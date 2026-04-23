import { NextRequest, NextResponse } from 'next/server'
import { getRun, saveRun } from '@/lib/blob'
import { executeTestCase } from '@/lib/execution/executeTestCase'

export const maxDuration = 300

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (run.status === 'aborted') {
    return NextResponse.json({ done: true, aborted: true })
  }

  const pendingTc = run.testCases.find(tc => tc.verdict === 'PENDING')
  if (!pendingTc) {
    run.status = 'completed'
    await saveRun(run)
    return NextResponse.json({ done: true, completed: true })
  }

  run.status = 'running'
  await saveRun(run)

  const completedTc = await executeTestCase(run, pendingTc)

  const idx = run.testCases.findIndex(tc => tc.id === pendingTc.id)
  run.testCases[idx] = completedTc

  const allDone = run.testCases.every(tc => tc.verdict !== 'PENDING')
  run.status = allDone ? 'completed' : 'running'

  await saveRun(run)
  return NextResponse.json({ done: allDone, tc: completedTc })
}
