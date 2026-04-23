import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { getRun } from '@/lib/blob'
import { StatusBadge } from '@/components/StatusBadge'
import { TestCaseTable } from '@/components/TestCaseTable'
import type { TestCase, Verdict } from '@/lib/types'

export const dynamic = 'force-dynamic'

const VERDICT_ORDER: Record<Verdict, number> = {
  FAIL: 0,
  PARTIAL: 1,
  ERROR: 2,
  PASS: 3,
  PENDING: 4,
}

function sortTcs(tcs: TestCase[]): TestCase[] {
  return [...tcs].sort(
    (a, b) => (VERDICT_ORDER[a.verdict] ?? 5) - (VERDICT_ORDER[b.verdict] ?? 5)
  )
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) notFound()

  const ran = run.testCases.filter(tc => tc.verdict !== 'PENDING')
  const passCount = ran.filter(tc => tc.verdict === 'PASS').length
  const failCount = ran.filter(tc => tc.verdict === 'FAIL').length
  const partialCount = ran.filter(tc => tc.verdict === 'PARTIAL').length
  const errorCount = ran.filter(tc => tc.verdict === 'ERROR').length
  const passRate = ran.length > 0 ? Math.round((passCount / ran.length) * 100) : 0
  const sorted = sortTcs(run.testCases)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href={`/runs/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to run
          </Link>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{run.name}</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date(run.createdAt).toLocaleString()} · {run.model}
          </p>
        </div>
        <a
          href={`/api/runs/${id}/report`}
          className="shrink-0 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <Download size={16} /> Download Report (.xlsx)
        </a>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {
            label: 'Pass Rate',
            value: `${passRate}%`,
            color:
              passRate >= 80
                ? 'text-green-700'
                : passRate >= 50
                  ? 'text-amber-700'
                  : 'text-red-700',
          },
          { label: 'Pass', value: passCount, color: 'text-green-700' },
          { label: 'Fail', value: failCount, color: 'text-red-700' },
          { label: 'Partial', value: partialCount, color: 'text-amber-700' },
          { label: 'Error', value: errorCount, color: 'text-gray-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border rounded-lg p-4 text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Results table with full expand/transcript */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Test Case Results{' '}
          <span className="text-slate-400 font-normal text-base">
            ({sorted.length} · sorted by verdict)
          </span>
        </h2>
        <div className="bg-white border rounded-lg overflow-hidden">
          <TestCaseTable runId={id} initialTcs={sorted} />
        </div>
      </div>

      {/* Share link */}
      <div className="text-xs text-slate-400 border-t pt-4">
        Share this URL with your team to view results:
        <span className="ml-1 font-mono text-slate-500">
          {`[your-domain]/runs/${id}/results`}
        </span>
      </div>
    </div>
  )
}
