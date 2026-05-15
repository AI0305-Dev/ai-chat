import Groq from 'groq-sdk'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `あなたは親切で丁寧なAIアシスタントです。
ユーザーと楽しく雑談・会話することが得意です。
常に丁寧な口調を保ちながら、温かみのある会話をしてください。`

const STREAM_TIMEOUT_MS = 30_000

export type Message = { role: 'user' | 'assistant'; content: string }

export async function* streamChat(messages: Message[]): AsyncGenerator<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS)

  try {
    const stream = await client.chat.completions.create(
      {
        model: 'llama-3.3-70b-versatile',
        max_tokens: 4096,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      },
      { signal: controller.signal },
    )

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) yield text
    }
  } finally {
    clearTimeout(timer)
  }
}
