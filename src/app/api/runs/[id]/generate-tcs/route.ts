import { NextRequest, NextResponse } from 'next/server'
import { getRun, saveRun } from '@/lib/blob'
import { generateTestCases } from '@/lib/llm/generateTestCases'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const testCases = await generateTestCases(run.promptText)
  run.testCases = testCases
  run.status = 'ready'
  await saveRun(run)

  return NextResponse.json(testCases)
}
