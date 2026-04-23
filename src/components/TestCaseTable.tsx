'use client'
import { useState } from 'react'
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
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-600 text-xs uppercase tracking-wide">
              <th className="px-3 py-2 w-20">ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">What Is Tested</th>
              <th className="px-3 py-2 w-28">Status</th>
              <th className="px-3 py-2 w-28">Actions</th>
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
      </div>
      <div className="px-3 py-2 border-t">
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 border border-dashed border-slate-300 rounded px-3 py-1.5 hover:border-slate-500 transition-colors"
        >
          <Plus size={14} /> Add Test Case
        </button>
      </div>
    </div>
  )
}
