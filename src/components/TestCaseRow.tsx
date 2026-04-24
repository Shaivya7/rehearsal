'use client'
import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Trash2, Check, X } from 'lucide-react'
import type { TestCase } from '@/lib/types'
import { StatusBadge } from './StatusBadge'

interface Props {
  tc: TestCase
  onUpdate: (id: string, updates: Partial<TestCase>) => void
  onDelete: (id: string) => void
}

export function TestCaseRow({ tc, onUpdate, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    name: tc.name,
    whatIsTested: tc.whatIsTested,
    leadBehaviourScript: tc.leadBehaviourScript,
    passCriterion: tc.passCriterion,
  })

  function save() {
    onUpdate(tc.id, draft)
    setEditing(false)
  }
  function cancel() {
    setDraft({ name: tc.name, whatIsTested: tc.whatIsTested, leadBehaviourScript: tc.leadBehaviourScript, passCriterion: tc.passCriterion })
    setEditing(false)
  }

  const inputCls = "w-full bg-elevated border border-rim rounded px-2 py-1 text-xs text-ink font-sans focus:outline-none focus:border-gold/50 transition-colors"
  const textareaCls = `${inputCls} h-20 resize-y`

  return (
    <>
      <tr className={`border-b border-border text-sm transition-colors ${expanded ? 'bg-elevated' : 'hover:bg-surface/60'}`}>
        <td className="px-4 py-3 font-mono text-[11px] text-ink-3 whitespace-nowrap">{tc.id}</td>
        <td className="px-4 py-3">
          {editing ? (
            <input className={inputCls} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          ) : (
            <span className="text-ink font-medium text-[13px]">{tc.name || <span className="text-ink-3 italic">Untitled</span>}</span>
          )}
        </td>
        <td className="px-4 py-3 text-ink-2 text-xs hidden md:table-cell max-w-xs">
          {editing ? (
            <input className={inputCls} value={draft.whatIsTested} onChange={e => setDraft(d => ({ ...d, whatIsTested: e.target.value }))} />
          ) : (
            <span className="line-clamp-2">{tc.whatIsTested}</span>
          )}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={tc.verdict} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 justify-end">
            {editing ? (
              <>
                <button onClick={save} className="p-1.5 rounded text-pass hover:bg-pass/10 transition-colors"><Check size={13} /></button>
                <button onClick={cancel} className="p-1.5 rounded text-ink-3 hover:bg-rim/20 transition-colors"><X size={13} /></button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-rim/20 transition-colors"><Pencil size={13} /></button>
                <button onClick={() => onDelete(tc.id)} className="p-1.5 rounded text-ink-3 hover:text-fail hover:bg-fail/10 transition-colors"><Trash2 size={13} /></button>
                <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-rim/20 transition-colors">
                  {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-border bg-bg">
          <td colSpan={5} className="px-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-xs mb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-3 mb-2">Lead Behaviour Script</p>
                {editing ? (
                  <textarea className={textareaCls} value={draft.leadBehaviourScript} onChange={e => setDraft(d => ({ ...d, leadBehaviourScript: e.target.value }))} />
                ) : (
                  <p className="text-ink-2 leading-relaxed">{tc.leadBehaviourScript || <span className="italic text-ink-3">Not set</span>}</p>
                )}
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-3 mb-2">Pass Criterion</p>
                {editing ? (
                  <textarea className={textareaCls} value={draft.passCriterion} onChange={e => setDraft(d => ({ ...d, passCriterion: e.target.value }))} />
                ) : (
                  <p className="text-ink-2 leading-relaxed">{tc.passCriterion || <span className="italic text-ink-3">Not set</span>}</p>
                )}
              </div>
            </div>

            {tc.turns.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-3 mb-2">
                  Transcript · {tc.turns.length} turns
                </p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto border border-border rounded bg-surface p-3">
                  {tc.turns.map(turn => (
                    <div key={turn.number} className="text-xs flex gap-2">
                      <span className={`shrink-0 font-mono text-[10px] w-20 ${turn.speaker === 'Agent' ? 'text-blue' : 'text-gold'}`}>
                        [{turn.number}] {turn.speaker}
                      </span>
                      <span className="text-ink-2">{turn.text}</span>
                    </div>
                  ))}
                </div>
                {tc.remarks && (
                  <div className="mt-2 text-xs text-ink-2 bg-elevated border border-border rounded p-3 leading-relaxed">
                    <span className="font-mono text-[10px] text-ink-3 uppercase tracking-wider mr-2">Remarks</span>
                    {tc.remarks}
                  </div>
                )}
                {tc.failures && tc.failures.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {tc.failures.map((f, i) => (
                      <li key={i} className="text-xs text-fail font-mono">↳ {f}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
