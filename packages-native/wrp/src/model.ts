export type NodeKind =
  | "wish"
  | "prompt"
  | "observation"
  | "decision"

export type ClaimStatus =
  | "unexamined"
  | "underTest"
  | "supported"
  | "falsified"
  | "inconclusive"

export type WishStatus =
  | "unspecified"
  | "inProgress"
  | "fulfilled"
  | "blocked"

export type EvaluationManualStep = {
  description: string
  expected: string
}

export type EvaluationManual = {
  timeBudgetMinutes: number
  difficulty: "easy" | "medium" | "hard"
  steps: EvaluationManualStep[]
}

export type EvaluationSpec = {
  reproLevel: "manual-human"
  manual: EvaluationManual
  script?: unknown
  metric?: unknown
}

export type BaseNode = {
  id: string
  kind: NodeKind
  title: string
  deps?: string[]
  tags?: string[]
  body?: string
  [key: string]: unknown
}

export type ClaimOverlay = {
  claimKind?: "wish" | "decision" | "observation"
  claimStatus?: ClaimStatus
  evaluation?: EvaluationSpec
}

export type WishNode = BaseNode &
  ClaimOverlay & {
    kind: "wish"
    status: WishStatus
  }

export type AnyNode = WishNode | BaseNode
