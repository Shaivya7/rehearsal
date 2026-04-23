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
    setDraft({
      name: tc.name,
      whatIsTested: tc.whatIsTested,
      leadBehaviourScript: tc.leadBehaviourScript,
      passCriterion: tc.passCriterion,
    })
    setEditing(false)
  }

  return (
    <>
      <tr className="border-b hover:bg-slate-50 text-sm">
        <td className="px-3 py-2 text-slate-500 font-mono text-xs whitespace-nowrap">{tc.id}</td>
        <td className="px-3 py-2">
          {editing ? (
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            />
          ) : (
            <span className="font-medium">{tc.name}</span>
          )}
        </td>
        <td className="px-3 py-2 text-slate-600 max-w-xs">
          {editing ? (
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={draft.whatIsTested}
              onChange={e => setDraft(d => ({ ...d, whatIsTested: e.target.value }))}
            />
          ) : (
            tc.whatIsTested
          )}
        </td>
        <td className="px-3 py-2">
          <StatusBadge status={tc.verdict} />
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <button
                  onClick={save}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={cancel}
                  className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onDelete(tc.id)}
                  className="p-1 text-red-400 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                  title="Expand"
                >
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-slate-50 border-b">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-slate-700 mb-1">Lead Behaviour Script</p>
                {editing ? (
                  <textarea
                    className="w-full border rounded px-2 py-1 text-sm h-24 resize-y"
                    value={draft.leadBehaviourScript}
                    onChange={e =>
                      setDraft(d => ({ ...d, leadBehaviourScript: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-slate-600 leading-relaxed">{tc.leadBehaviourScript}</p>
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-700 mb-1">Pass Criterion</p>
                {editing ? (
                  <textarea
                    className="w-full border rounded px-2 py-1 text-sm h-24 resize-y"
                    value={draft.passCriterion}
                    onChange={e =>
                      setDraft(d => ({ ...d, passCriterion: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-slate-600 leading-relaxed">{tc.passCriterion}</p>
                )}
              </div>
            </div>

            {tc.turns.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold text-slate-700 mb-1 text-sm">
                  Transcript ({tc.turns.length} turns)
                </p>
                <div className="space-y-1 max-h-52 overflow-y-auto border rounded bg-white p-2">
                  {tc.turns.map(turn => (
                    <div key={turn.number} className="text-xs">
                      <span
                        className={`font-semibold mr-2 ${
                          turn.speaker === 'Agent' ? 'text-blue-700' : 'text-slate-600'
                        }`}
                      >
                        [{turn.number}] {turn.speaker}:
                      </span>
                      <span className="text-slate-700">{turn.text}</span>
                    </div>
                  ))}
                </div>
                {tc.remarks && (
                  <p className="mt-2 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded p-2">
                    <span className="font-semibold">Remarks: </span>
                    {tc.remarks}
                  </p>
                )}
                {tc.failures && tc.failures.length > 0 && (
                  <ul className="mt-1 text-xs text-red-700 list-disc list-inside">
                    {tc.failures.map((f, i) => (
                      <li key={i}>{f}</li>
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
