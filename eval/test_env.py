import os
import sys

# Add the project root to the Python path to allow importing 'simulation'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from simulation.railway_env import RailwayEnv

def main():
    print("Initialize RailwayEnv...")
    env = RailwayEnv(
        network_config="data/network_config.json",
        timetable_path="data/synthetic_timetable.csv" # Default parameter might be looking for data/timetable.csv but workspace has synthetic_timetable.csv
    )
    
    print("Reset environment...")
    obs, info = env.reset()
    
    # Assert observation shape
    assert obs.shape == (102,), f"Expected observation shape (102,), but got {obs.shape}"
    print(f"Initial observation shape correct: {obs.shape}")
    
    print("Running 10 random steps...")
    for step in range(1, 11):
        # Sample random action
        action = env.action_space.sample()
        
        # Take step in the environment
        obs, reward, terminated, truncated, info = env.step(action)
        
        # Print results
        print(f"Step {step:2d} | Reward: {reward:7.2f} | Terminated: {terminated} | Truncated: {truncated}")
        
        if terminated or truncated:
            print("Episode ended early!")
            break
            
    print("Sanity check completed successfully!")

if __name__ == "__main__":
    main()
