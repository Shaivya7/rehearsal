import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { saveRun, listRunSummaries } from '@/lib/blob'
import { generateSummary } from '@/lib/llm/generateSummary'
import type { Run } from '@/lib/types'

export async function GET() {
  const summaries = await listRunSummaries()
  return NextResponse.json(summaries)
}

export async function POST(req: NextRequest) {
  const { name, promptText, maxTurns } = await req.json()
  if (!name || !promptText) {
    return NextResponse.json({ error: 'name and promptText required' }, { status: 400 })
  }

  const promptSummary = await generateSummary(promptText)

  const run: Run = {
    id: uuidv4(),
    name,
    createdAt: new Date().toISOString(),
    promptText,
    promptSummary,
    model: 'gpt-4.1-mini',
    maxTurns: Math.min(24, Math.max(6, maxTurns ?? 16)),
    status: 'draft',
    testCases: [],
  }

  await saveRun(run)
  return NextResponse.json(run, { status: 201 })
}
