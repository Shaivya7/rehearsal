import type { Verdict, RunStatus } from '@/lib/types'

type Status = Verdict | RunStatus

const cfg: Record<string, { dot: string; text: string; border: string }> = {
  PASS:      { dot: 'bg-pass',     text: 'text-pass',    border: 'border-pass/30' },
  FAIL:      { dot: 'bg-fail',     text: 'text-fail',    border: 'border-fail/30' },
  PARTIAL:   { dot: 'bg-partial',  text: 'text-partial', border: 'border-partial/30' },
  ERROR:     { dot: 'bg-ink-3',    text: 'text-ink-3',   border: 'border-rim/50' },
  PENDING:   { dot: 'bg-ink-3',    text: 'text-ink-3',   border: 'border-rim/50' },
  running:   { dot: 'bg-blue',     text: 'text-blue',    border: 'border-blue/30' },
  completed: { dot: 'bg-pass',     text: 'text-pass',    border: 'border-pass/30' },
  ready:     { dot: 'bg-gold',     text: 'text-gold',    border: 'border-gold/30' },
  draft:     { dot: 'bg-ink-3',    text: 'text-ink-3',   border: 'border-rim/50' },
  aborted:   { dot: 'bg-orange',   text: 'text-orange',  border: 'border-orange/30' },
  error:     { dot: 'bg-fail',     text: 'text-fail',    border: 'border-fail/30' },
}

export function StatusBadge({ status }: { status: Status }) {
  const s = cfg[status] ?? cfg.PENDING
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${s.border} bg-surface text-[11px] font-medium font-mono tracking-wide ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === 'running' ? 'pulse-gold' : ''}`} />
      {status}
    </span>
  )
}
