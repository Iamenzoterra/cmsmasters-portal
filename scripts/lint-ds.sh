#!/usr/bin/env bash
# lint-ds.sh — Check files for hardcoded styles that should use DS tokens
# Usage:
#   ./scripts/lint-ds.sh <file>           # check one file
#   ./scripts/lint-ds.sh --staged         # check git staged files
#   ./scripts/lint-ds.sh --app studio     # check all files in apps/studio/
#   ./scripts/lint-ds.sh --changed        # check git changed (unstaged + staged)
#
# Exit codes: 0 = clean, 1 = violations found

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

VIOLATIONS=0
CHECKED=0

# Patterns and their fix suggestions
# Format: "PATTERN|||SUGGESTION"
RULES=(
  "fontFamily:|||Remove fontFamily — inherited from body globals.css. If needed: var(--font-family-body) or var(--font-family-monospace)"
  "fontWeight:\s*[0-9]|||Use var(--font-weight-medium), var(--font-weight-semibold), etc."
  "#[0-9a-fA-F]{3,8}['\"\`\s,;)}]|||Use semantic token: hsl(var(--text-primary)), hsl(var(--bg-surface)), etc."
  "rgba?\([0-9]|||Use alpha tokens: hsl(var(--black-alpha-40)), or shadow tokens: var(--shadow-sm)"
  "boxShadow:\s*['\"]0|||Use shadow tokens: var(--shadow-sm), var(--shadow-md), var(--shadow-lg), var(--shadow-xl)"
  "(bg|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]|||Use semantic classes: bg-primary, text-muted-foreground, border-border, etc."
)

# Files/dirs to always skip
SKIP_PATTERN="(node_modules|\.next|dist|build|tokens\.css|\.test\.|\.spec\.|\.stories\.)"

check_file() {
  local file="$1"

  # Only check ts/tsx/css files
  if [[ ! "$file" =~ \.(tsx?|css)$ ]]; then
    return
  fi

  # Skip excluded paths
  if [[ "$file" =~ $SKIP_PATTERN ]]; then
    return
  fi

  # Skip command-center (has its own theme)
  if [[ "$file" =~ command-center ]]; then
    return
  fi

  CHECKED=$((CHECKED + 1))
  local file_violations=0

  for rule in "${RULES[@]}"; do
    local pattern="${rule%%|||*}"
    local suggestion="${rule##*|||}"

    # Use grep with line numbers
    local matches
    matches=$(grep -nE "$pattern" "$file" 2>/dev/null || true)

    if [[ -n "$matches" ]]; then
      if [[ $file_violations -eq 0 ]]; then
        echo -e "\n${CYAN}$file${NC}"
      fi
      while IFS= read -r match; do
        local lineno="${match%%:*}"
        local content="${match#*:}"
        # Skip lines near a ds-lint-ignore comment (brand logos, third-party SVGs, etc.)
        # Checks the line itself and up to 5 lines above for the marker
        local skip=false
        for offset in 0 1 2 3 4 5; do
          local check_lineno=$((lineno - offset))
          if [[ $check_lineno -lt 1 ]]; then break; fi
          local check_line
          check_line=$(sed -n "${check_lineno}p" "$file" 2>/dev/null || true)
          if echo "$check_line" | grep -q "ds-lint-ignore"; then
            skip=true; break
          fi
        done
        if $skip; then continue; fi
        # Trim whitespace
        content=$(echo "$content" | sed 's/^[[:space:]]*//')
        echo -e "  ${RED}L${lineno}${NC}: ${content}"
        echo -e "  ${YELLOW}fix${NC}: $suggestion"
        VIOLATIONS=$((VIOLATIONS + 1))
        file_violations=$((file_violations + 1))
      done <<< "$matches"
    fi
  done
}

# --- Argument parsing ---

FILES=()

if [[ $# -eq 0 ]]; then
  echo "Usage: lint-ds.sh <file|--staged|--changed|--app NAME>"
  exit 0
fi

case "$1" in
  --staged)
    while IFS= read -r f; do
      [[ -n "$f" ]] && FILES+=("$f")
    done < <(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null)
    ;;
  --changed)
    while IFS= read -r f; do
      [[ -n "$f" ]] && FILES+=("$f")
    done < <(git diff --name-only --diff-filter=ACMR 2>/dev/null; git diff --cached --name-only --diff-filter=ACMR 2>/dev/null)
    # Deduplicate
    mapfile -t FILES < <(printf '%s\n' "${FILES[@]}" | sort -u)
    ;;
  --app)
    APP="${2:-}"
    if [[ -z "$APP" ]]; then
      echo "Error: --app requires an app name (e.g., studio, admin, dashboard)"
      exit 1
    fi
    while IFS= read -r f; do
      [[ -n "$f" ]] && FILES+=("$f")
    done < <(find "apps/$APP" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) 2>/dev/null)
    ;;
  *)
    # Single file or list of files
    for arg in "$@"; do
      FILES+=("$arg")
    done
    ;;
esac

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No files to check."
  exit 0
fi

for f in "${FILES[@]}"; do
  check_file "$f"
done

echo ""
if [[ $VIOLATIONS -gt 0 ]]; then
  echo -e "${RED}Found $VIOLATIONS DS violation(s) in $CHECKED file(s).${NC}"
  echo "See CLAUDE.md 'STRICT: No Hardcoded Styles' for the full token reference."
  exit 1
else
  echo -e "Checked $CHECKED file(s) — ${CYAN}clean${NC}."
  exit 0
fi
