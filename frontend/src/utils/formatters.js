/**
 * Format delay minutes to a display string.
 * @param {number} mins
 * @returns {string}
 */
export function formatDelay(mins) {
  if (mins == null) return "--";
  if (mins === 0) return "On time";
  return `+${Number(mins).toFixed(1)} min`;
}

/**
 * Format a raw simulation time string for display.
 * @param {string} t  e.g. "06:42"
 * @returns {string}
 */
export function formatTime(t) {
  if (!t) return "--:--";
  return t;
}

/**
 * Return the Tailwind text-color class for a given delay value.
 * @param {number} mins
 * @returns {string}
 */
export function getDelayColor(mins) {
  if (mins == null) return "text-text-muted";
  if (mins <= 0) return "text-accent-green";
  if (mins <= 5) return "text-accent-green";
  if (mins <= 15) return "text-accent-amber";
  return "text-accent-red";
}

/**
 * Return the raw hex color for a given delay value.
 * @param {number} mins
 * @returns {string}
 */
export function getDelayHex(mins) {
  if (mins == null) return "#3D4666";
  if (mins <= 0) return "#00FF88";
  if (mins < 5) return "#00FF88";
  if (mins <= 15) return "#FFB800";
  return "#FF4444";
}

/**
 * Return the hex for an on-time percentage.
 * @param {number} pct
 * @returns {string}
 */
export function getOnTimePctHex(pct) {
  if (pct == null) return "#3D4666";
  if (pct > 80) return "#00FF88";
  if (pct >= 60) return "#FFB800";
  return "#FF4444";
}

/**
 * Return hex for a signal color code.
 * @param {"R"|"Y"|"G"} code
 * @returns {string}
 */
export function getSignalHex(code) {
  switch (code) {
    case "R": return "#FF4444";
    case "Y": return "#FFB800";
    case "G": return "#00FF88";
    default:  return "#3D4666";
  }
}

/**
 * Map signal letter to human-readable word.
 * @param {"R"|"Y"|"G"} code
 * @returns {string}
 */
export function getSignalLabel(code) {
  switch (code) {
    case "R": return "RED";
    case "Y": return "YELLOW";
    case "G": return "GREEN";
    default:  return "UNKNOWN";
  }
}
