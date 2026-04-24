import type OpenAI from 'openai'
import { openai, MODEL, withRetry } from '../openai'
import type { Turn } from '../types'

export async function agentTurn(
  botPrompt: string,
  history: Turn[],
  dynamicVariables?: string
): Promise<{ text: string; tokens: number }> {
  const systemContent = dynamicVariables?.trim()
    ? `${botPrompt}\n\nDYNAMIC VARIABLES (these replace {{placeholders}} in your responses):\n${dynamicVariables}`
    : botPrompt

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
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
