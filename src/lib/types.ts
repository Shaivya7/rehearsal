export type Verdict = 'PASS' | 'FAIL' | 'PARTIAL' | 'ERROR' | 'PENDING'
export type RunStatus = 'draft' | 'ready' | 'running' | 'completed' | 'aborted' | 'error'
export type TcSource = 'generated' | 'imported' | 'manual'

export interface Turn {
  number: number
  speaker: 'Agent' | 'Lead'
  text: string
  timestamp: string
  tokens?: number
}

export interface TestCase {
  id: string
  name: string
  whatIsTested: string
  leadBehaviourScript: string
  passCriterion: string
  source: TcSource
  turns: Turn[]
  verdict: Verdict
  remarks?: string
  failures?: string[]
}

export interface Run {
  id: string
  name: string
  createdAt: string
  promptText: string
  promptSummary: string
  greetingText?: string
  dynamicVariables?: string
  model: string
  maxTurns: number
  status: RunStatus
  testCases: TestCase[]
}

export interface RunSummary {
  id: string
  name: string
  createdAt: string
  status: RunStatus
  totalTcs: number
  passCount: number
  failCount: number
  partialCount: number
  errorCount: number
}

export interface AnalysisResult {
  verdict: Verdict
  remarks: string
  failures: string[]
}

export interface StatusResponse {
  status: RunStatus
  completedTcs: number
  totalTcs: number
  currentTcName: string | null
  passCount: number
  failCount: number
  partialCount: number
}
