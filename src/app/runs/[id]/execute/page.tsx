import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRun } from '@/lib/blob'
import { ExecutionPoller } from '@/components/ExecutionPoller'
import type { StatusResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ExecutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) notFound()

  const done = run.testCases.filter(tc => tc.verdict !== 'PENDING')
  const initialStatus: StatusResponse = {
    status: run.status,
    completedTcs: done.length,
    totalTcs: run.testCases.length,
    currentTcName: run.testCases.find(tc => tc.verdict === 'PENDING')?.name ?? null,
    passCount: done.filter(tc => tc.verdict === 'PASS').length,
    failCount: done.filter(tc => tc.verdict === 'FAIL').length,
    partialCount: done.filter(tc => tc.verdict === 'PARTIAL').length,
    finishedTestCases: done.map(tc => ({ id: tc.id, name: tc.name, verdict: tc.verdict, remarks: tc.remarks })),
  }

  return (
    <div className="max-w-xl fade-up">
      <Link href={`/runs/${id}`} className="text-[11px] font-mono text-ink-3 hover:text-gold transition-colors">
        ← Back to run
      </Link>
      <h1 className="font-display text-3xl font-light text-ink mt-2 mb-1">{run.name}</h1>
      <p className="text-[11px] font-mono text-ink-3 mb-8">
        {run.testCases.length} test cases · {run.model} · max {run.maxTurns} turns each
      </p>

      <div className="bg-surface border border-border rounded-lg p-6">
        <ExecutionPoller runId={id} initialStatus={initialStatus} />
      </div>
    </div>
  )
}
