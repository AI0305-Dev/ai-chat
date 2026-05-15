'use client'

import { useState, useEffect } from 'react'
import ChatWindow, { type ChatMessage } from '@/components/ChatWindow'
import InputForm from '@/components/InputForm'
import { sendMessage, getHistory, deleteHistory } from '@/lib/api'
import { getSessionId } from '@/lib/session'

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = getSessionId()
    setSessionId(id)
    getHistory(id).then(setMessages).catch(() => {
      setError('履歴の読み込みに失敗しました。')
    })
  }, [])

  async function handleSend(content: string) {
    if (isStreaming) return
    setError(null)

    setMessages((prev) => [
      ...prev,
      { role: 'user', content },
      { role: 'assistant', content: '', streaming: true },
    ])
    setIsStreaming(true)

    try {
      for await (const chunk of sendMessage(sessionId, content)) {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk }
          }
          return updated
        })
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && last.content === '') {
          updated.pop()
        }
        return updated
      })
      setError('送信に失敗しました。再試行してください。')
    } finally {
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, streaming: false }
        }
        return updated
      })
      setIsStreaming(false)
    }
  }

  async function handleReset() {
    if (!sessionId) return
    await deleteHistory(sessionId)
    setMessages([])
    setError(null)
  }

  return (
    <div className="flex flex-col h-full">
      <header className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-base">AIチャット</h1>
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleReset}
          disabled={isStreaming}
        >
          会話をリセット
        </button>
      </header>
      <div className="flex-1 overflow-hidden max-w-3xl w-full mx-auto flex flex-col">
        <ChatWindow messages={messages} />
        {error && (
          <p className="px-4 py-2 text-xs text-red-500 text-center">{error}</p>
        )}
        <InputForm onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  )
}
