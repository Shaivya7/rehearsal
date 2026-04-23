import { put, list, del } from '@vercel/blob'
import type { Run, RunSummary } from './types'

const prefix = 'runs/'

export async function saveRun(run: Run): Promise<void> {
  await put(`${prefix}${run.id}.json`, JSON.stringify(run), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true,
  })
}

export async function getRun(id: string): Promise<Run | null> {
  try {
    const { blobs } = await list({ prefix: `${prefix}${id}.json` })
    if (blobs.length === 0) return null
    const res = await fetch(blobs[0].url)
    if (!res.ok) return null
    return (await res.json()) as Run
  } catch {
    return null
  }
}

export async function listRunSummaries(): Promise<RunSummary[]> {
  const { blobs } = await list({ prefix })
  const summaries: RunSummary[] = []
  for (const blob of blobs) {
    try {
      const res = await fetch(blob.url)
      if (!res.ok) continue
      const run = (await res.json()) as Run
      summaries.push({
        id: run.id,
        name: run.name,
        createdAt: run.createdAt,
        status: run.status,
        totalTcs: run.testCases.length,
        passCount: run.testCases.filter(tc => tc.verdict === 'PASS').length,
        failCount: run.testCases.filter(tc => tc.verdict === 'FAIL').length,
        partialCount: run.testCases.filter(tc => tc.verdict === 'PARTIAL').length,
        errorCount: run.testCases.filter(tc => tc.verdict === 'ERROR').length,
      })
    } catch {
      // skip malformed blobs
    }
  }
  return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function deleteRun(id: string): Promise<void> {
  const { blobs } = await list({ prefix: `${prefix}${id}.json` })
  for (const blob of blobs) await del(blob.url)
}
