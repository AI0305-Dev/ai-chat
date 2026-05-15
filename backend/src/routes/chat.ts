import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { getOrCreateSession, getRecentMessages, saveMessage, isSessionAtLimit } from '../services/session.js'
import { streamChat } from '../services/claude.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_MESSAGE_LENGTH = 2000
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const chat = new Hono()

chat.post('/api/chat', async (c) => {
  const body = await c.req.json<{ sessionId: string; message: string; image?: string }>()
  const { sessionId, message, image } = body

  if (!sessionId || !message) {
    return c.json({ error: 'sessionId and message are required' }, 400)
  }
  if (!UUID_REGEX.test(sessionId)) {
    return c.json({ error: 'Invalid sessionId format' }, 400)
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return c.json({ error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` }, 400)
  }
  if (image) {
    const match = image.match(/^data:(image\/[a-zA-Z]+);base64,/)
    if (!match || !ALLOWED_IMAGE_TYPES.includes(match[1])) {
      return c.json({ error: 'Unsupported image type' }, 400)
    }
    const base64Data = image.split(',')[1] ?? ''
    const byteLength = Math.ceil(base64Data.length * 0.75)
    if (byteLength > MAX_IMAGE_BYTES) {
      return c.json({ error: 'Image exceeds 5MB limit' }, 400)
    }
  }

  await getOrCreateSession(sessionId)

  if (await isSessionAtLimit(sessionId)) {
    return c.json({ error: 'この会話は上限に達しました。リセットしてください。' }, 429)
  }

  const history = await getRecentMessages(sessionId)
  await saveMessage(sessionId, 'user', message)
  history.push({ role: 'user', content: message })

  return streamSSE(c, async (stream) => {
    let fullResponse = ''
    try {
      for await (const chunk of streamChat(history, image)) {
        fullResponse += chunk
        await stream.writeSSE({
          data: JSON.stringify({ type: 'delta', text: chunk }),
        })
      }
      await saveMessage(sessionId, 'assistant', fullResponse)
      await stream.writeSSE({ data: JSON.stringify({ type: 'done' }) })
    } catch {
      await stream.writeSSE({
        data: JSON.stringify({ type: 'error', message: 'AI response failed' }),
      })
    }
  })
})

export default chat
