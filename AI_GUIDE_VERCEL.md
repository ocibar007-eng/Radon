# AI Deployment & Maintenance Guide (Vercel) 🤖

This document is intended for AI agents (Claude, GPT, Gemini, etc.) interacting with this repository. It explains how to maintain the "Radon Lite" deployment on Vercel.

## 📌 Project Context
- **Product Name:** Radon Lite (radon-lite.vercel.app)
- **Technical ID (Vercel):** `app-ocr-v6` (linked via `.vercel/project.json`)
- **Framework:** Vite + React 19 (SPA)

## 🚀 How to Deploy Updates
When you make code changes and want to push them to production, run:
```bash
npx vercel --prod --yes
```
*Note: `--yes` skips confirmation prompts, and `--prod` targets the production domain.*

## 🔑 Environment Variables & Security
The project uses `GEMINI_API_KEY` and several `FIREBASE_*` variables.
- **Mapping:** `vite.config.ts` maps these to `process.env` for the browser bundle.
- **Viewing Envs:** `npx vercel env ls`
- **Adding/Updating Envs:**
  ```bash
  npx vercel env add KEY_NAME production
  # Follow prompt or pipe value:
  printf "value" | npx vercel env add KEY_NAME production
  ```

## 🛠 Troubleshooting for AI Agents
1. **White Screen/Console Errors:** Check if `API_KEY` is missing in `process.env`. The app requires these keys to initialize Firebase/Gemini.
2. **Build Failures:** Check `npx vercel logs`. Common causes are missing dependencies in `package.json` or TypeScript errors.
3. **Rebranding:** If updating titles/icons, ensure `index.html` (title/favicon) and `package.json` (name) are synced.

---
*Maintained by Antigravity AI — January 2026*
