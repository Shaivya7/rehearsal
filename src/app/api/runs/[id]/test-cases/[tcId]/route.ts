import { NextRequest, NextResponse } from 'next/server'
import { getRun, saveRun } from '@/lib/blob'

type Params = { params: Promise<{ id: string; tcId: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const { id, tcId } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const idx = run.testCases.findIndex(tc => tc.id === tcId)
  if (idx === -1) return NextResponse.json({ error: 'TC not found' }, { status: 404 })

  const updates = await req.json()
  run.testCases[idx] = { ...run.testCases[idx], ...updates }
  await saveRun(run)
  return NextResponse.json(run.testCases[idx])
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, tcId } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  run.testCases = run.testCases.filter(tc => tc.id !== tcId)
  await saveRun(run)
  return NextResponse.json({ ok: true })
}
