import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getRun } from '@/lib/blob'
import { TestCaseTable } from '@/components/TestCaseTable'
import { StatusBadge } from '@/components/StatusBadge'
import { GenerateTcsButton } from '@/components/GenerateTcsButton'

export const dynamic = 'force-dynamic'

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) notFound()

  if (run.status === 'completed') redirect(`/runs/${id}/results`)
  if (run.status === 'running') redirect(`/runs/${id}/execute`)

  return (
    <div className="space-y-8 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/" className="text-[11px] font-mono text-ink-3 hover:text-gold transition-colors">
            ← All runs
          </Link>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <h1 className="font-display text-3xl font-light text-ink">{run.name}</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-[11px] font-mono text-ink-3 mt-1.5">
            {new Date(run.createdAt).toLocaleString()} · {run.model} · {run.maxTurns} turns max
          </p>
        </div>
        {run.testCases.length > 0 && (
          <Link
            href={`/runs/${id}/execute`}
            className="shrink-0 bg-blue text-bg px-5 py-2 rounded text-sm font-semibold hover:bg-blue/90 transition-colors"
          >
            Run All ({run.testCases.length}) →
          </Link>
        )}
      </div>

      {/* Test Cases */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink-3 mb-1">
              Test Cases
            </p>
            <h2 className="font-display text-xl font-light text-ink">
              {run.testCases.length > 0 ? (
                <>{run.testCases.length} cases ready</>
              ) : (
                <>No cases yet</>
              )}
            </h2>
          </div>
          <GenerateTcsButton
            runId={id}
            label={run.testCases.length === 0 ? 'Generate Test Cases' : 'Regenerate'}
            hasExisting={run.testCases.length > 0}
          />
        </div>

        {/* TestCaseTable is always rendered — handles empty state + Add button internally */}
        <TestCaseTable runId={id} initialTcs={run.testCases} />
      </div>
    </div>
  )
}
