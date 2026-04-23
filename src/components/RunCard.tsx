import Link from 'next/link'
import type { RunSummary } from '@/lib/types'
import { StatusBadge } from './StatusBadge'

export function RunCard({ run }: { run: RunSummary }) {
  const ran = run.passCount + run.failCount + run.partialCount + run.errorCount

  return (
    <Link
      href={`/runs/${run.id}`}
      className="block border rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all bg-white"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{run.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(run.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={run.status} />
      </div>
      {ran > 0 && (
        <div className="mt-3 flex gap-3 text-xs">
          <span className="text-green-700">{run.passCount} PASS</span>
          <span className="text-red-700">{run.failCount} FAIL</span>
          <span className="text-amber-700">{run.partialCount} PARTIAL</span>
          {run.errorCount > 0 && (
            <span className="text-gray-500">{run.errorCount} ERROR</span>
          )}
          <span className="text-slate-400 ml-auto">
            {ran}/{run.totalTcs} run
          </span>
        </div>
      )}
      {ran === 0 && run.totalTcs > 0 && (
        <p className="mt-2 text-xs text-slate-400">{run.totalTcs} test cases · not run yet</p>
      )}
    </Link>
  )
}
