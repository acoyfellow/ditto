#!/bin/bash

# Kill processes on ports used by Alchemy dev servers
PORTS=(1337 1338 5173)

for PORT in "${PORTS[@]}"; do
  PID=$(lsof -ti:$PORT 2>/dev/null)
  if [ ! -z "$PID" ]; then
    echo "Killing process on port $PORT (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
  fi
done

echo "Ports cleared"

