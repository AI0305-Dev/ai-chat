import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { getOrCreateSession, getRecentMessages, saveMessage, isSessionAtLimit } from '../services/session.js'
import { streamChat } from '../services/claude.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_MESSAGE_LENGTH = 2000

const chat = new Hono()

chat.post('/api/chat', async (c) => {
  const body = await c.req.json<{ sessionId: string; message: string }>()
  const { sessionId, message } = body

  if (!sessionId || !message) {
    return c.json({ error: 'sessionId and message are required' }, 400)
  }
  if (!UUID_REGEX.test(sessionId)) {
    return c.json({ error: 'Invalid sessionId format' }, 400)
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return c.json({ error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` }, 400)
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
      for await (const chunk of streamChat(history)) {
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
