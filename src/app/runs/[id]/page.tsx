import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getRun } from '@/lib/blob'
import { TestCaseTable } from '@/components/TestCaseTable'
import { StatusBadge } from '@/components/StatusBadge'
import { GenerateTcsButton } from '@/components/GenerateTcsButton'

export const dynamic = 'force-dynamic'

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) notFound()

  if (run.status === 'completed') redirect(`/runs/${id}/results`)
  if (run.status === 'running') redirect(`/runs/${id}/execute`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{run.name}</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date(run.createdAt).toLocaleString()} · {run.model} · max {run.maxTurns} turns
          </p>
        </div>
        {run.testCases.length > 0 && (
          <Link
            href={`/runs/${id}/execute`}
            className="shrink-0 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Run All ({run.testCases.length} TCs) →
          </Link>
        )}
      </div>

      {/* Prompt Summary */}
      <div className="bg-white border rounded-lg p-4">
        <p className="text-xs font-semibold uppercase text-slate-400 tracking-wide mb-2">
          Prompt Summary
        </p>
        <p className="text-slate-700 text-sm leading-relaxed">{run.promptSummary}</p>
        <details className="mt-3">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none">
            View raw prompt ({run.promptText.length.toLocaleString()} chars)
          </summary>
          <pre className="mt-2 text-xs text-slate-600 font-mono bg-slate-50 rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-64 border">
            {run.promptText}
          </pre>
        </details>
      </div>

      {/* Test Cases */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Test Cases{' '}
            {run.testCases.length > 0 && (
              <span className="text-slate-400 font-normal text-base">
                ({run.testCases.length})
              </span>
            )}
          </h2>
          <GenerateTcsButton
            runId={id}
            label={run.testCases.length === 0 ? 'Generate Test Cases' : 'Regenerate'}
            hasExisting={run.testCases.length > 0}
          />
        </div>

        {run.testCases.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-12 text-center text-slate-400">
            <p className="text-base">No test cases yet.</p>
            <p className="text-sm mt-1">
              Click &ldquo;Generate Test Cases&rdquo; to auto-generate them from the prompt, or add
              manually below.
            </p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <TestCaseTable runId={id} initialTcs={run.testCases} />
          </div>
        )}
      </div>
    </div>
  )
}
