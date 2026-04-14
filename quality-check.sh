#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

step() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  STEP $1: $2${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

pass() { echo -e "${GREEN}  ✓ PASS${NC}"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}  ✗ FAIL${NC}"; FAIL=$((FAIL + 1)); }
warn() { echo -e "${YELLOW}  ⚠ WARN${NC}"; WARN=$((WARN + 1)); }

# ─── Step 1: TypeScript Compilation ───
step 1 "TypeScript — type checking"
if npx tsc --noEmit 2>&1; then
  pass
else
  fail
fi

# ─── Step 2: ESLint — static analysis ───
step 2 "ESLint — sonarjs + security + unicorn"
set +e
ESLINT_OUTPUT=$(npx eslint . --max-warnings 65 2>&1)
ESLINT_EXIT=$?
set -e
echo "$ESLINT_OUTPUT"
if [ $ESLINT_EXIT -eq 0 ]; then
  if echo "$ESLINT_OUTPUT" | grep -q "warning"; then
    warn
  else
    pass
  fi
else
  # Check for actual errors (not "0 errors" in the summary)
  if echo "$ESLINT_OUTPUT" | grep -qE "^\s+[0-9]+:[0-9]+\s+error\s"; then
    fail
  else
    warn
  fi
fi

# ─── Step 3: Knip — unused exports & dependencies ───
step 3 "Knip — unused exports & dependencies"
if npx knip 2>&1; then
  pass
else
  warn
fi

# ─── Step 4: jscpd — copy-paste detection ───
step 4 "jscpd — copy-paste detection"
if npx jscpd apps/ packages/ 2>&1; then
  pass
else
  warn
fi

# ─── Step 5: dependency-cruiser — circular deps ───
step 5 "dependency-cruiser — circular dependencies"
if npx depcruise apps/command-center/app --config .dependency-cruiser.cjs 2>&1; then
  pass
else
  fail
fi

# ─── Step 6: Nx build ───
step 6 "Nx — production build"
if npx nx run-many -t build 2>&1; then
  pass
else
  fail
fi

# ─── Step 7: Package audit ───
step 7 "npm audit — security vulnerabilities"
if npm audit --omit=dev 2>&1; then
  pass
else
  warn
fi

# ─── Summary ───
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  QUALITY REPORT${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}PASS: ${PASS}${NC}  ${YELLOW}WARN: ${WARN}${NC}  ${RED}FAIL: ${FAIL}${NC}  (total: $((PASS + WARN + FAIL))/7)"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}  Quality gate FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}  Quality gate PASSED${NC}"
  exit 0
fi
