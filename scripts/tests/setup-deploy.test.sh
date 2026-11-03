#!/usr/bin/env bash
# Runs the deploy wizard end to end under the system bash (3.2 on macOS) with scripted answers and
# fake browser / clipboard / curl, inside a throwaway copy of the repo layout, started from apps/api.
#   bash scripts/tests/setup-deploy.test.sh
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/repo/scripts" "$tmp/repo/apps/api" "$tmp/bin"
cp "$here/../setup-deploy.sh" "$tmp/repo/scripts/setup-deploy.sh"

# Stubs: no real browser, clipboard or network.
for opener in open xdg-open; do
  printf '#!/bin/sh\nexit 0\n' > "$tmp/bin/$opener"
done
printf '#!/bin/sh\ncat > /dev/null\n' > "$tmp/bin/pbcopy"
cat > "$tmp/bin/curl" <<'EOF'
#!/bin/sh
case "$*" in
  *http_code*) case "$*" in *styleguide*) printf 404 ;; *) printf 200 ;; esac ;;
  *) printf '{"status":"ok","db":"up","version":"0.1.0"}' ;;
esac
EOF
chmod +x "$tmp/bin/"*

# One line per prompt, in order: start, Neon string, Render ready, API URL, Vercel ready,
# site URL, Render live again, finish.
answers="
postgresql://user:secret@db.example/neondb?sslmode=require

https://api.example.com/

https://yoyo.example.com


"

if ! (cd "$tmp/repo/apps/api" && printf '%s' "$answers" | PATH="$tmp/bin:$PATH" /bin/bash "$tmp/repo/scripts/setup-deploy.sh" > "$tmp/out.log" 2>&1); then
  cat "$tmp/out.log"
  echo "FAIL - the wizard exited with an error"
  exit 1
fi

env_file="$tmp/repo/.env.deploy"
failures=0
pass() { echo "ok   - $1"; }
fail() { echo "FAIL - $1"; failures=$((failures + 1)); }

if [[ -f "$env_file" ]]; then pass "values land in .env.deploy at the repo root"; else fail "values land in .env.deploy at the repo root"; fi
if [[ ! -e "$tmp/repo/apps/api/.env" ]]; then pass "nothing is written to a .env in the current directory"; else fail "nothing is written to a .env in the current directory"; fi
if grep -q "^NEON_DATABASE_URL='postgresql://user:secret@db.example/neondb?sslmode=require'$" "$env_file" 2>/dev/null; then
  pass "the Neon connection string is saved"
else
  fail "the Neon connection string is saved"
fi
if grep -q "^API_URL='https://api.example.com'$" "$env_file" 2>/dev/null; then pass "the API URL is saved without a trailing slash"; else fail "the API URL is saved without a trailing slash"; fi
if grep -q "^WEB_URL='https://yoyo.example.com'$" "$env_file" 2>/dev/null; then pass "the site URL is saved"; else fail "the site URL is saved"; fi
# GNU stat (Linux) first: on Linux `stat -f` means "file system status" and would not fail.
mode="$(stat -c %a "$env_file" 2>/dev/null || stat -f %Lp "$env_file" 2>/dev/null || echo missing)"
if [[ "$mode" == "600" ]]; then pass "the file is private (0600)"; else fail "the file is private (0600), got $mode"; fi

if (( failures )); then
  echo "--- wizard output ---"
  cat "$tmp/out.log"
  exit 1
fi
echo "all wizard checks passed"
