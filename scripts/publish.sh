#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default version bump type
BUMP_TYPE="${1:-prerelease}"

echo -e "${YELLOW}Publishing oh-my-opencode fork...${NC}"
echo ""

# 1. Clean dist
echo -e "${GREEN}[1/5]${NC} Cleaning dist folder..."
rm -rf dist

# 2. Build
echo -e "${GREEN}[2/5]${NC} Building..."
bun run build

# 3. Bump version
echo -e "${GREEN}[3/5]${NC} Bumping version (${BUMP_TYPE})..."
if [ "$BUMP_TYPE" = "prerelease" ]; then
    NEW_VERSION=$(npm version prerelease --preid=beta --no-git-tag-version)
else
    NEW_VERSION=$(npm version "$BUMP_TYPE" --no-git-tag-version)
fi
echo -e "  New version: ${YELLOW}${NEW_VERSION}${NC}"

# 4. Commit and tag
echo -e "${GREEN}[4/5]${NC} Committing and tagging..."
git add -A
git commit -m "${NEW_VERSION}"
git tag "${NEW_VERSION}"

# 5. Publish to npm
echo -e "${GREEN}[5/5]${NC} Publishing to npm..."
if [ "$BUMP_TYPE" = "prerelease" ]; then
    npm publish --access public --tag beta
else
    npm publish --access public
fi

# 6. Push to git
echo -e "${GREEN}[6/5]${NC} Pushing to git..."
git push origin main --tags

echo ""
echo -e "${GREEN}Done!${NC} Published ${YELLOW}${NEW_VERSION}${NC}"
