import { NextRequest, NextResponse } from 'next/server'
import { getRun, saveRun } from '@/lib/blob'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  run.status = 'aborted'
  await saveRun(run)
  return NextResponse.json({ aborted: true })
}
