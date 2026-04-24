import { agentTurn } from '../llm/agentTurn'
import { leadPersonaTurn } from '../llm/leadPersonaTurn'
import { analyseTranscript } from '../llm/analyseTranscript'
import type { Run, TestCase, Turn } from '../types'

// Hard stop: agent explicitly invoked hangup_call action
function isHangupCall(text: string): boolean {
  return text.toLowerCase().includes('hangup_call')
}

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
    lower.includes('end the conversation')
  )
}

export async function executeTestCase(run: Run, tc: TestCase): Promise<TestCase> {
  const turns: Turn[] = []

  // Prepend the greeting as the first agent turn — no LLM call needed
  if (run.greetingText?.trim()) {
    turns.push({
      number: 1,
      speaker: 'Agent',
      text: run.greetingText.trim(),
      timestamp: new Date().toISOString(),
    })
  }

  // Each "turn pair" is one Agent + one Lead. maxTurns controls pairs.
  const maxTotalTurns = run.maxTurns * 2
  // Start after any pre-populated turns; lead always responds to a greeting first
  const startTurn = turns.length + 1

  try {
    for (let turnNumber = startTurn; turnNumber <= maxTotalTurns; turnNumber++) {
      // If we started with a greeting (turn 1 = Agent), turn 2 is Lead, turn 3 is Agent, etc.
      const isAgentTurn = turns.length % 2 === 1

      if (isAgentTurn) {
        const { text, tokens } = await agentTurn(run.promptText, turns, run.dynamicVariables)
        turns.push({
          number: turnNumber,
          speaker: 'Agent',
          text,
          timestamp: new Date().toISOString(),
          tokens,
        })
        // Hard stop on hangup_call — do not let lead respond
        if (isHangupCall(text)) break
        // Heuristic closing detection (only after first exchange)
        if (turns.length > 2 && isClosingTurn(text)) break
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
