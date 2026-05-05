import json
import networkx as nx

class RailwayNetwork:
    def __init__(self, config_path: str = "data/network_config.json"):
        self.G = nx.MultiDiGraph()
        self.crossovers = []
        self._stations_order = []
        self._load(config_path)

    def _load(self, config_path: str):
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
        except Exception as e:
            print(f"Error loading config: {e}")
            return
            
        for station in config.get("nodes", config.get("stations", [])):
            self.G.add_node(station["id"], name=station["name"], platforms=station.get("platforms"))
            self._stations_order.append(station["id"])
            
        for edge in config.get("edges", []):
            u = edge["source"]
            v = edge["target"]
            line_type = edge.get("line_type", edge.get("line", "slow")).lower()
            key = 0 if line_type == "slow" else 1
            max_speed = edge.get("max_speed", 80 if line_type == "fast" else 60)
            dist_km = edge.get("dist_km", 1.0)
            self.G.add_edge(
                u, v, key=key, 
                line_type=line_type, 
                dist_km=dist_km, 
                max_speed=max_speed, 
                occupant=None
            )
            
        self.crossovers = config.get("crossovers", [])

    def get_edges_from(self, station_id: str) -> list:
        if station_id not in self.G:
            return []
        return list(self.G.out_edges(station_id, keys=True))

    def occupy(self, u: str, v: str, key: int, train_id: str):
        if self.G.has_edge(u, v, key):
            self.G.edges[u, v, key]['occupant'] = train_id

    def free(self, u: str, v: str, key: int):
        if self.G.has_edge(u, v, key):
            self.G.edges[u, v, key]['occupant'] = None

    def is_clear(self, u: str, v: str, key: int) -> bool:
        if self.G.has_edge(u, v, key):
            return self.G.edges[u, v, key]['occupant'] is None
        return False
        
    def get_crossovers(self, station_id: str) -> list:
        return [c for c in self.crossovers if c.get("station") == station_id]
        
    def station_index(self, station_id: str) -> int:
        try:
            return self._stations_order.index(station_id)
        except ValueError:
            return -1
