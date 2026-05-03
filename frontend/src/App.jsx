import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import useSimulation from "./hooks/useSimulation";
import TopBar from "./components/TopBar";
import MetricsStrip from "./components/MetricsStrip";
import TrackMap from "./components/TrackMap";
import DecisionLog from "./components/DecisionLog";
import TrainRoster from "./components/TrainRoster";
import ScenarioInjector from "./components/ScenarioInjector";

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export default function App() {
  const { simState, isConnected, connectionStatus, delayHistory, controlSim, injectScenario } =
    useSimulation();

  const [highlightedTrain, setHighlightedTrain] = useState(null);

  const handleLocateTrain = useCallback((trainId) => {
    setHighlightedTrain(trainId);
    // Visual highlight on SVG marker
    const el = document.querySelector(`[data-train-id="${trainId}"]`);
    if (el) {
      el.classList.add("shadow-active");
      setTimeout(() => el.classList.remove("shadow-active"), 2000);
    }
  }, []);

  return (
    <motion.div
      className="h-screen w-screen flex flex-col bg-bg-base overflow-hidden"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* TopBar — 56px */}
      <motion.div variants={fadeUp}>
        <TopBar
          simState={simState}
          isConnected={isConnected}
          connectionStatus={connectionStatus}
          controlSim={controlSim}
        />
      </motion.div>

      {/* MetricsStrip — 88px */}
      <motion.div variants={fadeUp}>
        <MetricsStrip
          metrics={simState?.metrics}
          delayHistory={delayHistory}
        />
      </motion.div>

      {/* TrackMap — 320px */}
      <motion.div variants={fadeUp}>
        <TrackMap
          trains={simState?.trains}
          signals={simState?.signals}
          highlightedTrainId={highlightedTrain}
        />
      </motion.div>

      {/* Middle panels — Decision Log + Train Roster */}
      <motion.div variants={fadeUp} className="flex-1 flex gap-3 px-5 py-3 min-h-0">
        <DecisionLog
          signals={simState?.signals}
          trains={simState?.trains}
          onLocateTrain={handleLocateTrain}
        />
        <TrainRoster
          trains={simState?.trains}
          onSelectTrain={handleLocateTrain}
        />
      </motion.div>

      {/* ScenarioInjector — 80px */}
      <motion.div variants={fadeUp}>
        <ScenarioInjector injectScenario={injectScenario} />
      </motion.div>
    </motion.div>
  );
}
