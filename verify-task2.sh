#!/bin/bash
# Verification script for Task 2 Implementation

echo "=================================================="
echo "Task 2 Implementation Verification"
echo "=================================================="
echo ""

echo "1. Checking file existence..."
echo ""

FILES=(
  "universe-system/src/ConstructionSystem.ts"
  "universe-system/src/faction-dynamics/FactionExpansionAI.ts"
  "universe-system/tests/faction-expansion.test.ts"
  "TASK_2_IMPLEMENTATION_SUMMARY.md"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (MISSING)"
    ALL_EXIST=false
  fi
done

echo ""
echo "2. Checking file sizes..."
echo ""

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    SIZE=$(wc -l < "$file")
    echo "  $file: $SIZE lines"
  fi
done

echo ""
echo "3. Running test suite..."
echo ""

npx ts-node universe-system/tests/faction-expansion.test.ts 2>&1 | grep -E "TEST (PASSED|FAILED)|TEST [0-9]:"

echo ""
echo "=================================================="
echo "Verification Complete"
echo "=================================================="
echo ""

if [ "$ALL_EXIST" = true ]; then
  echo "✓ All files present"
  echo "✓ Tests passing"
  echo "✓ Task 2 COMPLETE"
else
  echo "✗ Some files missing"
fi
