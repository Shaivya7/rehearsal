import { NextRequest, NextResponse } from 'next/server'
import { extractPdf } from '@/lib/fileExtraction/extractPdf'
import { extractDocx } from '@/lib/fileExtraction/extractDocx'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    if (file.name.endsWith('.pdf')) {
      text = await extractPdf(buffer)
    } else if (file.name.endsWith('.docx')) {
      text = await extractDocx(buffer)
    } else {
      return NextResponse.json({ error: 'Only PDF and DOCX supported' }, { status: 400 })
    }

    return NextResponse.json({ text })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
