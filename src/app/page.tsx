import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listRunSummaries } from '@/lib/blob'
import { RunCard } from '@/components/RunCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  let runs: Awaited<ReturnType<typeof listRunSummaries>> = []
  try {
    runs = await listRunSummaries()
  } catch {
    // Blob not configured yet — show empty state
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Runs</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Each run tests one bot prompt against a generated set of test cases.
          </p>
        </div>
        <Link
          href="/runs/new"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <Plus size={16} /> New Run
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-24 text-slate-400">
          <p className="text-lg font-medium">No runs yet.</p>
          <p className="text-sm mt-1">Create a new run to start testing a bot prompt.</p>
          <Link
            href="/runs/new"
            className="mt-4 inline-block bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Create your first run →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {runs.map(run => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  )
}
