'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText } from 'lucide-react'

export default function NewRunPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [promptText, setPromptText] = useState('')
  const [maxTurns, setMaxTurns] = useState(16)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [uploadedFilename, setUploadedFilename] = useState('')

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload/prompt', { method: 'POST', body: form })
    const data = await res.json()
    if (data.text) {
      setPromptText(data.text)
      setUploadedFilename(file.name)
    } else {
      setError(data.error ?? 'Upload failed')
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !promptText.trim()) {
      setError('Run name and prompt text are required.')
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), promptText: promptText.trim(), maxTurns }),
    })
    if (!res.ok) {
      setError('Failed to create run. Check your OpenAI API key.')
      setLoading(false)
      return
    }
    const run = await res.json()
    router.push(`/runs/${run.id}`)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">New Run</h1>
      <p className="text-slate-500 text-sm mb-6">
        Import a bot system prompt. A plain-English summary is generated automatically.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Run name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="e.g. BankBazaar SBI Credit Card v3"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Prompt <span className="text-red-500">*</span>
          </label>
          <div className="mb-2 flex items-center gap-3">
            <label className="cursor-pointer flex items-center gap-1.5 text-sm text-slate-600 border rounded px-3 py-1.5 hover:bg-slate-50 transition-colors">
              <Upload size={14} />
              {uploading ? 'Uploading…' : 'Upload PDF or DOCX'}
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            {uploadedFilename && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <FileText size={12} /> {uploadedFilename}
              </span>
            )}
          </div>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400 h-72 resize-y"
            placeholder="Or paste your bot system prompt here…"
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">
            {promptText.length.toLocaleString()} characters
            {promptText.length > 50000 && (
              <span className="text-amber-600 ml-2">⚠ Large prompt — may be slow</span>
            )}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Max turns per test case
          </label>
          <input
            type="number"
            min={6}
            max={24}
            className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={maxTurns}
            onChange={e => setMaxTurns(Number(e.target.value))}
          />
          <p className="text-xs text-slate-400 mt-1">6–24 turns. Default 16.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating run + generating summary…' : 'Create Run →'}
        </button>
      </form>
    </div>
  )
}
