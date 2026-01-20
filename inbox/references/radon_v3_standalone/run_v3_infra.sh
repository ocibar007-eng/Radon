#!/bin/bash

# Kill ports 8001 (Python) and 3005 (Node) just in case
lsof -ti:8001 | xargs kill -9 2>/dev/null
lsof -ti:3005 | xargs kill -9 2>/dev/null

echo "🚀 Starting Radon V3 Demo Infrastructure..."

# 1. Install Python Deps
echo "📦 Installing Python dependencies..."
pip install fastapi uvicorn pydantic > /dev/null 2>&1

# 2. Start Calculator Service (Background)
echo "🐍 Starting Python Calculator Service on :8001..."
python3 src/services/calculator/calculator_service.py &
PID_PYTHON=$!

# Wait for python to boot
sleep 2

# 3. Start Node Orchestrator (Background)
# Attempt to use ts-node via npx
echo "🤖 Starting Node Orchestrator API on :3005..."
npx ts-node src/core/radon-agents/api_server.ts &
PID_NODE=$!

echo "✅ Infrastructure Ready!"
echo "   - python-calc: http://localhost:8001"
echo "   - node-orch:   http://localhost:3005"
echo ""
echo "👉 Use the Frontend to run tests."
echo "Press CTRL+C to stop services."

# Trap cleanup
trap "kill $PID_PYTHON $PID_NODE; exit" INT
wait
