import { getDb } from '../lib/mongodb.js'
import type { Message } from './claude.js'

const MAX_HISTORY = 40
const MAX_SESSION_MESSAGES = 200

export async function getOrCreateSession(sessionId: string) {
  const db = await getDb()
  await db.collection('sessions').updateOne(
    { sessionId },
    { $set: { updatedAt: new Date() }, $setOnInsert: { sessionId, createdAt: new Date() } },
    { upsert: true },
  )
}

export async function getRecentMessages(sessionId: string): Promise<Message[]> {
  const db = await getDb()
  const messages = await db
    .collection('messages')
    .find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(MAX_HISTORY)
    .toArray()
  return messages.reverse().map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content as string,
  }))
}

export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
) {
  const db = await getDb()
  await db.collection('messages').insertOne({ sessionId, role, content, createdAt: new Date() })
}

export async function deleteSession(sessionId: string) {
  const db = await getDb()
  await db.collection('messages').deleteMany({ sessionId })
  await db.collection('sessions').deleteMany({ sessionId })
}

export async function isSessionAtLimit(sessionId: string): Promise<boolean> {
  const db = await getDb()
  const count = await db.collection('messages').countDocuments({ sessionId })
  return count >= MAX_SESSION_MESSAGES
}
