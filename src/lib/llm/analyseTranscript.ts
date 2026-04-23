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
