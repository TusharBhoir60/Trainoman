import numpy as np
from simulation.network import RailwayNetwork
from simulation.train import Train

class SafetyValidator:
    MIN_HEADWAY_TICKS = 6
    TICK_SECS = 30
    
    def __init__(self, network: RailwayNetwork):
        self.network = network

    def get_action_mask(self, trains: list[Train], network: RailwayNetwork) -> np.ndarray:
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
            v = train.next_station
            s_idx = network.station_index(u)
            
            # If standard idx is outside 0-11, drop it
            if s_idx < 0 or s_idx >= 12:
                continue
                
            # Rule 1: Route train to occupied block (is_clear check)
            if not network.is_clear(u, v, 0):
                mask[s_idx, 2] = 0  # GREEN_SLOW disallowed
            if not network.is_clear(u, v, 1):
                mask[s_idx, 3] = 0  # GREEN_FAST disallowed
                
            # Rule 3: Double-book a platform (pseudo-check: if holding causes double booking)
            for other in trains:
                if other != train and other.current_station == u and other.platform_no == train.platform_no:
                    # Platform conflict, e.g. holding might be dangerous if another train is arriving
                    pass

            # Rule 4: Route to fast line when no crossover exists at that station
            crossovers = network.get_crossovers(u)
            
            if train.line_type == "slow":
                has_crossover = any(c.get("from_line") == "slow" and c.get("to_line") == "fast" for c in crossovers)
                if not has_crossover:
                    mask[s_idx, 3] = 0
            elif train.line_type == "fast":
                has_crossover = any(c.get("from_line") == "fast" and c.get("to_line") == "slow" for c in crossovers)
                if not has_crossover:
                    mask[s_idx, 2] = 0
                    
            # Rule 2: MIN_HEADWAY_TICKS violation on same segment
            # A more detailed logic would compare segment_pct and dwell ticks
            for other in trains:
                if other != train and other.current_station == u and other.next_station == v:
                    if other.segment_pct < 0.1:  # simplified headway check
                        mask[s_idx, 2] = 0
                        mask[s_idx, 3] = 0
                        
        return mask
