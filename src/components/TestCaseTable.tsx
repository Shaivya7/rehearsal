'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { TestCase } from '@/lib/types'
import { TestCaseRow } from './TestCaseRow'

interface Props {
  runId: string
  initialTcs: TestCase[]
}

export function TestCaseTable({ runId, initialTcs }: Props) {
  const [tcs, setTcs] = useState<TestCase[]>(initialTcs)

  async function handleUpdate(id: string, updates: Partial<TestCase>) {
    await fetch(`/api/runs/${runId}/test-cases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setTcs(prev => prev.map(tc => (tc.id === id ? { ...tc, ...updates } : tc)))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this test case?')) return
    await fetch(`/api/runs/${runId}/test-cases/${id}`, { method: 'DELETE' })
    setTcs(prev => prev.filter(tc => tc.id !== id))
  }

  async function handleAdd() {
    const res = await fetch(`/api/runs/${runId}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Test Case',
        whatIsTested: '',
        leadBehaviourScript: '',
        passCriterion: '',
      }),
    })
    const tc = await res.json()
    setTcs(prev => [...prev, tc])
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {tcs.length === 0 ? (
        <div className="py-14 text-center">
          <p className="font-display text-lg font-light text-ink-3 mb-1">No test cases yet</p>
          <p className="text-xs text-ink-3 mb-5">
            Generate from the prompt above, or add one manually.
          </p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 text-sm text-gold border border-gold/30 rounded px-4 py-2 hover:bg-gold/10 transition-colors font-medium"
          >
            <Plus size={14} /> Add Test Case
          </button>
        </div>
      ) : (
        <>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-ink-3 w-20">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-ink-3">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-ink-3 hidden md:table-cell">
                  What Is Tested
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-ink-3 w-28">
                  Status
                </th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {tcs.map(tc => (
                <TestCaseRow
                  key={tc.id}
                  tc={tc}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 text-xs font-mono text-ink-3 hover:text-gold border border-dashed border-border hover:border-gold/40 rounded px-3 py-1.5 transition-colors duration-150"
            >
              <Plus size={12} /> Add Test Case
            </button>
            <Link
              href={`/runs/${runId}/execute`}
              className="flex items-center gap-1.5 bg-gold text-bg text-xs font-semibold px-4 py-1.5 rounded hover:bg-gold/90 transition-colors"
            >
              Run All ({tcs.length}) →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
