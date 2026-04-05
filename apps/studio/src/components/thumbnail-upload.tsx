import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'

interface ThumbnailUploadProps {
  url: string
  onUpload: (file: File) => Promise<void>
  onRemove: () => void
  onError: (msg: string) => void
}

export function ThumbnailUpload({ url, onUpload, onRemove, onError }: ThumbnailUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file: File) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      onError('Only PNG, JPG, WebP allowed')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      onError('Max 2MB')
      return
    }
    setUploading(true)
    try { await onUpload(file) } catch (err) { onError(err instanceof Error ? err.message : 'Upload failed') }
    finally { setUploading(false) }
  }

  return (
    <>
      {url ? (
        <div className="flex flex-col items-center" style={{ gap: 'var(--spacing-sm)' }}>
          <img
            src={url}
            alt="Thumbnail"
            style={{ borderRadius: 'var(--rounded-lg)' }}
          />
          <div className="flex items-center justify-center" style={{ gap: 'var(--spacing-xs)' }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{
                height: '28px',
                padding: '0 var(--spacing-sm)',
                fontSize: 'var(--text-xs-font-size)',
                color: 'hsl(var(--text-secondary))',
                backgroundColor: 'transparent',
                border: '1px solid hsl(var(--border-default))',
                borderRadius: 'var(--rounded-md)',
                cursor: 'pointer',
              }}
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              style={{
                height: '28px',
                padding: '0 var(--spacing-sm)',
                fontSize: 'var(--text-xs-font-size)',
                color: 'hsl(var(--text-secondary))',
                backgroundColor: 'transparent',
                border: '1px solid hsl(var(--border-default))',
                borderRadius: 'var(--rounded-md)',
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
          className="flex flex-col items-center justify-center"
          style={{
            padding: 'var(--spacing-xl) var(--spacing-md)',
            border: `2px dashed hsl(var(${dragOver ? '--border-focus' : '--border-default'}))`,
            borderRadius: 'var(--rounded-lg)',
            backgroundColor: dragOver ? 'hsl(var(--bg-surface-alt))' : 'hsl(var(--bg-surface-alt))',
            cursor: uploading ? 'wait' : 'pointer',
            transition: 'border-color 0.15s ease, background-color 0.15s ease',
          }}
        >
          <Upload size={20} style={{ color: 'hsl(var(--text-muted))', marginBottom: '8px' }} />
          <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
            {uploading ? 'Uploading...' : 'Click or drag image'}
          </span>
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
            PNG, JPG, WebP · Max 2MB
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </>
  )
}
