'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, ChevronDown, ChevronUp } from 'lucide-react'

export function GenerateTcsButton({
  runId,
  label = 'Generate Test Cases',
  hasExisting = false,
}: {
  runId: string
  label?: string
  hasExisting?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()

  async function handleClick() {
    if (hasExisting && !confirm('This will replace all existing test cases. Continue?')) return
    setLoading(true)
    await fetch(`/api/runs/${runId}/generate-tcs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructions: instructions.trim() }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-2 min-w-[220px]">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1 text-[11px] font-mono text-ink-3 hover:text-gold transition-colors"
      >
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        {expanded ? 'Hide instructions' : 'Add generation instructions'}
      </button>

      {expanded && (
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="e.g. Only generate test cases for the rebuttal handling section. Skip happy-path flows."
          className="w-full bg-surface border border-border rounded px-3 py-2 text-xs font-mono text-ink placeholder:text-ink-3 focus:outline-none focus:border-gold/50 transition-colors resize-y h-24 leading-relaxed"
        />
      )}

      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 bg-gold text-bg px-4 py-2 rounded text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 transition-colors duration-150"
      >
        <Zap size={14} strokeWidth={2.5} className={loading ? 'animate-pulse' : ''} />
        {loading ? 'Generating…' : label}
      </button>
    </div>
  )
}
