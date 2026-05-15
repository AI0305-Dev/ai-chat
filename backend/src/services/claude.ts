import Groq from 'groq-sdk'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `あなたは親切で丁寧なAIアシスタントです。
ユーザーと楽しく雑談・会話することが得意です。
常に丁寧な口調を保ちながら、温かみのある会話をしてください。`

const STREAM_TIMEOUT_MS = 30_000
const TEXT_MODEL = 'llama-3.3-70b-versatile'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

export type Message = { role: 'user' | 'assistant'; content: string }

export async function* streamChat(
  messages: Message[],
  imageDataUrl?: string,
): AsyncGenerator<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS)

  try {
    const lastMessage = messages[messages.length - 1]
    const historyMessages = messages.slice(0, -1)

    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }

    type ApiMessage = {
      role: 'user' | 'assistant' | 'system'
      content: string | ContentPart[]
    }

    const apiMessages: ApiMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...historyMessages.map((m) => ({ role: m.role, content: m.content })),
    ]

    if (imageDataUrl && lastMessage.role === 'user') {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: lastMessage.content },
        ],
      })
    } else {
      apiMessages.push({ role: lastMessage.role, content: lastMessage.content })
    }

    const stream = await client.chat.completions.create(
      {
        model: imageDataUrl ? VISION_MODEL : TEXT_MODEL,
        max_tokens: 4096,
        messages: apiMessages as Parameters<typeof client.chat.completions.create>[0]['messages'],
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
