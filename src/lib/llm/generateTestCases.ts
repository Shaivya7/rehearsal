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
Return a JSON object with a "testCases" array. No markdown, no explanation. Each object must have exactly these fields:
{
  "id": "TC-1",
  "name": "short specific label",
  "whatIsTested": "one sentence",
  "leadBehaviourScript": "natural language description of lead behaviour",
  "passCriterion": "condition(s) for pass, citing the prompt",
  "source": "generated"
}`

export async function generateTestCases(promptText: string, dynamicVariables?: string, instructions?: string): Promise<TestCase[]> {
  const varsBlock = dynamicVariables?.trim()
    ? `\n\nDYNAMIC VARIABLES (these replace {{placeholders}} in the prompt and greeting):\n${dynamicVariables}`
    : ''
  const instructionsBlock = instructions?.trim()
    ? `\n\nSPECIAL INSTRUCTIONS FROM THE USER (follow these above all else when deciding which test cases to generate):\n${instructions}`
    : ''

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Here is the bot prompt to analyse:\n---\n${promptText}\n---${varsBlock}${instructionsBlock}\nGenerate all test cases.`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })
  )

  const raw = response.choices[0].message.content ?? '{}'

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  // Handle {testCases: [...]} or direct array shapes
  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : ((parsed as Record<string, unknown>)['testCases'] as unknown[]) ??
      ((parsed as Record<string, unknown>)[Object.keys(parsed as object)[0]] as unknown[]) ??
      []

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
