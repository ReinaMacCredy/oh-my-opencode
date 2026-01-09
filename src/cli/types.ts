export type ClaudeSubscription = "no" | "yes" | "max20"
export type BooleanArg = "no" | "yes"

export interface InstallArgs {
  tui: boolean
  proxypal?: BooleanArg
  claude?: ClaudeSubscription
  chatgpt?: BooleanArg
  skipAuth?: boolean
}

export interface InstallConfig {
  hasProxyPal: boolean
  hasClaude: boolean
  isMax20: boolean
  hasChatGPT: boolean
  hasGemini: boolean
}

export interface ConfigMergeResult {
  success: boolean
  configPath: string
  error?: string
}

export interface DetectedConfig {
  isInstalled: boolean
  hasProxyPal: boolean
  hasClaude: boolean
  isMax20: boolean
  hasChatGPT: boolean
  hasGemini: boolean
}
