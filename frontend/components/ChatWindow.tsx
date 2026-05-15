'use client'

import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  imageDataUrl?: string
  streaming?: boolean
}

type Props = {
  messages: ChatMessage[]
}

export default function ChatWindow({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          AIと気軽に話しかけてみてください
        </div>
      )}
      {messages.map((msg, i) => (
        <MessageBubble
          key={i}
          role={msg.role}
          content={msg.content}
          imageDataUrl={msg.imageDataUrl}
          streaming={msg.streaming}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
