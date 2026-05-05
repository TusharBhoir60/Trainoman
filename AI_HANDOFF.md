# Trainoman - Project Context & Handoff Document

## Project Overview
**Trainoman** is a railway simulation and Reinforcement Learning (RL) environment aimed at train scheduling, routing, and dispatching. It is specifically modeled around the **Mumbai Western Line** (Churchgate to Borivali) with varying train types (Fast/Express, Slow) and traffic directions (UP and DN). 

The goal of the system is to provide a comprehensive training environment where an RL agent can make decisions on signals, routing, and platform assignments without violating strict safety rules. 

## Directory Structure
- `agents/`: Contains reinforcement learning agent logic (`basline.py`, `train.py`).
- `api/`: Backend API layers (`main.py`, `websocket.py`) to serve the simulation state to the frontend or external clients.
- `data/`: Configurations and timetables. Includes `network_config.json` for topology and CSV timetables.
- `eval/`: Evaluation metrics and reports (`run_eval.py`, `report.py`) to measure agent performance.
- `frontend/`: The UI layer (React/JSX) to visualize the simulation (e.g., `src/App.jsx`).
- `simulation/`: The core environment logic modeling the physical world (`network.py`, `safety.py`, `simulator.py`, `train.py`).

## Recent Progress & Implemented Modules

### 1. Timetable Generation (`data/generate_timetable.py`)
- **Status:** Completed
- **Details:** Created a Python script to generate highly realistic synthetic timetables (`synthetic_timetable.csv`) for the Mumbai Western line.
- **Features:** 
  - Handles 22 stations.
  - Distinguishes between **Fast (Express)** and **Slow** lines.
  - Alternates **UP and DN** directions.
  - Predicts realistic arrival (`arr_str`) and departure (`dep_str`) times.
  - Assigns realistic platform numbers (e.g., platforms 1/2 for slow, 3/4 for fast).

### 2. Network Topology & State (`simulation/network.py`)
- **Status:** Initialized
- **Details:** Implemented the `RailwayNetwork` class handling the physical infrastructure.
- **Features:**
  - Uses `networkx.MultiDiGraph()` to represent the track layout (stations/junctions as nodes, tracks/blocks as edges).
  - Designed to load nodes and edges dynamically via a JSON config (`network_config.json`).
  - Maintains states for edge occupancy, tracking which train ID occupies which track block.
  - Methods implemented: `get_valid_routes`, `occupy`, `free`, `is_clear`.

### 3. Safety Validator (`simulation/safety.py`)
- **Status:** Initialized (Core structure ready, collision logic stubbed out)
- **Details:** Implemented the `SafetyValidator` class as an "uncrossable gate". 
- **Purpose:** Runs BEFORE any action is taken by the agent, generating an **action mask** to ensure the environment never enters an unsafe state. The agent only gets to choose from safe actions (value `1` in the action mask).
- **Enforced Rules:**
  1. No two trains on the same block (edge) simultaneously.
  2. Absolute minimum headway gaps (`MIN_HEADWAY_TICKS` = 6 ticks, or 3 mins).
  3. No platform double-booking.

## What Needs to be Done Next (For the Next AI)
1. **Connect `_would_collide` in `SafetyValidator`**: Implement the actual graph traversal checks using the states provided by `network.py`.
2. **Setup the RL Environment Wrappers (`simulator.py`)**: Integrate `network.py` and `safety.py` into a standard RL step function (e.g., OpenAI Gym/PettingZoo architecture).
3. **Draft the `network_config.json`**: Map the actual nodes and edge links for the Churchgate-Borivali track.
4. **Implement Frontend Visualization (`frontend/src/App.jsx`)**: Connect via websockets to visualize the real-time simulation movements and agent decisions.
