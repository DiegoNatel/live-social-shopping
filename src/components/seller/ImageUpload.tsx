'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Link as LinkIcon, Loader2, X } from 'lucide-react'
import { inputClass } from './FormField'

const MAX_BYTES = 5 * 1024 * 1024

async function upload(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error(`${file.name}: máximo 5 MB`)
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/uploads', { method: 'POST', body })
  const data = (await res.json().catch(() => null)) as { url?: string; message?: string } | null
  if (!res.ok || !data?.url) throw new Error(data?.message ?? `Não foi possível enviar ${file.name}`)
  return data.url
}

interface ImageUploadProps {
  value: string[]
  onChange: React.Dispatch<React.SetStateAction<string[]>>
  max: number
}

// Uploads to R2 via /api/uploads; an https link can be pasted instead
export function ImageUpload({ value, onChange, max }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [showLink, setShowLink] = useState(false)
  const remaining = max - value.length - uploading

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    const picked = [...files].slice(0, Math.max(0, remaining))
    setUploading(n => n + picked.length)
    // Uploaded in parallel; each one is added as soon as it finishes
    await Promise.all(
      picked.map(async file => {
        try {
          const url = await upload(file)
          onChange(urls => [...urls, url])
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Falha no envio')
        } finally {
          setUploading(n => n - 1)
        }
      })
    )
    if (inputRef.current) inputRef.current.value = ''
  }

  const addLink = () => {
    try {
      if (new URL(link).protocol !== 'https:') throw new Error()
    } catch {
      setError('Use um link https://')
      return
    }
    onChange(urls => [...urls, link])
    setLink('')
    setShowLink(false)
    setError('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={url} className="relative w-20 h-20 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
            <Image src={url} alt="" fill className="object-cover" />
            {i === 0 && max > 1 && (
              <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center">Capa</span>
            )}
            <button
              type="button"
              aria-label="Remover imagem"
              onClick={() => onChange(urls => urls.filter(u => u !== url))}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={`up-${i}`} className="w-20 h-20 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-md border-2 border-dashed border-gray-300 text-gray-400 flex flex-col items-center justify-center gap-1 text-xs hover:border-sky-blue hover:text-sky-blue transition-colors"
          >
            <ImagePlus className="w-5 h-5" />
            Enviar
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={max > 1}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {remaining > 0 &&
        (showLink ? (
          <div className="flex gap-2 mt-2">
            <input
              className={inputClass}
              value={link}
              onChange={e => setLink(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLink())}
              placeholder="https://..."
              autoFocus
            />
            <button type="button" onClick={addLink} className="px-3 text-sm text-sky-blue hover:underline">
              Adicionar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLink(true)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-sky-blue"
          >
            <LinkIcon className="w-3 h-3" />
            Usar um link em vez disso
          </button>
        ))}

      <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP ou GIF, até 5 MB{max > 1 ? ` · até ${max} imagens` : ''}</p>
      {error && <p className="text-coral-pink text-xs mt-1">{error}</p>}
    </div>
  )
}
