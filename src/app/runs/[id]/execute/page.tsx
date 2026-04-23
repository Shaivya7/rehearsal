import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRun } from '@/lib/blob'
import { ExecutionPoller } from '@/components/ExecutionPoller'
import type { StatusResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ExecutePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) notFound()

  const completedTcs = run.testCases.filter(tc => tc.verdict !== 'PENDING').length
  const initialStatus: StatusResponse = {
    status: run.status,
    completedTcs,
    totalTcs: run.testCases.length,
    currentTcName: run.testCases.find(tc => tc.verdict === 'PENDING')?.name ?? null,
    passCount: run.testCases.filter(tc => tc.verdict === 'PASS').length,
    failCount: run.testCases.filter(tc => tc.verdict === 'FAIL').length,
    partialCount: run.testCases.filter(tc => tc.verdict === 'PARTIAL').length,
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/runs/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to run
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{run.name}</h1>
        <p className="text-slate-500 text-sm">
          {run.testCases.length} test cases · {run.model} · max {run.maxTurns} turns each
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <ExecutionPoller runId={id} initialStatus={initialStatus} />
      </div>
    </div>
  )
}
