#!/bin/bash

# Watch for test results file and display updates
RESULTS_FILE="test-results/results.json"
LAST_SIZE=0

echo "Watching for test results in $RESULTS_FILE..."
echo "Press Ctrl+C to stop"
echo ""

# Create results directory if it doesn't exist
mkdir -p test-results

while true; do
  if [ -f "$RESULTS_FILE" ]; then
    CURRENT_SIZE=$(stat -f%z "$RESULTS_FILE" 2>/dev/null || stat -c%s "$RESULTS_FILE" 2>/dev/null || echo 0)
    
    if [ "$CURRENT_SIZE" != "$LAST_SIZE" ]; then
      echo "=== Test Results Updated ==="
      echo "$(date '+%Y-%m-%d %H:%M:%S')"
      echo ""
      
      # Parse and display results
      if command -v jq &> /dev/null; then
        echo "Summary:"
        jq -r '.stats | "Total: \(.total) | Passed: \(.passed) | Failed: \(.failed) | Skipped: \(.skipped)"' "$RESULTS_FILE" 2>/dev/null || echo "Parsing results..."
        echo ""
        echo "Failed Tests:"
        jq -r '.suites[].specs[] | select(.tests[].results[].status == "failed") | "- \(.title)"' "$RESULTS_FILE" 2>/dev/null || echo "No failed tests or parsing error"
      else
        echo "Install 'jq' for better output formatting"
        echo "Results file size: $CURRENT_SIZE bytes"
        tail -20 "$RESULTS_FILE"
      fi
      
      echo ""
      echo "---"
      echo ""
      
      LAST_SIZE=$CURRENT_SIZE
    fi
  fi
  
  sleep 2
done


