'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

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
  const router = useRouter()

  async function handleClick() {
    if (hasExisting && !confirm('This will replace all existing test cases. Continue?')) return
    setLoading(true)
    await fetch(`/api/runs/${runId}/generate-tcs`, { method: 'POST' })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 bg-gold text-bg px-4 py-2 rounded text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 transition-colors duration-150"
    >
      <Zap size={14} strokeWidth={2.5} className={loading ? 'animate-pulse' : ''} />
      {loading ? 'Generating…' : label}
    </button>
  )
}
