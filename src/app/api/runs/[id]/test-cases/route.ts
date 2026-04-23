import { NextRequest, NextResponse } from 'next/server'
import { getRun, saveRun } from '@/lib/blob'
import type { TestCase } from '@/lib/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const tc: TestCase = {
    id: `TC-${run.testCases.length + 1}`,
    name: body.name ?? '',
    whatIsTested: body.whatIsTested ?? '',
    leadBehaviourScript: body.leadBehaviourScript ?? '',
    passCriterion: body.passCriterion ?? '',
    source: 'manual',
    turns: [],
    verdict: 'PENDING',
  }

  run.testCases.push(tc)
  await saveRun(run)
  return NextResponse.json(tc, { status: 201 })
}
