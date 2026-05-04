import csv
import numpy as np
from simulation.network import RailwayNetwork
from simulation.train import Train
from simulation.safety import SafetyValidator

class Simulator:
    TICK_SECS = 30
    MAX_TICKS = 2880
    N_TRAINS = 20

    def __init__(self, network_config: str, timetable_path: str):
        self.config_path = network_config
        self.network = RailwayNetwork(self.config_path)
        self.safety = SafetyValidator(self.network)
        self.timetable_path = timetable_path
        self.trains: list[Train] = []
        self.tick_count = 0
        self.signals = {}
        self._last_decisions = {}
        self._cascades_prevented = 0
        self.metrics = {"completed_trips": 0, "total_delay_mins": 0.0}

    def _load_trains(self):
        self.trains = []
        try:
            with open(self.timetable_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    train = Train(
                        id=row.get("id", f"T{len(self.trains)}"),
                        current_station=row.get("start_station", ""),
                        next_station=row.get("next_station", ""),
                        is_express=row.get("is_express", "False") == "True",
                        scheduled_dep=row.get("scheduled_dep", ""),
                        is_at_platform=True,
                        line_type="fast" if row.get("is_express", "False") == "True" else "slow"
                    )
                    self.trains.append(train)
        except Exception as e:
            print(f"Failed to load timetable: {e}")

    def reset(self) -> dict:
        self.tick_count = 0
        self.network = RailwayNetwork(self.config_path)
        self.signals = {st: 0 for st in self.network._stations_order}
        self._last_decisions = {}
        self._cascades_prevented = 0
        self.metrics = {"completed_trips": 0, "total_delay_mins": 0.0}
        self._load_trains()
        return self.get_state()

    def tick(self, actions: dict[str, int]) -> dict:
        """
        actions: {station_id: action_int}
        0=RED, 1=YELLOW, 2=GREEN_SLOW, 3=GREEN_FAST, 4=HOLD
        """
        # 1. Apply SafetyValidator
        mask = self.safety.get_action_mask(self.trains, self.network)
        safe_actions = {}
        for st, action in actions.items():
            s_idx = self.network.station_index(st)
            if s_idx >= 0 and s_idx < 12:
                # If unsafe, fallback to RED (0)
                if mask[s_idx, action] == 0:
                    safe_actions[st] = 0
                    self._cascades_prevented += 1
                else:
                    safe_actions[st] = action
                    
        self.signals = safe_actions

        # 2-5 Process each train
        for train in self.trains:
            if train.is_at_platform:
                if train.dwell_ticks_remaining > 0:
                    train.dwell_ticks_remaining -= 1
                else:
                    # ready to depart
                    act = safe_actions.get(train.current_station, 0)
                    if act in (2, 3):  # GREEN_SLOW or GREEN_FAST
                        target_line = "slow" if act == 2 else "fast"
                        key = 0 if act == 2 else 1
                        
                        edges = self.network.get_edges_from(train.current_station)
                        # Find the correct edge
                        valid_edge = None
                        for u, v, k in edges:
                            if k == key and v == train.next_station:
                                valid_edge = (u, v, k)
                                break
                                
                        if valid_edge:
                            train.line_type = target_line
                            train.is_at_platform = False
                            train.segment_pct = 0.0
                            self.network.occupy(*valid_edge, train.id)
                            self._last_decisions[train.current_station] = f"→ {target_line} · train {train.id}"
            else:
                # 3. Advance segment_pct
                # Get edge details
                key = 0 if train.line_type == "slow" else 1
                if self.network.G.has_edge(train.current_station, train.next_station, key):
                    edge_data = self.network.G.edges[train.current_station, train.next_station, key]
                    dist_km = edge_data.get("dist_km", 1.0)
                    speed_kmh = edge_data.get("max_speed", 60)
                    
                    # distance covered in this tick in km = speed(km/h) * (ticks_secs / 3600)
                    dist_tick_km = speed_kmh * (self.TICK_SECS / 3600.0)
                    pct_increase = dist_tick_km / dist_km
                    train.segment_pct += pct_increase
                    
                    # 4. Arrive at next station
                    if train.segment_pct >= 1.0:
                        train.segment_pct = 0.0
                        train.is_at_platform = True
                        self.network.free(train.current_station, train.next_station, key)
                        train.current_station = train.next_station
                        
                        # Find next station (simplified linear advance for now)
                        edges = self.network.get_edges_from(train.current_station)
                        if edges:
                            train.next_station = edges[0][1] # just take the first connection as 'next'
                        else:
                            train.next_station = "" # Terminated
                            self.metrics["completed_trips"] += 1
                            
                        # compute delay from elapsed simulation time
                        elapsed_mins = (self.tick_count * self.TICK_SECS) / 60.0
                        if train.scheduled_dep:
                            h, m = map(int, train.scheduled_dep.split(":"))
                            sched_mins = h * 60 + m
                            train.delay_mins = max(0.0, elapsed_mins - sched_mins)
                        else:
                            train.delay_mins = 0.0
                        train.dwell_ticks_remaining = 1 # e.g. 30 seconds

        self.tick_count += 1
        return self.get_state()

    def get_state(self) -> dict:
        ACTION_TO_COLOR = {0: "R", 1: "Y", 2: "G", 3: "G", 4: "Y"}
        signals_list = [
            {
                "station_id": st,
                "color": ACTION_TO_COLOR.get(action, "R"),
                "last_decision": self._last_decisions.get(st, "")
            }
            for st, action in self.signals.items()
        ]
        self.metrics["total_delay_mins"] = round(
            sum(t.delay_mins for t in self.trains), 2)
        self.metrics["on_time_pct"] = round(
            100 * sum(1 for t in self.trains if t.delay_mins < 2.0)
            / max(1, len(self.trains)), 1)
        self.metrics["cascades_prevented"] = self._cascades_prevented
        return {
            "tick": self.tick_count,
            "trains": [
                {
                    "id": t.id,
                    "current_station": t.current_station,
                    "next_station": t.next_station,
                    "segment_pct": t.segment_pct,
                    "delay_mins": t.delay_mins,
                    "line_type": t.line_type,
                    "is_at_platform": t.is_at_platform
                } for t in self.trains
            ],
            "signals": signals_list,
            "metrics": self.metrics
        }

    def get_obs(self) -> np.ndarray:
        obs_list = []
        for t in self.trains[:self.N_TRAINS]:
            obs_list.append(t.to_obs_vector(self.network))
            
        # Pad if less than N_TRAINS
        while len(obs_list) < self.N_TRAINS:
            obs_list.append(np.zeros(5, dtype=np.float32))
            
        # Flatten
        obs_flat = np.concatenate(obs_list)
        
        # 2 global features: tick_pct and total delay normalized
        tick_pct = self.tick_count / float(self.MAX_TICKS)
        avg_delay = self.metrics["total_delay_mins"] / max(1, len(self.trains)) / 30.0 # arbitrary normalization
        avg_delay = min(1.0, avg_delay)
        
        global_feats = np.array([tick_pct, avg_delay], dtype=np.float32)
        
        return np.concatenate([obs_flat, global_feats])
