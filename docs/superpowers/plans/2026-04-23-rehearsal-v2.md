# Rehearsal v2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Rehearsal — a web QA tool that imports a conversational bot prompt, generates test cases from it, simulates multi-turn Agent/Lead conversations using gpt-4.1-mini, and produces Pass/Fail/Partial verdicts with a downloadable Excel report.

**Architecture:** Next.js 15 App Router on Vercel. Run state stored in Vercel Blob as JSON files. Client-side polling drives sequential TC execution (one TC per `/api/runs/[id]/execute-next` call, server-side, ~60s per TC, well within Vercel's 300s limit). No auth, no database.

**Tech Stack:** Next.js 15 (App Router, TypeScript strict), Tailwind CSS v4, OpenAI SDK (`gpt-4.1-mini` for all LLM calls), `@vercel/blob`, `exceljs`, `mammoth`, `pdf-parse`, `lucide-react`, `uuid`, `papaparse`

---

## File Map

```
src/
  app/
    layout.tsx                        # Root layout, nav
    page.tsx                          # Home: list of runs
    globals.css                       # Tailwind base + custom
    runs/
      new/page.tsx                    # Prompt import + run creation
      [id]/page.tsx                   # Run detail: prompt summary + TC table
      [id]/execute/page.tsx           # Execution view (polling driver)
      [id]/results/page.tsx           # Results dashboard + download
    api/
      runs/
        route.ts                      # GET list, POST create+summary
        [id]/
          route.ts                    # GET full run
          generate-tcs/route.ts       # POST generate test cases
          test-cases/
            route.ts                  # POST add manual TC
            [tcId]/route.ts           # PUT edit, DELETE remove TC
          execute-next/route.ts       # POST run next pending TC to completion
          status/route.ts             # GET {status, completed, total, currentTc}
          abort/route.ts              # POST mark run as aborted
          report/route.ts             # GET stream .xlsx download
      upload/
        prompt/route.ts               # POST PDF/DOCX → extracted text
  lib/
    types.ts                          # All TypeScript interfaces
    openai.ts                         # OpenAI client singleton + retry helper
    blob.ts                           # getRun, saveRun, listRuns
    llm/
      generateSummary.ts
      generateTestCases.ts
      agentTurn.ts
      leadPersonaTurn.ts
      analyseTranscript.ts
    execution/
      executeTestCase.ts              # Runs one TC: turn loop + analysis
    report/
      generateExcel.ts                # Builds 3-sheet .xlsx
    fileExtraction/
      extractPdf.ts
      extractDocx.ts
  components/
    RunCard.tsx                       # Summary card on home page
    PromptImport.tsx                  # Paste / upload UI
    TestCaseTable.tsx                 # TC list with inline editing
    TestCaseRow.tsx                   # Single row: expand, edit, delete
    ExecutionPoller.tsx               # Client component — drives polling loop
    StatusBadge.tsx                   # PASS/FAIL/PARTIAL/ERROR/PENDING badge
    ResultsSummary.tsx                # Metric cards (pass rate, counts)
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.env.local`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Scaffold Next.js app inside the Rehearsal folder**

```bash
cd /Users/shaivya.bora/Desktop/Rehearsal
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint --yes
```

Expected: Next.js 15 project created in current directory. `src/app/` exists.

- [ ] **Step 2: Install all dependencies**

```bash
cd /Users/shaivya.bora/Desktop/Rehearsal
npm install openai @vercel/blob exceljs mammoth pdf-parse uuid papaparse lucide-react
npm install --save-dev @types/uuid @types/papaparse @types/pdf-parse @types/mammoth
```

Expected: All packages in node_modules. No peer dep errors.

- [ ] **Step 3: Create `.env.local`**

```bash
cat > .env.local << 'EOF'
OPENAI_API_KEY=sk-replace-me
BLOB_READ_WRITE_TOKEN=replace-after-vercel-link
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 4: Update `next.config.ts` to allow large uploads and long API timeouts**

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  experimental: {
    serverActions: { bodySizeLimit: '20mb' },
  },
}

export default nextConfig
```

- [ ] **Step 5: Replace `src/app/globals.css`**

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #0f172a;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, sans-serif;
}

.font-mono {
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
}
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts on http://localhost:3000. Default Next.js page loads.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 app for Rehearsal v2"
```

---

## Task 2: Core TypeScript Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write `src/lib/types.ts` with all interfaces**

```typescript
// src/lib/types.ts

export type Verdict = 'PASS' | 'FAIL' | 'PARTIAL' | 'ERROR' | 'PENDING'
export type RunStatus = 'draft' | 'ready' | 'running' | 'completed' | 'aborted' | 'error'
export type TcSource = 'generated' | 'imported' | 'manual'

export interface Turn {
  number: number
  speaker: 'Agent' | 'Lead'
  text: string
  timestamp: string
  tokens?: number
}

export interface TestCase {
  id: string
  name: string
  whatIsTested: string
  leadBehaviourScript: string
  passCriterion: string
  source: TcSource
  turns: Turn[]
  verdict: Verdict
  remarks?: string
  failures?: string[]
}

export interface Run {
  id: string
  name: string
  createdAt: string
  promptText: string
  promptSummary: string
  model: string
  maxTurns: number
  status: RunStatus
  testCases: TestCase[]
}

export interface RunSummary {
  id: string
  name: string
  createdAt: string
  status: RunStatus
  totalTcs: number
  passCount: number
  failCount: number
  partialCount: number
  errorCount: number
}

export interface AnalysisResult {
  verdict: Verdict
  remarks: string
  failures: string[]
}

export interface StatusResponse {
  status: RunStatus
  completedTcs: number
  totalTcs: number
  currentTcName: string | null
  passCount: number
  failCount: number
  partialCount: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add core TypeScript types"
```

---

## Task 3: Vercel Blob Store

**Files:**
- Create: `src/lib/blob.ts`

Vercel Blob stores run state as `runs/{id}.json`. All reads and writes go through this module.

- [ ] **Step 1: Write `src/lib/blob.ts`**

```typescript
// src/lib/blob.ts
import { put, get, list, del } from '@vercel/blob'
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/blob.ts
git commit -m "feat: add Vercel Blob store helpers"
```

---

## Task 4: OpenAI Client + Retry

**Files:**
- Create: `src/lib/openai.ts`

- [ ] **Step 1: Write `src/lib/openai.ts`**

```typescript
// src/lib/openai.ts
import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set')
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const MODEL = 'gpt-4.1-mini'

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
      }
    }
  }
  throw lastError
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/openai.ts
git commit -m "feat: add OpenAI client singleton with retry helper"
```

---

## Task 5: File Extraction (PDF + DOCX)

**Files:**
- Create: `src/lib/fileExtraction/extractPdf.ts`
- Create: `src/lib/fileExtraction/extractDocx.ts`

- [ ] **Step 1: Write `src/lib/fileExtraction/extractPdf.ts`**

```typescript
// src/lib/fileExtraction/extractPdf.ts
import pdfParse from 'pdf-parse'

export async function extractPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text.trim()
}
```

- [ ] **Step 2: Write `src/lib/fileExtraction/extractDocx.ts`**

```typescript
// src/lib/fileExtraction/extractDocx.ts
import mammoth from 'mammoth'

export async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value.trim()
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/fileExtraction/
git commit -m "feat: add PDF and DOCX text extraction"
```

---

## Task 6: LLM Functions

**Files:**
- Create: `src/lib/llm/generateSummary.ts`
- Create: `src/lib/llm/generateTestCases.ts`
- Create: `src/lib/llm/agentTurn.ts`
- Create: `src/lib/llm/leadPersonaTurn.ts`
- Create: `src/lib/llm/analyseTranscript.ts`

These use the exact prompt templates from the PRD.

- [ ] **Step 1: Write `src/lib/llm/generateSummary.ts`**

```typescript
// src/lib/llm/generateSummary.ts
import { openai, MODEL, withRetry } from '../openai'

export async function generateSummary(promptText: string): Promise<string> {
  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            "You are a QA engineer. Summarise what this bot does in 3–5 sentences, including its purpose, tone, language, and any notable behavioural rules.",
        },
        { role: 'user', content: promptText },
      ],
      temperature: 0.2,
    })
  )
  return response.choices[0].message.content?.trim() ?? ''
}
```

- [ ] **Step 2: Write `src/lib/llm/generateTestCases.ts`**

```typescript
// src/lib/llm/generateTestCases.ts
import { openai, MODEL, withRetry } from '../openai'
import type { TestCase } from '../types'

const SYSTEM_PROMPT = `You are a senior QA engineer who specialises in testing AI conversational agents. You have been given the complete system prompt for an AI agent. Your job is to generate a comprehensive set of test cases that will verify whether the LLM running this prompt is correctly following its instructions.

RULES FOR TEST CASE GENERATION:
- Read the entire prompt carefully before generating any test cases.
- Generate ONLY test cases that are warranted by THIS specific prompt. Do not apply generic templates. If the prompt has no rebuttal chain, do not generate a rebuttal test. If the prompt has no language-switching rule, do not generate a language-switching test.
- Every test case must have a pass criterion that is directly traceable to a specific instruction or rule in the prompt. Quote or closely paraphrase the relevant instruction in the pass criterion.
- Cover: happy paths, edge cases, boundary conditions, potential failure modes, and any prompt-specific guardrails you identify.
- The lead behaviour script is a natural-language description — NOT pre-written dialogue. It tells the persona engine how the lead should behave, not what to say.
- Test case names must be specific (e.g., 'PIN refusal — second rebuttal'), not generic (e.g., 'Refusal Test').

RETURN FORMAT:
Return a JSON array. No markdown, no explanation, just the raw JSON array. Each object in the array must have exactly these fields:
{
  "id": "TC-1",
  "name": "short specific label",
  "whatIsTested": "one sentence",
  "leadBehaviourScript": "natural language description of lead behaviour",
  "passCriterion": "condition(s) for pass, citing the prompt",
  "source": "generated"
}`

export async function generateTestCases(promptText: string): Promise<TestCase[]> {
  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Here is the bot prompt to analyse:\n---\n${promptText}\n---\nGenerate all test cases.`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })
  )

  const raw = response.choices[0].message.content ?? '[]'

  // Handle both {testCases: [...]} and [...] shapes
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown[]>)[Object.keys(parsed as object)[0]] ?? []

  return (arr as Partial<TestCase>[]).map((tc, i) => ({
    id: tc.id ?? `TC-${i + 1}`,
    name: tc.name ?? '',
    whatIsTested: tc.whatIsTested ?? '',
    leadBehaviourScript: tc.leadBehaviourScript ?? '',
    passCriterion: tc.passCriterion ?? '',
    source: 'generated' as const,
    turns: [],
    verdict: 'PENDING' as const,
  }))
}
```

- [ ] **Step 3: Write `src/lib/llm/agentTurn.ts`**

```typescript
// src/lib/llm/agentTurn.ts
import { openai, MODEL, withRetry } from '../openai'
import type { Turn } from '../types'

export async function agentTurn(
  botPrompt: string,
  history: Turn[]
): Promise<{ text: string; tokens: number }> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: botPrompt },
    ...history.map(t => ({
      role: t.speaker === 'Lead' ? ('user' as const) : ('assistant' as const),
      content: t.text,
    })),
  ]

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.3,
    })
  )

  return {
    text: response.choices[0].message.content?.trim() ?? '',
    tokens: response.usage?.total_tokens ?? 0,
  }
}

// Fix missing import
import OpenAI from 'openai'
```

- [ ] **Step 4: Write `src/lib/llm/leadPersonaTurn.ts`**

```typescript
// src/lib/llm/leadPersonaTurn.ts
import { openai, MODEL, withRetry } from '../openai'
import type { Turn } from '../types'

const PERSONA_SYSTEM = `You are playing the role of a human speaking to an AI agent. The agent is running a specific script/prompt. Your job is to respond naturally, as a real person would in this type of interaction.

PERSONA RULES:
- Match the language and register of the conversation. If the agent speaks Hindi-English, respond in Hindi-English. If formal English, respond formally. Mirror whatever language/tone context the agent sets.
- Keep your responses brief: 1–3 sentences, sometimes just a word or phrase.
- Be realistic: real humans are sometimes ambiguous, use fillers (hmm, okay, achha), ask unexpected questions, or give partial information.
- Follow the BEHAVIOUR SCRIPT for this test case — it tells you how to behave at key decision points. Do not rigidly pre-plan every word; let the conversation flow naturally while staying true to the script.
- Do NOT go off-script in ways that would make the test invalid.
- Do NOT play the agent's role. You are always the human.`

export async function leadPersonaTurn(
  leadBehaviourScript: string,
  history: Turn[]
): Promise<{ text: string; tokens: number }> {
  const historyText = history
    .map(t => `${t.speaker}: ${t.text}`)
    .join('\n')

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `${PERSONA_SYSTEM}\n\nBEHAVIOUR SCRIPT FOR THIS TEST CASE:\n${leadBehaviourScript}\n\nCONVERSATION HISTORY:\n${historyText}`,
        },
        {
          role: 'user',
          content: 'Respond as the human lead. One response only. No stage directions. No quotation marks.',
        },
      ],
      temperature: 0.7,
    })
  )

  return {
    text: response.choices[0].message.content?.trim() ?? '',
    tokens: response.usage?.total_tokens ?? 0,
  }
}
```

- [ ] **Step 5: Write `src/lib/llm/analyseTranscript.ts`**

```typescript
// src/lib/llm/analyseTranscript.ts
import { openai, MODEL, withRetry } from '../openai'
import type { TestCase, Turn, AnalysisResult } from '../types'

const SYSTEM_PROMPT = `You are evaluating whether an AI agent correctly followed its system prompt during a simulated conversation. Your job is to:
1. Read the agent's system prompt and understand its instructions precisely.
2. Read the test case: what was being tested, how the lead was scripted to behave, and what the pass criterion says.
3. Read the full conversation transcript turn by turn.
4. Determine the verdict: PASS, FAIL, or PARTIAL.
5. Write a remark that explains your verdict in plain English, citing specific turn numbers for any failures.
6. List specific failures (if any) as an array of short strings.

VERDICT RULES:
- PASS: The pass criterion was met AND the agent did not violate any explicit instruction in its system prompt.
- FAIL: The pass criterion was NOT met, OR the agent violated an explicit instruction in its system prompt (even if the criterion was technically met).
- PARTIAL: The pass criterion was mostly met, but secondary behaviours were incorrect (e.g., returned to the wrong field after a FAQ, or used a slightly wrong closing).

RETURN FORMAT: Return raw JSON only. No markdown.
{"verdict":"PASS"|"FAIL"|"PARTIAL","remarks":"plain English explanation with turn citations","failures":["specific failure 1 (Turn N)"]}`

export async function analyseTranscript(
  promptText: string,
  tc: TestCase,
  turns: Turn[]
): Promise<AnalysisResult> {
  const transcriptText = turns
    .map(t => `Turn ${t.number} [${t.speaker}]: ${t.text}`)
    .join('\n')

  const userContent = `BOT SYSTEM PROMPT:\n---\n${promptText}\n---\n\nTEST CASE:\nName: ${tc.name}\nWhat is being tested: ${tc.whatIsTested}\nLead behaviour script: ${tc.leadBehaviourScript}\nPass criterion: ${tc.passCriterion}\n---\n\nTRANSCRIPT:\n${transcriptText}\n---\n\nEvaluate and return JSON.`

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })
  )

  try {
    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    return {
      verdict: parsed.verdict ?? 'ERROR',
      remarks: parsed.remarks ?? '',
      failures: parsed.failures ?? [],
    }
  } catch {
    return { verdict: 'ERROR', remarks: 'Analysis failed to parse', failures: [] }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/llm/
git commit -m "feat: add all five LLM functions with PRD prompt templates"
```

---

## Task 7: Execution Engine

**Files:**
- Create: `src/lib/execution/executeTestCase.ts`

This function runs ONE TestCase to completion: alternates Agent→Lead turns until maxTurns is reached or agent closes, then calls analysis.

- [ ] **Step 1: Write `src/lib/execution/executeTestCase.ts`**

```typescript
// src/lib/execution/executeTestCase.ts
import { agentTurn } from '../llm/agentTurn'
import { leadPersonaTurn } from '../llm/leadPersonaTurn'
import { analyseTranscript } from '../llm/analyseTranscript'
import type { Run, TestCase, Turn } from '../types'

// Heuristic: detect if agent has issued a closing action
function isClosingTurn(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('transfer') ||
    lower.includes('connecting you') ||
    lower.includes('hang up') ||
    lower.includes('goodbye') ||
    lower.includes('thank you for your time') ||
    lower.includes('have a great day') ||
    lower.includes('take care')
  )
}

export async function executeTestCase(run: Run, tc: TestCase): Promise<TestCase> {
  const turns: Turn[] = []
  let turnNumber = 1

  try {
    // First turn is always Agent
    while (turnNumber <= run.maxTurns * 2) {
      const isAgentTurn = turnNumber % 2 === 1

      if (isAgentTurn) {
        const { text, tokens } = await agentTurn(run.promptText, turns)
        turns.push({
          number: turnNumber,
          speaker: 'Agent',
          text,
          timestamp: new Date().toISOString(),
          tokens,
        })

        // Check if agent has closed the conversation
        if (isClosingTurn(text) && turnNumber > 1) {
          break
        }
      } else {
        const { text, tokens } = await leadPersonaTurn(tc.leadBehaviourScript, turns)
        turns.push({
          number: turnNumber,
          speaker: 'Lead',
          text,
          timestamp: new Date().toISOString(),
          tokens,
        })
      }

      turnNumber++
    }

    // Run analysis
    const analysis = await analyseTranscript(run.promptText, tc, turns)

    return {
      ...tc,
      turns,
      verdict: analysis.verdict,
      remarks: analysis.remarks,
      failures: analysis.failures,
    }
  } catch (err) {
    return {
      ...tc,
      turns,
      verdict: 'ERROR',
      remarks: `Execution failed: ${err instanceof Error ? err.message : String(err)}`,
      failures: [],
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/execution/
git commit -m "feat: add TC execution engine with turn loop and analysis"
```

---

## Task 8: Excel Report Generator

**Files:**
- Create: `src/lib/report/generateExcel.ts`

Produces a 3-sheet .xlsx matching the PRD spec: Summary, Test Case Results, Full Transcripts.

- [ ] **Step 1: Write `src/lib/report/generateExcel.ts`**

```typescript
// src/lib/report/generateExcel.ts
import ExcelJS from 'exceljs'
import type { Run } from '../types'

const COLORS = {
  PASS: 'FF92D050',
  FAIL: 'FFFF0000',
  PARTIAL: 'FFFFC000',
  ERROR: 'FFD3D3D3',
  PENDING: 'FFD3D3D3',
  header: 'FF1F3864',
}

function headerStyle(ws: ExcelJS.Worksheet, row: number, cols: number) {
  for (let c = 1; c <= cols; c++) {
    const cell = ws.getRow(row).getCell(c)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { wrapText: true, vertical: 'top' }
  }
}

export async function generateExcel(run: Run): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()

  // --- Sheet 1: Run Summary ---
  const ws1 = wb.addWorksheet('Run Summary')
  ws1.columns = [{ width: 30 }, { width: 50 }]
  const summaryData = [
    ['Run Name', run.name],
    ['Prompt Name', run.name],
    ['Model', run.model],
    ['Run Timestamp', run.createdAt],
    ['Total TCs', run.testCases.length],
    ['Pass', run.testCases.filter(tc => tc.verdict === 'PASS').length],
    ['Fail', run.testCases.filter(tc => tc.verdict === 'FAIL').length],
    ['Partial', run.testCases.filter(tc => tc.verdict === 'PARTIAL').length],
    ['Error', run.testCases.filter(tc => tc.verdict === 'ERROR').length],
    [
      'Pass Rate',
      `${Math.round(
        (run.testCases.filter(tc => tc.verdict === 'PASS').length /
          Math.max(run.testCases.filter(tc => tc.verdict !== 'PENDING').length, 1)) *
          100
      )}%`,
    ],
  ]
  summaryData.forEach(([k, v]) => {
    const row = ws1.addRow([k, v])
    row.getCell(1).font = { bold: true }
  })

  // --- Sheet 2: Test Case Results ---
  const ws2 = wb.addWorksheet('Test Case Results')

  // Determine max agent/lead turns
  const maxTurns = Math.max(...run.testCases.map(tc => Math.ceil(tc.turns.length / 2)), 1)
  const fixedCols = ['TC ID', 'Test Case Name', 'What Is Tested', 'Pass Criterion']
  const turnCols: string[] = []
  for (let i = 1; i <= maxTurns; i++) {
    turnCols.push(`Agent Turn ${i}`, `Lead Turn ${i}`)
  }
  const trailCols = ['Status', 'Remarks']
  const allCols = [...fixedCols, ...turnCols, ...trailCols]

  ws2.addRow(allCols)
  headerStyle(ws2, 1, allCols.length)
  ws2.columns = allCols.map((_, i) => ({
    width: i < 4 ? 25 : i >= allCols.length - 2 ? 30 : 40,
  }))

  run.testCases.forEach(tc => {
    const agentTurns = tc.turns.filter(t => t.speaker === 'Agent').map(t => t.text)
    const leadTurns = tc.turns.filter(t => t.speaker === 'Lead').map(t => t.text)
    const interleaved: string[] = []
    for (let i = 0; i < maxTurns; i++) {
      interleaved.push(agentTurns[i] ?? '', leadTurns[i] ?? '')
    }
    const rowData = [tc.id, tc.name, tc.whatIsTested, tc.passCriterion, ...interleaved, tc.verdict, tc.remarks ?? '']
    const row = ws2.addRow(rowData)

    const color = COLORS[tc.verdict] ?? COLORS.PENDING
    for (let c = 1; c <= allCols.length; c++) {
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
      row.getCell(c).alignment = { wrapText: true, vertical: 'top' }
    }
  })

  // --- Sheet 3: Full Transcripts ---
  const ws3 = wb.addWorksheet('Full Transcripts')
  const transcriptCols = ['Run Name', 'TC ID', 'TC Name', 'Turn Number', 'Speaker', 'Utterance', 'Timestamp']
  ws3.addRow(transcriptCols)
  headerStyle(ws3, 1, transcriptCols.length)
  ws3.columns = [{ width: 20 }, { width: 10 }, { width: 25 }, { width: 12 }, { width: 10 }, { width: 80 }, { width: 25 }]

  run.testCases.forEach(tc => {
    tc.turns.forEach(turn => {
      const row = ws3.addRow([run.name, tc.id, tc.name, turn.number, turn.speaker, turn.text, turn.timestamp])
      row.getCell(6).alignment = { wrapText: true, vertical: 'top' }
    })
  })

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/report/
git commit -m "feat: add 3-sheet Excel report generator"
```

---

## Task 9: API Routes

**Files:**
- Create: `src/app/api/upload/prompt/route.ts`
- Create: `src/app/api/runs/route.ts`
- Create: `src/app/api/runs/[id]/route.ts`
- Create: `src/app/api/runs/[id]/generate-tcs/route.ts`
- Create: `src/app/api/runs/[id]/test-cases/route.ts`
- Create: `src/app/api/runs/[id]/test-cases/[tcId]/route.ts`
- Create: `src/app/api/runs/[id]/execute-next/route.ts`
- Create: `src/app/api/runs/[id]/status/route.ts`
- Create: `src/app/api/runs/[id]/abort/route.ts`
- Create: `src/app/api/runs/[id]/report/route.ts`

- [ ] **Step 1: Write `src/app/api/upload/prompt/route.ts`**

```typescript
// src/app/api/upload/prompt/route.ts
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
```

- [ ] **Step 2: Write `src/app/api/runs/route.ts`**

```typescript
// src/app/api/runs/route.ts
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
    maxTurns: maxTurns ?? 16,
    status: 'draft',
    testCases: [],
  }

  await saveRun(run)
  return NextResponse.json(run, { status: 201 })
}
```

- [ ] **Step 3: Write `src/app/api/runs/[id]/route.ts`**

```typescript
// src/app/api/runs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRun } from '@/lib/blob'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(run)
}
```

- [ ] **Step 4: Write `src/app/api/runs/[id]/generate-tcs/route.ts`**

```typescript
// src/app/api/runs/[id]/generate-tcs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRun, saveRun } from '@/lib/blob'
import { generateTestCases } from '@/lib/llm/generateTestCases'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const testCases = await generateTestCases(run.promptText)
  run.testCases = testCases
  run.status = 'ready'
  await saveRun(run)

  return NextResponse.json(testCases)
}
```

- [ ] **Step 5: Write `src/app/api/runs/[id]/test-cases/route.ts`**

```typescript
// src/app/api/runs/[id]/test-cases/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getRun, saveRun } from '@/lib/blob'
import type { TestCase } from '@/lib/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const tc: TestCase = {
    id: `TC-${run.testCases.length + 1}`,
    name: body.name ?? '',
    whatIsTested: body.whatIsTested ?? '',
    leadBehaviourScript: body.leadBehaviourScript ?? '',
    passCriterion: body.passCriterion ?? '',
    source: 'manual',
    turns: [],
    verdict: 'PENDING',
  }

  run.testCases.push(tc)
  await saveRun(run)
  return NextResponse.json(tc, { status: 201 })
}
```

- [ ] **Step 6: Write `src/app/api/runs/[id]/test-cases/[tcId]/route.ts`**

```typescript
// src/app/api/runs/[id]/test-cases/[tcId]/route.ts
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
```

- [ ] **Step 7: Write `src/app/api/runs/[id]/execute-next/route.ts`**

This is the critical route. It finds the next PENDING TC, runs it fully, saves results, and returns.

```typescript
// src/app/api/runs/[id]/execute-next/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRun, saveRun } from '@/lib/blob'
import { executeTestCase } from '@/lib/execution/executeTestCase'

export const maxDuration = 300

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (run.status === 'aborted') {
    return NextResponse.json({ done: true, aborted: true })
  }

  const pendingTc = run.testCases.find(tc => tc.verdict === 'PENDING')
  if (!pendingTc) {
    // All TCs done — mark run complete
    run.status = 'completed'
    await saveRun(run)
    return NextResponse.json({ done: true, completed: true })
  }

  run.status = 'running'
  await saveRun(run)

  const completedTc = await executeTestCase(run, pendingTc)

  // Update the TC in the run
  const idx = run.testCases.findIndex(tc => tc.id === pendingTc.id)
  run.testCases[idx] = completedTc

  // Check if all TCs are now done
  const allDone = run.testCases.every(tc => tc.verdict !== 'PENDING')
  run.status = allDone ? 'completed' : 'running'

  await saveRun(run)
  return NextResponse.json({ done: allDone, tc: completedTc })
}
```

- [ ] **Step 8: Write `src/app/api/runs/[id]/status/route.ts`**

```typescript
// src/app/api/runs/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRun } from '@/lib/blob'
import type { StatusResponse } from '@/lib/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const completedTcs = run.testCases.filter(tc => tc.verdict !== 'PENDING').length
  const currentPending = run.testCases.find(tc => tc.verdict === 'PENDING')

  const status: StatusResponse = {
    status: run.status,
    completedTcs,
    totalTcs: run.testCases.length,
    currentTcName: currentPending?.name ?? null,
    passCount: run.testCases.filter(tc => tc.verdict === 'PASS').length,
    failCount: run.testCases.filter(tc => tc.verdict === 'FAIL').length,
    partialCount: run.testCases.filter(tc => tc.verdict === 'PARTIAL').length,
  }

  return NextResponse.json(status)
}
```

- [ ] **Step 9: Write `src/app/api/runs/[id]/abort/route.ts`**

```typescript
// src/app/api/runs/[id]/abort/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRun, saveRun } from '@/lib/blob'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  run.status = 'aborted'
  await saveRun(run)
  return NextResponse.json({ aborted: true })
}
```

- [ ] **Step 10: Write `src/app/api/runs/[id]/report/route.ts`**

```typescript
// src/app/api/runs/[id]/report/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRun } from '@/lib/blob'
import { generateExcel } from '@/lib/report/generateExcel'

export const maxDuration = 120

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buffer = await generateExcel(run)
  const filename = `rehearsal-${run.name.replace(/\s+/g, '-')}-${run.id.slice(0, 8)}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Step 11: Commit all API routes**

```bash
git add src/app/api/
git commit -m "feat: add all API routes (runs CRUD, TC management, execution, report)"
```

---

## Task 10: Shared UI Components

**Files:**
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/RunCard.tsx`
- Create: `src/components/TestCaseRow.tsx`
- Create: `src/components/TestCaseTable.tsx`
- Create: `src/components/ExecutionPoller.tsx`

- [ ] **Step 1: Write `src/components/StatusBadge.tsx`**

```tsx
// src/components/StatusBadge.tsx
import type { Verdict, RunStatus } from '@/lib/types'

type Status = Verdict | RunStatus

const styles: Record<string, string> = {
  PASS: 'bg-green-100 text-green-800 border-green-300',
  FAIL: 'bg-red-100 text-red-800 border-red-300',
  PARTIAL: 'bg-amber-100 text-amber-800 border-amber-300',
  ERROR: 'bg-gray-100 text-gray-600 border-gray-300',
  PENDING: 'bg-slate-100 text-slate-500 border-slate-300',
  running: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  ready: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  draft: 'bg-slate-100 text-slate-500 border-slate-300',
  aborted: 'bg-orange-100 text-orange-800 border-orange-300',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${styles[status] ?? styles.PENDING}`}>
      {status}
    </span>
  )
}
```

- [ ] **Step 2: Write `src/components/RunCard.tsx`**

```tsx
// src/components/RunCard.tsx
import Link from 'next/link'
import type { RunSummary } from '@/lib/types'
import { StatusBadge } from './StatusBadge'

export function RunCard({ run }: { run: RunSummary }) {
  const passRate = run.totalTcs > 0
    ? Math.round((run.passCount / (run.totalTcs - (run.totalTcs - run.passCount - run.failCount - run.partialCount - run.errorCount || run.totalTcs))) * 100)
    : 0
  const ran = run.passCount + run.failCount + run.partialCount + run.errorCount

  return (
    <Link href={`/runs/${run.id}`} className="block border rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all bg-white">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{run.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{new Date(run.createdAt).toLocaleString()}</p>
        </div>
        <StatusBadge status={run.status} />
      </div>
      {ran > 0 && (
        <div className="mt-3 flex gap-3 text-xs">
          <span className="text-green-700">{run.passCount} PASS</span>
          <span className="text-red-700">{run.failCount} FAIL</span>
          <span className="text-amber-700">{run.partialCount} PARTIAL</span>
          {run.errorCount > 0 && <span className="text-gray-500">{run.errorCount} ERROR</span>}
          <span className="text-slate-400 ml-auto">{ran}/{run.totalTcs} run</span>
        </div>
      )}
    </Link>
  )
}
```

- [ ] **Step 3: Write `src/components/TestCaseRow.tsx`**

Inline-editable row for the TC table. Expands to show lead script, pass criterion, and transcript.

```tsx
// src/components/TestCaseRow.tsx
'use client'
import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Trash2, Check, X } from 'lucide-react'
import type { TestCase } from '@/lib/types'
import { StatusBadge } from './StatusBadge'

interface Props {
  tc: TestCase
  onUpdate: (id: string, updates: Partial<TestCase>) => void
  onDelete: (id: string) => void
}

export function TestCaseRow({ tc, onUpdate, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ name: tc.name, whatIsTested: tc.whatIsTested, leadBehaviourScript: tc.leadBehaviourScript, passCriterion: tc.passCriterion })

  function save() {
    onUpdate(tc.id, draft)
    setEditing(false)
  }

  function cancel() {
    setDraft({ name: tc.name, whatIsTested: tc.whatIsTested, leadBehaviourScript: tc.leadBehaviourScript, passCriterion: tc.passCriterion })
    setEditing(false)
  }

  return (
    <>
      <tr className="border-b hover:bg-slate-50 text-sm">
        <td className="px-3 py-2 text-slate-500 font-mono text-xs whitespace-nowrap">{tc.id}</td>
        <td className="px-3 py-2">
          {editing ? (
            <input className="w-full border rounded px-2 py-1 text-sm" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          ) : (
            <span className="font-medium">{tc.name}</span>
          )}
        </td>
        <td className="px-3 py-2 text-slate-600 max-w-xs">
          {editing ? (
            <input className="w-full border rounded px-2 py-1 text-sm" value={draft.whatIsTested} onChange={e => setDraft(d => ({ ...d, whatIsTested: e.target.value }))} />
          ) : tc.whatIsTested}
        </td>
        <td className="px-3 py-2"><StatusBadge status={tc.verdict} /></td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <button onClick={save} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={14} /></button>
                <button onClick={cancel} className="p-1 text-slate-500 hover:bg-slate-100 rounded"><X size={14} /></button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="p-1 text-slate-500 hover:bg-slate-100 rounded"><Pencil size={14} /></button>
                <button onClick={() => onDelete(tc.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                <button onClick={() => setExpanded(e => !e)} className="p-1 text-slate-500 hover:bg-slate-100 rounded">
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50 border-b">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-slate-700 mb-1">Lead Behaviour Script</p>
                {editing ? (
                  <textarea className="w-full border rounded px-2 py-1 text-sm h-24" value={draft.leadBehaviourScript} onChange={e => setDraft(d => ({ ...d, leadBehaviourScript: e.target.value }))} />
                ) : (
                  <p className="text-slate-600">{tc.leadBehaviourScript}</p>
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-700 mb-1">Pass Criterion</p>
                {editing ? (
                  <textarea className="w-full border rounded px-2 py-1 text-sm h-24" value={draft.passCriterion} onChange={e => setDraft(d => ({ ...d, passCriterion: e.target.value }))} />
                ) : (
                  <p className="text-slate-600">{tc.passCriterion}</p>
                )}
              </div>
            </div>
            {tc.turns.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold text-slate-700 mb-1">Transcript ({tc.turns.length} turns)</p>
                <div className="space-y-1 max-h-48 overflow-y-auto border rounded bg-white p-2">
                  {tc.turns.map(turn => (
                    <div key={turn.number} className="text-xs">
                      <span className={`font-semibold mr-2 ${turn.speaker === 'Agent' ? 'text-blue-700' : 'text-slate-600'}`}>
                        [{turn.number}] {turn.speaker}:
                      </span>
                      <span className="text-slate-700">{turn.text}</span>
                    </div>
                  ))}
                </div>
                {tc.remarks && (
                  <p className="mt-2 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded p-2">
                    <span className="font-semibold">Remarks:</span> {tc.remarks}
                  </p>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
```

- [ ] **Step 4: Write `src/components/TestCaseTable.tsx`**

```tsx
// src/components/TestCaseTable.tsx
'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { TestCase } from '@/lib/types'
import { TestCaseRow } from './TestCaseRow'

interface Props {
  runId: string
  initialTcs: TestCase[]
  onTcsChange?: (tcs: TestCase[]) => void
}

export function TestCaseTable({ runId, initialTcs, onTcsChange }: Props) {
  const [tcs, setTcs] = useState<TestCase[]>(initialTcs)

  async function handleUpdate(id: string, updates: Partial<TestCase>) {
    await fetch(`/api/runs/${runId}/test-cases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const updated = tcs.map(tc => tc.id === id ? { ...tc, ...updates } : tc)
    setTcs(updated)
    onTcsChange?.(updated)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this test case?')) return
    await fetch(`/api/runs/${runId}/test-cases/${id}`, { method: 'DELETE' })
    const updated = tcs.filter(tc => tc.id !== id)
    setTcs(updated)
    onTcsChange?.(updated)
  }

  async function handleAdd() {
    const res = await fetch(`/api/runs/${runId}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Test Case', whatIsTested: '', leadBehaviourScript: '', passCriterion: '' }),
    })
    const tc = await res.json()
    setTcs(prev => [...prev, tc])
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-600 text-xs uppercase tracking-wide">
              <th className="px-3 py-2 w-20">ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">What Is Tested</th>
              <th className="px-3 py-2 w-24">Status</th>
              <th className="px-3 py-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tcs.map(tc => (
              <TestCaseRow key={tc.id} tc={tc} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={handleAdd}
        className="mt-3 flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-dashed border-slate-300 rounded px-3 py-1.5 hover:border-slate-500 transition-colors"
      >
        <Plus size={14} /> Add Test Case
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/ExecutionPoller.tsx`**

This is the client-side driver. It calls `/api/runs/[id]/execute-next` in a loop.

```tsx
// src/components/ExecutionPoller.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { StatusResponse } from '@/lib/types'

interface Props {
  runId: string
  initialStatus: StatusResponse
}

export function ExecutionPoller({ runId, initialStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/runs/${runId}/status`)
    if (res.ok) setStatus(await res.json())
  }, [runId])

  const executeNext = useCallback(async () => {
    if (running) return
    setRunning(true)
    setError(null)
    try {
      const res = await fetch(`/api/runs/${runId}/execute-next`, { method: 'POST' })
      const data = await res.json()
      await fetchStatus()
      if (data.done) {
        setRunning(false)
        router.push(`/runs/${runId}/results`)
        return
      }
      setRunning(false)
      // Immediately trigger next TC
      executeNext()
    } catch (err) {
      setError(String(err))
      setRunning(false)
    }
  }, [runId, running, fetchStatus, router])

  // Auto-start on mount if there are pending TCs
  useEffect(() => {
    if (initialStatus.completedTcs < initialStatus.totalTcs) {
      executeNext()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const progress = status.totalTcs > 0
    ? Math.round((status.completedTcs / status.totalTcs) * 100)
    : 0

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm text-slate-600 mb-1">
          <span>
            {status.completedTcs < status.totalTcs
              ? `Running TC ${status.completedTcs + 1} of ${status.totalTcs}${status.currentTcName ? ` — ${status.currentTcName}` : ''}`
              : 'All test cases complete'}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { label: 'Pass', count: status.passCount, color: 'text-green-700' },
          { label: 'Fail', count: status.failCount, color: 'text-red-700' },
          { label: 'Partial', count: status.partialCount, color: 'text-amber-700' },
          { label: 'Done', count: status.completedTcs, color: 'text-slate-700' },
        ].map(({ label, count, color }) => (
          <div key={label} className="border rounded p-3">
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          Error: {error}
          <button onClick={executeNext} className="ml-3 underline">Retry</button>
        </p>
      )}

      {running && status.completedTcs < status.totalTcs && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Executing…
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={async () => {
            await fetch(`/api/runs/${runId}/abort`, { method: 'POST' })
            router.push(`/runs/${runId}/results`)
          }}
          className="text-sm text-red-600 hover:underline"
        >
          Abort
        </button>
        {status.completedTcs === status.totalTcs && (
          <button
            onClick={() => router.push(`/runs/${runId}/results`)}
            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700"
          >
            View Results →
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Keep this tab open while the run executes. Share this URL with a teammate to let them monitor progress.
        <br />URL: {typeof window !== 'undefined' ? window.location.href : ''}
      </p>
    </div>
  )
}
```

- [ ] **Step 6: Commit all components**

```bash
git add src/components/
git commit -m "feat: add UI components (StatusBadge, RunCard, TestCaseTable, ExecutionPoller)"
```

---

## Task 11: Home Page + Root Layout

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write `src/app/layout.tsx`**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rehearsal — LLM Conversation QA',
  description: 'Test whether your AI agent follows its prompt correctly',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <header className="bg-white border-b px-6 py-3 flex items-center gap-3">
          <a href="/" className="text-lg font-bold text-slate-900 tracking-tight">Rehearsal</a>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">v2.0</span>
          <span className="text-slate-300 ml-auto text-xs">LLM Conversation QA</span>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Write `src/app/page.tsx`**

```tsx
// src/app/page.tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listRunSummaries } from '@/lib/blob'
import { RunCard } from '@/components/RunCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const runs = await listRunSummaries()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Runs</h1>
          <p className="text-slate-500 text-sm mt-0.5">Each run tests one bot prompt against a set of test cases.</p>
        </div>
        <Link
          href="/runs/new"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <Plus size={16} /> New Run
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg">No runs yet.</p>
          <p className="text-sm mt-1">Create a new run to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {runs.map(run => <RunCard key={run.id} run={run} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx
git commit -m "feat: add home page and root layout"
```

---

## Task 12: New Run Page + Run Detail Page

**Files:**
- Create: `src/app/runs/new/page.tsx`
- Create: `src/app/runs/[id]/page.tsx`

- [ ] **Step 1: Write `src/app/runs/new/page.tsx`**

```tsx
// src/app/runs/new/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText } from 'lucide-react'

export default function NewRunPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [promptText, setPromptText] = useState('')
  const [maxTurns, setMaxTurns] = useState(16)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [uploadedFilename, setUploadedFilename] = useState('')

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload/prompt', { method: 'POST', body: form })
    const data = await res.json()
    if (data.text) {
      setPromptText(data.text)
      setUploadedFilename(file.name)
    } else {
      setError(data.error ?? 'Upload failed')
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !promptText.trim()) {
      setError('Run name and prompt text are required.')
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, promptText, maxTurns }),
    })
    if (!res.ok) {
      setError('Failed to create run')
      setLoading(false)
      return
    }
    const run = await res.json()
    router.push(`/runs/${run.id}`)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">New Run</h1>
      <p className="text-slate-500 text-sm mb-6">Import a bot system prompt to test. A summary will be generated automatically.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Run name</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="e.g. BankBazaar SBI Credit Card v3"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Prompt</label>
          <div className="mb-2 flex items-center gap-3">
            <label className="cursor-pointer flex items-center gap-1.5 text-sm text-slate-600 border rounded px-3 py-1.5 hover:bg-slate-50">
              <Upload size={14} />
              {uploading ? 'Uploading…' : 'Upload PDF or DOCX'}
              <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileUpload} />
            </label>
            {uploadedFilename && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <FileText size={12} /> {uploadedFilename}
              </span>
            )}
          </div>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400 h-64 resize-y"
            placeholder="Paste your bot system prompt here…"
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">{promptText.length.toLocaleString()} characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Max turns per test case</label>
          <input
            type="number"
            min={6}
            max={24}
            className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={maxTurns}
            onChange={e => setMaxTurns(Number(e.target.value))}
          />
          <p className="text-xs text-slate-400 mt-1">6–24. Default 16.</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating run + generating summary…' : 'Create Run'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/app/runs/[id]/page.tsx`**

```tsx
// src/app/runs/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getRun } from '@/lib/blob'
import { TestCaseTable } from '@/components/TestCaseTable'
import { StatusBadge } from '@/components/StatusBadge'
import { GenerateTcsButton } from '@/components/GenerateTcsButton'

export const dynamic = 'force-dynamic'

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) notFound()

  // If run is completed or running, redirect to appropriate page
  if (run.status === 'completed') redirect(`/runs/${id}/results`)
  if (run.status === 'running') redirect(`/runs/${id}/execute`)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{run.name}</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-slate-500 text-sm mt-0.5">{new Date(run.createdAt).toLocaleString()}</p>
        </div>
        {run.testCases.length > 0 && (
          <Link
            href={`/runs/${id}/execute`}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Run All ({run.testCases.length} TCs) →
          </Link>
        )}
      </div>

      {/* Prompt Summary */}
      <div className="bg-white border rounded-lg p-4">
        <p className="text-xs font-semibold uppercase text-slate-400 tracking-wide mb-2">Prompt Summary</p>
        <p className="text-slate-700 text-sm leading-relaxed">{run.promptSummary}</p>
        <details className="mt-3">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">View raw prompt</summary>
          <pre className="mt-2 text-xs text-slate-600 font-mono bg-slate-50 rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-64">{run.promptText}</pre>
        </details>
      </div>

      {/* Test Cases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Test Cases {run.testCases.length > 0 && <span className="text-slate-400 font-normal text-base">({run.testCases.length})</span>}
          </h2>
          {run.testCases.length === 0 && (
            <GenerateTcsButton runId={id} />
          )}
          {run.testCases.length > 0 && (
            <GenerateTcsButton runId={id} label="Regenerate" />
          )}
        </div>

        {run.testCases.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-10 text-center text-slate-400">
            <p>No test cases yet.</p>
            <p className="text-sm mt-1">Generate them from the prompt, or add manually.</p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <TestCaseTable runId={id} initialTcs={run.testCases} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/GenerateTcsButton.tsx`**

```tsx
// src/components/GenerateTcsButton.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export function GenerateTcsButton({ runId, label = 'Generate Test Cases' }: { runId: string; label?: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClick() {
    if (!confirm('This will replace all existing test cases. Continue?')) return
    setLoading(true)
    await fetch(`/api/runs/${runId}/generate-tcs`, { method: 'POST' })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
    >
      <Zap size={14} />
      {loading ? 'Generating…' : label}
    </button>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/runs/ src/components/GenerateTcsButton.tsx
git commit -m "feat: add new run page and run detail page"
```

---

## Task 13: Execution + Results Pages

**Files:**
- Create: `src/app/runs/[id]/execute/page.tsx`
- Create: `src/app/runs/[id]/results/page.tsx`

- [ ] **Step 1: Write `src/app/runs/[id]/execute/page.tsx`**

```tsx
// src/app/runs/[id]/execute/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRun } from '@/lib/blob'
import { ExecutionPoller } from '@/components/ExecutionPoller'
import type { StatusResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ExecutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) notFound()

  const completedTcs = run.testCases.filter(tc => tc.verdict !== 'PENDING').length
  const initialStatus: StatusResponse = {
    status: run.status,
    completedTcs,
    totalTcs: run.testCases.length,
    currentTcName: run.testCases.find(tc => tc.verdict === 'PENDING')?.name ?? null,
    passCount: run.testCases.filter(tc => tc.verdict === 'PASS').length,
    failCount: run.testCases.filter(tc => tc.verdict === 'FAIL').length,
    partialCount: run.testCases.filter(tc => tc.verdict === 'PARTIAL').length,
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/runs/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Back to run</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{run.name}</h1>
        <p className="text-slate-500 text-sm">Running {run.testCases.length} test cases with {run.model}</p>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <ExecutionPoller runId={id} initialStatus={initialStatus} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/app/runs/[id]/results/page.tsx`**

```tsx
// src/app/runs/[id]/results/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { getRun } from '@/lib/blob'
import { StatusBadge } from '@/components/StatusBadge'
import type { TestCase } from '@/lib/types'

export const dynamic = 'force-dynamic'

function sortTcs(tcs: TestCase[]): TestCase[] {
  const order = { FAIL: 0, PARTIAL: 1, ERROR: 2, PASS: 3, PENDING: 4 }
  return [...tcs].sort((a, b) => (order[a.verdict] ?? 5) - (order[b.verdict] ?? 5))
}

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)
  if (!run) notFound()

  const ran = run.testCases.filter(tc => tc.verdict !== 'PENDING')
  const passRate = ran.length > 0 ? Math.round((ran.filter(tc => tc.verdict === 'PASS').length / ran.length) * 100) : 0
  const sorted = sortTcs(run.testCases)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/runs/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Back to run</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{run.name}</h1>
          <StatusBadge status={run.status} />
        </div>
        <a
          href={`/api/runs/${id}/report`}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <Download size={16} /> Download Report (.xlsx)
        </a>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 80 ? 'text-green-700' : passRate >= 50 ? 'text-amber-700' : 'text-red-700' },
          { label: 'Pass', value: ran.filter(tc => tc.verdict === 'PASS').length, color: 'text-green-700' },
          { label: 'Fail', value: ran.filter(tc => tc.verdict === 'FAIL').length, color: 'text-red-700' },
          { label: 'Partial', value: ran.filter(tc => tc.verdict === 'PARTIAL').length, color: 'text-amber-700' },
          { label: 'Error', value: ran.filter(tc => tc.verdict === 'ERROR').length, color: 'text-gray-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border rounded-lg p-4 text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* TC results table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 w-24">Status</th>
              <th className="px-3 py-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(tc => (
              <tr key={tc.id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-500 font-mono text-xs">{tc.id}</td>
                <td className="px-3 py-2 font-medium">{tc.name}</td>
                <td className="px-3 py-2"><StatusBadge status={tc.verdict} /></td>
                <td className="px-3 py-2 text-slate-600 text-xs">{tc.remarks ? tc.remarks.slice(0, 120) + (tc.remarks.length > 120 ? '…' : '') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/runs/[id]/execute/ src/app/runs/[id]/results/
git commit -m "feat: add execution view and results dashboard"
```

---

## Task 14: Vercel Deployment

**Files:**
- Create: `vercel.json` (optional, for function timeout config)

- [ ] **Step 1: Add function timeout config**

Create `vercel.json`:
```json
{
  "functions": {
    "src/app/api/runs/[id]/execute-next/route.ts": {
      "maxDuration": 300
    },
    "src/app/api/runs/[id]/report/route.ts": {
      "maxDuration": 120
    }
  }
}
```

- [ ] **Step 2: Do a local build to catch any TypeScript errors**

```bash
npm run build
```

Fix any TypeScript errors before proceeding. Common issues: missing `await` on params in App Router routes (Next.js 15 makes params async).

- [ ] **Step 3: Link project to Vercel**

```bash
npx vercel link
```

Follow prompts:
- Link to existing account → Yes
- Which scope → your account
- Link to existing project? → No (create new)
- Project name → `rehearsal`

- [ ] **Step 4: Add Vercel Blob storage**

```bash
npx vercel storage add blob rehearsal-blob
```

When prompted, link to your project. This creates a `BLOB_READ_WRITE_TOKEN` env var in Vercel.

Pull the env vars locally:
```bash
npx vercel env pull .env.local
```

- [ ] **Step 5: Add OpenAI API key to Vercel**

```bash
npx vercel env add OPENAI_API_KEY
```

When prompted, enter your OpenAI API key. Select all environments (Production, Preview, Development).

- [ ] **Step 6: Deploy to production**

```bash
npx vercel --prod
```

Expected: Deployment URL printed. Visit it — home page loads.

- [ ] **Step 7: Smoke test the deployment**

1. Go to the Vercel URL
2. Click "New Run"
3. Paste a short test prompt: `You are a customer service agent. Greet the user and ask how you can help. If the user says goodbye, say goodbye and end the conversation.`
4. Set name to "Smoke Test"
5. Click "Create Run" — should redirect to run detail page with a summary
6. Click "Generate Test Cases" — should generate 3–5 TCs in ~30 seconds
7. Click "Run All" — execution view should show progress
8. Wait for completion — results page with verdicts should load
9. Click "Download Report (.xlsx)" — file should download and open correctly

- [ ] **Step 8: Final commit**

```bash
git add vercel.json
git commit -m "feat: add vercel config and complete Rehearsal v2.0 build"
```

---

## Self-Review: Spec Coverage Check

| PRD Section | Covered By |
|-------------|-----------|
| 4.1 Prompt Import (paste/PDF/DOCX) | Task 5 (extraction), Task 9 (upload API), Task 12 (new run page) |
| 4.1 Prompt Summary | Task 6 (generateSummary), Task 9 (POST /runs), Task 12 (run detail) |
| 4.2 Test Case Generation (no universal buckets) | Task 6 (generateTestCases with PRD prompt), Task 9 (generate-tcs API) |
| 4.2 TC fields: ID, name, what tested, script, criterion | Task 2 (types), Task 6, Task 10 (TestCaseTable) |
| 4.2 TC edit/delete/add before run | Task 10 (TestCaseRow inline editing), Task 9 (TC CRUD routes) |
| 4.4 Execution: agent turn with bot prompt | Task 6 (agentTurn), Task 7 (executeTestCase) |
| 4.4 Execution: lead persona with behaviour script | Task 6 (leadPersonaTurn), Task 7 |
| 4.4 Turn loop, end conditions, max turns | Task 7 (executeTestCase) |
| 4.4 ERROR state continues run | Task 7 (try/catch returns ERROR verdict, Task 9 execute-next moves on) |
| 4.5 Analysis: verdict + remarks + failures | Task 6 (analyseTranscript), Task 7 |
| 4.5 PASS/FAIL/PARTIAL/ERROR verdicts | Task 6 (exact rules in prompt) |
| 4.6 Excel report: 3 sheets, formatting | Task 8 (generateExcel) |
| 4.6 Report download | Task 9 (report route) |
| 5.2 All 6 LLM call types | Tasks 6 (all 5 LLM functions — summary, TC gen, agent, lead, analysis) |
| 5.3 Data models | Task 2 (types.ts) |
| 5.4 API routes | Task 9 (all 10 routes) |
| 6.1–6.3 Exact LLM prompt templates | Task 6 (all prompts match PRD verbatim) |
| 7.1 Screen flow | Tasks 11–13 (all 5 pages) |
| 7.2 TC table with expand, inline edit | Task 10 (TestCaseRow, TestCaseTable) |
| 7.3 Execution progress view | Task 10 (ExecutionPoller), Task 13 (execute page) |
| 7.4 Results: sorted FAIL first, download | Task 13 (results page) |
| 9. Resumable on error | Task 7 + 9 (PENDING TCs picked up on next execute-next call) |

**Gap identified:** TC import via CSV/XLSX (Section 4.3) is not in the plan. This is listed as "Optional Override" in the PRD. Omitting for v1 — can be added as a follow-up task.

**Gap identified:** The `agentTurn.ts` file has an import ordering issue — `import OpenAI from 'openai'` appears at the bottom. Fix: move the OpenAI type import to the top.

Fix for `agentTurn.ts` — replace the file body with:

```typescript
// src/lib/llm/agentTurn.ts
import OpenAI from 'openai'
import { openai, MODEL, withRetry } from '../openai'
import type { Turn } from '../types'

export async function agentTurn(
  botPrompt: string,
  history: Turn[]
): Promise<{ text: string; tokens: number }> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: botPrompt },
    ...history.map(t => ({
      role: t.speaker === 'Lead' ? ('user' as const) : ('assistant' as const),
      content: t.text,
    })),
  ]

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.3,
    })
  )

  return {
    text: response.choices[0].message.content?.trim() ?? '',
    tokens: response.usage?.total_tokens ?? 0,
  }
}
```
