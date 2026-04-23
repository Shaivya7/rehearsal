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
      className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
    >
      <Zap size={14} />
      {loading ? 'Generating…' : label}
    </button>
  )
}
