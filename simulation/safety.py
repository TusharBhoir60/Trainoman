import numpy as np
from simulation.network import RailwayNetwork
from simulation.train import Train

class SafetyValidator:
    MIN_HEADWAY_TICKS = 6
    TICK_SECS = 30
    
    def __init__(self, network: RailwayNetwork):
        self.network = network

    def _would_collide(self, train: Train, action: int, network: RailwayNetwork, current_tick: int, all_trains: list[Train]) -> bool:
        """
        Enforce safety rules before allowing a train to proceed on an edge.
        Returns True if the action is UNSAFE (would collide or violate headway/platform limits).
        """
        if action not in (2, 3):
            # HOLD (4), RED (0), YELLOW (1) don't advance the train block so it's not a collision check here
            return False
            
        u = train.current_station
        v = train.next_station
        track_key = 0 if action == 2 else 1 # 2 is SLOW (0), 3 is FAST (1)
        
        # 1. Block Collision: Check if target edge is clear
        if not network.is_clear(u, v, track_key):
            return True
            
        # 2. Headway Constraint: Ensure train ahead is >= MIN_HEADWAY_TICKS away
        for other in all_trains:
            if other != train and not other.is_at_platform and other.current_station == u and other.next_station == v:
                # Naive time estimate: other.segment_pct could be translated to ticks. 
                # Better: assuming an edge takes >6 ticks to traverse, check if other just entered it
                # For this rule, we just assume if another train is on the same edge, we need to enforce spacing
                # By checking segment_pct, approx:
                if other.segment_pct < 0.1:  # if other train just entered recently
                    return True
                    
        # 3. Platform Mutex: Ensure target station platform no other train is occupying it
        for other in all_trains:
            if other != train and other.is_at_platform and other.current_station == v:
                # simple logic: if another train is currently at the target station platform, we can't send our train there
                return True
                
        return False

    def get_action_mask(self, trains: list[Train], network: RailwayNetwork, current_tick: int) -> np.ndarray:
        """
        Returns a valid action mask for 12 stations.
        Actions per station:
        0 = RED
        1 = YELLOW
        2 = GREEN_SLOW
        3 = GREEN_FAST
        4 = HOLD
        """
        # Assume 12 stations based on prompt requirement
        mask = np.ones((12, 5), dtype=np.float32)
        
        for train in trains:
            u = train.current_station
            s_idx = network.station_index(u)
            if s_idx < 0 or s_idx >= 12:
                continue

            # Route to fast/slow line according to crossover rules
            crossovers = network.get_crossovers(u)
            if train.line_type == "slow":
                has_crossover = any(c.get("from_line") == "slow" and c.get("to_line") == "fast" for c in crossovers)
                if not has_crossover:
                    mask[s_idx, 3] = 0
            elif train.line_type == "fast":
                has_crossover = any(c.get("from_line") == "fast" and c.get("to_line") == "slow" for c in crossovers)
                if not has_crossover:
                    mask[s_idx, 2] = 0

            # Use _would_collide for SLOW (2) and FAST (3)
            # if unsafe, mask it out
            if self._would_collide(train, 2, network, current_tick, trains):
                mask[s_idx, 2] = 0
            if self._would_collide(train, 3, network, current_tick, trains):
                mask[s_idx, 3] = 0
                        
        return mask
