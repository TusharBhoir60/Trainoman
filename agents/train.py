import os
import numpy as np
from stable_baselines3 import DQN
from sb3_contrib import MaskablePPO
from sb3_contrib.common.wrappers import ActionMasker
from stable_baselines3.common.callbacks import EvalCallback
from stable_baselines3.common.monitor import Monitor

from simulation.env import RailwayEnv
from agents.baseline import RuleBasedAgent

def mask_fn(env: RailwayEnv) -> np.ndarray:
    return env.simulator.safety.get_action_mask(env.simulator.trains, env.simulator.network).flatten()

def evaluate_agent(agent, env, num_episodes=5):
    """
    Evaluates an agent. If it is a Maskable agent, uses masks.
    """
    total_rewards = []
    total_delays = []
    total_on_time = []
    
    for _ in range(num_episodes):
        obs, info = env.reset()
        done = False
        episode_reward = 0.0
        
        while not done:
            if hasattr(agent, "predict"):
                if isinstance(agent, MaskablePPO):
                    action_masks = mask_fn(env.unwrapped)
                    action, _ = agent.predict(obs, action_masks=action_masks, deterministic=True)
                elif isinstance(agent, RuleBasedAgent):
                    action, _ = agent.predict(obs, action_masks=info.get("action_masks"))
                else:
                    action, _ = agent.predict(obs, deterministic=True)
            else:
                action = env.action_space.sample()  # fallback
                
            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated
            episode_reward += reward
            
        total_rewards.append(episode_reward)
        total_delays.append(env.simulator.metrics["total_delay_mins"])
        
        # Calculate trailing on-time %
        completed_trains = len(env.simulator.trains)
        if completed_trains > 0:
            on_time_count = sum(1 for t in env.simulator.trains if t.delay_mins < 2.0)
            total_on_time.append((on_time_count / completed_trains) * 100.0)
        else:
            total_on_time.append(0.0)
            
    return np.mean(total_rewards), np.mean(total_delays), np.mean(total_on_time)

def main():
    os.makedirs("checkpoints/dqn", exist_ok=True)
    os.makedirs("checkpoints/ppo", exist_ok=True)

    print("Initializing environment...")
    base_env = RailwayEnv()
    
    # Needs Monitor for EvalCallback to work reliably
    env = Monitor(base_env)
    
    # We define the masked environment mapping
    masked_env = ActionMasker(env, mask_fn)

    # 1. DQN
    print("\n--- Training DQN ---")
    dqn_model = DQN(
        policy="MlpPolicy",
        env=env,
        policy_kwargs=dict(net_arch=[256, 256]),
        learning_rate=1e-4,
        buffer_size=100000,
        batch_size=64,
        gamma=0.99,
        target_update_interval=1000,
        exploration_fraction=0.3,
        verbose=1
    )
    
    dqn_eval_callback = EvalCallback(
        env,
        best_model_save_path="checkpoints/dqn/",
        log_path="checkpoints/dqn/",
        eval_freq=10000,
        deterministic=True,
        render=False
    )
    
    dqn_model.learn(total_timesteps=500000, callback=dqn_eval_callback)

    # 2. Maskable PPO
    print("\n--- Training Maskable PPO ---")
    ppo_model = MaskablePPO(
        policy="MlpPolicy",
        env=masked_env,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        verbose=1
    )
    
    ppo_eval_callback = EvalCallback(
        masked_env,
        best_model_save_path="checkpoints/ppo/",
        log_path="checkpoints/ppo/",
        eval_freq=10000,
        deterministic=True,
        render=False
    )
    
    ppo_model.learn(total_timesteps=500000, callback=ppo_eval_callback)

    # 3. RuleBased Baseline
    print("\n--- Evaluating agents ---")
    baseline = RuleBasedAgent()
    eval_env = base_env  # Raw, without Monitors or Wrappers wrappers ideally for pure logic
    
    print("Evaluating Baseline...")
    rba_rew, rba_del, rba_ont = evaluate_agent(baseline, eval_env)
    
    # Load best models instead of last state models
    print("Evaluating Best DQN...")
    try:
        best_dqn = DQN.load("checkpoints/dqn/best_model")
        dqn_rew, dqn_del, dqn_ont = evaluate_agent(best_dqn, eval_env)
    except:
        print("Cannot find best model, evaluating active state.")
        dqn_rew, dqn_del, dqn_ont = evaluate_agent(dqn_model, eval_env)

    print("Evaluating Best MaskablePPO...")
    try:
        best_ppo = MaskablePPO.load("checkpoints/ppo/best_model")
        ppo_rew, ppo_del, ppo_ont = evaluate_agent(best_ppo, ActionMasker(eval_env, mask_fn))
    except:
        print("Cannot find best model, evaluating active state.")
        ppo_rew, ppo_del, ppo_ont = evaluate_agent(ppo_model, ActionMasker(eval_env, mask_fn))

    print("\n================== COMPARISON TABLE ==================")
    print(f"| {'Agent':<20} | {'Mean Reward':<12} | {'Mean Delay':<12} | {'On Time %':<12} |")
    print("-" * 65)
    print(f"| {'Rule-Based Baseline':<20} | {rba_rew:<12.2f} | {rba_del:<12.2f} | {rba_ont:<11.2f}% |")
    print(f"| {'DQN':<20} | {dqn_rew:<12.2f} | {dqn_del:<12.2f} | {dqn_ont:<11.2f}% |")
    print(f"| {'Maskable PPO':<20} | {ppo_rew:<12.2f} | {ppo_del:<12.2f} | {ppo_ont:<11.2f}% |")
    print("======================================================")

if __name__ == "__main__":
    main()
