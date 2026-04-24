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
    // Blob not yet configured
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-10 fade-up">
        <div>
          <p className="text-[11px] font-mono text-ink-3 uppercase tracking-widest mb-2">
            Dashboard
          </p>
          <h1 className="font-display text-4xl font-light text-ink tracking-tight">
            Test Runs
          </h1>
        </div>
        <Link
          href="/runs/new"
          className="flex items-center gap-2 bg-gold text-bg px-4 py-2 rounded text-sm font-semibold hover:bg-gold/90 transition-colors duration-150"
        >
          <Plus size={15} strokeWidth={2.5} />
          New Run
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="fade-up delay-1 border border-dashed border-border rounded-lg py-24 text-center">
          <p className="font-display text-2xl font-light text-ink-3 mb-2">No runs yet</p>
          <p className="text-sm text-ink-3 mb-6">
            Import a bot prompt to generate and run test cases.
          </p>
          <Link
            href="/runs/new"
            className="inline-flex items-center gap-2 bg-gold text-bg px-5 py-2 rounded text-sm font-semibold hover:bg-gold/90 transition-colors"
          >
            <Plus size={14} /> Create your first run
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {runs.map((run, i) => (
            <div
              key={run.id}
              className={`fade-up delay-${Math.min(i + 1, 4)}`}
            >
              <RunCard run={run} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
