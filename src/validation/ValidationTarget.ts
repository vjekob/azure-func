export const ValidationTargets = ["body", "query", "headers", "params"] as const;

export type ValidationTarget = typeof ValidationTargets[number];