export const STATIONS = [
  { id: "CCG", name: "Churchgate",     short: "CCG", x: 40,  platforms: 5 },
  { id: "MRL", name: "Marine Lines",   short: "MRL", x: 98,  platforms: 2 },
  { id: "CNR", name: "Charni Road",    short: "CNR", x: 156, platforms: 2 },
  { id: "GTR", name: "Grant Road",     short: "GTR", x: 214, platforms: 2 },
  { id: "MBC", name: "Mumbai Central", short: "MBC", x: 272, platforms: 4 },
  { id: "MXH", name: "Mahalaxmi",      short: "MXH", x: 330, platforms: 2 },
  { id: "LPR", name: "Lower Parel",    short: "LPR", x: 388, platforms: 3 },
  { id: "EPR", name: "Elphinstone Rd", short: "EPR", x: 446, platforms: 2 },
  { id: "DDR", name: "Dadar",          short: "DDR", x: 504, platforms: 6 },
  { id: "MTG", name: "Matunga Road",   short: "MTG", x: 540, platforms: 2 },
  { id: "MHM", name: "Mahim",          short: "MHM", x: 590, platforms: 2 },
  { id: "BDR", name: "Bandra",         short: "BDR", x: 638, platforms: 4 },
  { id: "ADH", name: "Andheri",        short: "ADH", x: 696, platforms: 6 },
];

export const CROSSOVER_STATIONS = ["DDR", "BDR", "ADH"];

export const FAST_LINE_Y = 70;
export const SLOW_LINE_Y = 120;
export const SIGNAL_Y = 50;
export const SVG_VIEWBOX = "0 0 760 200";

export const STATION_MAP = Object.fromEntries(
  STATIONS.map((s) => [s.id, s])
);
