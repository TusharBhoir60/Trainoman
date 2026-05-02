import json
import networkx as nx

class RailwayNetwork:
    def __init__(self, config_path: str):
        self.G = nx.MultiDiGraph()
        # Allows accessing nodes and edges using an edge_id mapping if needed
        self.edge_map = {}
        self._load(config_path)

    def _load(self, config_path: str):
        """
        Loads network configuration containing nodes and edges.
        Expects a JSON format config file.
        """
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
        except Exception as e:
            print(f"Error loading config: {e}")
            return
            
        # Add nodes (stations, track sections)
        for node in config.get("nodes", []):
            self.G.add_node(node["id"], **node)
            
        # Add edges (tracks between nodes)
        for edge in config.get("edges", []):
            u = edge["from"]
            v = edge["to"]
            edge_id = edge["id"]
            # MultiDiGraph allows multiple edges between u and v, differentiated by key (edge_id)
            self.G.add_edge(u, v, key=edge_id, occupant=None, **edge)
            self.edge_map[edge_id] = (u, v, edge_id)

    def get_valid_routes(self, train_id: str, from_st: str) -> list:
        """
        Returns a list of valid action IDs (edge keys) available from `from_st`.
        Filters by crossover availability and whether the edge is clear.
        """
        valid_routes = []
        if from_st not in self.G:
            return valid_routes
            
        for u, v, key, data in self.G.out_edges(from_st, keys=True, data=True):
            if self.is_clear(key):
                # Placeholder for cross-over logic
                # if data.get('requires_crossover') and not crossover_available(u, v):
                #     continue
                valid_routes.append(key)
                
        return valid_routes

    def occupy(self, edge_id, train_id: str):
        """
        Occupies a given edge with the specified train.
        """
        u, v, key = self.edge_map[edge_id]
        self.G.edges[u, v, key]['occupant'] = train_id

    def free(self, edge_id):
        """
        Frees a given edge.
        """
        u, v, key = self.edge_map[edge_id]
        self.G.edges[u, v, key]['occupant'] = None

    def is_clear(self, edge_id) -> bool:
        """
        Checks if the given edge is clear.
        """
        u, v, key = self.edge_map[edge_id]
        return self.G.edges[u, v, key]['occupant'] is None

