import Link from 'next/link'
import { Plus, FileText, Cpu, FlaskConical, CheckCircle, ArrowRight, Mic, GitBranch, Zap, Shield } from 'lucide-react'
import { listRunSummaries } from '@/lib/blob'
import { RunCard } from '@/components/RunCard'

export const dynamic = 'force-dynamic'

const steps = [
  {
    n: '01',
    icon: FileText,
    title: 'Paste your bot prompt',
    body: 'Drop in your AI voice bot system prompt — the same one running in production. Optionally add a greeting, dynamic variables, and a lead persona description.',
  },
  {
    n: '02',
    icon: Cpu,
    title: 'Generate test cases',
    body: 'Rehearsal reads your prompt and auto-generates diverse test cases covering happy paths, objections, edge cases, and failure modes. Add custom instructions to steer coverage.',
  },
  {
    n: '03',
    icon: FlaskConical,
    title: 'Simulate conversations',
    body: 'Each test case runs as a full multi-turn conversation. The agent follows your prompt; an LLM-powered lead persona responds realistically. Calls end on hangup or transfer.',
  },
  {
    n: '04',
    icon: CheckCircle,
    title: 'Get pass / fail verdicts',
    body: 'Every conversation is evaluated against its test objective. You get a PASS, FAIL, or PARTIAL verdict with a one-line reason — so you know exactly what to fix before going live.',
  },
]

const capabilities = [
  { icon: Mic, label: 'Voice bot prompt testing' },
  { icon: GitBranch, label: 'Multi-turn conversation simulation' },
  { icon: Zap, label: 'Auto-generated test cases' },
  { icon: Shield, label: 'Pass / Fail / Partial verdicts' },
  { icon: FileText, label: 'Dynamic variable injection' },
  { icon: Cpu, label: 'LLM-powered lead persona' },
]

export default async function HomePage() {
  let runs: Awaited<ReturnType<typeof listRunSummaries>> = []
  try {
    runs = await listRunSummaries()
  } catch {
    // Blob not yet configured
  }

  return (
    <div>
      {/* ── Hero ── */}
      <div className="fade-up mb-16">
        <p className="text-[11px] font-mono text-ink-3 uppercase tracking-widest mb-3">
          What is Rehearsal?
        </p>
        <h1 className="font-display text-4xl font-light text-ink tracking-tight mb-4 max-w-xl leading-snug">
          Test your AI voice bot<br />before it talks to a real lead.
        </h1>
        <p className="text-sm text-ink-2 max-w-lg leading-relaxed">
          Rehearsal simulates full lead conversations against your bot prompt, runs auto-generated
          test cases, and gives you verdict-level confidence — so nothing breaks in production.
        </p>
      </div>

      {/* ── How it works ── */}
      <div className="fade-up delay-1 mb-16">
        <p className="text-[11px] font-mono text-ink-3 uppercase tracking-widest mb-8">
          How it works
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-lg overflow-hidden">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.n} className="bg-surface p-6 relative group">
                {/* Step connector arrow */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center bg-surface">
                    <ArrowRight size={12} className="text-ink-3" />
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-[10px] text-ink-3">{step.n}</span>
                  <div className="w-7 h-7 rounded bg-elevated flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-gold" />
                  </div>
                </div>

                <h3 className="font-display text-base font-light text-ink mb-2 leading-snug">
                  {step.title}
                </h3>
                <p className="text-[12px] text-ink-2 leading-relaxed">
                  {step.body}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Capabilities ── */}
      <div className="fade-up delay-2 mb-16">
        <p className="text-[11px] font-mono text-ink-3 uppercase tracking-widest mb-6">
          Capabilities
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {capabilities.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3"
            >
              <Icon size={14} className="text-gold shrink-0" />
              <span className="text-[12px] text-ink-2">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Runs ── */}
      <div className="fade-up delay-3">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[11px] font-mono text-ink-3 uppercase tracking-widest mb-1">
              Dashboard
            </p>
            <h2 className="font-display text-2xl font-light text-ink tracking-tight">
              Test Runs
            </h2>
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
          <div className="border border-dashed border-border rounded-lg py-20 text-center">
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
              <div key={run.id} className={`fade-up delay-${Math.min(i + 1, 4)}`}>
                <RunCard run={run} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
