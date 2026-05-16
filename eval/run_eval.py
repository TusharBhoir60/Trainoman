import os
import sys
import numpy as np

# Add the project root to the Python path to allow importing 'simulation'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from simulation.railway_env import RailwayEnv
from sb3_contrib import MaskablePPO

def evaluate_model(num_episodes=1):
    print("Initializing environment...")
    timetable_path = os.path.join(BASE_DIR, "data", "timetable.csv")
    network_path = os.path.join(BASE_DIR, "data", "network_config.json")
    
    env = RailwayEnv(network_config=network_path, timetable_path=timetable_path)
    
    model_path = os.path.join(BASE_DIR, "models", "ppo_railway_final.zip")
    
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}")
        return
        
    print(f"Loading model from {model_path}...")
    model = MaskablePPO.load(model_path, env=env)
    
    print(f"\n--- Starting Evaluation ({num_episodes} Episodes) ---")
    
    for episode in range(1, num_episodes + 1):
        obs, _ = env.reset()
        terminated = False
        truncated = False
        total_reward = 0.0
        step_count = 0
        
        while not (terminated or truncated):
            # Get valid actions mask
            action_masks = env.action_masks()
            
            # Predict the next move deterministically
            action, _states = model.predict(obs, action_masks=action_masks, deterministic=True)
            
            # Step the environment
            obs, reward, terminated, truncated, _ = env.step(action)
            total_reward += reward
            step_count += 1
            
        print(f"\nEpisode {episode} Finished!")
        print(f"Total Steps: {step_count}")
        print(f"Cumulative Reward: {total_reward:.2f}")
        
        # Access simulator metrics
        sim = env.simulator
        completed_trips = sim.metrics.get("completed_trips", 0)
        
        # Calculate final total delay 
        final_total_delay = sum(t.delay_mins for t in sim.trains)
        avg_delay = final_total_delay / len(sim.trains) if sim.trains else 0.0
        
        cascades_prevented = sim._cascades_prevented
        
        print("Performance Metrics:")
        print(f"  - Completed Trips:    {completed_trips}/{len(sim.trains)}")
        print(f"  - Avg Delay (mins):   {avg_delay:.2f}")
        print(f"  - Cascades Prevented: {cascades_prevented}")

if __name__ == "__main__":
    evaluate_model(num_episodes=3)
