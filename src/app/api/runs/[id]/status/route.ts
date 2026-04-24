import { NextRequest, NextResponse } from 'next/server'
import { getRun } from '@/lib/blob'
import type { StatusResponse } from '@/lib/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const completedTcs = run.testCases.filter(tc => tc.verdict !== 'PENDING').length
  const currentPending = run.testCases.find(tc => tc.verdict === 'PENDING')

  const done = run.testCases.filter(tc => tc.verdict !== 'PENDING')

  const status: StatusResponse = {
    status: run.status,
    completedTcs,
    totalTcs: run.testCases.length,
    currentTcName: currentPending?.name ?? null,
    passCount: done.filter(tc => tc.verdict === 'PASS').length,
    failCount: done.filter(tc => tc.verdict === 'FAIL').length,
    partialCount: done.filter(tc => tc.verdict === 'PARTIAL').length,
    finishedTestCases: done.map(tc => ({
      id: tc.id,
      name: tc.name,
      verdict: tc.verdict,
      remarks: tc.remarks,
    })),
  }

  return NextResponse.json(status)
}
