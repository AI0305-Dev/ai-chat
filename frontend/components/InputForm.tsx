'use client'

import { useState, useRef, type KeyboardEvent, type DragEvent, type ClipboardEvent } from 'react'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

type Props = {
  onSend: (message: string, imageDataUrl?: string) => void
  disabled: boolean
}

export default function InputForm({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function processFile(file: File) {
    setImageError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError('JPEG / PNG / GIF / WebP のみ対応しています')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setImageError('画像は5MB以下にしてください')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setImageDataUrl(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function handlePaste(e: ClipboardEvent) {
    const file = Array.from(e.clipboardData.items)
      .find((item) => item.type.startsWith('image/'))
      ?.getAsFile()
    if (file) processFile(file)
  }

  function handleSubmit() {
    const trimmed = value.trim()
    if ((!trimmed && !imageDataUrl) || disabled) return
    onSend(trimmed || '画像を送信しました', imageDataUrl ?? undefined)
    setValue('')
    setImageDataUrl(null)
    setImageError(null)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className={`border-t bg-background px-4 py-3 transition-colors ${isDragging ? 'bg-muted/50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-2 max-w-3xl mx-auto">
        {imageDataUrl && (
          <div className="relative w-fit">
            <img src={imageDataUrl} alt="preview" className="max-h-32 rounded-xl object-contain border" />
            <button
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center"
              onClick={() => setImageDataUrl(null)}
            >
              ×
            </button>
          </div>
        )}
        {imageError && <p className="text-xs text-red-500">{imageError}</p>}
        {isDragging && (
          <p className="text-xs text-center text-muted-foreground py-2">ここにドロップ</p>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            className="shrink-0 rounded-xl border bg-muted px-3 py-2 text-sm disabled:opacity-50 hover:bg-muted/80 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="画像を添付"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <textarea
            className="flex-1 resize-none rounded-xl border bg-muted px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring min-h-[42px] max-h-32"
            rows={1}
            placeholder="メッセージを入力（Enterで送信 / Ctrl+Vで画像貼付け）"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={disabled}
          />
          <button
            className="shrink-0 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            onClick={handleSubmit}
            disabled={disabled || (!value.trim() && !imageDataUrl)}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  )
}
