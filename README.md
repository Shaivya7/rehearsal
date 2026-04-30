# Rehearsal

Rehearsal is a QA tool for testing AI voice bot prompts before they go live. You paste your bot's system prompt, it auto-generates test cases, simulates full multi-turn conversations against a realistic lead persona, and gives you a pass/fail verdict for each scenario.

## Inputs

Before starting a run, you provide the following:

| Field | Required | Description |
|-------|----------|-------------|
| Run name | Yes | Label for this test run |
| Prompt | Yes | The bot's full system prompt (paste or upload PDF/DOCX) |
| Greeting message | No | The opening line the bot always sends first |
| Dynamic variables | No | Key-value pairs like agent_name, product (upload a screenshot to auto-extract) |
| Max turns | No | Conversation length limit per test case (6 to 24, default 16) |

## How it works

Once inputs are submitted, Rehearsal runs through five stages:

| Stage | What happens |
|-------|-------------|
| 1. Create run | The prompt is stored and a plain-language summary is generated via OpenAI |
| 2. Generate test cases | OpenAI reads the prompt and produces structured test cases with pass criteria, covering happy paths, objections, edge cases, and failure modes |
| 3. Simulate conversations | Each test case runs as a live multi-turn conversation. The bot follows your prompt while an LLM-powered lead persona responds realistically. Calls end on hangup or transfer |
| 4. Analyse | The full transcript is sent to OpenAI for verdict scoring |
| 5. Results | Each test case gets a PASS, FAIL, or PARTIAL verdict with a one-line reason. Results are viewable on the results page and exportable as an Excel report |

## Tech stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS v4
- Vercel Blob for run storage
- OpenAI API for test case generation, lead persona simulation, and verdict analysis
