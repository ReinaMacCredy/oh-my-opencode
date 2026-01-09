# Fork Maintenance Guide

This document describes how to maintain this fork of oh-my-opencode with integrated Maestro workflow skills.

## Branch Strategy

```
main     ← Your fork with Maestro integration (published to npm)
upstream ← Remote pointing to code-yeongyu/oh-my-opencode
```

> **IMPORTANT**: Upstream uses `dev` branch as their main development branch, NOT `master`.
> Always sync from `upstream/dev`, not `upstream/master`.

## Conflict-Prone Files

When syncing from upstream, these files are most likely to conflict:

| File | Reason | Resolution Strategy |
|------|--------|---------------------|
| `package.json` | Name changed to `@reinamaccredy/oh-my-opencode` | **Keep ours** for `name`, merge other changes |
| `src/features/builtin-skills/skills.ts` | Added 5 Maestro skills | **Merge carefully** - keep our additions at top |
| `src/features/opencode-skill-loader/skill-content.ts` | Added auto-prepend logic | **Merge carefully** - keep our functions |
| `src/features/opencode-skill-loader/index.ts` | May have export changes | Check if our exports still work |

### Safe Files (No Conflicts Expected)

| File/Directory | Reason |
|----------------|--------|
| `src/features/workflow-engine/` | Entirely new - doesn't exist upstream |
| `FORK_MAINTENANCE.md` | New file |

---

## Sync from Upstream Workflow

### 1. Fetch Upstream Changes

```bash
cd /Users/maccredyreina/Documents/Projects/_Active/oh-my-opencode-fork
git fetch upstream
```

### 2. Check What Changed

```bash
# See commits we're missing (use upstream/dev, NOT upstream/master)
git log main..upstream/dev --oneline

# See files that will conflict
git diff main...upstream/dev --stat
```

### 3. Merge with Ours Strategy for Known Files

```bash
# Create a merge branch for safety
git checkout -b sync-upstream-$(date +%Y%m%d)

# Merge upstream (use dev branch!)
git merge upstream/dev

# If conflicts occur, resolve them:
```

### 4. Conflict Resolution Commands

```bash
# For package.json - keep our name, accept their other changes
git checkout --ours package.json
# Then manually merge version/dependencies

# For builtin-skills/skills.ts - keep our Maestro skills
# Open file and ensure lines 1-450 (Maestro section) remain intact
# Add any new upstream skills AFTER our section

# For skill-content.ts - keep our auto-prepend logic
# Ensure MAESTRO_SKILLS Set and resolveSkillContent() remain
```

### 5. After Resolving Conflicts

```bash
git add .
git commit -m "chore: sync with upstream oh-my-opencode"
git checkout main
git merge sync-upstream-$(date +%Y%m%d)
git push origin main
```

---

## Updating Maestro Skills

Your original Maestro skills are at:
```
/Users/maccredyreina/Documents/Projects/_Active/my-workflow:3/skills/
```

When updating skills in the fork:

### 1. Edit the TypeScript Source

Edit `src/features/builtin-skills/skills.ts`:
- `maestroCoreSkill.template` (lines 10-78)
- `designingSkill.template` (lines 84-174)
- `conductorSkill.template` (lines 180-262)
- `orchestratorSkill.template` (lines 268-387)
- `trackingSkill.template` (lines 393-449)

### 2. Update skill-content.ts If Adding New Skills

If adding a new Maestro skill, update `src/features/opencode-skill-loader/skill-content.ts`:

```typescript
const MAESTRO_SKILLS = new Set([
  "designing",
  "conductor",
  "orchestrator",
  "tracking",
  "new-skill",  // Add new skill here
])
```

### 3. Run Tests

```bash
npm test -- --testPathPattern="contract.test"
```

### 4. Bump Version and Publish

```bash
# Bump version
npm version patch  # or minor/major

# Publish
npm publish --access public
```

---

## Quick Reference

### Remotes

```bash
git remote -v
# origin    → Your fork (ReinaMacCredy/oh-my-opencode)
# upstream  → Original (code-yeongyu/oh-my-opencode)
```

### Key Commits

| Commit | Description |
|--------|-------------|
| `5ec6c74` | Initial Maestro integration |
| `f41cfa3` | npm package rename |

### Backups

| Backup | Location |
|--------|----------|
| Old Maestro plugins | `~/maestro-marketplace-backup.zip` |
| Original skills | `/Users/maccredyreina/Documents/Projects/_Active/my-workflow:3/skills/` |

### Files We Own (Never Accept Upstream)

```
src/features/workflow-engine/           # Entire directory
src/features/builtin-skills/skills.ts   # Lines 1-450 (Maestro section)
src/features/opencode-skill-loader/skill-content.ts  # Our functions
FORK_MAINTENANCE.md                     # This file
```

### Files We Share (Merge Carefully)

```
package.json                            # Keep our name, merge rest
src/features/builtin-skills/index.ts    # May need export updates
src/features/opencode-skill-loader/index.ts  # May need export updates
```

---

## Troubleshooting

### Skills Not Loading from npm Package

1. Check `~/.config/opencode/opencode.json` has `@reinamaccredy/oh-my-opencode` in plugins
2. Ensure no global skill symlink: `ls -la ~/.config/opencode/skill`
3. Check no conflicting plugins: `grep -i maestro ~/.claude/plugins/installed_plugins.json`

### Restoring Old Plugin System

If you need to restore the old external plugin system:

```bash
# Restore from backup
unzip ~/maestro-marketplace-backup.zip -d ~/.claude/plugins/cache/

# Re-add to installed_plugins.json
# Edit ~/.claude/plugins/installed_plugins.json and add back the entries
```

### Restoring Global Skill Symlink

```bash
ln -s /Users/maccredyreina/Documents/Projects/_Active/my-workflow:3/skills ~/.config/opencode/skill
```
