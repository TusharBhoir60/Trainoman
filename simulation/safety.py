import numpy as np

class SafetyValidator:
    MIN_HEADWAY_TICKS = 6  # 6 × 30s = 3 min minimum gap

    THREE_RULES = """
    1. No two trains on the same block (edge) simultaneously
    2. MIN_HEADWAY_TICKS between consecutive trains on same segment
    3. No platform double-booking at same station/platform
    """

    def __init__(self, stations: list, num_actions: int = 5):
        self.stations = stations
        self.num_actions = num_actions

    def get_action_mask(self, state, network) -> np.ndarray:
        # shape: (N_STATIONS, N_SIGNAL_CHOICES)
        # 1 = safe, 0 = forbidden
        mask = np.ones((len(self.stations), self.num_actions))
        for station_idx, station in enumerate(self.stations):
            for action_idx in range(self.num_actions):
                if self._would_collide(station, action_idx, state, network):
                    mask[station_idx, action_idx] = 0
        return mask

    def _would_collide(self, station, action_idx, state, network) -> bool:
        """
        Evaluates THREE_RULES:
        1. Block collision
        2. Headway violation
        3. Platform double booking
        """
        # TODO: Implement full state checks against the network topology here.
        # Check if the chosen routing/movement action for the train at `station`
        # violates any of the three safety rules.
        
        # Example pseudo-logic:
        # next_edge = network.get_edge_for_action(station, action_idx)
        # if not network.is_clear(next_edge):
        #     return True 
        
        return False
