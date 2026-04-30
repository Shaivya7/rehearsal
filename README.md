# Rehearsal

Rehearsal is an internal QA tool for testing AI voice bot prompts before they go live. You paste your bot's system prompt, it auto-generates test cases, simulates full multi-turn conversations against a realistic lead persona, and gives you a pass/fail verdict for each scenario.

## What it does

1. **Import a prompt** - Paste your bot system prompt directly or upload a PDF/DOCX file. Optionally add a greeting message and dynamic variables (agent name, product, etc.).
2. **Generate test cases** - Rehearsal reads the prompt and generates diverse test cases covering happy paths, objections, edge cases, and failure modes.
3. **Simulate conversations** - Each test case runs as a full multi-turn conversation. The bot follows your prompt; an LLM-powered lead persona responds realistically. Calls end on hangup or transfer.
4. **Get verdicts** - Every conversation is evaluated against its test objective. You get a PASS, FAIL, or PARTIAL verdict with a one-line reason.
5. **Download a report** - Export results as an Excel file with a run summary, test case results, and full conversation transcripts.

## Tech stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Vercel Blob (run storage)
- OpenAI API (test case generation, lead persona, verdict analysis)

## Local setup

**Prerequisites:** Node.js 18+, an OpenAI API key, and a Vercel Blob store.

```bash
git clone https://github.com/Shaivya7/rehearsal.git
cd rehearsal
npm install
```

Create a `.env.local` file in the project root:

```
OPENAI_API_KEY=sk-...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

The app is deployed on Vercel. To deploy your own instance:

```bash
npx vercel --prod
```

Make sure `OPENAI_API_KEY` and `BLOB_READ_WRITE_TOKEN` are set in your Vercel project environment variables.

## How a run works

| Step | What happens |
|------|-------------|
| Create run | Prompt is stored in Vercel Blob and a summary is generated via OpenAI |
| Generate TCs | OpenAI reads the prompt and produces structured test cases with pass criteria |
| Execute | Each test case runs as a live conversation loop until max turns or a hangup signal |
| Analyse | The full transcript is sent to OpenAI for verdict scoring |
| Results | Verdicts are displayed on the results page and available as an Excel download |

## Input reference

| Field | Required | Description |
|-------|----------|-------------|
| Run name | Yes | Label for this test run |
| Prompt | Yes | The bot's full system prompt (paste or upload PDF/DOCX) |
| Greeting message | No | The opening line the bot always sends first |
| Dynamic variables | No | Key-value pairs like agent_name, product (upload a screenshot to auto-extract) |
| Max turns | No | Conversation length limit per test case (6 to 24, default 16) |
