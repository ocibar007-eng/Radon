#!/bin/bash

# Kill ports to ensure clean start
lsof -ti :3005 | xargs kill -9 2>/dev/null
lsof -ti :8001 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null

echo "🚀 Starting Radon V3 Standalone Environment..."

# 1. Start Python Calculator
echo "🐍 Starting Python Service..."
cd services/calculator
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
uvicorn calculator_service:app --host 0.0.0.0 --port 8001 &
PYTHON_PID=$!
cd ../..

# 2. Start Node Orchestrator
echo "🤖 Starting Node Orchestrator..."
# We assume root node_modules exists, but we can also install locally if needed.
# For standalone isolation, let's install minimal deps here if missing.
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Backend Deps..."
    npm init -y > /dev/null
    npm install express cors zod axios > /dev/null
    npm install --save-dev typescript ts-node @types/express @types/cors @types/node > /dev/null
fi

# Run with ts-node. Needs specific tsconfig or just generic execution.
# Since we didn't set up a full backend project structure, we use npx ts-node directly.
# api_server.ts imports relative paths.
npx ts-node core/radon-agents/api_server.ts &
NODE_PID=$!

# 3. Start Frontend
echo "🎨 Starting Frontend..."
cd ui
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Frontend Deps..."
    npm install > /dev/null
fi
npm run dev -- --host &
UI_PID=$!
cd ..

echo "✅ Environment Running!"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend:  http://localhost:3005"
echo "   - Python:   http://localhost:8001"
echo ""
echo "Press CTRL+C to stop all services."

trap "kill $PYTHON_PID $NODE_PID $UI_PID; exit" INT
wait
