# Rehearsal

Rehearsal is a QA tool for testing AI voice bot prompts before they go live. You paste your bot's system prompt, it auto-generates test cases, simulates full multi-turn conversations against a realistic lead persona, and gives you a pass/fail verdict for each scenario.

## How it works

1. **Import a prompt** - Paste your bot system prompt or upload a PDF/DOCX file. Optionally add a greeting message and dynamic variables (agent name, product, etc.).
2. **Generate test cases** - Rehearsal reads the prompt and generates diverse test cases covering happy paths, objections, edge cases, and failure modes.
3. **Simulate conversations** - Each test case runs as a full multi-turn conversation. The bot follows your prompt while an LLM-powered lead persona responds realistically. Calls end on hangup or transfer.
4. **Get verdicts** - Every conversation is evaluated against its test objective. You get a PASS, FAIL, or PARTIAL verdict with a one-line reason.
5. **Download a report** - Export results as an Excel file with a run summary, test case results, and full conversation transcripts.

## Inputs

| Field | Required | Description |
|-------|----------|-------------|
| Run name | Yes | Label for this test run |
| Prompt | Yes | The bot's full system prompt (paste or upload PDF/DOCX) |
| Greeting message | No | The opening line the bot always sends first |
| Dynamic variables | No | Key-value pairs like agent_name, product (upload a screenshot to auto-extract) |
| Max turns | No | Conversation length limit per test case (6 to 24, default 16) |

## Tech stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS v4
- Vercel Blob for run storage
- OpenAI API for test case generation, lead persona simulation, and verdict analysis
