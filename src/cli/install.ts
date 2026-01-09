import * as p from "@clack/prompts"
import color from "picocolors"
import type { InstallArgs, InstallConfig, ClaudeSubscription, BooleanArg, DetectedConfig } from "./types"
import {
  addPluginToOpenCodeConfig,
  writeOmoConfig,
  isOpenCodeInstalled,
  getOpenCodeVersion,
  addAuthPlugins,
  addProviderConfig,
  detectCurrentConfig,
} from "./config-manager"

const SYMBOLS = {
  check: color.green("✓"),
  cross: color.red("✗"),
  arrow: color.cyan("→"),
  bullet: color.dim("•"),
  info: color.blue("ℹ"),
  warn: color.yellow("⚠"),
  star: color.yellow("★"),
}

function formatProvider(name: string, enabled: boolean, detail?: string): string {
  const status = enabled ? SYMBOLS.check : color.dim("○")
  const label = enabled ? color.white(name) : color.dim(name)
  const suffix = detail ? color.dim(` (${detail})`) : ""
  return `  ${status} ${label}${suffix}`
}

function formatConfigSummary(config: InstallConfig): string {
  const lines: string[] = []

  lines.push(color.bold(color.white("Configuration Summary")))
  lines.push("")

  if (config.hasProxyPal) {
    lines.push(formatProvider("ProxyPal", true, "all models via proxy"))
    lines.push(formatProvider("Claude", false))
    lines.push(formatProvider("ChatGPT", false))
    lines.push(formatProvider("Gemini", false))
  } else {
    lines.push(formatProvider("ProxyPal", false))
    const claudeDetail = config.hasClaude ? (config.isMax20 ? "max20" : "standard") : undefined
    lines.push(formatProvider("Claude", config.hasClaude, claudeDetail))
    lines.push(formatProvider("ChatGPT", config.hasChatGPT))
  }

  lines.push("")
  lines.push(color.dim("─".repeat(40)))
  lines.push("")

  lines.push(color.bold(color.white("Agent Configuration")))
  lines.push("")

  let sisyphusModel: string
  let oracleModel: string
  let librarianModel: string
  let frontendModel: string

  if (config.hasProxyPal) {
    sisyphusModel = "gemini-claude-opus-4-5-thinking"
    oracleModel = "gpt-5.2-codex"
    librarianModel = "gemini-claude-opus-4-5-thinking"
    frontendModel = "gemini-3-pro-preview"
    sisyphusModel = "claude-opus-4-5"
    oracleModel = config.hasChatGPT ? "gpt-5.2-codex" : "claude-opus-4-5"
    librarianModel = "claude-sonnet-4-5"
    frontendModel = "claude-opus-4-5"
  } else {
    sisyphusModel = "glm-4.7-free"
    oracleModel = config.hasChatGPT ? "gpt-5.2-codex" : "glm-4.7-free"
    librarianModel = "glm-4.7-free"
    frontendModel = "glm-4.7-free"
  }

  lines.push(`  ${SYMBOLS.bullet} Sisyphus     ${SYMBOLS.arrow} ${color.cyan(sisyphusModel)}`)
  lines.push(`  ${SYMBOLS.bullet} Oracle       ${SYMBOLS.arrow} ${color.cyan(oracleModel)}`)
  lines.push(`  ${SYMBOLS.bullet} Librarian    ${SYMBOLS.arrow} ${color.cyan(librarianModel)}`)
  lines.push(`  ${SYMBOLS.bullet} Frontend     ${SYMBOLS.arrow} ${color.cyan(frontendModel)}`)

  return lines.join("\n")
}

function printHeader(isUpdate: boolean): void {
  const mode = isUpdate ? "Update" : "Install"
  console.log()
  console.log(color.bgMagenta(color.white(` oMoMoMoMo... ${mode} `)))
  console.log()
}

function printStep(step: number, total: number, message: string): void {
  const progress = color.dim(`[${step}/${total}]`)
  console.log(`${progress} ${message}`)
}

function printSuccess(message: string): void {
  console.log(`${SYMBOLS.check} ${message}`)
}

function printError(message: string): void {
  console.log(`${SYMBOLS.cross} ${color.red(message)}`)
}

function printInfo(message: string): void {
  console.log(`${SYMBOLS.info} ${message}`)
}

function printWarning(message: string): void {
  console.log(`${SYMBOLS.warn} ${color.yellow(message)}`)
}

function printBox(content: string, title?: string): void {
  const lines = content.split("\n")
  const maxWidth = Math.max(...lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, "").length), title?.length ?? 0) + 4
  const border = color.dim("─".repeat(maxWidth))

  console.log()
  if (title) {
    console.log(color.dim("┌─") + color.bold(` ${title} `) + color.dim("─".repeat(maxWidth - title.length - 4)) + color.dim("┐"))
  } else {
    console.log(color.dim("┌") + border + color.dim("┐"))
  }

  for (const line of lines) {
    const stripped = line.replace(/\x1b\[[0-9;]*m/g, "")
    const padding = maxWidth - stripped.length
    console.log(color.dim("│") + ` ${line}${" ".repeat(padding - 1)}` + color.dim("│"))
  }

  console.log(color.dim("└") + border + color.dim("┘"))
  console.log()
}

function validateNonTuiArgs(args: InstallArgs): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (args.proxypal !== undefined && !["no", "yes"].includes(args.proxypal)) {
    errors.push(`Invalid --proxypal value: ${args.proxypal} (expected: no, yes)`)
  }

  if (args.proxypal === "yes") {
    return { valid: errors.length === 0, errors }
  }

  if (args.claude === undefined) {
    errors.push("--claude is required (values: no, yes, max20)")
  } else if (!["no", "yes", "max20"].includes(args.claude)) {
    errors.push(`Invalid --claude value: ${args.claude} (expected: no, yes, max20)`)
  }

  if (args.chatgpt === undefined) {
    errors.push("--chatgpt is required (values: no, yes)")
  } else if (!["no", "yes"].includes(args.chatgpt)) {
    errors.push(`Invalid --chatgpt value: ${args.chatgpt} (expected: no, yes)`)
  }


  return { valid: errors.length === 0, errors }
}

function argsToConfig(args: InstallArgs): InstallConfig {
  if (args.proxypal === "yes") {
    return {
      hasProxyPal: true,
      hasClaude: false,
      isMax20: false,
      hasChatGPT: false,
      hasGemini: false,
    }
  }

  return {
    hasProxyPal: false,
    hasClaude: args.claude !== "no",
    isMax20: args.claude === "max20",
    hasChatGPT: args.chatgpt === "yes",
    hasGemini: false,
  }
}

function detectedToInitialValues(detected: DetectedConfig): { proxypal: BooleanArg; claude: ClaudeSubscription; chatgpt: BooleanArg } {
  let claude: ClaudeSubscription = "no"
  if (detected.hasClaude) {
    claude = detected.isMax20 ? "max20" : "yes"
  }

  return {
    proxypal: detected.hasProxyPal ? "yes" : "no",
    claude,
    chatgpt: detected.hasChatGPT ? "yes" : "no",
  }
}

async function runTuiMode(detected: DetectedConfig): Promise<InstallConfig | null> {
  const initial = detectedToInitialValues(detected)

  const proxypal = await p.select({
    message: "Are you using ProxyPal? (github.com/heyhuynhgiabuu/proxypal)",
    options: [
      { value: "yes" as const, label: "Yes", hint: "All models via ProxyPal proxy - skip other questions" },
      { value: "no" as const, label: "No", hint: "Configure individual providers" },
    ],
    initialValue: initial.proxypal,
  })

  if (p.isCancel(proxypal)) {
    p.cancel("Installation cancelled.")
    return null
  }

  if (proxypal === "yes") {
    return {
      hasProxyPal: true,
      hasClaude: false,
      isMax20: false,
      hasChatGPT: false,
      hasGemini: false,
    }
  }

  const claude = await p.select({
    message: "Do you have a Claude Pro/Max subscription?",
    options: [
      { value: "no" as const, label: "No", hint: "Will use opencode/glm-4.7-free as fallback" },
      { value: "yes" as const, label: "Yes (standard)", hint: "Claude Opus 4.5 for orchestration" },
      { value: "max20" as const, label: "Yes (max20 mode)", hint: "Full power with Claude Sonnet 4.5 for Librarian" },
    ],
    initialValue: initial.claude,
  })

  if (p.isCancel(claude)) {
    p.cancel("Installation cancelled.")
    return null
  }

  const chatgpt = await p.select({
    message: "Do you have a ChatGPT Plus/Pro subscription?",
    options: [
      { value: "no" as const, label: "No", hint: "Oracle will use fallback model" },
      { value: "yes" as const, label: "Yes", hint: "GPT-5.2 for debugging and architecture" },
    ],
    initialValue: initial.chatgpt,
  })

  if (p.isCancel(chatgpt)) {
    p.cancel("Installation cancelled.")
    return null
  }

  return {
    hasProxyPal: false,
    hasClaude: claude !== "no",
    isMax20: claude === "max20",
    hasChatGPT: chatgpt === "yes",
    hasGemini: false,
  }
}

async function runNonTuiInstall(args: InstallArgs): Promise<number> {
  const validation = validateNonTuiArgs(args)
  if (!validation.valid) {
    printHeader(false)
    printError("Validation failed:")
    for (const err of validation.errors) {
      console.log(`  ${SYMBOLS.bullet} ${err}`)
    }
    console.log()
    printInfo("Usage: bunx oh-my-opencode install --no-tui --proxypal=yes")
    printInfo("   or: bunx oh-my-opencode install --no-tui --claude=<no|yes|max20> --chatgpt=<no|yes>")
    console.log()
    return 1
  }

  const detected = detectCurrentConfig()
  const isUpdate = detected.isInstalled

  printHeader(isUpdate)

  const totalSteps = 6
  let step = 1

  printStep(step++, totalSteps, "Checking OpenCode installation...")
  const installed = await isOpenCodeInstalled()
  if (!installed) {
    printError("OpenCode is not installed on this system.")
    printInfo("Visit https://opencode.ai/docs for installation instructions")
    return 1
  }

  const version = await getOpenCodeVersion()
  printSuccess(`OpenCode ${version ?? ""} detected`)

  if (isUpdate) {
    const initial = detectedToInitialValues(detected)
    if (initial.proxypal === "yes") {
      printInfo(`Current config: ProxyPal=yes`)
    } else {
      printInfo(`Current config: Claude=${initial.claude}, ChatGPT=${initial.chatgpt}`)
    }
  }

  const config = argsToConfig(args)

  printStep(step++, totalSteps, "Adding oh-my-opencode plugin...")
  const pluginResult = addPluginToOpenCodeConfig()
  if (!pluginResult.success) {
    printError(`Failed: ${pluginResult.error}`)
    return 1
  }
  printSuccess(`Plugin ${isUpdate ? "verified" : "added"} ${SYMBOLS.arrow} ${color.dim(pluginResult.configPath)}`)

  if (config.hasProxyPal) {
    printStep(step++, totalSteps, "Adding ProxyPal provider configuration...")
    const providerResult = addProviderConfig(config)
    if (!providerResult.success) {
      printError(`Failed: ${providerResult.error}`)
      return 1
    }
    printSuccess(`ProxyPal configured ${SYMBOLS.arrow} ${color.dim(providerResult.configPath)}`)
    step += 1
  } else if (config.hasChatGPT) {
    printStep(step++, totalSteps, "Adding auth plugins...")
    const authResult = await addAuthPlugins(config)
    if (!authResult.success) {
      printError(`Failed: ${authResult.error}`)
      return 1
    }
    printSuccess(`Auth plugins configured ${SYMBOLS.arrow} ${color.dim(authResult.configPath)}`)

    printStep(step++, totalSteps, "Adding provider configurations...")
    const providerResult = addProviderConfig(config)
    if (!providerResult.success) {
      printError(`Failed: ${providerResult.error}`)
      return 1
    }
    printSuccess(`Providers configured ${SYMBOLS.arrow} ${color.dim(providerResult.configPath)}`)
  } else {
    step += 2
  }

  printStep(step++, totalSteps, "Writing oh-my-opencode configuration...")
  const omoResult = writeOmoConfig(config)
  if (!omoResult.success) {
    printError(`Failed: ${omoResult.error}`)
    return 1
  }
  printSuccess(`Config written ${SYMBOLS.arrow} ${color.dim(omoResult.configPath)}`)

  printBox(formatConfigSummary(config), isUpdate ? "Updated Configuration" : "Installation Complete")

  if (!config.hasProxyPal && !config.hasClaude && !config.hasChatGPT) {
    printWarning("No model providers configured. Using opencode/glm-4.7-free as fallback.")
  }

  if (config.hasProxyPal && !args.skipAuth) {
    console.log(color.bold("Next Steps - Configure ProxyPal:"))
    console.log()
    console.log(`  ${SYMBOLS.arrow} Start ProxyPal and ensure proxy is running on ${color.cyan("http://localhost:8317")}`)
    console.log(`  ${SYMBOLS.arrow} Authenticate your providers in ProxyPal app`)
    console.log()
  } else if ((config.hasClaude || config.hasChatGPT) && !args.skipAuth) {
    console.log(color.bold("Next Steps - Authenticate your providers:"))
    console.log()
    if (config.hasClaude) {
      console.log(`  ${SYMBOLS.arrow} ${color.dim("opencode auth login")} ${color.gray("(select Anthropic → Claude Pro/Max)")}`)
    }
    if (config.hasChatGPT) {
      console.log(`  ${SYMBOLS.arrow} ${color.dim("opencode auth login")} ${color.gray("(select OpenAI → ChatGPT Plus/Pro)")}`)
    }

    console.log()
  }

  console.log(`${SYMBOLS.star} ${color.bold(color.green(isUpdate ? "Configuration updated!" : "Installation complete!"))}`)
  console.log(`  Run ${color.cyan("opencode")} to start!`)
  console.log()

  printBox(
    `${color.bold("Pro Tip:")} Include ${color.cyan("ultrawork")} (or ${color.cyan("ulw")}) in your prompt.\n` +
    `All features work like magic—parallel agents, background tasks,\n` +
    `deep exploration, and relentless execution until completion.`,
    "🪄 The Magic Word"
  )

  console.log(`${SYMBOLS.star} ${color.yellow("If you found this helpful, consider starring the repo!")}`)
  console.log(`  ${color.dim("gh repo star code-yeongyu/oh-my-opencode")}`)
  console.log()
  console.log(color.dim("oMoMoMoMo... Enjoy!"))
  console.log()

  return 0
}

export async function install(args: InstallArgs): Promise<number> {
  if (!args.tui) {
    return runNonTuiInstall(args)
  }

  const detected = detectCurrentConfig()
  const isUpdate = detected.isInstalled

  p.intro(color.bgMagenta(color.white(isUpdate ? " oMoMoMoMo... Update " : " oMoMoMoMo... ")))

  if (isUpdate) {
    const initial = detectedToInitialValues(detected)
    if (initial.proxypal === "yes") {
      p.log.info(`Existing configuration detected: ProxyPal=yes`)
    } else {
      p.log.info(`Existing configuration detected: Claude=${initial.claude}, ChatGPT=${initial.chatgpt}`)
    }
  }

  const s = p.spinner()
  s.start("Checking OpenCode installation")

  const installed = await isOpenCodeInstalled()
  if (!installed) {
    s.stop("OpenCode is not installed")
    p.log.error("OpenCode is not installed on this system.")
    p.note("Visit https://opencode.ai/docs for installation instructions", "Installation Guide")
    p.outro(color.red("Please install OpenCode first."))
    return 1
  }

  const version = await getOpenCodeVersion()
  s.stop(`OpenCode ${version ?? "installed"} ${color.green("✓")}`)

  const config = await runTuiMode(detected)
  if (!config) return 1

  s.start("Adding oh-my-opencode to OpenCode config")
  const pluginResult = addPluginToOpenCodeConfig()
  if (!pluginResult.success) {
    s.stop(`Failed to add plugin: ${pluginResult.error}`)
    p.outro(color.red("Installation failed."))
    return 1
  }
  s.stop(`Plugin added to ${color.cyan(pluginResult.configPath)}`)

  if (config.hasProxyPal) {
    s.start("Adding ProxyPal provider configuration")
    const providerResult = addProviderConfig(config)
    if (!providerResult.success) {
      s.stop(`Failed to add provider config: ${providerResult.error}`)
      p.outro(color.red("Installation failed."))
      return 1
    }
    s.stop(`ProxyPal configured to ${color.cyan(providerResult.configPath)}`)
  } else if (config.hasChatGPT) {
    s.start("Adding auth plugins (fetching latest versions)")
    const authResult = await addAuthPlugins(config)
    if (!authResult.success) {
      s.stop(`Failed to add auth plugins: ${authResult.error}`)
      p.outro(color.red("Installation failed."))
      return 1
    }
    s.stop(`Auth plugins added to ${color.cyan(authResult.configPath)}`)

    s.start("Adding provider configurations")
    const providerResult = addProviderConfig(config)
    if (!providerResult.success) {
      s.stop(`Failed to add provider config: ${providerResult.error}`)
      p.outro(color.red("Installation failed."))
      return 1
    }
    s.stop(`Provider config added to ${color.cyan(providerResult.configPath)}`)
  }

  s.start("Writing oh-my-opencode configuration")
  const omoResult = writeOmoConfig(config)
  if (!omoResult.success) {
    s.stop(`Failed to write config: ${omoResult.error}`)
    p.outro(color.red("Installation failed."))
    return 1
  }
  s.stop(`Config written to ${color.cyan(omoResult.configPath)}`)

  if (!config.hasProxyPal && !config.hasClaude && !config.hasChatGPT) {
    p.log.warn("No model providers configured. Using opencode/glm-4.7-free as fallback.")
  }

  p.note(formatConfigSummary(config), isUpdate ? "Updated Configuration" : "Installation Complete")

  if (config.hasProxyPal && !args.skipAuth) {
    const steps: string[] = [
      `Start ProxyPal and ensure proxy is running on ${color.cyan("http://localhost:8317")}`,
      `Authenticate your providers in the ProxyPal app`,
    ]
    p.note(steps.join("\n"), "Next Steps - Configure ProxyPal")
  } else if ((config.hasClaude || config.hasChatGPT) && !args.skipAuth) {
    const steps: string[] = []
    if (config.hasClaude) {
      steps.push(`${color.dim("opencode auth login")} ${color.gray("(select Anthropic → Claude Pro/Max)")}`)
    }
    if (config.hasChatGPT) {
      steps.push(`${color.dim("opencode auth login")} ${color.gray("(select OpenAI → ChatGPT Plus/Pro)")}`)
    }

    p.note(steps.join("\n"), "Next Steps - Authenticate your providers")
  }

  p.log.success(color.bold(isUpdate ? "Configuration updated!" : "Installation complete!"))
  p.log.message(`Run ${color.cyan("opencode")} to start!`)

  p.note(
    `Include ${color.cyan("ultrawork")} (or ${color.cyan("ulw")}) in your prompt.\n` +
    `All features work like magic—parallel agents, background tasks,\n` +
    `deep exploration, and relentless execution until completion.`,
    "🪄 The Magic Word"
  )

  p.log.message(`${color.yellow("★")} If you found this helpful, consider starring the repo!`)
  p.log.message(`  ${color.dim("gh repo star code-yeongyu/oh-my-opencode")}`)

  p.outro(color.green("oMoMoMoMo... Enjoy!"))

  return 0
}
