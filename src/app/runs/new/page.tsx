'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Image } from 'lucide-react'

export default function NewRunPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [promptText, setPromptText] = useState('')
  const [greetingText, setGreetingText] = useState('')
  const [dynamicVariables, setDynamicVariables] = useState('')
  const [maxTurns, setMaxTurns] = useState(16)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [extractingVars, setExtractingVars] = useState(false)
  const [error, setError] = useState('')
  const [uploadedFilename, setUploadedFilename] = useState('')
  const [varsFilename, setVarsFilename] = useState('')

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

  async function handleVarsUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setExtractingVars(true)
    setError('')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload/dynamic-vars', { method: 'POST', body: form })
    const data = await res.json()
    if (data.variables) {
      setDynamicVariables(data.variables)
      setVarsFilename(file.name)
    } else {
      setError(data.error ?? 'Variable extraction failed')
    }
    setExtractingVars(false)
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
      body: JSON.stringify({
        name: name.trim(),
        promptText: promptText.trim(),
        greetingText: greetingText.trim(),
        dynamicVariables: dynamicVariables.trim(),
        maxTurns,
      }),
    })
    if (!res.ok) {
      setError('Failed to create run. Check your OpenAI API key.')
      setLoading(false)
      return
    }
    const run = await res.json()
    router.push(`/runs/${run.id}`)
  }

  const labelCls = "block text-[10px] font-mono uppercase tracking-widest text-ink-3 mb-2"
  const inputCls = "w-full bg-surface border border-border rounded px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-gold/50 transition-colors"

  return (
    <div className="max-w-2xl fade-up">
      <p className="text-[11px] font-mono text-ink-3 uppercase tracking-widest mb-2">New Run</p>
      <h1 className="font-display text-3xl font-light text-ink tracking-tight mb-8">
        Import a prompt
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Run name */}
        <div>
          <label className={labelCls}>Run name <span className="text-fail">*</span></label>
          <input
            className={inputCls}
            placeholder="e.g. BankBazaar SBI Credit Card v3"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Prompt */}
        <div>
          <label className={labelCls}>Prompt <span className="text-fail">*</span></label>
          <div className="mb-2 flex items-center gap-3">
            <label className="cursor-pointer flex items-center gap-1.5 text-xs font-mono text-ink-2 border border-border rounded px-3 py-1.5 hover:border-rim hover:text-ink transition-colors">
              <Upload size={12} />
              {uploading ? 'Uploading…' : 'Upload PDF or DOCX'}
              <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileUpload} />
            </label>
            {uploadedFilename && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-gold">
                <FileText size={11} /> {uploadedFilename}
              </span>
            )}
          </div>
          <textarea
            className={`${inputCls} font-mono text-xs h-72 resize-y leading-relaxed`}
            placeholder="…or paste your bot system prompt here"
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
          />
          <p className="text-[10px] font-mono text-ink-3 mt-1.5 flex items-center gap-2">
            <span>{promptText.length.toLocaleString()} chars</span>
            {promptText.length > 50000 && (
              <span className="text-partial">⚠ Large prompt — may be slow</span>
            )}
          </p>
        </div>

        {/* Greeting */}
        <div>
          <label className={labelCls}>Greeting message</label>
          <p className="text-[11px] font-mono text-ink-3 mb-2">
            The opening message the agent always sends first. Leave blank if the agent waits for the lead to speak.
          </p>
          <textarea
            className={`${inputCls} font-mono text-xs h-24 resize-y leading-relaxed`}
            placeholder="e.g. Hello! I'm Rohan calling from SquadStack. Am I speaking with {{lead_name}}?"
            value={greetingText}
            onChange={e => setGreetingText(e.target.value)}
          />
        </div>

        {/* Dynamic Variables */}
        <div>
          <label className={labelCls}>Dynamic variables</label>
          <p className="text-[11px] font-mono text-ink-3 mb-2">
            Upload a screenshot of your variable definitions (e.g. agent_name, product). We'll extract them automatically.
          </p>
          <div className="mb-2 flex items-center gap-3">
            <label className="cursor-pointer flex items-center gap-1.5 text-xs font-mono text-ink-2 border border-border rounded px-3 py-1.5 hover:border-rim hover:text-ink transition-colors">
              <Image size={12} />
              {extractingVars ? 'Extracting…' : 'Upload screenshot'}
              <input type="file" accept="image/*" className="hidden" onChange={handleVarsUpload} />
            </label>
            {varsFilename && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-gold">
                <FileText size={11} /> {varsFilename}
              </span>
            )}
          </div>
          <textarea
            className={`${inputCls} font-mono text-xs h-28 resize-y leading-relaxed`}
            placeholder={"agent_name: Rohan\nproduct: SBI Credit Card\ncompany: SquadStack"}
            value={dynamicVariables}
            onChange={e => setDynamicVariables(e.target.value)}
          />
          <p className="text-[10px] font-mono text-ink-3 mt-1.5">
            Edit extracted values if needed. Used as context during test execution.
          </p>
        </div>

        {/* Max turns */}
        <div>
          <label className={labelCls}>Max turns per test case</label>
          <div className="flex items-center gap-3">
            <input
              type="number" min={6} max={24}
              className={`${inputCls} w-24`}
              value={maxTurns}
              onChange={e => setMaxTurns(Number(e.target.value))}
            />
            <span className="text-[11px] font-mono text-ink-3">6 – 24 · default 16</span>
          </div>
        </div>

        {error && (
          <p className="text-xs font-mono text-fail bg-fail/5 border border-fail/20 rounded px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-gold text-bg px-6 py-2.5 rounded text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
              Creating run + generating summary…
            </>
          ) : 'Create Run →'}
        </button>
      </form>
    </div>
  )
}
