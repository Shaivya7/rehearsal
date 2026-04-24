'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { StatusResponse, FinishedTcSummary } from '@/lib/types'

interface Props {
  runId: string
  initialStatus: StatusResponse
}

const VERDICT_COLOR: Record<string, string> = {
  PASS:    'text-pass bg-pass/10 border-pass/20',
  FAIL:    'text-fail bg-fail/10 border-fail/20',
  PARTIAL: 'text-partial bg-partial/10 border-partial/20',
  ERROR:   'text-ink-3 bg-surface border-border',
}

function VerdictPill({ verdict }: { verdict: string }) {
  return (
    <span className={`inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${VERDICT_COLOR[verdict] ?? VERDICT_COLOR.ERROR}`}>
      {verdict}
    </span>
  )
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
    }
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

  const progress = status.totalTcs > 0
    ? Math.round((status.completedTcs / status.totalTcs) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <p className="text-xs font-mono text-ink-3">
            {status.completedTcs < status.totalTcs
              ? <>TC <span className="text-gold">{status.completedTcs + 1}</span> of {status.totalTcs}{status.currentTcName ? ` · ${status.currentTcName}` : ''}</>
              : <span className="text-pass">All test cases complete</span>
            }
          </p>
          <span className="font-mono text-sm font-semibold text-ink">{progress}%</span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Pass',    val: status.passCount,    color: 'text-pass' },
          { label: 'Fail',    val: status.failCount,    color: 'text-fail' },
          { label: 'Partial', val: status.partialCount, color: 'text-partial' },
          { label: 'Done',    val: status.completedTcs, color: 'text-ink' },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-bg border border-border rounded-lg py-4 text-center">
            <p className={`font-display text-3xl font-light ${color}`}>{val}</p>
            <p className="text-[10px] font-mono text-ink-3 mt-0.5 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Spinner */}
      {!error && status.completedTcs < status.totalTcs && (
        <div className="flex items-center gap-2.5 text-xs text-ink-3 font-mono">
          <div className="w-3 h-3 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          Executing test cases…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs font-mono text-fail bg-fail/5 border border-fail/20 rounded p-3">
          <p>Error: {error}</p>
          <button onClick={runLoop} className="mt-2 text-fail/70 hover:text-fail underline">
            Retry from last completed TC
          </button>
        </div>
      )}

      {/* Completed TCs live view */}
      {status.finishedTestCases.length > 0 && (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-3 mb-3">
            Completed · {status.finishedTestCases.length} of {status.totalTcs}
          </p>
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {status.finishedTestCases.map((tc: FinishedTcSummary) => (
              <div key={tc.id} className="flex items-start gap-3 px-4 py-3">
                <VerdictPill verdict={tc.verdict} />
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">{tc.name}</p>
                  {tc.remarks && (
                    <p className="text-[11px] font-mono text-ink-3 mt-0.5 line-clamp-1">{tc.remarks}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <button
          onClick={async () => {
            await fetch(`/api/runs/${runId}/abort`, { method: 'POST' })
            router.push(`/runs/${runId}/results`)
          }}
          className="text-xs font-mono text-ink-3 hover:text-fail transition-colors"
        >
          Abort run
        </button>
        <p className="text-[10px] font-mono text-ink-3">
          Keep this tab open · share URL to monitor
        </p>
      </div>
    </div>
  )
}
