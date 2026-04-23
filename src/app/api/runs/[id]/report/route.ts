import { NextRequest, NextResponse } from 'next/server'
import { getRun } from '@/lib/blob'
import { generateExcel } from '@/lib/report/generateExcel'

export const maxDuration = 120

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buffer = await generateExcel(run)
  const safeName = run.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const filename = `rehearsal-${safeName}-${id.slice(0, 8)}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
