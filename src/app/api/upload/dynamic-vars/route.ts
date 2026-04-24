import { NextRequest, NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/png'

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            {
              type: 'text',
              text: 'Extract all dynamic variable definitions from this screenshot. List each as "variable_name: value" on its own line. Return only the variable list with no extra explanation.',
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const variables = response.choices[0].message.content?.trim() ?? ''
    return NextResponse.json({ variables })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
