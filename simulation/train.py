from dataclasses import dataclass
from datetime import datetime
import numpy as np
from simulation.network import RailwayNetwork

@dataclass
class Train:
    id: str
    current_station: str
    next_station: str
    segment_pct: float = 0.0
    delay_mins: float = 0.0
    line_type: str = "slow"
    is_express: bool = False
    platform_no: int = 1
    dwell_ticks_remaining: int = 0
    is_at_platform: bool = False
    scheduled_dep: str = ""
    actual_dep: str = ""
    route: list[str] = None

    def __post_init__(self):
        if self.route is None:
            self.route = []

    def to_obs_vector(self, network: RailwayNetwork) -> np.ndarray:
        """
        Returns an observation vector of 5 normalized floats.
        network: An instance of RailwayNetwork to lookup the station index.
        """
        idx = network.station_index(self.current_station)
        # Normalize station idx based on 12 total stations (index 0 to 11)
        # We max to 0 just in case station index is -1
        station_normalized = max(0, idx) / 11.0 
        segment = self.segment_pct
        delay_normalized = min(self.delay_mins, 30.0) / 30.0
        express = float(self.is_express)
        at_platform = float(self.is_at_platform)
        
        return np.array([
            station_normalized,
            segment,
            delay_normalized,
            express,
            at_platform
        ], dtype=np.float32)

def compute_delay(scheduled: str, actual: str) -> float:
    """
    Computes delay in minutes between actual and scheduled times.
    Format: "HH:MM"
    """
    if not scheduled or not actual:
        return 0.0
        
    fmt = "%H:%M"
    try:
        t_sched = datetime.strptime(scheduled, fmt)
        t_actual = datetime.strptime(actual, fmt)
        diff = (t_actual - t_sched).total_seconds() / 60.0
        # If departure represents a crossover midnight without date,
        # e.g., 23:50 scheduled, 00:10 actual
        if diff < -720:  # Scheduled late night, actual early morning next day
            diff += 1440
        elif diff > 720: # Scheduled early morning, actual late night
            diff -= 1440
            
        # We assume delay is always positive. If it departed early, return 0.
        return max(0.0, diff)
    except ValueError:
        return 0.0
