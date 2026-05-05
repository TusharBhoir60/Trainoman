import os
import sys

# Add the project root to the python path so it can find "simulation"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from stable_baselines3.common.callbacks import CheckpointCallback
from sb3_contrib import MaskablePPO

from simulation.railway_env import RailwayEnv

def main():
    # Make sure output directories exist
    os.makedirs("./checkpoints/ppo/", exist_ok=True)
    os.makedirs("./models/", exist_ok=True)
    os.makedirs("./tensorboard_logs/", exist_ok=True)

    timetable_path = os.path.join(BASE_DIR, "data", "timetable.csv")
    network_path = os.path.join(BASE_DIR, "data", "network_config.json")

    # Initialize the Railway Environment
    env = RailwayEnv(network_config=network_path, timetable_path=timetable_path)

    # Set up a checkpoint callback to save the model every 10,000 steps
    checkpoint_callback = CheckpointCallback(
        save_freq=10000,
        save_path="./checkpoints/ppo/",
        name_prefix="rl_model"
    )

    # Initialize the MaskablePPO model with an MLP policy
    # We use MaskablePPO because the environment provides action masks via SecurityValidator
    model = MaskablePPO(
        "MlpPolicy",
        env,
        learning_rate=3e-4,
        tensorboard_log="./tensorboard_logs/",
        verbose=1
    )

    print("Starting training with MaskablePPO...")
    
    # Train the model
    model.learn(
        total_timesteps=500000,
        callback=checkpoint_callback
    )

    print("Training complete! Saving the final model...")
    
    # Save the final trained model
    model.save("./models/ppo_railway_final.zip")

if __name__ == "__main__":
    main()
