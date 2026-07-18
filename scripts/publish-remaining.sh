#!/usr/bin/env bash
# Resumable publish: skips any @cruzjs/<pkg>@<version> already on npm, so a
# re-run with a fresh OTP only publishes what's left. OTP via NPM_OTP env.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PACKAGES=(
  drizzle-universal core saas ui ai monitor
  adapter-aws adapter-azure adapter-cloudflare adapter-digitalocean
  adapter-docker adapter-gcp start cli create skills
)

OTP_ARG=()
[ -n "${NPM_OTP:-}" ] && OTP_ARG=(--otp="${NPM_OTP}")

failed=()
for pkg in "${PACKAGES[@]}"; do
  ver="$(node -p "require('./packages/${pkg}/package.json').version")"
  published="$(npm view "@cruzjs/${pkg}@${ver}" version 2>/dev/null || true)"
  if [ "$published" = "$ver" ]; then
    echo "== skip @cruzjs/${pkg}@${ver} (already on npm)"
    continue
  fi
  echo "==> Publishing @cruzjs/${pkg}@${ver}"
  if npm publish --access public "${OTP_ARG[@]}" -w "packages/${pkg}" >/dev/null 2>&1; then
    echo "   ok"
  else
    echo "   FAILED"
    failed+=("${pkg}")
  fi
done

if [ ${#failed[@]} -eq 0 ]; then
  echo "ALL PUBLISHED"
else
  echo "REMAINING: ${failed[*]}"
  exit 1
fi
