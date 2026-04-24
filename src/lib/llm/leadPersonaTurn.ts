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
  const historyText = history.map(t => `${t.speaker}: ${t.text}`).join('\n')

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
          content: history.length === 1
            ? 'The agent just gave their opening greeting. Respond as the human lead with a short natural greeting reply — e.g. "hi", "hello", "haan", "batao", "haan bolo", "ji bolo" — keep it brief and realistic. No stage directions. No quotation marks.'
            : 'Respond as the human lead. One response only. No stage directions. No quotation marks.',
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
