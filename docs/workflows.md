# Workflows

The Phase 1 source-evidence workflow is: retrieve or import → immutable source → normalize → extract observations → propose classified claims → attach directional evidence → create and prioritize questions.

The Phase 2 thesis workflow is: prioritized question → source/evidence → claims → testable hypothesis → initial thesis revision → conditions, risks, catalysts, and forecasts → new evidence → explicit contradiction → revised thesis → “what changed”.

`src/tests/slm-phase2-eval.test.ts` executes this flow with a clearly marked synthetic SLM Grad PLUS fixture. It ends in `CONFLICTED` with an insufficient-evidence conclusion; it is an evaluation of the workflow, not investment research or a recommendation.
