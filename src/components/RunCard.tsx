import Link from 'next/link'
import type { RunSummary } from '@/lib/types'
import { StatusBadge } from './StatusBadge'

export function RunCard({ run }: { run: RunSummary }) {
  const ran = run.passCount + run.failCount + run.partialCount + run.errorCount
  const passRate = ran > 0 ? Math.round((run.passCount / ran) * 100) : null

  return (
    <Link
      href={`/runs/${run.id}`}
      className="group block bg-surface border border-border rounded-lg p-5 hover:border-gold/40 hover:bg-elevated transition-all duration-200 relative overflow-hidden"
    >
      {/* Gold left accent on hover */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gold scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom rounded-r" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-semibold text-ink text-base leading-snug truncate group-hover:text-gold transition-colors duration-200">
            {run.name}
          </p>
          <p className="text-[11px] font-mono text-ink-3 mt-1">
            {new Date(run.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <StatusBadge status={run.status} />
      </div>

      {ran > 0 ? (
        <div className="mt-4">
          {/* Progress bar */}
          <div className="flex h-1 rounded-full overflow-hidden bg-border gap-px mb-3">
            {run.passCount > 0 && (
              <div
                className="bg-pass rounded-full transition-all"
                style={{ width: `${(run.passCount / ran) * 100}%` }}
              />
            )}
            {run.partialCount > 0 && (
              <div
                className="bg-partial"
                style={{ width: `${(run.partialCount / ran) * 100}%` }}
              />
            )}
            {run.failCount > 0 && (
              <div
                className="bg-fail"
                style={{ width: `${(run.failCount / ran) * 100}%` }}
              />
            )}
          </div>
          <div className="flex gap-3 text-[11px] font-mono">
            {run.passCount > 0 && <span className="text-pass">{run.passCount} pass</span>}
            {run.failCount > 0 && <span className="text-fail">{run.failCount} fail</span>}
            {run.partialCount > 0 && <span className="text-partial">{run.partialCount} partial</span>}
            {run.errorCount > 0 && <span className="text-ink-3">{run.errorCount} error</span>}
            {passRate !== null && (
              <span className="ml-auto text-ink-3">{passRate}% pass rate</span>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[11px] font-mono text-ink-3">
          {run.totalTcs > 0 ? `${run.totalTcs} test cases · not run` : 'no test cases yet'}
        </p>
      )}
    </Link>
  )
}
