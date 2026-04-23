// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

export async function extractPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return (data.text as string).trim()
}
