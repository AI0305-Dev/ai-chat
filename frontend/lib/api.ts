const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export type Message = { role: 'user' | 'assistant'; content: string }

export async function* sendMessage(
  sessionId: string,
  message: string,
): AsyncGenerator<string> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  })

  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (!json) continue

      const data = JSON.parse(json) as { type: string; text?: string; message?: string }
      if (data.type === 'delta' && data.text) yield data.text
      if (data.type === 'done') return
      if (data.type === 'error') throw new Error(data.message)
    }
  }
}

export async function getHistory(sessionId: string): Promise<Message[]> {
  const res = await fetch(`${API_URL}/api/history/${sessionId}`)
  const data = (await res.json()) as { messages: Message[] }
  return data.messages
}

export async function deleteHistory(sessionId: string): Promise<void> {
  await fetch(`${API_URL}/api/history/${sessionId}`, { method: 'DELETE' })
}
