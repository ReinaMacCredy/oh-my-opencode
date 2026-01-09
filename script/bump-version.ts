#!/usr/bin/env bun

const PACKAGE_NAME = "@reinamaccredy/oh-my-opencode"
const bump = process.env.BUMP as "major" | "minor" | "patch" | undefined
const versionOverride = process.env.VERSION

console.log("=== Bumping version ===\n")

async function fetchPreviousVersion(): Promise<string> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${PACKAGE_NAME}`)
    if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
    const data = (await res.json()) as { "dist-tags": Record<string, string>; versions: Record<string, unknown> }
    
    const distTags = data["dist-tags"]
    const betaVersion = distTags?.beta
    const latestVersion = distTags?.latest
    
    const allVersions = Object.keys(data.versions || {})
      .filter(v => v.includes("-beta."))
      .sort((a, b) => {
        const aMatch = a.match(/-beta\.(\d+)$/)
        const bMatch = b.match(/-beta\.(\d+)$/)
        return (Number(bMatch?.[1] ?? 0)) - (Number(aMatch?.[1] ?? 0))
      })
    
    const highestBeta = allVersions[0]
    const previousVersion = highestBeta || betaVersion || latestVersion || "0.0.0"
    
    console.log(`Previous version: ${previousVersion}`)
    return previousVersion
  } catch {
    console.log("No previous version found, starting from 0.0.0")
    return "0.0.0"
  }
}

function bumpVersion(version: string, type: "major" | "minor" | "patch"): string {
  const prereleaseMatch = version.match(/^(\d+)\.(\d+)\.(\d+)-([a-zA-Z]+)\.(\d+)$/)
  if (prereleaseMatch) {
    const [, major, minor, patch, tag, preNum] = prereleaseMatch
    switch (type) {
      case "major":
        return `${Number(major) + 1}.0.0`
      case "minor":
        return `${major}.${Number(minor) + 1}.0`
      case "patch":
        return `${major}.${minor}.${patch}-${tag}.${Number(preNum) + 1}`
    }
  }

  const [major, minor, patch] = version.split(".").map(Number)
  switch (type) {
    case "major":
      return `${major + 1}.0.0`
    case "minor":
      return `${major}.${minor + 1}.0`
    case "patch":
      return `${major}.${minor}.${patch + 1}`
  }
}

async function updatePackageVersion(newVersion: string): Promise<void> {
  const pkgPath = new URL("../package.json", import.meta.url).pathname
  let pkg = await Bun.file(pkgPath).text()
  pkg = pkg.replace(/"version": "[^"]+"/, `"version": "${newVersion}"`)
  await Bun.file(pkgPath).write(pkg)
  console.log(`Updated: ${pkgPath}`)
}

async function checkVersionExists(version: string): Promise<boolean> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${PACKAGE_NAME}/${version}`)
    return res.ok
  } catch {
    return false
  }
}

async function main() {
  const previous = await fetchPreviousVersion()
  const newVersion = versionOverride || (bump ? bumpVersion(previous, bump) : bumpVersion(previous, "patch"))
  console.log(`New version: ${newVersion}\n`)

  if (await checkVersionExists(newVersion)) {
    console.log(`Version ${newVersion} already exists on npm. Skipping.`)
    process.exit(0)
  }

  await updatePackageVersion(newVersion)
  console.log(`\n=== Version bumped to ${newVersion} ===`)
}

main()
