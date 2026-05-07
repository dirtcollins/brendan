const { useEffect, useMemo, useRef, useState } = React;

const SUPABASE_CONFIG = window.FGB_SUPABASE_CONFIG || {};
const AUTH_REQUIRED = SUPABASE_CONFIG.requireAuth === true;
const GUEST_SESSION = {
  user: {
    id: "local-guest",
    email: "guest@local"
  }
};
const supabaseClient = window.supabase && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey
  ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
  : null;

const PICKET_TARGET_GAP = 5;
const MAX_PICKET_COUNT = 40;
const ADMIN_EMAILS = ["dirtcollins@gmail.com"];

const DEFAULTS = {
  settingsVersion: 2,
  buildMode: "gate",
  gateType: "double",
  postWidth: 3,
  postThickness: 0.083,
  postHeight: 72,
  postEmbed: 24,
  leftLeafWidth: 60,
  rightLeafWidth: 60,
  sameLeafWidth: true,
  leafHeight: 69,
  gateTopStyle: "flat",
  archRise: 0,
  postGap: 0.5,
  hingePostSide: "left",
  hingeGap: 0.5,
  latchGap: 0.5,
  centerGap: 0.5,
  frameSize: 1.5,
  frameThickness: 0.083,
  picketWidth: 0.625,
  picketThickness: 0.065,
  leftPicketCount: 9,
  rightPicketCount: 9,
  manualPicketSpacing: false,
  railCount: 2,
  layoutMode: "edge",
  waste: 10,
  cwtCost: 105,
  fenceLengthFeet: 84,
  fenceHeight: 72,
  fenceMaxSectionFeet: 8,
  fenceSectionMode: "auto",
  fenceManualSections: "",
  fencePicketMaterial: "Cedar",
  fencePicketWidth: 5.5,
  fencePicketHeight: 72,
  fencePostEmbed: 24,
  fenceGateCount: 0,
  fenceGateWidthFeet: 4,
  fenceGateStartFeet: 24,
  fenceGateBuildId: "",
  fenceRailCount: 3
};

const STORAGE_KEY = "gate-fabrication-react-v1";
const LOCAL_BUILDS_KEY = "gate-fabrication-local-builds-v1";
const LOCAL_FEATURE_REQUESTS_KEY = "gate-fabrication-local-feature-requests-v1";
const STEEL_LB_PER_CUBIC_INCH = 0.283;
const STOCK_LENGTH_OPTIONS = [
  { label: "20 ft", length: 240 },
  { label: "24 ft", length: 288 }
];

const THICKNESS_OPTIONS = [
  { label: "16 gauge", value: 0.065 },
  { label: "14 gauge", value: 0.083 },
  { label: "3/16", value: 0.1875 },
  { label: "1/4", value: 0.25 }
];

const ICON_PATHS = {
  save: ["M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z", "M17 21v-8H7v8", "M7 3v5h8"],
  upload: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"],
  print: ["M6 9V2h12v7", "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2", "M6 14h12v8H6z"],
  plus: ["M12 5v14", "M5 12h14"],
  reset: ["M3 12a9 9 0 1 0 3-6.7", "M3 4v6h6"],
  gate: ["M4 20V6", "M20 20V6", "M4 8h6v12H4", "M14 8h6v12h-6", "M10 8c1.5 0 2.7-1 4-2 1.3 1 2.5 2 4 2", "M7 11v7", "M17 11v7"],
  fence: ["M4 20V5", "M20 20V5", "M8 20V7", "M12 20V5", "M16 20V7", "M3 10h18", "M3 16h18"],
  ruler: ["M4 20h16", "M6 16v4", "M10 14v6", "M14 16v4", "M18 14v6", "M4 8h16"],
  frame: ["M5 5h14v14H5z", "M9 5v14", "M15 5v14", "M5 10h14", "M5 15h14"],
  waste: ["M3 6h18", "M8 6V4h8v2", "M6 6l1 15h10l1-15", "M10 11v6", "M14 11v6"],
  dollar: ["M12 2v20", "M17 6.5c-1-1-2.6-1.5-4.5-1.5-2.5 0-4 1.1-4 2.8 0 4.2 9 2.2 9 6.9 0 1.8-1.7 3.3-4.8 3.3-2.1 0-4-.6-5.2-1.8"],
  chart: ["M4 19V5", "M4 19h16", "M8 16v-5", "M12 16V8", "M16 16v-8"],
  wood: ["M4 20h16", "M6 20V7l3-3 3 3v13", "M12 20V7l3-3 3 3v13"],
  posts: ["M7 21V4h4v17", "M13 21V4h4v17", "M5 21h14"],
  link: ["M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1", "M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"],
  saved: ["M5 3h12l2 2v16H5V3Z", "M8 3v6h8V3", "M8 14h8", "M8 17h8", "M9 6h5"],
  builds: ["M5 3h12l2 2v16H5V3Z", "M8 3v6h8V3", "M8 14h8", "M8 17h8", "M9 6h5"],
  request: ["M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z", "M8 8h8", "M8 12h5"],
  settings: ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 .9-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5.9h.1a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"]
};

function Icon({ name, className = "icon" }) {
  const paths = ICON_PATHS[name] || ICON_PATHS.gate;
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths.map((path, index) => <path key={index} d={path} />)}
    </svg>
  );
}

function SectionTitle({ icon, children }) {
  return (
    <h2 className="section-title">
      <Icon name={icon} />
      <span>{children}</span>
    </h2>
  );
}

function usePersistentPreview(dependencies, position, setPosition) {
  const previewRef = useRef(null);

  useEffect(() => {
    const node = previewRef.current;
    if (!node) return undefined;

    const frame = requestAnimationFrame(() => {
      const maxLeft = Math.max(0, node.scrollWidth - node.clientWidth);
      const maxTop = Math.max(0, node.scrollHeight - node.clientHeight);
      const hasSavedPosition = Number.isFinite(position.left) && Number.isFinite(position.top);
      node.scrollLeft = hasSavedPosition
        ? Math.max(0, Math.min(position.left, maxLeft))
        : Math.max(0, maxLeft / 2);
      node.scrollTop = hasSavedPosition
        ? Math.max(0, Math.min(position.top, maxTop))
        : Math.max(0, maxTop / 2);
    });

    return () => cancelAnimationFrame(frame);
  }, dependencies);

  function handleScroll(event) {
    setPosition({
      left: event.currentTarget.scrollLeft,
      top: event.currentTarget.scrollTop
    });
  }

  return { previewRef, previewPositionEvents: { onScroll: handleScroll } };
}

function usePreviewNavigation(previewRef, setZoom, minZoom, maxZoom) {
  const panRef = useRef({ active: false, x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  useEffect(() => {
    const node = previewRef.current;
    if (!node) return undefined;

    function wheelZoom(event) {
      event.preventDefault();
      event.stopPropagation();
      const amount = event.deltaY > 0 ? -5 : 5;
      setZoom((value) => Math.max(minZoom, Math.min(maxZoom, value + amount)));
    }

    node.addEventListener("wheel", wheelZoom, { passive: false });
    return () => node.removeEventListener("wheel", wheelZoom);
  }, [previewRef, setZoom, minZoom, maxZoom]);

  function startPan(event) {
    if (event.button !== 0 || event.target.closest?.("[data-gate-drag-target='true']")) return;
    const node = previewRef.current;
    if (!node) return;
    panRef.current = {
      active: true,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: node.scrollLeft,
      scrollTop: node.scrollTop
    };
    node.classList.add("is-panning");
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePan(event) {
    const node = previewRef.current;
    if (!node || !panRef.current.active) return;
    node.scrollLeft = panRef.current.scrollLeft - (event.clientX - panRef.current.x);
    node.scrollTop = panRef.current.scrollTop - (event.clientY - panRef.current.y);
  }

  function endPan(event) {
    const node = previewRef.current;
    if (!node || !panRef.current.active) return;
    panRef.current.active = false;
    node.classList.remove("is-panning");
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return {
    onPointerDown: startPan,
    onPointerMove: movePan,
    onPointerUp: endPan,
    onPointerCancel: endPan
  };
}

function normalizeSettings(settings) {
  const normalized = { ...DEFAULTS, ...settings };
  if (settings.leafWidth && !settings.leftLeafWidth) normalized.leftLeafWidth = Number(settings.leafWidth);
  if (settings.leafWidth && !settings.rightLeafWidth) normalized.rightLeafWidth = Number(settings.leafWidth);
  if (settings.hingeGap !== undefined && settings.postGap === undefined) normalized.postGap = Number(settings.hingeGap);
  if (settings.hingeGap === undefined) normalized.hingeGap = Number(normalized.postGap);
  if (settings.latchGap === undefined) normalized.latchGap = Number(normalized.postGap);
  if (settings.sameLeafWidth === undefined) {
    normalized.sameLeafWidth = Number(normalized.leftLeafWidth) === Number(normalized.rightLeafWidth);
  }
  if (settings.picketCount && !settings.leftPicketCount) normalized.leftPicketCount = Number(settings.picketCount);
  if (settings.picketCount && !settings.rightPicketCount) normalized.rightPicketCount = Number(settings.picketCount);
  normalized.manualPicketSpacing = Boolean(settings.manualPicketSpacing);
  normalized.buildMode = normalized.buildMode === "fence" ? "fence" : "gate";
  normalized.gateType = normalized.gateType === "single" ? "single" : "double";
  normalized.gateTopStyle = normalized.gateTopStyle === "arched" ? "arched" : "flat";
  normalized.hingePostSide = normalized.hingePostSide === "right" ? "right" : "left";
  normalized.fenceSectionMode = normalized.fenceSectionMode === "manual" ? "manual" : "auto";
  normalized.fencePicketMaterial = normalized.fencePicketMaterial === "Redwood" ? "Redwood" : "Cedar";
  normalized.fenceManualSections = String(normalized.fenceManualSections || "");
  normalized.fenceGateBuildId = String(normalized.fenceGateBuildId || "");
  ["postThickness", "frameThickness", "picketThickness"].forEach((key) => {
    const current = Number(normalized[key]);
    const exact = THICKNESS_OPTIONS.find((option) => option.value === current);
    normalized[key] = exact ? exact.value : DEFAULTS[key];
  });
  return normalized;
}

function isDoubleGate(settings) {
  return settings.gateType !== "single";
}

function getArchRise(settings) {
  return settings.gateTopStyle === "arched" ? Math.max(0, Number(settings.archRise) || 0) : 0;
}

function hasArchedTop(settings) {
  return getArchRise(settings) > 0;
}

function getGateVisualHeight(settings) {
  return Number(settings.leafHeight) + getArchRise(settings);
}

function circularArchExtraAtRatio(ratio, span, rise) {
  const chord = Math.max(0, Number(span) || 0);
  const height = Math.max(0, Number(rise) || 0);
  if (!chord || !height) return 0;
  const value = Math.max(0, Math.min(1, Number(ratio) || 0));
  const radius = (chord * chord) / (8 * height) + height / 2;
  const endpointDrop = Math.sqrt(Math.max((radius * radius) - ((chord / 2) * (chord / 2)), 0));
  const x = (value - 0.5) * chord;
  return Math.max(0, Math.sqrt(Math.max((radius * radius) - (x * x), 0)) - endpointDrop);
}

function getArchExtraAtRatio(ratio, side, settings, leafWidth = settings.leftLeafWidth) {
  const rise = getArchRise(settings);
  if (!rise) return 0;
  const value = Math.max(0, Math.min(1, Number(ratio) || 0));
  const span = Math.max(Number(leafWidth) || Number(settings.leftLeafWidth) || 0, 0);
  if (side === "left") return circularArchExtraAtRatio(value / 2, span * 2, rise);
  if (side === "right") return circularArchExtraAtRatio(0.5 + value / 2, span * 2, rise);
  return circularArchExtraAtRatio(value, span, rise);
}

function picketRatio(index, count, settings) {
  if (count <= 1) return 0.5;
  if (settings.layoutMode === "edge") return index / (count - 1);
  return (index + 1) / (count + 1);
}

function getPicketCutLengthAtRatio(ratio, side, settings, leafWidth) {
  const topHeight = Number(settings.leafHeight) + getArchExtraAtRatio(ratio, side, settings, leafWidth);
  return Math.max(0, topHeight - (Number(settings.frameSize) * 2));
}

function getPicketCutLengths(count, side, settings, leafWidth) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => (
    getPicketCutLengthAtRatio(picketRatio(index, count, settings), side, settings, leafWidth)
  ));
}

function summarizeLengths(lengths) {
  if (!lengths.length) return { min: 0, max: 0, total: 0 };
  return lengths.reduce((summary, length) => ({
    min: Math.min(summary.min, length),
    max: Math.max(summary.max, length),
    total: summary.total + length
  }), { min: lengths[0], max: lengths[0], total: 0 });
}

function archedTopRailLength(chord, rise) {
  const span = Math.max(0, Number(chord) || 0);
  const height = Math.max(0, Number(rise) || 0);
  if (!span || !height) return span;
  const radius = (span * span) / (8 * height) + height / 2;
  const theta = 2 * Math.asin(Math.min(1, span / (2 * radius)));
  return radius * theta;
}

function lengthRangeLabel(min, max) {
  return fmt(min, 3) === fmt(max, 3) ? inch(min) : `${inch(min)} to ${inch(max)}`;
}

function fmt(value, digits = 3) {
  if (!Number.isFinite(value)) return "ERR";
  return String(Number(value.toFixed(digits)));
}

function inch(value) {
  return inchFraction(value);
}

function inchFraction(value, denominator = 16) {
  return formatInches(value, denominator);
}

function formatInches(value, denominator = 16) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "ERR";
  const sign = numeric < 0 ? "-" : "";
  const rounded = Math.round(Math.abs(numeric) * denominator);
  let adjustedWhole = Math.floor(rounded / denominator);
  let numerator = rounded % denominator;

  if (numerator === denominator) {
    adjustedWhole += 1;
    numerator = 0;
  }

  if (numerator === 0) return `${sign}${adjustedWhole}"`;

  const divisor = gcd(numerator, denominator);
  const simpleNumerator = numerator / divisor;
  const simpleDenominator = denominator / divisor;
  return adjustedWhole > 0
    ? `${sign}${adjustedWhole}-${simpleNumerator}/${simpleDenominator}"`
    : `${sign}${simpleNumerator}/${simpleDenominator}"`;
}

function feet(value) {
  return formatFeetFromInches(value);
}

function formatFeetFromInches(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "ERR";
  const sign = numeric < 0 ? "-" : "";
  const roundedInches = Math.round(Math.abs(numeric) * 16) / 16;
  const wholeFeet = Math.floor(roundedInches / 12);
  const remainingInches = roundedInches - wholeFeet * 12;
  if (remainingInches === 0) return `${sign}${wholeFeet}'`;
  if (wholeFeet === 0) return `${sign}${inchFraction(remainingInches)}`;
  return `${sign}${wholeFeet}'-${inchFraction(remainingInches)}`;
}

function parseMeasurementInput(value, unit = "in") {
  const text = String(value).trim().toLowerCase();
  if (!text) return Number.NaN;

  if (unit === "ft" && /'|ft|in|"/.test(text)) {
    const feetMatch = text.match(/(-?\d+(?:\.\d+)?)\s*(?:'|ft)/);
    const feetValue = feetMatch ? Number(feetMatch[1]) : 0;
    const afterFeet = feetMatch ? text.slice(feetMatch.index + feetMatch[0].length) : text;
    const inchValue = parseFractionNumber(afterFeet.replace(/in|"/g, "").trim()) || 0;
    return feetValue + inchValue / 12;
  }

  return parseFractionNumber(text.replace(/in|"/g, "").replace(/ft|'/g, "").trim());
}

function parseFractionNumber(value) {
  const text = String(value).trim().replace(/\s+/g, " ");
  if (!text) return Number.NaN;
  const mixed = text.match(/^(-?\d+)(?:-|\s+)(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const sign = whole < 0 ? -1 : 1;
    return whole + sign * (Number(mixed[2]) / Number(mixed[3]));
  }
  const fraction = text.match(/^(-?\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return Number(text);
}

function formatFieldMeasurement(id, value) {
  const unit = numberFieldUnit(id);
  if (!unit) return String(value);
  if (unit === "ft") return formatFeetInput(value);
  return inchFraction(Number(value));
}

function formatFeetInput(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  const totalInches = numeric * 12;
  return formatFeetFromInches(totalInches);
}

function pounds(value, digits = 1) {
  return `${fmt(value, digits)} lb`;
}

function money(value) {
  if (!Number.isFinite(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}

function tubeSpec(size, thickness) {
  return `${inch(size)} square, ${thicknessLabel(thickness)} wall`;
}

function tubeSpecFraction(size, thickness) {
  return `${inchFraction(size)} square, ${thicknessLabel(thickness)} wall`;
}

function thicknessLabel(thickness) {
  const option = THICKNESS_OPTIONS.find((item) => item.value === Number(thickness));
  return option ? option.label : inch(thickness, 4);
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function getBalancedPicketCount({ leafWidth, frameSize, picketWidth, layoutMode }) {
  const innerWidth = Number(leafWidth) - (Number(frameSize) * 2);
  let best = { count: 1, gap: Number.POSITIVE_INFINITY, score: Number.POSITIVE_INFINITY };

  for (let count = 1; count <= MAX_PICKET_COUNT; count += 1) {
    const spaces = layoutMode === "edge" ? Math.max(count - 1, 1) : count + 1;
    const gap = (innerWidth - (count * Number(picketWidth))) / spaces;
    if (gap < PICKET_TARGET_GAP) continue;

    const score = Math.abs(gap - PICKET_TARGET_GAP);
    if (score < best.score) best = { count, gap, score };
  }

  return best.count;
}

function balancePicketsForSettings(settings) {
  const doubleGate = isDoubleGate(settings);
  return {
    ...settings,
    leftPicketCount: getBalancedPicketCount({
      leafWidth: settings.leftLeafWidth,
      frameSize: settings.frameSize,
      picketWidth: settings.picketWidth,
      layoutMode: settings.layoutMode
    }),
    rightPicketCount: doubleGate
      ? getBalancedPicketCount({
        leafWidth: settings.rightLeafWidth,
        frameSize: settings.frameSize,
        picketWidth: settings.picketWidth,
        layoutMode: settings.layoutMode
      })
      : settings.rightPicketCount
  };
}

function squareTubeWeight(length, outsideSize, wallThickness) {
  const insideSize = Math.max(outsideSize - (wallThickness * 2), 0);
  const steelArea = Math.max((outsideSize * outsideSize) - (insideSize * insideSize), 0);
  return steelArea * length * STEEL_LB_PER_CUBIC_INCH;
}

function expandCuts(cuts) {
  return cuts.flatMap((cut) => Array.from({ length: cut.qty }, () => cut.length));
}

function packCuts(cuts, stockLength) {
  const pieces = expandCuts(cuts).sort((a, b) => b - a);
  if (pieces.some((piece) => piece > stockLength)) {
    const used = pieces.reduce((sum, piece) => sum + piece, 0);
    return {
      stockLength,
      sticks: 0,
      used,
      purchased: 0,
      waste: Number.POSITIVE_INFINITY,
      layouts: []
    };
  }

  const sticks = [];

  pieces.forEach((piece) => {
    const target = sticks.find((stick) => stick.remaining >= piece);
    if (target) {
      target.pieces.push(piece);
      target.remaining -= piece;
    } else {
      sticks.push({ pieces: [piece], remaining: stockLength - piece });
    }
  });

  const used = pieces.reduce((sum, piece) => sum + piece, 0);
  const purchased = sticks.length * stockLength;
  return {
    stockLength,
    sticks: sticks.length,
    used,
    purchased,
    waste: purchased - used,
    layouts: sticks
  };
}

function stockPlan(name, size, thickness, cuts) {
  const options = STOCK_LENGTH_OPTIONS.map((option) => ({
    ...option,
    ...packCuts(cuts, option.length)
  }));
  const best = options.reduce((winner, option) => {
    if (option.waste < winner.waste) return option;
    if (option.waste === winner.waste && option.purchased < winner.purchased) return option;
    return winner;
  }, options[0]);

  return {
    name,
    size,
    thickness,
    cuts,
    best,
    options,
    usedWeight: squareTubeWeight(best.used, size, thickness),
    purchasedWeight: squareTubeWeight(best.purchased, size, thickness)
  };
}

function calculate(settings) {
  const doubleGate = isDoubleGate(settings);
  const leafCount = doubleGate ? 2 : 1;
  const leftLeafWidth = settings.leftLeafWidth;
  const rightLeafWidth = doubleGate ? settings.rightLeafWidth : 0;
  const centerGap = doubleGate ? settings.centerGap : 0;
  const rightPicketCount = doubleGate ? settings.rightPicketCount : 0;
  const archRise = getArchRise(settings);
  const archedTop = archRise > 0;
  const gateVisualHeight = getGateVisualHeight(settings);
  const leftPostGap = doubleGate ? settings.postGap : (settings.hingePostSide === "left" ? settings.hingeGap : settings.latchGap);
  const rightPostGap = doubleGate ? settings.postGap : (settings.hingePostSide === "right" ? settings.hingeGap : settings.latchGap);
  const opening = leftLeafWidth + rightLeafWidth + leftPostGap + rightPostGap + centerGap;
  const outside = opening + (settings.postWidth * 2);
  const innerHeight = settings.leafHeight - (settings.frameSize * 2);
  const leftSpaces = settings.layoutMode === "edge" ? Math.max(settings.leftPicketCount - 1, 1) : settings.leftPicketCount + 1;
  const rightSpaces = settings.layoutMode === "edge" ? Math.max(rightPicketCount - 1, 1) : rightPicketCount + 1;
  const leftPicketTotalWidth = settings.leftPicketCount * settings.picketWidth;
  const rightPicketTotalWidth = rightPicketCount * settings.picketWidth;
  const leftInnerWidth = leftLeafWidth - (settings.frameSize * 2);
  const rightInnerWidth = doubleGate ? rightLeafWidth - (settings.frameSize * 2) : 0;
  const leftPicketGap = (leftInnerWidth - leftPicketTotalWidth) / leftSpaces;
  const rightPicketGap = doubleGate ? (rightInnerWidth - rightPicketTotalWidth) / rightSpaces : leftPicketGap;
  const railInsideLengths = doubleGate ? [leftInnerWidth, rightInnerWidth] : [leftInnerWidth];
  const straightRailCount = archedTop ? Math.max(settings.railCount - 1, 0) : settings.railCount;
  const leftTopRailLength = archedTop
    ? (doubleGate ? archedTopRailLength(leftInnerWidth * 2, archRise) / 2 : archedTopRailLength(leftInnerWidth, archRise))
    : leftInnerWidth;
  const rightTopRailLength = doubleGate
    ? (archedTop ? archedTopRailLength(rightInnerWidth * 2, archRise) / 2 : rightInnerWidth)
    : 0;
  const topRailLengths = archedTop ? [leftTopRailLength, ...(doubleGate ? [rightTopRailLength] : [])] : [];
  const verticalLength = settings.leafHeight;
  const postCutLength = settings.postHeight + settings.postEmbed;
  const postTube = postCutLength * 2;
  const straightRailTube = railInsideLengths.reduce((sum, length) => sum + (length * straightRailCount), 0);
  const topRailTube = topRailLengths.reduce((sum, length) => sum + length, 0);
  const frameTube = (verticalLength * 2 * leafCount) + straightRailTube + topRailTube;
  const leftPicketLengths = getPicketCutLengths(settings.leftPicketCount, doubleGate ? "left" : "single", settings, leftLeafWidth);
  const rightPicketLengths = doubleGate ? getPicketCutLengths(rightPicketCount, "right", settings, rightLeafWidth) : [];
  const leftPicketSummary = summarizeLengths(leftPicketLengths);
  const rightPicketSummary = summarizeLengths(rightPicketLengths);
  const allPicketLengths = [...leftPicketLengths, ...rightPicketLengths];
  const picketSummary = summarizeLengths(allPicketLengths);
  const picketTube = picketSummary.total;
  const wasteMultiplier = 1 + (settings.waste / 100);
  const stockPlans = [
    stockPlan("Posts", settings.postWidth, settings.postThickness, [
      { length: postCutLength, qty: 2 }
    ]),
    stockPlan("Frame tube", settings.frameSize, settings.frameThickness, [
      { length: verticalLength, qty: 2 * leafCount },
      ...(straightRailCount > 0 ? [{ length: leftInnerWidth, qty: straightRailCount }] : []),
      ...(doubleGate && straightRailCount > 0 ? [{ length: rightInnerWidth, qty: straightRailCount }] : []),
      ...(archedTop ? [{ length: leftTopRailLength, qty: 1 }] : []),
      ...(doubleGate && archedTop ? [{ length: rightTopRailLength, qty: 1 }] : [])
    ]),
    stockPlan("Picket tube", settings.picketWidth, settings.picketThickness, [
      ...leftPicketLengths.map((length) => ({ length, qty: 1 })),
      ...rightPicketLengths.map((length) => ({ length, qty: 1 }))
    ])
  ];
  const postWeight = squareTubeWeight(postTube, settings.postWidth, settings.postThickness);
  const leftFrameWeight = squareTubeWeight((verticalLength * 2) + (leftInnerWidth * straightRailCount) + (archedTop ? leftTopRailLength : 0), settings.frameSize, settings.frameThickness);
  const rightFrameWeight = doubleGate ? squareTubeWeight((verticalLength * 2) + (rightInnerWidth * straightRailCount) + (archedTop ? rightTopRailLength : 0), settings.frameSize, settings.frameThickness) : 0;
  const leftPicketWeight = squareTubeWeight(leftPicketSummary.total, settings.picketWidth, settings.picketThickness);
  const rightPicketWeight = squareTubeWeight(rightPicketSummary.total, settings.picketWidth, settings.picketThickness);
  const leftGateWeight = leftFrameWeight + leftPicketWeight;
  const rightGateWeight = rightFrameWeight + rightPicketWeight;
  const gateFrameWeight = squareTubeWeight(frameTube, settings.frameSize, settings.frameThickness);
  const gatePicketWeight = squareTubeWeight(picketTube, settings.picketWidth, settings.picketThickness);
  const totalGateWeight = gateFrameWeight + gatePicketWeight;
  const gateLeafWeight = totalGateWeight / leafCount;
  const frameWeight = squareTubeWeight(frameTube * wasteMultiplier, settings.frameSize, settings.frameThickness);
  const picketWeight = squareTubeWeight(picketTube * wasteMultiplier, settings.picketWidth, settings.picketThickness);
  const totalUsedMetalWeight = stockPlans.reduce((sum, plan) => sum + plan.usedWeight, 0);
  const totalMetalWeight = stockPlans.reduce((sum, plan) => sum + plan.purchasedWeight, 0);
  const metalCost = (totalMetalWeight / 100) * settings.cwtCost;
  const purchasedLength = stockPlans.reduce((sum, plan) => sum + plan.best.purchased, 0);
  const usedLength = stockPlans.reduce((sum, plan) => sum + plan.best.used, 0);
  const stockWaste = purchasedLength - usedLength;

  return {
    opening,
    outside,
    doubleGate,
    leafCount,
    centerGap,
    archedTop,
    archRise,
    gateVisualHeight,
    leftPostGap,
    rightPostGap,
    leftLeafWidth,
    rightLeafWidth,
    leftInnerWidth,
    rightInnerWidth,
    innerHeight,
    leftPicketGap,
    rightPicketGap,
    picketGap: Math.min(leftPicketGap, rightPicketGap),
    postCutLength,
    postTube,
    railInsideLengths,
    straightRailCount,
    leftTopRailLength,
    rightTopRailLength,
    topRailLengths,
    leftRailInsideLength: leftInnerWidth,
    rightRailInsideLength: rightInnerWidth,
    horizontalLength: leftInnerWidth,
    leftPicketLengths,
    rightPicketLengths,
    leftPicketSummary,
    rightPicketSummary,
    picketSummary,
    verticalLength,
    frameTube,
    picketTube,
    frameTubeWithWaste: frameTube * wasteMultiplier,
    picketTubeWithWaste: picketTube * wasteMultiplier,
    postWeight,
    leftFrameWeight,
    rightFrameWeight,
    leftPicketWeight,
    rightPicketWeight,
    leftGateWeight,
    rightGateWeight,
    gateFrameWeight,
    gatePicketWeight,
    totalGateWeight,
    gateLeafWeight,
    frameWeight,
    picketWeight,
    stockPlans,
    purchasedLength,
    usedLength,
    stockWaste,
    totalUsedMetalWeight,
    totalMetalWeight,
    metalCost,
    totalPickets: settings.leftPicketCount + rightPicketCount
  };
}

function parseFenceSections(value) {
  return String(value || "")
    .split(/[\s,]+/)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((feetValue) => feetValue * 12);
}

function evenFenceSections(length, maxSection) {
  if (length <= 0) return [];
  const count = Math.max(1, Math.ceil(length / maxSection));
  return Array.from({ length: count }, () => length / count);
}

function calculateFence(settings, linkedGateSettings = null) {
  const linkedGateCalc = linkedGateSettings ? calculate(linkedGateSettings) : null;
  const totalLength = Math.max(Number(settings.fenceLengthFeet) || 0, 0) * 12;
  const maxSection = Math.max(Number(settings.fenceMaxSectionFeet) || 8, 1) * 12;
  const gateCount = linkedGateCalc ? 1 : Math.max(0, Math.round(Number(settings.fenceGateCount) || 0));
  const gateOpeningWidth = linkedGateCalc ? linkedGateCalc.opening : Math.max(Number(settings.fenceGateWidthFeet) || 0, 0) * 12;
  const gateOutsideWidth = linkedGateCalc ? linkedGateCalc.outside : gateOpeningWidth;
  const gateSpaceWidth = gateOutsideWidth;
  const totalGateSpace = Math.min(totalLength, gateCount * gateSpaceWidth);
  const maxGateStart = Math.max(totalLength - totalGateSpace, 0);
  const gateStart = gateCount > 0
    ? Math.max(0, Math.min((Number(settings.fenceGateStartFeet) || 0) * 12, maxGateStart))
    : 0;
  const leftRunLength = gateCount > 0 ? gateStart : totalLength;
  const rightRunLength = gateCount > 0 ? Math.max(totalLength - gateStart - totalGateSpace, 0) : 0;
  const fenceRunLength = Math.max(totalLength - totalGateSpace, 0);
  const manualSections = parseFenceSections(settings.fenceManualSections);
  const leftSections = evenFenceSections(leftRunLength, maxSection);
  const rightSections = evenFenceSections(rightRunLength, maxSection);
  const autoSections = gateCount > 0
    ? [...leftSections, ...rightSections]
    : evenFenceSections(fenceRunLength, maxSection);
  const sections = settings.fenceSectionMode === "manual" && manualSections.length > 0
    ? manualSections
    : autoSections;
  const sectionTotal = sections.reduce((sum, length) => sum + length, 0);
  const longestSection = sections.reduce((longest, length) => Math.max(longest, length), 0);
  const postCutLength = Number(settings.fenceHeight) + Number(settings.fencePostEmbed);
  const fencePostCount = gateCount > 0
    ? (leftSections.length > 0 ? leftSections.length + 1 : 0) + (rightSections.length > 0 ? rightSections.length + 1 : 0)
    : (sections.length > 0 ? sections.length + 1 : 0);
  const gatePostCount = gateCount > 0 ? 2 : 0;
  const totalPostCount = gateCount > 0
    ? Math.max(gatePostCount, fencePostCount + (leftSections.length === 0 || rightSections.length === 0 ? 1 : 0))
    : fencePostCount;
  const picketRows = sections.map((length, index) => {
    const count = Math.ceil(length / Number(settings.fencePicketWidth));
    return {
      index: index + 1,
      length,
      pickets: count,
      lastPicketRip: Math.max((count * Number(settings.fencePicketWidth)) - length, 0)
    };
  });
  const totalPickets = picketRows.reduce((sum, section) => sum + section.pickets, 0);
  const railCuts = sections.length * Number(settings.fenceRailCount);
  const postTube = totalPostCount * postCutLength;
  const postPlan = stockPlan("Posts", settings.postWidth, settings.postThickness, [
    { length: postCutLength, qty: totalPostCount }
  ]);
  const totalMetalWeight = postPlan.purchasedWeight;
  const metalCost = (totalMetalWeight / 100) * settings.cwtCost;

  return {
    totalLength,
    fenceRunLength,
    totalGateOpening: totalGateSpace,
    totalGateSpace,
    gateCount,
    gateWidth: gateSpaceWidth,
    gateOpeningWidth,
    gateOutsideWidth,
    gateSpaceWidth,
    gateStart,
    maxGateStart,
    leftRunLength,
    rightRunLength,
    leftSections,
    rightSections,
    sections,
    sectionTotal,
    longestSection,
    maxSection,
    postCutLength,
    fencePostCount,
    gatePostCount,
    totalPostCount,
    picketRows,
    totalPickets,
    railCuts,
    postTube,
    linkedGateCalc,
    linkedGateSettings,
    stockPlans: [postPlan],
    purchasedLength: postPlan.best.purchased,
    usedLength: postPlan.best.used,
    stockWaste: postPlan.best.waste,
    totalMetalWeight,
    metalCost
  };
}

function getMessages(settings, calc) {
  const messages = [];
  if (calc.gateVisualHeight >= settings.postHeight) {
    messages.push({ type: "warn", text: "Gate peak height is equal to or taller than the posts." });
  }
  if (calc.leftInnerWidth <= 0 || (calc.doubleGate && calc.rightInnerWidth <= 0) || calc.innerHeight <= 0) {
    messages.push({ type: "bad", text: "Frame size leaves no usable interior space." });
  }
  if (settings.postThickness * 2 >= settings.postWidth || settings.frameThickness * 2 >= settings.frameSize || settings.picketThickness * 2 >= settings.picketWidth) {
    messages.push({ type: "bad", text: "One tube wall thickness is too large for its outside size." });
  }
  if (calc.leftPicketGap < 0 || (calc.doubleGate && calc.rightPicketGap < 0)) {
    messages.push({ type: "bad", text: "Pickets are too wide or too many for this gate width." });
  } else if (calc.leftPicketGap < PICKET_TARGET_GAP || (calc.doubleGate && calc.rightPicketGap < PICKET_TARGET_GAP)) {
    messages.push({ type: "warn", text: calc.doubleGate ? `Picket gap is under the 5" goal. Left ${inch(calc.leftPicketGap)}, right ${inch(calc.rightPicketGap)}.` : `Picket gap is under the 5" goal at ${inch(calc.leftPicketGap)}.` });
  } else if (calc.leftPicketGap > 6.5 || (calc.doubleGate && calc.rightPicketGap > 6.5)) {
    messages.push({ type: "warn", text: calc.doubleGate ? `Picket gap is wide. Left ${inch(calc.leftPicketGap)}, right ${inch(calc.rightPicketGap)}.` : `Picket gap is wide at ${inch(calc.leftPicketGap)}.` });
  }
  return messages.length ? messages : [{ type: "ok", text: "Layout looks buildable with the current assumptions." }];
}

function getFenceMessages(settings, calc) {
  const messages = [];
  if (calc.longestSection > calc.maxSection) {
    messages.push({ type: "warn", text: `Longest section is ${feet(calc.longestSection, 2)}. Keep sections at ${feet(calc.maxSection, 0)} or less unless you mean to override it.` });
  } else {
    messages.push({ type: "ok", text: `Sections are even and stay under ${feet(calc.maxSection, 0)}.` });
  }
  if (calc.gateCount > 0) {
    messages.push({ type: "ok", text: `${calc.linkedGateCalc ? "Saved gate" : `${calc.gateCount} gate opening${calc.gateCount === 1 ? "" : "s"}`} starts at ${feet(calc.gateStart, 2)} from the left.` });
  }
  if (settings.fenceSectionMode === "manual" && Math.abs(calc.sectionTotal + calc.totalGateSpace - calc.totalLength) > 0.5) {
    messages.push({ type: "warn", text: `Manual sections plus gates equal ${feet(calc.sectionTotal + calc.totalGateSpace, 2)}, not ${feet(calc.totalLength, 2)}.` });
  }
  messages.push({ type: "ok", text: `${settings.fencePicketMaterial} dog-ear pickets with no spacing between pickets.` });
  return messages;
}

function getMaterialRows(settings, calc) {
  const sameLeafWidths = Number(settings.leftLeafWidth) === Number(settings.rightLeafWidth);
  const samePicketSpacing = fmt(calc.leftPicketGap, 3) === fmt(calc.rightPicketGap, 3);
  const sameTopRails = fmt(calc.leftTopRailLength, 3) === fmt(calc.rightTopRailLength, 3);
  const picketLength = calc.archedTop
    ? lengthRangeLabel(calc.picketSummary.min, calc.picketSummary.max)
    : inch(calc.innerHeight);
  const leftPicketLength = calc.archedTop
    ? lengthRangeLabel(calc.leftPicketSummary.min, calc.leftPicketSummary.max)
    : inch(calc.innerHeight);
  const rightPicketLength = calc.archedTop
    ? lengthRangeLabel(calc.rightPicketSummary.min, calc.rightPicketSummary.max)
    : inch(calc.innerHeight);
  const railNote = calc.archedTop ? "Straight bottom/intermediate rails" : "Horizontal rails fit between vertical frame members";
  const rows = [
    ["Posts", 2, tubeSpec(settings.postWidth, settings.postThickness), inch(calc.postCutLength), thicknessLabel(settings.postThickness), `${inch(settings.postHeight)} above grade + ${inch(settings.postEmbed)} embed`],
    ["Frame verticals", calc.leafCount * 2, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.verticalLength), thicknessLabel(settings.frameThickness), "Two per leaf"]
  ];

  if (!calc.doubleGate) {
    if (calc.straightRailCount > 0) rows.push(["Frame horizontals", calc.straightRailCount, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.leftRailInsideLength), thicknessLabel(settings.frameThickness), railNote]);
    if (calc.archedTop) rows.push(["Arched top rail", 1, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.leftTopRailLength), thicknessLabel(settings.frameThickness), `${inch(calc.archRise)} rise, arc length estimate`]);
    rows.push(["Pickets", settings.leftPicketCount, tubeSpec(settings.picketWidth, settings.picketThickness), picketLength, thicknessLabel(settings.picketThickness), `${inch(Math.max(calc.leftPicketGap, 0))} clear spacing`]);
    return rows;
  }

  if (sameLeafWidths) {
    if (calc.straightRailCount > 0) rows.push(["Frame horizontals", calc.straightRailCount * 2, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.leftRailInsideLength), thicknessLabel(settings.frameThickness), `${calc.straightRailCount} straight per leaf`]);
    if (calc.archedTop) rows.push(["Arched top rails", 2, tubeSpec(settings.frameSize, settings.frameThickness), sameTopRails ? inch(calc.leftTopRailLength) : `${inch(calc.leftTopRailLength)} / ${inch(calc.rightTopRailLength)}`, thicknessLabel(settings.frameThickness), `${inch(calc.archRise)} rise, arc length estimate`]);
    rows.push(["Pickets", settings.leftPicketCount + settings.rightPicketCount, tubeSpec(settings.picketWidth, settings.picketThickness), picketLength, thicknessLabel(settings.picketThickness), samePicketSpacing ? `${inch(Math.max(calc.leftPicketGap, 0))} clear spacing` : `Left ${inch(Math.max(calc.leftPicketGap, 0))}, right ${inch(Math.max(calc.rightPicketGap, 0))} clear spacing`]);
    return rows;
  }

  if (calc.straightRailCount > 0) {
    rows.push(
      ["Left frame horizontals", calc.straightRailCount, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.leftRailInsideLength), thicknessLabel(settings.frameThickness), railNote],
      ["Right frame horizontals", calc.straightRailCount, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.rightRailInsideLength), thicknessLabel(settings.frameThickness), railNote]
    );
  }
  if (calc.archedTop) {
    rows.push(
      ["Left arched top rail", 1, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.leftTopRailLength), thicknessLabel(settings.frameThickness), `${inch(calc.archRise)} rise, arc length estimate`],
      ["Right arched top rail", 1, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.rightTopRailLength), thicknessLabel(settings.frameThickness), `${inch(calc.archRise)} rise, arc length estimate`]
    );
  }
  rows.push(
    ["Left pickets", settings.leftPicketCount, tubeSpec(settings.picketWidth, settings.picketThickness), leftPicketLength, thicknessLabel(settings.picketThickness), `${inch(Math.max(calc.leftPicketGap, 0))} clear spacing`],
    ["Right pickets", settings.rightPicketCount, tubeSpec(settings.picketWidth, settings.picketThickness), rightPicketLength, thicknessLabel(settings.picketThickness), `${inch(Math.max(calc.rightPicketGap, 0))} clear spacing`]
  );
  return rows;
}

function getFenceMaterialRows(settings, calc) {
  return [
    ["Posts", calc.totalPostCount, `${inch(settings.postWidth, 2)} metal posts`, inch(calc.postCutLength, 2), thicknessLabel(settings.postThickness), `${inch(settings.fenceHeight, 2)} above grade + ${inch(settings.fencePostEmbed, 2)} embed`],
    [`${settings.fencePicketMaterial} dog-ear pickets`, calc.totalPickets, `${inchFraction(settings.fencePicketWidth)} x ${inchFraction(settings.fencePicketHeight)} pickets`, inch(settings.fencePicketHeight, 2), "", "Vertical pickets, no gap"],
    ["Fence rails", calc.railCuts, "Wood rails", "Section length", "", `${settings.fenceRailCount} rails per section`],
    ["Fence sections", calc.sections.length, "Even fence sections", feet(calc.longestSection || 0, 2), "", `Longest section, no section longer than ${feet(calc.maxSection, 0)}`],
    ...(calc.gateCount > 0 ? [[
      calc.linkedGateCalc ? "Saved gate" : "Gate openings",
      calc.gateCount,
      calc.linkedGateCalc ? "Full saved gate outside width" : "Gate space in fence run",
      feet(calc.gateSpaceWidth, 2),
      "",
      calc.linkedGateCalc ? `Post opening ${feet(calc.gateOpeningWidth, 2)}` : "Gate fabrication stays in Gate mode"
    ]] : [])
  ];
}

function getCutRows(settings, calc) {
  const stockByName = Object.fromEntries(calc.stockPlans.map((plan) => [plan.name, `${plan.best.sticks} x ${plan.best.label}`]));
  const sameLeafWidths = Number(settings.leftLeafWidth) === Number(settings.rightLeafWidth);
  const samePicketSpacing = fmt(calc.leftPicketGap, 3) === fmt(calc.rightPicketGap, 3);
  const sameTopRails = fmt(calc.leftTopRailLength, 3) === fmt(calc.rightTopRailLength, 3);
  const picketLength = calc.archedTop
    ? lengthRangeLabel(calc.picketSummary.min, calc.picketSummary.max)
    : inch(calc.innerHeight);
  const leftPicketLength = calc.archedTop
    ? lengthRangeLabel(calc.leftPicketSummary.min, calc.leftPicketSummary.max)
    : inch(calc.innerHeight);
  const rightPicketLength = calc.archedTop
    ? lengthRangeLabel(calc.rightPicketSummary.min, calc.rightPicketSummary.max)
    : inch(calc.innerHeight);
  const rows = [
    ["1", "Post", 2, inch(calc.postCutLength), inch(settings.postWidth), thicknessLabel(settings.postThickness), stockByName.Posts, "Post", `${inch(settings.postHeight)} above grade + ${inch(settings.postEmbed)} embed`],
    ["2", "Gate frame vertical", calc.leafCount * 2, inch(calc.verticalLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", "Miter or butt joint per shop standard"]
  ];
  let item = 3;
  const pushRow = (name, qty, length, size, thickness, stock, type, note) => {
    rows.push([String(item), name, qty, length, size, thickness, stock, type, note]);
    item += 1;
  };

  if (!calc.doubleGate) {
    if (calc.straightRailCount > 0) pushRow("Gate frame horizontal", calc.straightRailCount, inch(calc.leftRailInsideLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", "Straight bottom/intermediate rails");
    if (calc.archedTop) pushRow("Arched top rail", 1, inch(calc.leftTopRailLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", `${inch(calc.archRise)} rise, arc length estimate`);
    pushRow("Picket", settings.leftPicketCount, picketLength, inch(settings.picketWidth), thicknessLabel(settings.picketThickness), stockByName["Picket tube"], "Picket", `${inch(Math.max(calc.leftPicketGap, 0))} clear spacing`);
    return rows;
  }

  if (sameLeafWidths) {
    if (calc.straightRailCount > 0) pushRow("Gate frame horizontal", calc.straightRailCount * 2, inch(calc.leftRailInsideLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", `${calc.straightRailCount} straight per leaf`);
    if (calc.archedTop) pushRow("Arched top rail", 2, sameTopRails ? inch(calc.leftTopRailLength) : `${inch(calc.leftTopRailLength)} / ${inch(calc.rightTopRailLength)}`, inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", `${inch(calc.archRise)} rise, arc length estimate`);
    pushRow("Picket", settings.leftPicketCount + settings.rightPicketCount, picketLength, inch(settings.picketWidth), thicknessLabel(settings.picketThickness), stockByName["Picket tube"], "Picket", samePicketSpacing ? `${inch(Math.max(calc.leftPicketGap, 0))} clear spacing` : `Left ${inch(Math.max(calc.leftPicketGap, 0))}, right ${inch(Math.max(calc.rightPicketGap, 0))} clear spacing`);
    return rows;
  }

  if (calc.straightRailCount > 0) {
    pushRow("Left gate frame horizontal", calc.straightRailCount, inch(calc.leftRailInsideLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", "Straight bottom/intermediate rails");
    pushRow("Right gate frame horizontal", calc.straightRailCount, inch(calc.rightRailInsideLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", "Straight bottom/intermediate rails");
  }
  if (calc.archedTop) {
    pushRow("Left arched top rail", 1, inch(calc.leftTopRailLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", `${inch(calc.archRise)} rise, arc length estimate`);
    pushRow("Right arched top rail", 1, inch(calc.rightTopRailLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", `${inch(calc.archRise)} rise, arc length estimate`);
  }
  pushRow("Left picket", settings.leftPicketCount, leftPicketLength, inch(settings.picketWidth), thicknessLabel(settings.picketThickness), stockByName["Picket tube"], "Picket", `${inch(Math.max(calc.leftPicketGap, 0))} clear spacing`);
  pushRow("Right picket", settings.rightPicketCount, rightPicketLength, inch(settings.picketWidth), thicknessLabel(settings.picketThickness), stockByName["Picket tube"], "Picket", `${inch(Math.max(calc.rightPicketGap, 0))} clear spacing`);
  return rows;
}

function getFenceCutRows(settings, calc) {
  const stockByName = Object.fromEntries(calc.stockPlans.map((plan) => [plan.name, `${plan.best.sticks} x ${plan.best.label}`]));
  const railGroups = calc.sections.reduce((groups, length) => {
    const key = fmt(length, 3);
    const current = groups.get(key) || { length, sections: 0 };
    current.sections += 1;
    groups.set(key, current);
    return groups;
  }, new Map());
  const railRows = Array.from(railGroups.values()).map((group, index) => [
    String(index + 3),
    "Fence rails",
    group.sections * settings.fenceRailCount,
    feet(group.length, 2),
    "Wood rail",
    "",
    "Buy rail lumber",
    "Rail",
    `${settings.fenceRailCount} rails per section x ${group.sections} section${group.sections === 1 ? "" : "s"}`
  ]);

  return [
    ["1", "Post", calc.totalPostCount, inch(calc.postCutLength, 2), inch(settings.postWidth, 2), thicknessLabel(settings.postThickness), stockByName.Posts, "Post", `${inch(settings.fencePostEmbed, 2)} into ground`],
    ["2", `${settings.fencePicketMaterial} Pickets`, calc.totalPickets, inch(settings.fencePicketHeight, 2), inchFraction(settings.fencePicketWidth), "", "Buy full pickets", "Picket", "Vertical pickets, no spacing"],
    ...railRows
  ];
}

function makeBuildId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `gate-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getAuthRedirectUrl() {
  const productionUrl = "https://dirtcollins.github.io/brendan/";
  if (window.location.protocol === "file:" || window.location.origin === "null") return productionUrl;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return "http://localhost:4173/";
  const cleanPath = window.location.pathname.replace(/\/index\.html$/, "/");
  return `${window.location.origin}${cleanPath.endsWith("/") ? cleanPath : `${cleanPath}/`}`;
}

function normalizeBuild(build) {
  return {
    id: build.id || makeBuildId(),
    name: String(build.name || "Untitled Gate").trim() || "Untitled Gate",
    settings: normalizeSettings(build.settings || {}),
    createdAt: build.createdAt || new Date().toISOString(),
    updatedAt: build.updatedAt || build.createdAt || new Date().toISOString()
  };
}

function projectRowToBuild(row) {
  return normalizeBuild({
    id: row.id,
    name: row.name,
    settings: row.data,
    createdAt: row.created_at,
    updatedAt: row.created_at
  });
}

function featureRowToRequest(row) {
  return normalizeFeatureRequest({
    id: row.id,
    userId: row.user_id || "",
    title: row.title,
    details: row.details,
    priority: row.priority,
    status: row.status,
    buildMode: row.build_type,
    buildName: row.build_name,
    createdAt: row.created_at
  });
}

function normalizeFeatureRequest(request) {
  return {
    id: request.id || makeBuildId(),
    title: String(request.title || "Untitled request").trim() || "Untitled request",
    details: String(request.details || "").trim(),
    priority: ["Low", "Normal", "High"].includes(request.priority) ? request.priority : "Normal",
    status: ["New", "Planned", "Done"].includes(request.status) ? request.status : "New",
    buildMode: request.buildMode === "fence" ? "fence" : "gate",
    buildName: String(request.buildName || "").trim(),
    userId: String(request.userId || "").trim(),
    createdAt: request.createdAt || new Date().toISOString()
  };
}

function useAuthSession() {
  const [session, setSession] = useState(AUTH_REQUIRED ? null : GUEST_SESSION);
  const [authLoading, setAuthLoading] = useState(AUTH_REQUIRED);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!AUTH_REQUIRED) {
      setSession(GUEST_SESSION);
      setAuthLoading(false);
      return undefined;
    }

    if (!supabaseClient) {
      setAuthLoading(false);
      return undefined;
    }

    let mounted = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setAuthLoading(false);
    });

    const { data: listener } = supabaseClient.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, authLoading, passwordRecovery, setPasswordRecovery };
}

function useSupabaseProjects(userId) {
  const [builds, setBuilds] = useState(() => readLocalItems(LOCAL_BUILDS_KEY));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadProjects() {
    if (!AUTH_REQUIRED || !supabaseClient || !userId) {
      setBuilds(readLocalItems(LOCAL_BUILDS_KEY));
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabaseClient
      .from("projects")
      .select("id, name, type, data, created_at")
      .order("created_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
    } else {
      setBuilds((data || []).map(projectRowToBuild));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProjects();
  }, [userId]);

  return { builds, setBuilds, loading, error, refresh: loadProjects };
}

function useSupabaseFeatureRequests(userId, includeAll = false) {
  const [requests, setRequests] = useState(() => readLocalItems(LOCAL_FEATURE_REQUESTS_KEY));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadRequests() {
    if (!AUTH_REQUIRED || !supabaseClient || !userId) {
      setRequests(readLocalItems(LOCAL_FEATURE_REQUESTS_KEY));
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabaseClient
      .from("feature_requests")
      .select("id, user_id, title, details, priority, status, build_type, build_name, created_at")
      .order("created_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
    } else {
      setRequests((data || []).map(featureRowToRequest));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, [userId, includeAll]);

  return { requests, setRequests, loading, error, refresh: loadRequests };
}

function readLocalItems(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalItems(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function useSavedSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const storedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const normalized = normalizeSettings(storedSettings);
      if (!storedSettings.settingsVersion && Number(storedSettings.cwtCost) === 88) {
        return { ...normalized, cwtCost: DEFAULTS.cwtCost, settingsVersion: DEFAULTS.settingsVersion };
      }
      return normalized;
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return [settings, setSettings];
}

function AuthShell({ title, message }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand"><img src="./src/assets/logo4.svg" alt="Fence & Gate Builder" /></div>
        <h1>{title}</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";
  const isReset = mode === "reset";
  const title = isReset ? "Reset your password" : isSignup ? "Start free" : "Welcome back";
  const copy = isReset
    ? "Enter your email and we will send you a secure reset link."
    : isSignup
      ? "Create a free account to save gate and fence builds in the cloud."
      : "Sign in to open saved builds, continue estimates, and submit feature requests.";
  const submitText = loading ? "Working..." : isReset ? "Send reset link" : isSignup ? "Create free account" : "Sign in";

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    const redirectTo = getAuthRedirectUrl();
    const { error } = isReset
      ? await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo })
      : isSignup
        ? await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
        : await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(error.message);
    } else if (isReset) {
      setStatus("Password reset email sent.");
    } else if (isSignup) {
      setStatus("Signup complete. Check your email if confirmation is required.");
    }
    setLoading(false);
  }

  async function signInWithGoogle() {
    setLoading(true);
    setStatus("");
    const redirectTo = getAuthRedirectUrl();
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    if (error) {
      setStatus(error.message);
      setLoading(false);
    }
  }

  async function sendMagicLink() {
    if (!email) {
      setStatus("Enter your email first.");
      return;
    }
    setLoading(true);
    setStatus("");
    const redirectTo = getAuthRedirectUrl();
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true
      }
    });
    setStatus(error ? error.message : "Magic link sent. Check your email to sign in.");
    setLoading(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-layout">
        <aside className="auth-intro">
          <div className="auth-brand"><img src="./src/assets/logo4.svg" alt="Fence & Gate Builder" /></div>
          <div>
            <span className="auth-kicker">Free cloud account</span>
            <h1>Build, save, and reopen every fence and gate job.</h1>
            <p>Use the fabrication calculator on any device while keeping each customer's build private to your login.</p>
          </div>
          <div className="auth-benefits" aria-label="Account benefits">
            <span><Icon name="save" />Cloud saved gates and fences</span>
            <span><Icon name="request" />Feature requests tied to your account</span>
            <span><Icon name="settings" />Secure cloud login</span>
          </div>
          <div className="auth-preview" aria-hidden="true">
            <div className="auth-preview-top">
              <span />
              <span />
              <span />
            </div>
            <div className="auth-preview-gate">
              <i />
              <b />
              <b />
              <b />
              <b />
              <i />
            </div>
            <div className="auth-preview-metrics">
              <span>Saved builds</span>
              <strong>Cloud ready</strong>
            </div>
          </div>
        </aside>

        <form className="auth-card" onSubmit={submit}>
          <div className="auth-tabs" role="tablist" aria-label="Account options">
            <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>Sign in</button>
            <button className={mode === "signup" ? "active" : ""} type="button" onClick={() => setMode("signup")}>Free account</button>
          </div>
          <div>
            <h2>{title}</h2>
            <p>{copy}</p>
          </div>
          {!isReset && (
            <>
              <button className="google-auth-button" type="button" onClick={signInWithGoogle} disabled={loading}>
                <span className="google-mark" aria-hidden="true">G</span>
                {isSignup ? "Sign up with Google" : "Sign in with Google"}
              </button>
              <div className="auth-divider"><span>or use email</span></div>
            </>
          )}
          <label className="auth-field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" required />
          </label>
          {!isReset && (
            <button className="magic-link-button" type="button" onClick={sendMagicLink} disabled={loading}>
              Email me a magic link
            </button>
          )}
          {!isReset && (
            <label className="auth-field">
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" autoComplete={isSignup ? "new-password" : "current-password"} required minLength="6" />
            </label>
          )}
          {status && <div className="auth-status">{status}</div>}
          <button className="btn new-build auth-submit" type="submit" disabled={loading}>{submitText}</button>
          <div className="auth-links">
            <button type="button" onClick={() => setMode(isReset ? "login" : "reset")}>{isReset ? "Back to sign in" : "Forgot password?"}</button>
            {!isSignup && !isReset && <button type="button" onClick={() => setMode("signup")}>Create a free account</button>}
          </div>
          <p className="auth-fineprint">Free accounts can save projects and requests. Your projects stay private to your account.</p>
        </form>
      </section>
    </main>
  );
}

function UpdatePasswordScreen({ onComplete }) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Password updated.");
      onComplete();
    }
    setLoading(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-layout auth-layout-compact">
        <aside className="auth-intro">
          <div className="auth-brand"><img src="./src/assets/logo4.svg" alt="Fence & Gate Builder" /></div>
          <span className="auth-kicker">Account security</span>
          <h1>Set a new password.</h1>
          <p>After this updates, you can keep working in the builder.</p>
        </aside>
        <form className="auth-card" onSubmit={submit}>
          <h2>New password</h2>
          <p>Choose at least 6 characters.</p>
          <label className="auth-field">
            <span>New password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength="6" autoComplete="new-password" />
          </label>
          {status && <div className="auth-status">{status}</div>}
          <button className="btn new-build auth-submit" type="submit" disabled={loading}>{loading ? "Saving..." : "Update password"}</button>
        </form>
      </section>
    </main>
  );
}
