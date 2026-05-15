'use client'

import { useState, type KeyboardEvent } from 'react'

type Props = {
  onSend: (message: string) => void
  disabled: boolean
}

export default function InputForm({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t bg-background px-4 py-3">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <textarea
          className="flex-1 resize-none rounded-xl border bg-muted px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring min-h-[42px] max-h-32"
          rows={1}
          placeholder="メッセージを入力（Enterで送信）"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          className="shrink-0 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
        >
          送信
        </button>
      </div>
    </div>
  )
}
