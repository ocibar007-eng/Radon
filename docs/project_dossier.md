# Project Dossier – Radon

## Overview
The **Radon** project is a comprehensive AI‑powered radiology platform that processes medical imaging PDFs, extracts structured data, and presents it through a premium web UI. It integrates with Gemini AI, Firebase, and Vercel, offering features such as OCR batch processing, multi‑document grouping, clinical summary generation, and a modular architecture for agents.

## Core Objectives
- **Accurate extraction** of radiology report data from PDFs using OCR and Gemini prompts.
- **Structured representation** of findings, clinical summary, and patient metadata.
- **Premium UI/UX** with glassmorphism, dynamic animations, and responsive design.
- **Scalable backend** leveraging serverless functions, Firebase storage, and Vercel deployments.
- **Extensible agent framework** for future radiology AI agents (Calculator, Findings, Auditor, etc.).

## Architecture Overview
- **Frontend** (`/frontend`): React + Vite, premium design system, Tailwind‑free custom CSS, dynamic components (`ReportGroupCard`, `MultiDocumentTabs`).
- **Backend** (`/api`): Node.js/TypeScript serverless functions on Vercel, handling OCR, Gemini API calls, and Firebase interactions.
- **Agents** (`/agents`): Python services (Calculator) and TypeScript bridges, orchestrated by an Orchestrator.
- **Data Contracts** (`/contracts`): Shared TypeScript interfaces and Python schemas for consistent data shapes.
- **Observability** (`/observability`): Telemetry, logging, and performance guards.

## Key Components
| Component | Description | Language | Location |
|-----------|-------------|----------|----------|
| OCR Batch Processor | Isolated UI for batch PDF processing | React/TS | `frontend-ocr-batch-processor` |
| Calculator Service | Deterministic arithmetic service for agents | Python | `services/calculator` |
| Findings Agent | Generates radiology findings using Gemini prompts | TS/Python | `agents/findings` |
| Orchestrator | Coordinates agents, handles workflow | TS | `orchestrator` |
| UI Components | Premium design system, glassmorphism, animations | React/TS | `components/` |
| Vercel Deployments | CI/CD pipeline, environment management | N/A | Vercel dashboard |

## Recent Development Highlights
- **Security**: Fixed Gemini API key leak, rotated keys, and hardened environment variable handling.
- **UI Refresh**: Implemented premium design tokens, glassmorphism, and dynamic animations across the app.
- **Agent Framework**: Added deterministic calculator, initial Findings Agent, and Orchestrator scaffolding.
- **Documentation**: Created extensive specs in `docs/specs/`, including implementation notes and starter guides.
- **Performance**: Integrated `radon-performance-cost-guard` to monitor AI token usage and batch processing costs.
- **Observability**: Added telemetry hooks via `radon-observability-telemetry`.

## Documentation Structure
- `docs/specs/IMPLEMENTATION_NOTES.md` – Detailed implementation decisions.
- `docs/specs/COMECE_AQUI.md` – Quick start guide for new contributors.
- `docs/specs/` – Additional specs, design docs, and workflow definitions.
- `.agent/skills/` – Reusable skill modules for data contracts, debugging, UX design, etc.
- `.agent/workflows/` – Defined workflows for common tasks (e.g., `/commit`, `/debug-dark-mode`).

## How to Use This Dossier
1. **Share with AI**: Provide this markdown to any LLM for onboarding or code‑base analysis.
2. **Onboarding**: New developers can read the Overview and Architecture sections to understand the system.
3. **Reference**: Use the component table to locate source files for specific features.
4. **Extend**: Follow the documented workflows and skills to add new agents or UI components.

## Future Roadmap (High‑Level)
- Complete the **Findings Agent** prompt refinement and integration.
- Implement **Audit & Banlist** agents for quality assurance.
- Expand **Observability** with custom metrics dashboards.
- Refine **Multi‑Document Grouping** logic for edge cases.
- Deploy **Production‑grade CI/CD** with automated tests via `radon-qa`.

---
*Generated on 2026‑01‑20 by Antigravity (AI coding assistant).*
