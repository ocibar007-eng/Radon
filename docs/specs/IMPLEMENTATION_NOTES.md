# Implementation Notes

## Prompt Reference
- Latest prompt reference for TC/RM: `inbox/references/PROMPTS/PROMPTS APRIMORADOS TC E RM (2) - MOD V8.7.9.md`.
- When implementing (Blocos 7-8+), create a step-by-step plan per block and review together.
- Preserve the arcabouco (structure, separators, tone, missing data handling, comparison logic, impression logic) to keep output consistent with current workflow.
- Identify what is transferable to other modalities and what needs adaptation; document decisions per block.

## Working Agreement
- Before implementing any block, discuss scope and show: what will be reused, what will be excluded, and suggested improvements; wait for explicit OK.
- Share proposed changes up front (draft plan + deltas) and only proceed after review.
- Provide a per-modality adaptation plan (e.g., torax, neuro, MSK) with what is reusable vs. what must change.
- List what inputs are needed from the user for each modality before starting.
- Keep these preferences here to persist across context resets.

## Deferred Implementation Plan (Quick Actions + Prior Findings)
- Goal: add UI quick actions so the user can insert or reuse content without dictating, starting with "reuse prior findings".
- Phase 1 (data model): add a session-level flag to track "reuse prior findings" and whether the prior report is the user's own.
- Phase 2 (UI): add a dedicated button/toggle in the report workspace to set the flag; show a short tooltip explaining behavior.
- Phase 3 (pipeline): pass the flag into the prompt context so the LLM can copy prior findings only when explicitly enabled.
- Phase 4 (safety): ensure impression is still computed from current exam; prior findings are guidance only.
- Phase 5 (tests): add a minimal unit test to confirm the flag is persisted and injected into the prompt context.
- Future quick actions (to define together): buttons for reusable phrases, standardized sections, or common constraints (e.g., fixed protocol text).

## Deferred Implementation Plan (Comparison + Protocol Selector)
- Goal: add UI controls to select comparison logic and protocol type before prompt generation.
- Phase 1 (data model): add fields for `comparison_mode` and `protocol_type` on the session/case bundle.
- Phase 2 (UI): add two buttons/toggles: Comparison Selector (none / same service / external report / external images) and Protocol Selector (routine / oncologic / adrenal / uro / other).
- Phase 3 (pipeline): pass the selected comparison/protocol into prompt context; override any auto-detection when user explicitly sets.
- Phase 4 (safety): if user selects a mode without required data (e.g., external images missing), insert **<VERIFICAR>** and log in internal audit.
- Phase 5 (tests): assert selectors persist in session and are injected into prompt context.
