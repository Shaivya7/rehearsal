'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { StatusResponse } from '@/lib/types'

interface Props {
  runId: string
  initialStatus: StatusResponse
}

export function ExecutionPoller({ runId, initialStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const runningRef = useRef(false)

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/runs/${runId}/status`)
    if (res.ok) {
      const s = await res.json() as StatusResponse
      setStatus(s)
      return s
    }
    return null
  }, [runId])

  const runLoop = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    setError(null)

    try {
      while (true) {
        const res = await fetch(`/api/runs/${runId}/execute-next`, { method: 'POST' })
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        const data = await res.json()
        await fetchStatus()
        if (data.done || data.aborted) {
          router.push(`/runs/${runId}/results`)
          return
        }
      }
    } catch (err) {
      setError(String(err))
    } finally {
      runningRef.current = false
    }
  }, [runId, fetchStatus, router])

  useEffect(() => {
    if (initialStatus.completedTcs < initialStatus.totalTcs) {
      runLoop()
    } else {
      router.push(`/runs/${runId}/results`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const progress =
    status.totalTcs > 0 ? Math.round((status.completedTcs / status.totalTcs) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-slate-600 mb-1.5">
          <span>
            {status.completedTcs < status.totalTcs
              ? `Running TC ${status.completedTcs + 1} of ${status.totalTcs}${
                  status.currentTcName ? ` — ${status.currentTcName}` : ''
                }`
              : 'All test cases complete'}
          </span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { label: 'Pass', count: status.passCount, color: 'text-green-700' },
          { label: 'Fail', count: status.failCount, color: 'text-red-700' },
          { label: 'Partial', count: status.partialCount, color: 'text-amber-700' },
          { label: 'Done', count: status.completedTcs, color: 'text-slate-700' },
        ].map(({ label, count, color }) => (
          <div key={label} className="border rounded-lg p-3">
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Spinner */}
      {!error && status.completedTcs < status.totalTcs && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Executing test cases…
        </div>
      )}

      {/* Error with retry */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          <p>Error: {error}</p>
          <button
            onClick={runLoop}
            className="mt-2 underline text-red-700"
          >
            Retry from last completed TC
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={async () => {
            await fetch(`/api/runs/${runId}/abort`, { method: 'POST' })
            router.push(`/runs/${runId}/results`)
          }}
          className="text-sm text-red-500 hover:text-red-700 hover:underline"
        >
          Abort run
        </button>
      </div>

      <p className="text-xs text-slate-400 border-t pt-3">
        Keep this tab open while executing. Share this URL with a teammate to let them monitor.
      </p>
    </div>
  )
}
