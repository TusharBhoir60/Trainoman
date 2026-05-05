import gymnasium as gym
from gymnasium import spaces
import numpy as np
from simulation.simulator import Simulator
from simulation.safety import SafetyValidator  # Optional if just keeping the one inside simulator

class RailwayEnv(gym.Env):
    metadata = {"render_modes": ["human"]}

    def __init__(self, network_config: str = "data/network_config.json", timetable_path: str = "data/timetable.csv"):
        super().__init__()
        self.N_TRAINS = 20
        self.N_STATIONS = 12
        self.N_ACTIONS = 5
        
        self.simulator = Simulator(network_config, timetable_path)
        self.safety = self.simulator.safety # Access safety validator initialized in simulator
        
        # observation_space: 20 trains * 5 features + 2 global = 102 features
        self.observation_space = spaces.Box(
            low=0.0, high=1.0, 
            shape=(102,), 
            dtype=np.float32
        )
        
        # action_space: 12 stations, each taking an action from 0 to 4
        self.action_space = spaces.MultiDiscrete([self.N_ACTIONS] * self.N_STATIONS)

    def reset(self, seed=None, options=None) -> tuple[np.ndarray, dict]:
        super().reset(seed=seed)
        self.simulator.reset()
        return self._get_obs(), {}

    def step(self, action: np.ndarray) -> tuple[np.ndarray, float, bool, bool, dict]:
        # Formulate action dict for the simulator
        actions_dict = {}
        for i, act in enumerate(action):
            # Ensure we only map valid indices from stations order
            if i < min(self.N_STATIONS, len(self.simulator.network._stations_order)):
                st_id = self.simulator.network._stations_order[i]
                actions_dict[st_id] = int(act)

        # Apply tick
        self.simulator.tick(actions_dict)

        # Calculate reward
        active_trains = self.simulator.trains
        total_delay = sum(t.delay_mins for t in active_trains)
        
        # reward = -sum(delay)
        reward = -total_delay

        # Terminated if all trains reached their destinations
        # Assuming next_station == "" signifies termination in simulator.py based on previous logic
        terminated = len(active_trains) > 0 and all(t.next_station == "" for t in active_trains)
        truncated = self.simulator.tick_count >= self.simulator.MAX_TICKS

        return self._get_obs(), float(reward), terminated, truncated, {}

    def _get_obs(self) -> np.ndarray:
        obs_list = []
        for t in self.simulator.trains[:self.N_TRAINS]:
            obs_list.append(t.to_obs_vector(self.simulator.network))
            
        # Pad inactive train slots with zeros
        while len(obs_list) < self.N_TRAINS:
            obs_list.append(np.zeros(5, dtype=np.float32))
            
        obs_flat = np.concatenate(obs_list)
        
        # 2 global features: total_delay/300, tick/MAX_TICKS
        total_delay = sum(t.delay_mins for t in self.simulator.trains)
        # Cap normalized values to 1.0 to fit Box(0, 1) cleanly, though delay could technically exceed
        delay_feat = min(total_delay / 300.0, 1.0)
        tick_feat = self.simulator.tick_count / float(self.simulator.MAX_TICKS)
        
        global_feats = np.array([delay_feat, tick_feat], dtype=np.float32)
        
        return np.concatenate([obs_flat, global_feats])

    def action_masks(self) -> np.ndarray:
        mask = self.safety.get_action_mask(self.simulator.trains, self.simulator.network, self.simulator.tick_count)
        return mask.flatten()

    def render(self):
        active_trains = self.simulator.trains
        if not active_trains:
            mean_delay = 0.0
        else:
            mean_delay = sum(t.delay_mins for t in active_trains) / len(active_trains)
            
        print(f"Tick: {self.simulator.tick_count} | Mean Delay: {mean_delay:.2f} mins")
