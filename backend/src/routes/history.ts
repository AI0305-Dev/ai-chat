import { Hono } from 'hono'
import { getRecentMessages, deleteSession } from '../services/session.js'

const history = new Hono()

history.get('/api/history/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const messages = await getRecentMessages(sessionId)
  return c.json({ messages })
})

history.delete('/api/history/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  await deleteSession(sessionId)
  return c.json({ success: true })
})

export default history
