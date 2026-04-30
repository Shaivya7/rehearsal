import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { getRun } from '@/lib/blob'
import { StatusBadge } from '@/components/StatusBadge'
import { TestCaseTable } from '@/components/TestCaseTable'
import type { TestCase, Verdict } from '@/lib/types'

export const dynamic = 'force-dynamic'

const VERDICT_ORDER: Record<Verdict, number> = { FAIL: 0, PARTIAL: 1, ERROR: 2, PASS: 3, PENDING: 4 }

function sortTcs(tcs: TestCase[]): TestCase[] {
  return [...tcs].sort((a, b) => (VERDICT_ORDER[a.verdict] ?? 5) - (VERDICT_ORDER[b.verdict] ?? 5))
}

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const rateColor = passRate >= 80 ? 'text-pass' : passRate >= 50 ? 'text-partial' : 'text-fail'

  return (
    <div className="space-y-8 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href={`/runs/${id}`} className="text-[11px] font-mono text-ink-3 hover:text-gold transition-colors">
            ← Back to run
          </Link>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <h1 className="font-display text-3xl font-light text-ink">{run.name}</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-[11px] font-mono text-ink-3 mt-1.5">
            {new Date(run.createdAt).toLocaleString()} · {run.model}
          </p>
        </div>
        <a
          href={`/api/runs/${id}/report`}
          className="shrink-0 flex items-center gap-2 bg-pass text-bg px-4 py-2 rounded text-sm font-semibold hover:bg-pass/90 transition-colors"
        >
          <Download size={14} strokeWidth={2.5} />
          Download Report
        </a>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-1 bg-surface border border-border rounded-lg p-5 text-center">
          <p className={`font-display text-5xl font-light ${rateColor}`}>{passRate}%</p>
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-3 mt-2">Pass Rate</p>
        </div>
        {[
          { label: 'Pass',    val: passCount,    color: 'text-pass' },
          { label: 'Fail',    val: failCount,    color: 'text-fail' },
          { label: 'Partial', val: partialCount, color: 'text-partial' },
          { label: 'Error',   val: errorCount,   color: 'text-ink-3' },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-5 text-center">
            <p className={`font-display text-4xl font-light ${color}`}>{val}</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink-3 mt-2">{label}</p>
          </div>
        ))}
      </div>

      {/* Results */}
      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink-3 mb-1">Results</p>
            <h2 className="font-display text-xl font-light text-ink">
              {sorted.length} test cases · sorted by verdict
            </h2>
          </div>
        </div>
        <TestCaseTable runId={id} initialTcs={sorted} />
      </div>

      <p className="text-[10px] font-mono text-ink-3 border-t border-border pt-4">
        Share URL: <span className="text-ink-2">{`[your-domain]/runs/${id}/results`}</span>
      </p>
    </div>
  )
}
