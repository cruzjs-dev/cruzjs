#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PACKAGES=(
  drizzle-universal
  core
  saas
  ui
  ai
  monitor
  adapter-aws
  adapter-azure
  adapter-cloudflare
  adapter-digitalocean
  adapter-docker
  adapter-gcp
  start
  cli
  create
  skills
)

for pkg in "${PACKAGES[@]}"; do
  echo "==> Publishing @cruzjs/${pkg}@$(node -p "require('./packages/${pkg}/package.json').version")"
  npm publish --access public -w "packages/${pkg}"
done

echo "All packages published."
