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
