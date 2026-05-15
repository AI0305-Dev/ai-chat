import { MongoClient } from 'mongodb'

const TTL_SECONDS = 30 * 24 * 60 * 60

let client: MongoClient | null = null

export async function getDb() {
  if (!client) {
    const uri = process.env.DATABASE_URL
    if (!uri) throw new Error('DATABASE_URL is not set')
    const newClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    })
    await newClient.connect()
    client = newClient
  }
  return client.db()
}

export async function initDb() {
  const db = await getDb()
  await db.collection('messages').createIndex({ sessionId: 1, createdAt: -1 })
  await db.collection('messages').createIndex({ createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS })
  await db.collection('sessions').createIndex({ sessionId: 1 }, { unique: true })
  await db.collection('sessions').createIndex({ updatedAt: 1 }, { expireAfterSeconds: TTL_SECONDS })
}

export async function closeDb() {
  if (client) {
    await client.close()
    client = null
  }
}
