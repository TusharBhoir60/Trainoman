import numpy as np

class RuleBasedAgent:
    """
    A rule-based baseline agent that acts as a performance floor.
    Matches Stable Baselines 3 `predict` interface.
    """
    def __init__(self, n_stations=12, n_actions=5):
        self.n_stations = n_stations
        self.n_actions = n_actions

    def predict(self, observation, state=None, episode_start=None, deterministic=False, action_masks=None, masks=None, **kwargs):
        """
        SB3 predict signature.
        observation: np.ndarray of shape (102,) or (batch_size, 102)
        masks: action mask of shape (N_STATIONS * N_ACTIONS,) either flat or batched
        """
        # Unify masks argument depending on SB3 or sb3-contrib usage
        actual_masks = action_masks if action_masks is not None else masks
        
        is_batch = len(observation.shape) > 1
        if not is_batch:
            observation = np.expand_dims(observation, axis=0)
            if actual_masks is not None:
                actual_masks = np.expand_dims(actual_masks, axis=0)
                
        batch_size = observation.shape[0]
        actions = np.zeros((batch_size, self.n_stations), dtype=int)
        
        for b in range(batch_size):
            obs = observation[b]
            if actual_masks is not None:
                b_mask = actual_masks[b].reshape((self.n_stations, self.n_actions))
            else:
                b_mask = np.ones((self.n_stations, self.n_actions), dtype=np.float32)
                
            # Parse trains from observation
            # obs consists of N_TRAINS (20) segments of 5 floats, plus 2 global features
            trains = []
            for i in range(20):
                st_norm, segment, delay_norm, express, at_plat = obs[i*5 : i*5 + 5]
                # If train is at a platform
                if at_plat > 0.5: 
                    st_idx = int(round(st_norm * 11))
                    delay_mins = delay_norm * 30.0
                    trains.append({
                        'station': st_idx,
                        'express': express > 0.5,
                        'delay': delay_mins
                    })
                    
            for s in range(self.n_stations):
                s_trains = [t for t in trains if t['station'] == s]
                
                # Default for no train or fail-safe
                if not s_trains:
                    actions[b, s] = 0  # RED
                    continue
                    
                # Priority 1: Express train waiting -> GREEN_FAST if crossover available else GREEN_SLOW
                has_express = any(t['express'] for t in s_trains)
                if has_express:
                    if b_mask[s, 3]:  # GREEN_FAST
                        actions[b, s] = 3
                        continue
                    elif b_mask[s, 2]:  # GREEN_SLOW
                        actions[b, s] = 2
                        continue
                        
                # Priority 2: Train with delay > 5 min -> GREEN_FAST if available
                has_delayed = any(t['delay'] > 5.0 for t in s_trains)
                if has_delayed:
                    if b_mask[s, 3]:  # GREEN_FAST
                        actions[b, s] = 3
                        continue
                    elif b_mask[s, 2]:  # GREEN_SLOW
                        actions[b, s] = 2
                        continue
                        
                # Priority 3: Longest waiting train (any remaining train at platform) -> GREEN_SLOW
                if b_mask[s, 2]:  # GREEN_SLOW
                    actions[b, s] = 2
                    continue
                    
                # Default
                actions[b, s] = 0
                
        if not is_batch:
            return actions[0], state
        return actions, state
