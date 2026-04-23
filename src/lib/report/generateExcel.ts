import ExcelJS from 'exceljs'
import type { Run, Verdict } from '../types'

const FILL: Record<Verdict, string> = {
  PASS: 'FF92D050',
  FAIL: 'FFFF0000',
  PARTIAL: 'FFFFC000',
  ERROR: 'FFD3D3D3',
  PENDING: 'FFD3D3D3',
}

function applyHeaderStyle(ws: ExcelJS.Worksheet, rowNum: number, colCount: number) {
  const row = ws.getRow(rowNum)
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { wrapText: true, vertical: 'top' }
  }
}

export async function generateExcel(run: Run): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()

  // --- Sheet 1: Run Summary ---
  const ws1 = wb.addWorksheet('Run Summary')
  ws1.columns = [{ width: 30 }, { width: 50 }]
  const ran = run.testCases.filter(tc => tc.verdict !== 'PENDING')
  const passCount = run.testCases.filter(tc => tc.verdict === 'PASS').length
  const failCount = run.testCases.filter(tc => tc.verdict === 'FAIL').length
  const partialCount = run.testCases.filter(tc => tc.verdict === 'PARTIAL').length
  const errorCount = run.testCases.filter(tc => tc.verdict === 'ERROR').length
  const passRate = ran.length > 0 ? Math.round((passCount / ran.length) * 100) : 0

  const summaryRows = [
    ['Run Name', run.name],
    ['Model', run.model],
    ['Run Timestamp', new Date(run.createdAt).toLocaleString()],
    ['Total TCs', run.testCases.length],
    ['Pass', passCount],
    ['Fail', failCount],
    ['Partial', partialCount],
    ['Error', errorCount],
    ['Pass Rate', `${passRate}%`],
  ]
  summaryRows.forEach(([k, v]) => {
    const row = ws1.addRow([k, v])
    row.getCell(1).font = { bold: true }
  })

  // --- Sheet 2: Test Case Results ---
  const ws2 = wb.addWorksheet('Test Case Results')
  const maxPairs = Math.max(...run.testCases.map(tc => Math.ceil(tc.turns.length / 2)), 1)
  const fixedCols = ['TC ID', 'Test Case Name', 'What Is Tested', 'Pass Criterion']
  const turnCols: string[] = []
  for (let i = 1; i <= maxPairs; i++) {
    turnCols.push(`Agent Turn ${i}`, `Lead Turn ${i}`)
  }
  const allCols = [...fixedCols, ...turnCols, 'Status', 'Remarks']

  ws2.addRow(allCols)
  applyHeaderStyle(ws2, 1, allCols.length)
  ws2.columns = allCols.map((_, i) => ({
    width: i < 4 ? 25 : i >= allCols.length - 2 ? 35 : 45,
  }))

  run.testCases.forEach(tc => {
    const agentTexts = tc.turns.filter(t => t.speaker === 'Agent').map(t => t.text)
    const leadTexts = tc.turns.filter(t => t.speaker === 'Lead').map(t => t.text)
    const interleaved: string[] = []
    for (let i = 0; i < maxPairs; i++) {
      interleaved.push(agentTexts[i] ?? '', leadTexts[i] ?? '')
    }
    const rowData = [
      tc.id,
      tc.name,
      tc.whatIsTested,
      tc.passCriterion,
      ...interleaved,
      tc.verdict,
      tc.remarks ?? '',
    ]
    const row = ws2.addRow(rowData)
    const argb = FILL[tc.verdict] ?? FILL.PENDING
    for (let c = 1; c <= allCols.length; c++) {
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
      row.getCell(c).alignment = { wrapText: true, vertical: 'top' }
    }
  })

  // --- Sheet 3: Full Transcripts ---
  const ws3 = wb.addWorksheet('Full Transcripts')
  const transcriptCols = ['Run Name', 'TC ID', 'TC Name', 'Turn Number', 'Speaker', 'Utterance', 'Timestamp']
  ws3.addRow(transcriptCols)
  applyHeaderStyle(ws3, 1, transcriptCols.length)
  ws3.columns = [
    { width: 20 }, { width: 10 }, { width: 25 },
    { width: 12 }, { width: 10 }, { width: 80 }, { width: 25 },
  ]

  run.testCases.forEach(tc => {
    tc.turns.forEach(turn => {
      const row = ws3.addRow([
        run.name, tc.id, tc.name,
        turn.number, turn.speaker, turn.text, turn.timestamp,
      ])
      row.getCell(6).alignment = { wrapText: true, vertical: 'top' }
    })
  })

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
