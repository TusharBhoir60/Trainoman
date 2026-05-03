import asyncio
import json
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

from stable_baselines3 import DQN
from simulation.env import RailwayEnv

from api.websocket import manager



# Global simulation state
app_state = {
    "play": False,
    "env": None,
    "agent": None
}

async def sim_loop():
    """Background simulator loop running at 2Hz"""
    while True:
        if app_state["play"] and app_state["env"] is not None:
            env = app_state["env"]
            sim = env.simulator
            obs = env._get_obs()
            
            if app_state["agent"] is not None:
                action, _ = app_state["agent"].predict(obs, deterministic=True)
            else:
                # Fallback to random if model fails to load
                action = env.action_space.sample()
                
            # RailwayEnv step correctly formats the dictionary actions for Simulator.tick()
            env.step(action)
            
            state = sim.get_state()
            
            # Broadcast latest state to websocket clients
            await manager.broadcast(state)
            
        await asyncio.sleep(0.5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("Initializing environment...")
    app_state["env"] = RailwayEnv()
    try:
        app_state["agent"] = DQN.load("checkpoints/dqn/best_model")
        print("Successfully loaded DQN model.")
    except Exception as e:
        print(f"Warning: Could not load DQN model from checkpoints/dqn/best_model. {e}")
        app_state["agent"] = None
        
    loop_task = asyncio.create_task(sim_loop())
    yield
    # Shutdown logic
    loop_task.cancel()

app = FastAPI(lifespan=lifespan)

# Enable CORS for localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/network")
async def get_network():
    config_path = "data/network_config.json"
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            return json.load(f)
    return {"error": "Network configuration not found"}

class ControlBody(BaseModel):
    action: str

@app.post("/api/control")
async def control(body: ControlBody):
    if body.action == "play":
        app_state["play"] = True
    elif body.action == "pause":
        app_state["play"] = False
    elif body.action == "reset":
        if app_state["env"]:
            app_state["env"].reset()
            state = app_state["env"].simulator.get_state()
            await manager.broadcast(state)
    return {"status": "success", "action": body.action}

class ScenarioBody(BaseModel):
    type: str  # e.g. "breakdown", "platform", "upstream", "rushhour"
    params: Dict[str, Any] = {}

@app.post("/api/scenario")
async def set_scenario(body: ScenarioBody):
    # Scenario execution stub
    print(f"Applying scenario: {body.type} with params {body.params}")
    return {"status": "scenario_applied", "type": body.type}

@app.websocket("/ws/state")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
