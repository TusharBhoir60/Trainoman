# Project Clarifications (Trainoman)

This file clarifies naming and structure details for the current workspace.

## Why this file exists

The main `readme.md` contains the broader project narrative and architecture, but parts of it use older names from an earlier draft. This file maps those references to the actual files and folders present in this repository.

## Current repository name

- Repository/workspace folder in this setup: `Trainoman`
- Some README examples still refer to `mumbai-railway-ai` as a generic project name.

## Folder and file naming notes

- `agents/baseline.py` exists (not `agents/baseline_rule.py`)
- `agents/train.py` and `agents/train_agents.py` both exist
- Scenario directory in this repo is currently `data/scenerios/`
  - Note the spelling: `scenerios` (not `scenarios`)
- Main documentation file is `readme.md` (lowercase)

## Practical run flow (current)

1. Python environment and dependencies
   - Create/activate a virtual environment
   - Install backend dependencies from project requirements
2. Start backend API
   - Run the FastAPI service from `api/main.py`
3. Start frontend dashboard
   - In `frontend/`, install dependencies and run Vite dev server
4. Train/evaluate agents
   - Training scripts are in `agents/`
   - Evaluation scripts are in `eval/`

## Suggested cleanup (optional)

- Rename `data/scenerios/` to `data/scenarios/` and update all references.
- Keep one canonical training entrypoint in `agents/` and document it in `readme.md`.
- Add explicit backend/frontend run commands to `readme.md` matching actual scripts.
