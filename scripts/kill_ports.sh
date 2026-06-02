#!/bin/bash

PORTS=(5001 5002 5003 5004 5005 5006)

for port in "${PORTS[@]}"; do
  PIDS=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$PIDS" ]; then
    echo "Found PID(s) $PIDS on port $port"
    echo "$PIDS" | xargs kill -9
    echo "Killed PID(s) $PIDS"
  else
    echo "No process on port $port"
  fi
done

echo ""
echo "----- Ports after cleanup -----"
for port in "${PORTS[@]}"; do
  RESULT=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$RESULT" ]; then
    echo "Port $port: still in use by PID $RESULT"
  else
    echo "Port $port: free"
  fi
done
