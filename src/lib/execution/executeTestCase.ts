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
    lower.includes('take care') ||
    lower.includes('hangup') ||
    lower.includes('end the conversation')
  )
}

export async function executeTestCase(run: Run, tc: TestCase): Promise<TestCase> {
  const turns: Turn[] = []
  // Each "turn pair" is one Agent + one Lead. maxTurns controls pairs.
  const maxTotalTurns = run.maxTurns * 2

  try {
    for (let turnNumber = 1; turnNumber <= maxTotalTurns; turnNumber++) {
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
        // Check for closing action (only after first agent turn)
        if (turnNumber > 1 && isClosingTurn(text)) break
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
    }

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
