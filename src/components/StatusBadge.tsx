import type { Verdict, RunStatus } from '@/lib/types'

type Status = Verdict | RunStatus

const styles: Record<string, string> = {
  PASS: 'bg-green-100 text-green-800 border-green-300',
  FAIL: 'bg-red-100 text-red-800 border-red-300',
  PARTIAL: 'bg-amber-100 text-amber-800 border-amber-300',
  ERROR: 'bg-gray-100 text-gray-600 border-gray-300',
  PENDING: 'bg-slate-100 text-slate-500 border-slate-300',
  running: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  ready: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  draft: 'bg-slate-100 text-slate-500 border-slate-300',
  aborted: 'bg-orange-100 text-orange-800 border-orange-300',
  error: 'bg-red-100 text-red-700 border-red-300',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${styles[status] ?? styles.PENDING}`}
    >
      {status}
    </span>
  )
}
