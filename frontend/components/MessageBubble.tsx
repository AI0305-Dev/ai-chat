type Props = {
  role: 'user' | 'assistant'
  content: string
  imageDataUrl?: string
  streaming?: boolean
}

export default function MessageBubble({ role, content, imageDataUrl, streaming }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
        }`}
      >
        {imageDataUrl && (
          <img
            src={imageDataUrl}
            alt="添付画像"
            className="max-w-full rounded-xl mb-2 max-h-64 object-contain"
          />
        )}
        {content}
        {streaming && (
          <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 align-middle animate-pulse" />
        )}
      </div>
    </div>
  )
}
