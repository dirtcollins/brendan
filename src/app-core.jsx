const { useEffect, useMemo, useRef, useState } = React;

const SUPABASE_CONFIG = window.FGB_SUPABASE_CONFIG || {};
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
  const verticalLength = settings.leafHeight;
  const postCutLength = settings.postHeight + settings.postEmbed;
  const postTube = postCutLength * 2;
  const frameTube = (verticalLength * 2 * leafCount) + (railInsideLengths.reduce((sum, length) => sum + length, 0) * settings.railCount);
  const picketTube = innerHeight * (settings.leftPicketCount + rightPicketCount);
  const wasteMultiplier = 1 + (settings.waste / 100);
  const stockPlans = [
    stockPlan("Posts", settings.postWidth, settings.postThickness, [
      { length: postCutLength, qty: 2 }
    ]),
    stockPlan("Frame tube", settings.frameSize, settings.frameThickness, [
      { length: verticalLength, qty: 2 * leafCount },
      { length: leftInnerWidth, qty: settings.railCount },
      ...(doubleGate ? [{ length: rightInnerWidth, qty: settings.railCount }] : [])
    ]),
    stockPlan("Picket tube", settings.picketWidth, settings.picketThickness, [
      { length: innerHeight, qty: settings.leftPicketCount + rightPicketCount }
    ])
  ];
  const postWeight = squareTubeWeight(postTube, settings.postWidth, settings.postThickness);
  const leftFrameWeight = squareTubeWeight((verticalLength * 2) + (leftInnerWidth * settings.railCount), settings.frameSize, settings.frameThickness);
  const rightFrameWeight = doubleGate ? squareTubeWeight((verticalLength * 2) + (rightInnerWidth * settings.railCount), settings.frameSize, settings.frameThickness) : 0;
  const leftPicketWeight = squareTubeWeight(innerHeight * settings.leftPicketCount, settings.picketWidth, settings.picketThickness);
  const rightPicketWeight = squareTubeWeight(innerHeight * rightPicketCount, settings.picketWidth, settings.picketThickness);
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
    leftRailInsideLength: leftInnerWidth,
    rightRailInsideLength: rightInnerWidth,
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
  if (settings.leafHeight >= settings.postHeight) {
    messages.push({ type: "warn", text: "Gate height is equal to or taller than the posts." });
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
  const rows = [
    ["Posts", 2, tubeSpec(settings.postWidth, settings.postThickness), inch(calc.postCutLength), thicknessLabel(settings.postThickness), `${inch(settings.postHeight)} above grade + ${inch(settings.postEmbed)} embed`],
    ["Frame verticals", calc.leafCount * 2, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.verticalLength), thicknessLabel(settings.frameThickness), "Two per leaf"]
  ];

  if (!calc.doubleGate) {
    rows.push(
      ["Frame horizontals", settings.railCount, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.leftRailInsideLength), thicknessLabel(settings.frameThickness), `${settings.railCount} on single leaf`],
      ["Pickets", settings.leftPicketCount, tubeSpec(settings.picketWidth, settings.picketThickness), inch(calc.innerHeight), thicknessLabel(settings.picketThickness), `${inch(Math.max(calc.leftPicketGap, 0))} clear spacing`]
    );
    return rows;
  }

  if (sameLeafWidths) {
    rows.push(
      ["Frame horizontals", settings.railCount * 2, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.leftRailInsideLength), thicknessLabel(settings.frameThickness), `${settings.railCount} per leaf`],
      ["Pickets", settings.leftPicketCount + settings.rightPicketCount, tubeSpec(settings.picketWidth, settings.picketThickness), inch(calc.innerHeight), thicknessLabel(settings.picketThickness), samePicketSpacing ? `${inch(Math.max(calc.leftPicketGap, 0))} clear spacing` : `Left ${inch(Math.max(calc.leftPicketGap, 0))}, right ${inch(Math.max(calc.rightPicketGap, 0))} clear spacing`]
    );
    return rows;
  }

  rows.push(
    ["Left frame horizontals", settings.railCount, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.leftRailInsideLength), thicknessLabel(settings.frameThickness), `${settings.railCount} on left leaf`],
    ["Right frame horizontals", settings.railCount, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.rightRailInsideLength), thicknessLabel(settings.frameThickness), `${settings.railCount} on right leaf`],
    ["Left pickets", settings.leftPicketCount, tubeSpec(settings.picketWidth, settings.picketThickness), inch(calc.innerHeight), thicknessLabel(settings.picketThickness), `${inch(Math.max(calc.leftPicketGap, 0))} clear spacing`],
    ["Right pickets", settings.rightPicketCount, tubeSpec(settings.picketWidth, settings.picketThickness), inch(calc.innerHeight), thicknessLabel(settings.picketThickness), `${inch(Math.max(calc.rightPicketGap, 0))} clear spacing`]
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
  const rows = [
    ["1", "Post", 2, inch(calc.postCutLength), inch(settings.postWidth), thicknessLabel(settings.postThickness), stockByName.Posts, "Post", `${inch(settings.postHeight)} above grade + ${inch(settings.postEmbed)} embed`],
    ["2", "Gate frame vertical", calc.leafCount * 2, inch(calc.verticalLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", "Miter or butt joint per shop standard"]
  ];

  if (!calc.doubleGate) {
    rows.push(
      ["3", "Gate frame horizontal", settings.railCount, inch(calc.leftRailInsideLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", "Fits between vertical frame members"],
      ["4", "Picket", settings.leftPicketCount, inch(calc.innerHeight), inch(settings.picketWidth), thicknessLabel(settings.picketThickness), stockByName["Picket tube"], "Picket", `${inch(Math.max(calc.leftPicketGap, 0))} clear spacing`]
    );
    return rows;
  }

  if (sameLeafWidths) {
    rows.push(
      ["3", "Gate frame horizontal", settings.railCount * 2, inch(calc.leftRailInsideLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", "Fits between vertical frame members"],
      ["4", "Picket", settings.leftPicketCount + settings.rightPicketCount, inch(calc.innerHeight), inch(settings.picketWidth), thicknessLabel(settings.picketThickness), stockByName["Picket tube"], "Picket", samePicketSpacing ? `${inch(Math.max(calc.leftPicketGap, 0))} clear spacing` : `Left ${inch(Math.max(calc.leftPicketGap, 0))}, right ${inch(Math.max(calc.rightPicketGap, 0))} clear spacing`]
    );
    return rows;
  }

  rows.push(
    ["3", "Left gate frame horizontal", settings.railCount, inch(calc.leftRailInsideLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", "Fits between vertical frame members"],
    ["4", "Right gate frame horizontal", settings.railCount, inch(calc.rightRailInsideLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", "Fits between vertical frame members"],
    ["5", "Left picket", settings.leftPicketCount, inch(calc.innerHeight), inch(settings.picketWidth), thicknessLabel(settings.picketThickness), stockByName["Picket tube"], "Picket", `${inch(Math.max(calc.leftPicketGap, 0))} clear spacing`],
    ["6", "Right picket", settings.rightPicketCount, inch(calc.innerHeight), inch(settings.picketWidth), thicknessLabel(settings.picketThickness), stockByName["Picket tube"], "Picket", `${inch(Math.max(calc.rightPicketGap, 0))} clear spacing`]
  );
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

function downloadCSV(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function cleanPdfText(value) {
  return String(value ?? "")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value) {
  return cleanPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function makePdfPage() {
  const page = {
    width: 612,
    height: 792,
    commands: [],
    stroke: "0 0 0",
    fill: "0 0 0",
    font: "F1",
    fontSize: 10
  };

  page.raw = (command) => page.commands.push(command);
  page.strokeColor = (r, g, b) => {
    page.stroke = `${r} ${g} ${b}`;
    page.raw(`${page.stroke} RG`);
  };
  page.fillColor = (r, g, b) => {
    page.fill = `${r} ${g} ${b}`;
    page.raw(`${page.fill} rg`);
  };
  page.lineWidth = (width) => page.raw(`${fmt(width, 2)} w`);
  page.line = (x1, y1, x2, y2) => {
    page.raw(`${fmt(x1, 2)} ${fmt(page.height - y1, 2)} m ${fmt(x2, 2)} ${fmt(page.height - y2, 2)} l S`);
  };
  page.rect = (x, y, width, height, fill = false) => {
    page.raw(`${fmt(x, 2)} ${fmt(page.height - y - height, 2)} ${fmt(width, 2)} ${fmt(height, 2)} re ${fill ? "f" : "S"}`);
  };
  page.text = (x, y, text, size = 10, bold = false, align = "left") => {
    const safe = escapePdfText(text);
    const widthGuess = safe.length * size * 0.52;
    const tx = align === "center" ? x - widthGuess / 2 : align === "right" ? x - widthGuess : x;
    page.raw(`BT /${bold ? "F2" : "F1"} ${fmt(size, 2)} Tf ${fmt(tx, 2)} ${fmt(page.height - y, 2)} Td (${safe}) Tj ET`);
  };
  page.textRotated = (x, y, text, size = 10, bold = false) => {
    page.raw(`BT /${bold ? "F2" : "F1"} ${fmt(size, 2)} Tf 0 1 -1 0 ${fmt(x, 2)} ${fmt(page.height - y, 2)} Tm (${escapePdfText(text)}) Tj ET`);
  };
  return page;
}

function buildPdfDocument(pages) {
  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const regularFontRef = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontRef = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pagesRef = addObject("__PAGES__");
  const pageRefs = pages.map((page) => {
    const content = page.commands.join("\n");
    const streamRef = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    return addObject(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${regularFontRef} 0 R /F2 ${boldFontRef} 0 R >> >> /Contents ${streamRef} 0 R >>`);
  });
  objects[pagesRef - 1] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;
  const catalogRef = addObject(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function drawPdfHeader(page, title, subtitle, buildName) {
  page.fillColor(0, 0, 0);
  page.text(42, 42, title, 18, true);
  page.text(42, 61, subtitle, 10, false);
  page.text(570, 42, buildName || "Untitled Build", 10, true, "right");
  page.text(570, 58, new Date().toLocaleDateString(), 9, false, "right");
  page.strokeColor(0.78, 0.78, 0.78);
  page.lineWidth(0.8);
  page.line(42, 76, 570, 76);
  page.strokeColor(0, 0, 0);
}

function drawPdfLogoMark(page, x, y, size = 48) {
  const panelW = size * 0.42;
  const gap = size * 0.08;
  const panelH = size * 0.7;
  const top = y + size * 0.12;
  const leftA = x;
  const leftB = x + panelW + gap;

  page.fillColor(0, 0, 0);
  page.rect(leftA, top, panelW, panelH, true);
  page.rect(leftB, top, panelW, panelH, true);

  page.strokeColor(1, 1, 1);
  page.lineWidth(2.1);
  [leftA, leftB].forEach((panelX) => {
    page.line(panelX + panelW * 0.18, top + panelH * 0.22, panelX + panelW * 0.82, top + panelH * 0.22);
    page.line(panelX + panelW * 0.18, top + panelH * 0.42, panelX + panelW * 0.82, top + panelH * 0.42);
    page.line(panelX + panelW * 0.18, top + panelH * 0.62, panelX + panelW * 0.82, top + panelH * 0.62);
  });

  page.strokeColor(0, 0, 0);
  page.lineWidth(1.2);
  page.line(x + panelW + gap / 2, y + size * 0.08, x + panelW + gap / 2, y + size * 0.88);
}

function drawPdfInfoRow(page, x, y, label, value, width = 220) {
  page.fillColor(0.35, 0.35, 0.35);
  page.text(x, y, cleanPdfText(label).toUpperCase(), 8, true);
  page.fillColor(0, 0, 0);
  page.text(x, y + 15, cleanPdfText(value || "________________________________"), 11, true);
  page.strokeColor(0.82, 0.82, 0.82);
  page.lineWidth(0.6);
  page.line(x, y + 31, x + width, y + 31);
}

function drawCoverPage(page, buildName, isFence) {
  const projectType = isFence ? "Fence" : "Gate";

  page.fillColor(0, 0, 0);
  drawPdfLogoMark(page, 42, 45, 58);
  page.text(112, 55, "FENCE & GATE", 15, true);
  page.text(112, 73, "BUILDER", 15, true);
  page.text(570, 58, new Date().toLocaleDateString(), 10, true, "right");

  page.strokeColor(0.78, 0.78, 0.78);
  page.lineWidth(0.8);
  page.line(42, 120, 570, 120);

  page.fillColor(0, 0, 0);
  page.text(42, 160, "SHOP FABRICATION PACKET", 28, true);
  page.fillColor(0.35, 0.35, 0.35);
  page.text(42, 190, "Generated from project measurements and fabrication data.", 10, false);

  page.strokeColor(0.82, 0.82, 0.82);
  page.fillColor(0.98, 0.98, 0.97);
  page.rect(42, 232, 528, 142, true);
  page.strokeColor(0.72, 0.72, 0.72);
  page.rect(42, 232, 528, 142, false);

  page.fillColor(0, 0, 0);
  page.text(62, 256, "PROJECT INFORMATION", 12, true);
  drawPdfInfoRow(page, 62, 286, "Project name", buildName, 230);
  drawPdfInfoRow(page, 320, 286, "Project type", projectType, 210);
  drawPdfInfoRow(page, 62, 336, "Date", new Date().toLocaleDateString(), 230);
  drawPdfInfoRow(page, 320, 336, "Prepared by", "", 210);

  page.fillColor(0.98, 0.98, 0.97);
  page.strokeColor(0.82, 0.82, 0.82);
  page.rect(42, 404, 528, 160, true);
  page.strokeColor(0.72, 0.72, 0.72);
  page.rect(42, 404, 528, 160, false);

  page.fillColor(0, 0, 0);
  page.text(62, 428, "COMPANY DETAILS", 12, true);
  drawPdfInfoRow(page, 62, 458, "Company name", "Fence & Gate Builder", 230);
  drawPdfInfoRow(page, 320, 458, "Phone", "", 210);
  drawPdfInfoRow(page, 62, 508, "Email", "", 230);
  drawPdfInfoRow(page, 320, 508, "Website", "", 210);
  drawPdfInfoRow(page, 62, 558, "Address", "", 468);

  page.fillColor(1, 1, 1);
  page.strokeColor(0.72, 0.72, 0.72);
  page.rect(42, 598, 528, 136, true);
  page.rect(42, 598, 528, 136, false);
  page.fillColor(0, 0, 0);
  page.text(62, 622, "NOTES", 12, true);
  page.strokeColor(0.86, 0.86, 0.86);
  page.lineWidth(0.6);
  [662, 694, 726].forEach((lineY) => {
    page.line(62, lineY, 550, lineY);
  });

  page.fillColor(0.42, 0.42, 0.42);
  page.text(42, 762, "Fabrication packet for shop drawing, cut list, materials, purchase list, build notes, and install notes.", 8, false);
}

function drawDimensionH(page, x1, x2, y, label, options = {}) {
  const tick = options.tick || 7;
  const labelOffset = options.labelOffset || -7;
  page.lineWidth(options.lineWidth || 0.8);
  page.strokeColor(0, 0, 0);
  page.line(x1, y, x2, y);
  page.line(x1, y - tick, x1, y + tick);
  page.line(x2, y - tick, x2, y + tick);
  page.line(x1, y, x1 + 7, y - 5);
  page.line(x1, y, x1 + 7, y + 5);
  page.line(x2, y, x2 - 7, y - 5);
  page.line(x2, y, x2 - 7, y + 5);
  page.fillColor(0, 0, 0);
  page.text((x1 + x2) / 2, y + labelOffset, label, options.fontSize || 10, true, "center");
}

function drawDimensionV(page, x, y1, y2, label, options = {}) {
  const tick = options.tick || 7;
  page.lineWidth(options.lineWidth || 0.8);
  page.strokeColor(0, 0, 0);
  page.line(x, y1, x, y2);
  page.line(x - tick, y1, x + tick, y1);
  page.line(x - tick, y2, x + tick, y2);
  page.line(x, y1, x - 5, y1 + 7);
  page.line(x, y1, x + 5, y1 + 7);
  page.line(x, y2, x - 5, y2 - 7);
  page.line(x, y2, x + 5, y2 - 7);
  page.fillColor(0, 0, 0);
  page.textRotated(x - (options.labelOffset || 13), (y1 + y2) / 2 + label.length * 2.4, label, options.fontSize || 10, true);
}

function drawPicketsInPdfLeaf(page, frameX, frameY, leafWidth, leafHeight, count, settings, gap, scale) {
  const frameSize = settings.frameSize * scale;
  const picketWidth = Math.max(settings.picketWidth * scale, 1.2);
  const innerX = frameX + frameSize;
  const innerY = frameY + frameSize;
  const innerW = Math.max(0, leafWidth * scale - frameSize * 2);
  const innerH = Math.max(0, leafHeight * scale - frameSize * 2);
  const totalPicketWidth = count * picketWidth;
  const clearGap = Math.max(0, gap * scale);
  const firstX = settings.layoutMode === "edge"
    ? innerX
    : innerX + clearGap;
  const spacing = count > 1
    ? (settings.layoutMode === "edge"
      ? Math.max(0, (innerW - totalPicketWidth) / (count - 1))
      : picketWidth + clearGap)
    : 0;

  page.strokeColor(0.18, 0.22, 0.28);
  page.fillColor(1, 1, 1);
  page.lineWidth(0.6);
  for (let index = 0; index < count; index += 1) {
    const x = firstX + index * spacing;
    if (x + picketWidth > innerX + innerW + 0.1) continue;
    page.rect(x, innerY, picketWidth, innerH, false);
  }
}

function drawPdfPreviewModeLabel(page, area, label, note = "") {
  page.fillColor(0, 0, 0);
  page.text(area.x, area.y - 18, cleanPdfText(label), 10, true);
  if (note) {
    page.fillColor(0.42, 0.42, 0.42);
    page.text(area.x + 122, area.y - 18, cleanPdfText(note), 8, false);
  }
}

function drawPdfGateTopDownDrawing(page, settings, calc) {
  const area = { x: 54, y: 112, width: 504, height: 390 };
  drawPdfPreviewModeLabel(page, area, "TOP DOWN PREVIEW", "Tube sizes shown from above.");

  const scale = Math.min((area.width - 130) / Math.max(calc.outside, 1), 4);
  const y = area.y + 176;
  const outsideX = area.x + 88;
  const postW = Math.max(settings.postWidth * scale, 4);
  const frameW = Math.max(settings.frameSize * scale, 2);
  const picketW = Math.max(settings.picketWidth * scale, 1.2);
  const openingX = outsideX + postW;
  const rightPostX = openingX + calc.opening * scale;
  const leftLeafX = openingX + calc.leftPostGap * scale;
  const leftLeafW = calc.leftLeafWidth * scale;
  const centerGapW = calc.doubleGate ? calc.centerGap * scale : 0;
  const rightLeafX = calc.doubleGate ? leftLeafX + leftLeafW + centerGapW : leftLeafX;
  const rightLeafW = calc.doubleGate ? calc.rightLeafWidth * scale : 0;
  const depth = Math.max(settings.frameSize * scale, 8);

  page.fillColor(0.96, 0.95, 0.93);
  page.rect(area.x + 34, y - 42, area.width - 68, 84, true);

  page.fillColor(0.23, 0.39, 0.88);
  page.rect(outsideX, y - postW / 2, postW, postW, true);
  page.rect(rightPostX, y - postW / 2, postW, postW, true);

  page.strokeColor(0.78, 0.23, 0.20);
  page.lineWidth(frameW);
  page.rect(leftLeafX, y - depth / 2, leftLeafW, depth, false);
  if (calc.doubleGate) page.rect(rightLeafX, y - depth / 2, rightLeafW, depth, false);

  page.strokeColor(0.18, 0.22, 0.28);
  page.lineWidth(picketW);
  const drawTopPickets = (leafX, leafW, count) => {
    if (!count) return;
    const innerX = leafX + frameW;
    const innerW = Math.max(0, leafW - frameW * 2);
    const step = count > 1 ? innerW / (count - 1) : 0;
    for (let index = 0; index < count; index += 1) {
      const px = innerX + index * step;
      if (px > innerX + innerW + 0.1) continue;
      page.line(px, y - depth / 2 + 2, px, y + depth / 2 - 2);
    }
  };
  drawTopPickets(leftLeafX, leftLeafW, settings.leftPicketCount);
  if (calc.doubleGate) drawTopPickets(rightLeafX, rightLeafW, settings.rightPicketCount);

  const dimY1 = y + 42;
  const dimY2 = y + 68;
  const dimY3 = y + 94;
  if (calc.doubleGate) {
    drawDimensionH(page, leftLeafX, leftLeafX + leftLeafW, dimY1, `LEFT LEAF: ${inch(calc.leftLeafWidth)}`);
    drawDimensionH(page, rightLeafX, rightLeafX + rightLeafW, dimY1, `RIGHT LEAF: ${inch(calc.rightLeafWidth)}`);
  } else {
    drawDimensionH(page, leftLeafX, leftLeafX + leftLeafW, dimY1, `GATE: ${inch(calc.leftLeafWidth)}`);
  }
  drawDimensionH(page, outsideX, rightPostX + postW, dimY2, `OUTSIDE WIDTH: ${inch(calc.outside)}`);
  drawDimensionH(page, openingX, rightPostX, dimY3, `POST OPENING: ${inch(calc.opening)}`);

  page.fillColor(0, 0, 0);
  page.text(area.x, area.y + area.height - 24, `POSTS: ${inchFraction(settings.postWidth)} SQ`, 10, true);
  page.text(area.x + 140, area.y + area.height - 24, `FRAME: ${inchFraction(settings.frameSize)} SQ`, 10, true);
  page.text(area.x + 286, area.y + area.height - 24, `PICKETS: ${inchFraction(settings.picketWidth)} SQ`, 10, true);
}

function drawPdfGateDrawing(page, settings, calc, mode = "2d") {
  const area = { x: 54, y: 112, width: 504, height: 390 };
  if (mode === "top") {
    drawPdfGateTopDownDrawing(page, settings, calc);
    return;
  }

  const postHeight = settings.postHeight + settings.postEmbed;
  const drawingWidth = Math.max(calc.outside, 1);
  const drawingHeight = Math.max(postHeight, settings.leafHeight);
  const scale = Math.min((area.width - 130) / drawingWidth, (area.height - 112) / drawingHeight);
  const outsideX = area.x + 94;
  const topY = area.y + 48;
  const postW = settings.postWidth * scale;
  const frameW = settings.frameSize * scale;
  const leftPostX = outsideX;
  const openingX = leftPostX + postW;
  const rightPostX = openingX + calc.opening * scale;
  const postBottomY = topY + postHeight * scale;
  const gateBottomY = topY + settings.leafHeight * scale;
  const groundY = topY + settings.postHeight * scale;
  const leftLeafX = openingX + calc.leftPostGap * scale;
  const leftLeafW = calc.leftLeafWidth * scale;
  const centerGapW = calc.doubleGate ? calc.centerGap * scale : 0;
  const rightLeafX = calc.doubleGate ? leftLeafX + leftLeafW + centerGapW : leftLeafX;
  const rightLeafW = calc.doubleGate ? calc.rightLeafWidth * scale : 0;

  const previewLabel = mode === "3d" ? "3D PREVIEW" : mode === "plans" ? "PLANS PREVIEW" : "2D PREVIEW";
  drawPdfPreviewModeLabel(
    page,
    area,
    previewLabel,
    mode === "3d" ? "Front elevation with depth cue." : mode === "plans" ? "Clean shop drawing view." : "Front elevation."
  );
  if (mode === "3d") {
    const totalGateW = calc.doubleGate ? rightLeafX + rightLeafW - leftLeafX : leftLeafW;
    page.fillColor(0.88, 0.88, 0.86);
    page.rect(leftLeafX + 8, gateBottomY + 8, totalGateW, 8, true);
    page.fillColor(0.78, 0.82, 0.86);
    page.rect(rightPostX + postW, topY + 7, 9, settings.leafHeight * scale, true);
  }

  page.strokeColor(0.9, 0.9, 0.9);
  page.lineWidth(0.6);
  page.line(area.x, groundY, area.x + area.width, groundY);

  page.strokeColor(0.1, 0.1, 0.1);
  page.fillColor(0.95, 0.96, 0.97);
  page.lineWidth(1);
  page.rect(leftPostX, topY, postW, postHeight * scale, false);
  page.rect(rightPostX, topY, postW, postHeight * scale, false);
  page.strokeColor(0.72, 0.72, 0.72);
  page.lineWidth(0.5);
  page.line(leftPostX, groundY, leftPostX, postBottomY);
  page.line(rightPostX + postW, groundY, rightPostX + postW, postBottomY);

  page.strokeColor(0, 0, 0);
  page.lineWidth(Math.max(1.4, frameW));
  page.rect(leftLeafX, topY, leftLeafW, settings.leafHeight * scale, false);
  if (calc.doubleGate) {
    page.rect(rightLeafX, topY, rightLeafW, settings.leafHeight * scale, false);
  }

  drawPicketsInPdfLeaf(page, leftLeafX, topY, calc.leftLeafWidth, settings.leafHeight, settings.leftPicketCount, settings, calc.leftPicketGap, scale);
  if (calc.doubleGate) {
    drawPicketsInPdfLeaf(page, rightLeafX, topY, calc.rightLeafWidth, settings.leafHeight, settings.rightPicketCount, settings, calc.rightPicketGap, scale);
  }

  page.fillColor(0, 0, 0);
  page.text(leftLeafX + leftLeafW / 2, topY + 16, `FRAME: ${inchFraction(settings.frameSize)} SQ TUBE`, 9, true, "center");
  if (calc.doubleGate) {
    page.text(rightLeafX + rightLeafW / 2, topY + 16, `FRAME: ${inchFraction(settings.frameSize)} SQ TUBE`, 9, true, "center");
  }

  const dimY1 = gateBottomY + 18;
  const dimY2 = gateBottomY + 40;
  const dimY3 = gateBottomY + 64;
  if (calc.doubleGate) {
    drawDimensionH(page, leftLeafX, leftLeafX + leftLeafW, dimY1, `LEFT LEAF: ${inch(calc.leftLeafWidth)}`);
    drawDimensionH(page, rightLeafX, rightLeafX + rightLeafW, dimY1, `RIGHT LEAF: ${inch(calc.rightLeafWidth)}`);
  } else {
    drawDimensionH(page, leftLeafX, leftLeafX + leftLeafW, dimY1, `GATE: ${inch(calc.leftLeafWidth)}`);
  }
  drawDimensionH(page, leftPostX, rightPostX + postW, dimY2, `OUTSIDE WIDTH: ${inch(calc.outside)}`);
  drawDimensionH(page, openingX, rightPostX, dimY3, `POST OPENING: ${inch(calc.opening)}`);
  drawDimensionV(page, area.x + 34, topY, postBottomY, `POST HEIGHT: ${inch(postHeight)}`);
  drawDimensionV(page, area.x + 58, topY, gateBottomY, `GATE HEIGHT: ${inch(settings.leafHeight)}`);

  page.text(openingX + calc.leftPostGap * scale / 2, topY - 18, `POST GAP: ${inch(calc.leftPostGap)}`, 9, true, "center");
  if (calc.doubleGate) {
    page.text(leftLeafX + leftLeafW + centerGapW / 2, topY - 18, `CENTER GAP: ${inch(calc.centerGap)}`, 9, true, "center");
    page.text(rightLeafX + rightLeafW + calc.rightPostGap * scale / 2, topY - 18, `POST GAP: ${inch(calc.rightPostGap)}`, 9, true, "center");
  } else {
    page.text(leftLeafX + leftLeafW + calc.rightPostGap * scale / 2, topY - 18, `LATCH GAP: ${inch(calc.rightPostGap)}`, 9, true, "center");
  }

  const spacingText = calc.doubleGate
    ? `PICKET SPACING: Left ${inch(Math.max(calc.leftPicketGap, 0))} / Right ${inch(Math.max(calc.rightPicketGap, 0))}`
    : `PICKET SPACING: ${inch(Math.max(calc.leftPicketGap, 0))}`;
  page.text(area.x, area.y + area.height - 24, `PICKETS: ${inchFraction(settings.picketWidth)} SQ TUBE`, 10, true);
  page.text(area.x + 188, area.y + area.height - 24, spacingText, 10, true);
}

function drawPdfFenceTopDownDrawing(page, settings, calc) {
  const area = { x: 46, y: 120, width: 520, height: 390 };
  drawPdfPreviewModeLabel(page, area, "TOP DOWN PREVIEW", "Fence run shown from above.");

  const scale = Math.min((area.width - 60) / Math.max(calc.totalLength, 1), 4);
  const startX = area.x + 30;
  const y = area.y + 176;
  const runW = calc.totalLength * scale;
  const postW = Math.max(settings.postWidth * scale, 4);

  page.fillColor(0.96, 0.95, 0.93);
  page.rect(area.x + 24, y - 44, area.width - 48, 88, true);

  page.strokeColor(0.43, 0.31, 0.12);
  page.lineWidth(5);
  page.line(startX, y, startX + runW, y);

  const postPositions = [0];
  let cursor = 0;
  calc.sections.forEach((section) => {
    cursor += section;
    postPositions.push(cursor);
  });
  page.fillColor(0.23, 0.39, 0.88);
  postPositions.forEach((position) => {
    page.rect(startX + position * scale - postW / 2, y - postW / 2, postW, postW, true);
  });

  if (calc.gateCount > 0) {
    const gateX = startX + calc.gateStart * scale;
    const gateW = calc.gateSpaceWidth * scale;
    page.fillColor(1, 1, 1);
    page.rect(gateX, y - 18, gateW, 36, true);
    page.strokeColor(0.78, 0.23, 0.2);
    page.lineWidth(2);
    page.rect(gateX, y - 18, gateW, 36, false);
    page.fillColor(0, 0, 0);
    page.text(gateX + gateW / 2, y - 26, `GATE: ${formatFeetFromInches(calc.gateSpaceWidth)}`, 8, true, "center");
  }

  drawDimensionH(page, startX, startX + runW, y + 64, `TOTAL FENCE RUN: ${feet(calc.totalLength)}`, { fontSize: 10 });
  if (calc.sections.length) {
    drawDimensionH(page, startX, startX + calc.sections[0] * scale, y + 38, `SECTION: ${formatFeetFromInches(calc.sections[0])}`, { fontSize: 8, tick: 4 });
  }
  page.fillColor(0, 0, 0);
  page.text(area.x, area.y + area.height - 24, `POSTS: ${inchFraction(settings.postWidth)} SQ`, 10, true);
  page.text(area.x + 140, area.y + area.height - 24, `${settings.fencePicketMaterial.toUpperCase()} PICKETS: ${inchFraction(settings.fencePicketWidth)}`, 10, true);
  page.text(area.x + 340, area.y + area.height - 24, `RAILS: ${settings.fenceRailCount} PER SECTION`, 10, true);
}

function drawPdfFenceDrawing(page, settings, calc, mode = "2d") {
  const area = { x: 46, y: 120, width: 520, height: 390 };
  if (mode === "top") {
    drawPdfFenceTopDownDrawing(page, settings, calc);
    return;
  }
  const scale = Math.min((area.width - 24) / Math.max(calc.totalLength, 1), (area.height - 110) / Math.max(settings.fenceHeight + settings.fencePostEmbed, 1));
  const startX = area.x + 12;
  const topY = area.y + 62;
  const groundY = topY + settings.fenceHeight * scale;
  const postH = (settings.fenceHeight + settings.fencePostEmbed) * scale;
  const postW = Math.max(settings.postWidth * scale, 1.4);
  const previewLabel = mode === "3d" ? "3D PREVIEW" : mode === "plans" ? "PLANS PREVIEW" : "2D PREVIEW";

  drawPdfPreviewModeLabel(
    page,
    area,
    previewLabel,
    mode === "3d" ? "Fence elevation with depth cue." : mode === "plans" ? "Clean shop drawing view." : "Fence elevation."
  );
  if (mode === "3d") {
    page.fillColor(0.88, 0.88, 0.86);
    page.rect(startX + 8, groundY + 8, calc.totalLength * scale, 8, true);
  }

  page.strokeColor(0, 0, 0);
  page.lineWidth(1);
  page.line(startX, groundY, startX + calc.totalLength * scale, groundY);

  const postPositions = [0];
  let cursor = 0;
  calc.sections.forEach((section) => {
    cursor += section;
    postPositions.push(cursor);
  });
  postPositions.forEach((position) => {
    page.rect(startX + position * scale - postW / 2, topY, postW, postH, false);
  });

  page.strokeColor(0.15, 0.15, 0.15);
  page.lineWidth(0.6);
  const picketW = Math.max(settings.fencePicketWidth * scale, 1);
  const picketCount = Math.min(calc.totalPickets, 220);
  const spacing = calc.totalLength * scale / Math.max(picketCount, 1);
  for (let index = 0; index < picketCount; index += 1) {
    const x = startX + index * spacing;
    page.rect(x, topY, picketW, settings.fenceHeight * scale, false);
  }

  page.strokeColor(0, 0, 0);
  page.lineWidth(1.2);
  const railCount = Math.max(settings.fenceRailCount, 1);
  for (let index = 0; index < railCount; index += 1) {
    const y = topY + (settings.fenceHeight * scale) * ((index + 1) / (railCount + 1));
    page.line(startX, y, startX + calc.totalLength * scale, y);
  }

  if (calc.gateCount > 0) {
    const gateX = startX + calc.gateStart * scale;
    const gateW = calc.gateSpaceWidth * scale;
    page.strokeColor(0, 0, 0);
    page.lineWidth(1.5);
    page.rect(gateX, topY, gateW, settings.fenceHeight * scale, false);
    page.text(gateX + gateW / 2, topY + settings.fenceHeight * scale / 2, `GATE: ${formatFeetFromInches(calc.gateSpaceWidth)}`, 10, true, "center");
  }

  calc.sections.forEach((section, index) => {
    const x1 = startX + calc.sections.slice(0, index).reduce((total, value) => total + value, 0) * scale;
    const x2 = x1 + section * scale;
    drawDimensionH(page, x1, x2, groundY + 22, `SECTION ${index + 1}: ${formatFeetFromInches(section)}`, { fontSize: 7, tick: 4 });
  });
  drawDimensionH(page, startX, startX + calc.totalLength * scale, groundY + 52, `TOTAL FENCE RUN: ${feet(calc.totalLength)}`, { fontSize: 10 });
  drawDimensionV(page, area.x + 10, topY, topY + postH, `POST HEIGHT: ${inch(settings.fenceHeight + settings.fencePostEmbed)}`);
  drawDimensionV(page, area.x + 34, topY, groundY, `FENCE HEIGHT: ${inch(settings.fenceHeight)}`);
  page.text(area.x, area.y + area.height - 26, `${settings.fencePicketMaterial.toUpperCase()} PICKETS: ${inchFraction(settings.fencePicketWidth)} x ${inch(settings.fencePicketHeight)}`, 10, true);
  page.text(area.x + 250, area.y + area.height - 26, `RAILS PER SECTION: ${settings.fenceRailCount}`, 10, true);
}

function drawTitleBlock(page, settings, calc, isFence) {
  const x = 42;
  const y = 548;
  const rows = isFence
    ? [
      ["Build Type", "Fence"],
      ["Fence Run", feet(calc.totalLength)],
      ["Max Section", feet(settings.fenceMaxSectionFeet * 12)],
      ["Pickets", `${settings.fencePicketMaterial}, ${inchFraction(settings.fencePicketWidth)} wide`],
      ["Post Embed", inch(settings.fencePostEmbed)]
    ]
    : [
      ["Build Type", calc.doubleGate ? "Double Gate" : "Single Gate"],
      ["Post Opening", inch(calc.opening)],
      ["Outside Width", inch(calc.outside)],
      ["Frame", `${inchFraction(settings.frameSize)} square, ${thicknessLabel(settings.frameThickness)}`],
      ["Pickets", `${inchFraction(settings.picketWidth)} square, ${thicknessLabel(settings.picketThickness)}`]
    ];

  page.text(x, y, "BUILD SUMMARY", 12, true);
  rows.forEach((row, index) => {
    const rowY = y + 22 + index * 20;
    page.fillColor(0.36, 0.36, 0.36);
    page.text(x, rowY, row[0], 9, true);
    page.fillColor(0, 0, 0);
    page.text(x + 110, rowY, row[1], 10, false);
  });
}

function drawPreviewPage(page, buildName, settings, calc, isFence, mode, label, pageNumber) {
  drawPdfHeader(page, "FABRICATION PACKET", `PAGE ${pageNumber} - ${label}`, buildName);
  if (isFence) {
    drawPdfFenceDrawing(page, settings, calc, mode);
  } else {
    drawPdfGateDrawing(page, settings, calc, mode);
  }
  drawTitleBlock(page, settings, calc, isFence);
}

function wrapPdfText(text, maxChars) {
  const words = cleanPdfText(text).split(" ");
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawPdfTable(page, x, y, columns, rows, options = {}) {
  const tableWidth = options.width || 528;
  const headerHeight = 22;
  const fontSize = options.fontSize || 8;
  const rowGap = options.rowGap || 4;
  const maxLines = options.maxLines || 4;
  const maxY = options.maxY || 742;
  const colWidths = columns.map((column) => column.width);
  const totalCols = colWidths.reduce((sum, width) => sum + width, 0);
  const scale = tableWidth / totalCols;
  let currentY = y;
  let overflowCount = 0;

  page.fillColor(0.985, 0.98, 0.965);
  page.rect(x, currentY, tableWidth, headerHeight, true);
  page.strokeColor(0.82, 0.80, 0.76);
  page.lineWidth(0.5);
  page.rect(x, currentY, tableWidth, headerHeight, false);
  let currentX = x;
  columns.forEach((column) => {
    page.fillColor(0.42, 0.40, 0.36);
    page.text(currentX + 4, currentY + 13, column.label.toUpperCase(), 7, true);
    currentX += column.width * scale;
  });
  currentY += headerHeight;

  for (const row of rows) {
    const isGroup = Boolean(row.group || row.__group);
    const wrapped = columns.map((column) => {
      const lines = wrapPdfText(row[column.key], Math.max(8, Math.floor((column.width * scale) / (fontSize * 0.48))));
      if (lines.length <= maxLines) return lines;
      const visible = lines.slice(0, maxLines);
      visible[maxLines - 1] = `${visible[maxLines - 1].replace(/\.+$/g, "")}...`;
      return visible;
    });
    const rowHeight = Math.max(22, Math.max(...wrapped.map((lines) => lines.length)) * (fontSize + 3) + rowGap * 2);
    if (currentY + rowHeight > maxY) {
      overflowCount += 1;
      continue;
    }
    if (isGroup) {
      page.fillColor(0.965, 0.96, 0.94);
      page.rect(x, currentY, tableWidth, rowHeight, true);
    }
    page.strokeColor(0.88, 0.86, 0.82);
    page.line(x, currentY + rowHeight, x + tableWidth, currentY + rowHeight);
    currentX = x;
    wrapped.forEach((lines, columnIndex) => {
      page.fillColor(isGroup ? 0.10 : 0, isGroup ? 0.10 : 0, isGroup ? 0.10 : 0);
      lines.forEach((line, lineIndex) => {
        page.text(currentX + 4, currentY + rowGap + 10 + lineIndex * (fontSize + 3), line, fontSize, isGroup);
      });
      currentX += colWidths[columnIndex] * scale;
    });
    currentY += rowHeight;
  }

  if (overflowCount > 0) {
    page.fillColor(0.75, 0.12, 0.12);
    page.text(x, Math.min(currentY + 18, maxY), `${overflowCount} row${overflowCount === 1 ? "" : "s"} did not fit on this page.`, 8, true);
  }

  return currentY;
}

function pdfSwatchColor(label = "") {
  const value = String(label).toLowerCase();
  if (value.includes("post")) return [0.23, 0.39, 0.88];
  if (value.includes("frame") || value.includes("gate weight")) return [0.78, 0.23, 0.20];
  if (value.includes("rail")) return [0.42, 0.31, 0.12];
  if (value.includes("picket")) return [0.22, 0.25, 0.31];
  if (value.includes("section") || value.includes("opening")) return [0.72, 0.69, 0.63];
  if (value.includes("cost")) return [0.08, 0.08, 0.08];
  if (value.includes("weight")) return [0.78, 0.23, 0.20];
  return [0.20, 0.25, 0.32];
}

function drawPdfSectionTitle(page, x, y, title, subtitle = "") {
  page.fillColor(0.06, 0.06, 0.06);
  page.text(x, y, cleanPdfText(title), 12, true);
  if (subtitle) {
    page.fillColor(0.42, 0.40, 0.36);
    page.text(x, y + 15, cleanPdfText(subtitle), 8, false);
  }
}

function drawPdfSwatch(page, x, y, color) {
  page.fillColor(...color);
  page.rect(x, y - 8, 7, 7, true);
}

function drawPdfCardGrid(page, x, y, cards, options = {}) {
  const width = options.width || 528;
  const columns = options.columns || 3;
  const maxY = options.maxY || 742;
  const gap = options.gap || 0;
  const cardWidth = (width - gap * (columns - 1)) / columns;
  const cardHeight = options.cardHeight || 128;
  const visibleCards = cards.filter(Boolean);
  let overflowCount = 0;

  visibleCards.forEach((card, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const cardX = x + column * (cardWidth + gap);
    const cardY = y + row * cardHeight;
    if (cardY + cardHeight > maxY) {
      overflowCount += 1;
      return;
    }

    page.fillColor(1, 1, 1);
    page.rect(cardX, cardY, cardWidth, cardHeight, true);
    page.strokeColor(0.84, 0.82, 0.78);
    page.lineWidth(0.5);
    page.rect(cardX, cardY, cardWidth, cardHeight, false);

    page.fillColor(0.06, 0.06, 0.06);
    page.text(cardX + 10, cardY + 19, cleanPdfText(card.value), 16, true);
    drawPdfSwatch(page, cardX + 10, cardY + 34, card.color || pdfSwatchColor(card.label));
    page.fillColor(0.34, 0.35, 0.37);
    page.text(cardX + 22, cardY + 36, cleanPdfText(card.label), 8, true);

    let detailY = cardY + 54;
    const details = (card.details || []).slice(0, options.maxDetails || 4);
    details.forEach((detail) => {
      page.strokeColor(0.89, 0.87, 0.83);
      page.line(cardX + 10, detailY - 9, cardX + cardWidth - 10, detailY - 9);
      page.fillColor(0.43, 0.41, 0.37);
      page.text(cardX + 10, detailY, cleanPdfText(detail.label).toUpperCase(), 7, true);
      page.fillColor(0.05, 0.05, 0.05);
      const lines = wrapPdfText(detail.value, Math.max(18, Math.floor((cardWidth - 20) / 4.8))).slice(0, 2);
      lines.forEach((line, lineIndex) => {
        page.text(cardX + 10, detailY + 12 + lineIndex * 10, line, 8, false);
      });
      detailY += lines.length > 1 ? 34 : 26;
    });
  });

  const rows = Math.ceil(Math.min(visibleCards.length, columns * Math.floor((maxY - y) / cardHeight)) / columns);
  const endY = y + rows * cardHeight;
  if (overflowCount > 0) {
    page.fillColor(0.75, 0.12, 0.12);
    page.text(x, Math.min(endY + 14, maxY), `${overflowCount} card${overflowCount === 1 ? "" : "s"} did not fit on this page.`, 8, true);
  }
  return endY;
}

function firstStockPlan(calc) {
  return Array.isArray(calc.stockPlans) && calc.stockPlans.length > 0 ? calc.stockPlans[0] : null;
}

function materialCard(row) {
  const details = row.cardDetails || [
    { label: "Material", value: row.size },
    { label: "Cut length", value: row.stockLength },
    { label: "Wall", value: row.wall },
    { label: "Notes", value: row.notes }
  ];

  return {
    value: cleanPdfText(row.cardValue || (row.quantity ? `Qty: ${row.quantity}` : "")),
    label: cleanPdfText(row.cardLabel || row.material || ""),
    color: row.cardColor || pdfSwatchColor(row.material),
    details: details.filter((detail) => cleanPdfText(detail.value))
  };
}

function purchaseCard(row) {
  const details = row.cardDetails || [
    { label: "Used", value: row.used },
    { label: "Leftover", value: row.leftover },
    { label: "Weight", value: row.weight },
    { label: "Cost", value: row.cost },
    { label: "Notes", value: row.notes }
  ];

  return {
    value: cleanPdfText(row.cardValue || row.value || row.buy || ""),
    label: cleanPdfText(row.cardLabel || row.item || row.material || ""),
    color: row.cardColor || pdfSwatchColor(row.item || row.material),
    details: details.filter((detail) => cleanPdfText(detail.value))
  };
}

function cutListCard(row) {
  return {
    value: `Qty: ${cleanPdfText(row.qty)}`,
    label: cleanPdfText(row.part),
    color: pdfSwatchColor(row.part || row.material),
    details: [
      { label: "Length", value: row.length },
      { label: "Material", value: row.material },
      { label: "Wall", value: row.wall },
      { label: "Stock", value: row.stock }
    ].filter((detail) => cleanPdfText(detail.value))
  };
}

function drawPdfNoteCards(page, x, y, rows, options = {}) {
  const width = options.width || 528;
  const maxY = options.maxY || 742;
  let currentY = y;
  let overflowCount = 0;

  rows.forEach((row) => {
    const label = Array.isArray(row) ? row[0] : row.label;
    const details = Array.isArray(row) ? row[1] : row.details;
    const lines = wrapPdfText(details, options.maxChars || 92).slice(0, options.maxLines || 5);
    const cardHeight = Math.max(42, 24 + lines.length * 11);
    if (currentY + cardHeight > maxY) {
      overflowCount += 1;
      return;
    }

    page.fillColor(1, 1, 1);
    page.rect(x, currentY, width, cardHeight, true);
    page.strokeColor(0.84, 0.82, 0.78);
    page.lineWidth(0.5);
    page.rect(x, currentY, width, cardHeight, false);

    page.fillColor(0.08, 0.08, 0.08);
    page.text(x + 12, currentY + 19, cleanPdfText(label), 8, true);
    page.fillColor(0.12, 0.12, 0.12);
    lines.forEach((line, index) => {
      page.text(x + 132, currentY + 19 + index * 11, line, 8, false);
    });

    currentY += cardHeight + 6;
  });

  if (overflowCount > 0) {
    page.fillColor(0.75, 0.12, 0.12);
    page.text(x, Math.min(currentY + 12, maxY), `${overflowCount} note${overflowCount === 1 ? "" : "s"} did not fit on this page.`, 8, true);
  }

  return currentY;
}

function drawPdfCompactNoteGrid(page, x, y, rows, options = {}) {
  const width = options.width || 528;
  const columns = options.columns || 2;
  const gap = options.gap || 12;
  const cardWidth = (width - gap * (columns - 1)) / columns;
  const cardHeight = options.cardHeight || 70;
  const maxY = options.maxY || 742;
  const maxLines = options.maxLines || 4;
  const maxChars = options.maxChars || Math.max(32, Math.floor((cardWidth - 24) / 4.1));
  let overflowCount = 0;

  rows.forEach((row, index) => {
    const column = index % columns;
    const cardRow = Math.floor(index / columns);
    const cardX = x + column * (cardWidth + gap);
    const cardY = y + cardRow * (cardHeight + 8);
    if (cardY + cardHeight > maxY) {
      overflowCount += 1;
      return;
    }

    const label = Array.isArray(row) ? row[0] : row.label;
    const details = Array.isArray(row) ? row[1] : row.details;
    const wrapped = wrapPdfText(details, maxChars);
    const lines = wrapped.slice(0, maxLines);
    if (wrapped.length > lines.length && lines.length) {
      lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:\s]+$/, "")}...`;
    }

    page.fillColor(1, 1, 1);
    page.rect(cardX, cardY, cardWidth, cardHeight, true);
    page.strokeColor(0.84, 0.82, 0.78);
    page.lineWidth(0.5);
    page.rect(cardX, cardY, cardWidth, cardHeight, false);

    page.fillColor(0.08, 0.08, 0.08);
    page.text(cardX + 10, cardY + 12, cleanPdfText(label), 8, true);
    page.fillColor(0.18, 0.18, 0.18);
    lines.forEach((line, lineIndex) => {
      page.text(cardX + 10, cardY + 27 + lineIndex * 9.5, line, 7.2, false);
    });
  });

  const visibleCount = rows.length - overflowCount;
  const rowCount = Math.ceil(visibleCount / columns);
  const endY = y + rowCount * (cardHeight + 8);
  if (overflowCount > 0) {
    page.fillColor(0.75, 0.12, 0.12);
    page.text(x, Math.min(endY + 10, maxY), `${overflowCount} note${overflowCount === 1 ? "" : "s"} did not fit on this page.`, 8, true);
  }

  return endY;
}

function groupedCutRowsForPdf(cutRows) {
  const groups = [
    ["Post", "POSTS"],
    ["Frame", "FRAME"],
    ["Rail", "RAILS"],
    ["Picket", "PICKETS"]
  ];
  const output = [];
  groups.forEach(([type, label]) => {
    const rows = cutRows.filter((row) => String(row[7]).toLowerCase() === type.toLowerCase());
    if (!rows.length) return;
    output.push({ group: label });
    rows.forEach((row) => {
      output.push({
        number: row[0],
        part: row[1],
        qty: row[2],
        length: row[3],
        material: row[4],
        wall: row[5],
        stock: row[6],
        notes: row[8]
      });
    });
  });
  return output;
}

function drawCutListPage(page, buildName, cutRows, pageNumber = 3) {
  drawPdfHeader(page, "FABRICATION PACKET", `PAGE ${pageNumber} - CUT LIST`, buildName);
  const columns = [
    { key: "number", label: "#", width: 22 },
    { key: "part", label: "Part", width: 116 },
    { key: "qty", label: "Qty", width: 34 },
    { key: "length", label: "Length", width: 56 },
    { key: "material", label: "Material", width: 76 },
    { key: "wall", label: "Wall/Gauge", width: 62 },
    { key: "stock", label: "Stock Needed", width: 78 },
    { key: "notes", label: "Notes", width: 124 }
  ];
  const groupedRows = groupedCutRowsForPdf(cutRows);
  const cutCards = groupedRows.filter((row) => !row.group).slice(0, 6).map(cutListCard);
  const tableRows = groupedRows.flatMap((row) => (
    row.group
      ? [{ __group: true, number: "", part: row.group, qty: "", length: "", material: "", wall: "", stock: "", notes: "" }]
      : [row]
  ));

  drawPdfSectionTitle(page, 42, 104, "CUT LIST SUMMARY", "Matches the app card layout for fast shop reading");
  const tableY = drawPdfCardGrid(page, 42, 132, cutCards, { width: 528, columns: 3, cardHeight: 116, maxDetails: 3, maxY: 366 }) + 22;
  drawPdfSectionTitle(page, 42, tableY, "CUT LIST DETAIL", "Grouped by posts, frame, rails, and pickets");
  drawPdfTable(page, 42, tableY + 28, columns, tableRows, { width: 528, fontSize: 7, maxLines: 3, maxY: 742 });
}

function materialRowsForPdf(settings, calc, isFence, materialRows) {
  const cleanMaterialName = (name) => String(name || "")
    .replace(/\s+dog-ear\s+pickets/i, " Pickets")
    .replace(/\s+dog-ear\s+picket/i, " Picket");

  const rows = materialRows.map((row) => {
    const materialName = cleanMaterialName(row[0]);
    return {
      material: materialName,
      size: row[2],
      wall: row[4],
      stockLength: row[3],
      quantity: row[1],
      notes: row[5],
      cardValue: `Qty: ${row[1]}`,
      cardLabel: materialName,
      cardDetails: [
        { label: "Material", value: row[2] },
        { label: "Cut length", value: row[3] },
        { label: "Wall", value: row[4] },
        { label: "Notes", value: row[5] }
      ]
    };
  });

  if (isFence) {
    const postPlan = firstStockPlan(calc);
    if (postPlan) {
      rows.push({
        material: "Post stock to buy",
        size: tubeSpecFraction(settings.postWidth, settings.postThickness),
        wall: thicknessLabel(settings.postThickness),
        stockLength: postPlan.best.label,
        quantity: `${postPlan.best.sticks} stick${postPlan.best.sticks === 1 ? "" : "s"}`,
        notes: `${feet(calc.purchasedLength, 2)} full sticks; ${feet(calc.usedLength, 2)} cut; ${feet(calc.stockWaste, 2)} leftover`,
        cardValue: `${postPlan.best.sticks} x ${postPlan.best.label}`,
        cardLabel: "Post stock to buy",
        cardDetails: [
          { label: "Material", value: tubeSpecFraction(settings.postWidth, settings.postThickness) },
          { label: "Cut length", value: feet(calc.usedLength, 2) },
          { label: "Leftover", value: feet(calc.stockWaste, 2) },
          { label: "Wall", value: thicknessLabel(settings.postThickness) }
        ]
      });
    }
    rows.push({
      material: "Estimated post cost",
      size: pounds(calc.totalMetalWeight, 1),
      wall: `${money(settings.cwtCost)} per CWT`,
      stockLength: "Full sticks",
      quantity: money(calc.metalCost),
      notes: "Post metal only",
      cardValue: money(calc.metalCost),
      cardLabel: "Estimated post cost",
      cardDetails: [
        { label: "Weight", value: pounds(calc.totalMetalWeight, 1) },
        { label: "Rate", value: `${money(settings.cwtCost)} per CWT` },
        { label: "Basis", value: "Post metal only" }
      ]
    });
    return rows;
  }

  const gateWeightNote = calc.doubleGate
    ? `Left leaf ${pounds(calc.leftGateWeight, 1)}; right leaf ${pounds(calc.rightGateWeight, 1)}; frame ${pounds(calc.gateFrameWeight, 1)}; pickets ${pounds(calc.gatePicketWeight, 1)}`
    : `Gate leaf ${pounds(calc.leftGateWeight, 1)}; frame ${pounds(calc.gateFrameWeight, 1)}; pickets ${pounds(calc.gatePicketWeight, 1)}`;
  rows.push({
    material: "Gate weights",
    size: pounds(calc.totalGateWeight, 1),
    wall: "",
    stockLength: "",
    quantity: calc.doubleGate ? "2 leaves" : "1 leaf",
    notes: `${gateWeightNote}; posts and leftover stock excluded`,
    cardValue: pounds(calc.totalGateWeight, 1),
    cardLabel: "Gate weights",
    cardDetails: calc.doubleGate
      ? [
          { label: "Left leaf", value: pounds(calc.leftGateWeight, 1) },
          { label: "Right leaf", value: pounds(calc.rightGateWeight, 1) },
          { label: "Frame", value: pounds(calc.gateFrameWeight, 1) },
          { label: "Pickets", value: pounds(calc.gatePicketWeight, 1) }
        ]
      : [
          { label: "Gate leaf", value: pounds(calc.leftGateWeight, 1) },
          { label: "Frame", value: pounds(calc.gateFrameWeight, 1) },
          { label: "Pickets", value: pounds(calc.gatePicketWeight, 1) }
        ]
  });
  rows.push({
    material: "Steel weight to buy",
    size: pounds(calc.totalMetalWeight, 1),
    wall: "",
    stockLength: feet(calc.purchasedLength, 2),
    quantity: "Full sticks",
    notes: `${feet(calc.usedLength, 2)} cut length; ${feet(calc.stockWaste, 2)} leftover`,
    cardValue: pounds(calc.totalMetalWeight, 1),
    cardLabel: "Steel weight to buy",
    cardDetails: [
      { label: "Full sticks", value: feet(calc.purchasedLength, 2) },
      { label: "Cut length", value: feet(calc.usedLength, 2) },
      { label: "Leftover", value: feet(calc.stockWaste, 2) }
    ]
  });
  rows.push({
    material: "Estimated metal cost",
    size: money(calc.metalCost),
    wall: `${money(settings.cwtCost)} per CWT`,
    stockLength: "Full sticks",
    quantity: "Calculated",
    notes: "Based on purchased full-stick metal weight",
    cardValue: money(calc.metalCost),
    cardLabel: "Estimated metal cost",
    cardDetails: [
      { label: "Rate", value: `${money(settings.cwtCost)} per CWT` },
      { label: "Basis", value: "Full sticks" }
    ]
  });

  return rows;
}

function drawMaterialsPage(page, buildName, rows, pageNumber = 4) {
  drawPdfHeader(page, "FABRICATION PACKET", `PAGE ${pageNumber} - MATERIALS LIST`, buildName);
  const columns = [
    { key: "material", label: "Material", width: 125 },
    { key: "size", label: "Size", width: 95 },
    { key: "wall", label: "Wall", width: 70 },
    { key: "stockLength", label: "Cut/Stock Length", width: 80 },
    { key: "quantity", label: "Quantity", width: 62 },
    { key: "notes", label: "Notes", width: 136 }
  ];
  drawPdfSectionTitle(page, 42, 104, "MATERIALS SUMMARY", "Same card-first style as the app Materials tab");
  const tableY = drawPdfCardGrid(page, 42, 132, rows.map(materialCard), { width: 528, columns: 3, cardHeight: 110, maxDetails: 3, maxY: 466 }) + 18;
  drawPdfSectionTitle(page, 42, tableY, "MATERIALS DETAIL", "Full material list from the calculator");
  drawPdfTable(page, 42, tableY + 28, columns, rows, { width: 528, fontSize: 7, maxLines: 3, maxY: 742 });
}

function purchaseRowsForPdf(settings, calc, isFence) {
  if (isFence) {
    const postPlan = firstStockPlan(calc);
    const rows = [];
    if (postPlan) {
      rows.push({
        material: "Posts",
        tube: tubeSpecFraction(settings.postWidth, settings.postThickness),
        buy: `${postPlan.best.sticks} x ${postPlan.best.label}`,
        used: feet(postPlan.best.used, 2),
        leftover: feet(postPlan.best.waste, 2),
        weight: pounds(calc.totalMetalWeight, 1),
        cost: money(calc.metalCost),
        notes: `${tubeSpecFraction(settings.postWidth, settings.postThickness)}, ${money(settings.cwtCost)} per CWT`
      });
    }
    rows.push(
      {
        material: `${settings.fencePicketMaterial} Pickets`,
        tube: `${inchFraction(settings.fencePicketWidth)} x ${inch(settings.fencePicketHeight)}`,
        buy: `${calc.totalPickets} pickets`,
        used: feet(calc.totalPickets * settings.fencePicketHeight, 2),
        leftover: "By lumber order",
        weight: "",
        cost: "",
        notes: `${inchFraction(settings.fencePicketWidth)} wide, vertical, no spacing`
      },
      {
        material: "Fence rails",
        tube: "Wood rails",
        buy: `${calc.railCuts} rail cuts`,
        used: feet(calc.sectionTotal * settings.fenceRailCount, 2),
        leftover: "By lumber order",
        weight: "",
        cost: "",
        notes: `${settings.fenceRailCount} rails per section; cut to each section length`
      }
    );
    return rows;
  }

  return calc.stockPlans.map((plan) => ({
    material: plan.name,
    tube: tubeSpecFraction(plan.size, plan.thickness),
    buy: `${plan.best.sticks} x ${plan.best.label}`,
    used: feet(plan.best.used, 2),
    leftover: feet(plan.best.waste, 2),
    weight: pounds(plan.purchasedWeight, 1),
    cost: money((plan.purchasedWeight / 100) * settings.cwtCost),
    notes: tubeSpecFraction(plan.size, plan.thickness)
  }));
}

function purchaseSummaryRowsForPdf(settings, calc, isFence) {
  if (isFence) {
    const postPlan = firstStockPlan(calc);
    return [
      postPlan
        ? {
            item: "Post stock",
            value: `${postPlan.best.sticks} x ${postPlan.best.label}`,
            notes: tubeSpecFraction(settings.postWidth, settings.postThickness),
            cardValue: `${postPlan.best.sticks} x ${postPlan.best.label}`,
            cardLabel: "Post stock to buy",
            cardDetails: [
              { label: "Material", value: tubeSpecFraction(settings.postWidth, settings.postThickness) },
              { label: "Full sticks", value: feet(calc.purchasedLength, 2) },
              { label: "Cut length", value: feet(calc.usedLength, 2) },
              { label: "Leftover", value: feet(calc.stockWaste, 2) }
            ]
          }
        : null,
      {
        item: `${settings.fencePicketMaterial} Pickets`,
        value: `${calc.totalPickets}`,
        notes: `${inchFraction(settings.fencePicketWidth)} wide, no gaps`,
        cardValue: `${calc.totalPickets}`,
        cardLabel: `${settings.fencePicketMaterial} pickets`,
        cardDetails: [
          { label: "Width", value: inchFraction(settings.fencePicketWidth) },
          { label: "Height", value: inch(settings.fencePicketHeight) },
          { label: "Layout", value: "Vertical, no gap" }
        ]
      },
      {
        item: "Rails",
        value: `${calc.railCuts}`,
        notes: `${settings.fenceRailCount} rails per section`,
        cardValue: `Qty: ${calc.railCuts}`,
        cardLabel: "Fence rails",
        cardDetails: [
          { label: "Rails per section", value: `${settings.fenceRailCount}` },
          { label: "Used length", value: feet(calc.sectionTotal * settings.fenceRailCount, 2) },
          { label: "Cut note", value: "Cut to each section length" }
        ]
      },
      {
        item: "Estimated post cost",
        value: money(calc.metalCost),
        notes: `${pounds(calc.totalMetalWeight, 1)} at ${money(settings.cwtCost)} per CWT`,
        cardValue: money(calc.metalCost),
        cardLabel: "Estimated post cost",
        cardDetails: [
          { label: "Weight", value: pounds(calc.totalMetalWeight, 1) },
          { label: "Rate", value: `${money(settings.cwtCost)} per CWT` },
          { label: "Basis", value: "Post metal only" }
        ]
      }
    ];
  }

  return [
    {
      item: "Estimated metal cost",
      value: money(calc.metalCost),
      notes: `Full sticks calculated at ${money(settings.cwtCost)} per CWT`,
      cardValue: money(calc.metalCost),
      cardLabel: "Estimated metal cost",
      cardDetails: [
        { label: "Rate", value: `${money(settings.cwtCost)} per CWT` },
        { label: "Basis", value: "Full sticks" }
      ]
    },
    {
      item: "Steel weight to buy",
      value: pounds(calc.totalMetalWeight, 1),
      notes: `${feet(calc.purchasedLength, 2)} purchased length`,
      cardValue: pounds(calc.totalMetalWeight, 1),
      cardLabel: "Steel weight to buy",
      cardDetails: [
        { label: "Full sticks", value: feet(calc.purchasedLength, 2) },
        { label: "Cut length", value: feet(calc.usedLength, 2) },
        { label: "Leftover", value: feet(calc.stockWaste, 2) }
      ]
    },
    {
      item: "Expected leftover",
      value: feet(calc.stockWaste, 2),
      notes: `${feet(calc.usedLength, 2)} used from purchased stock`,
      cardValue: feet(calc.stockWaste, 2),
      cardLabel: "Expected leftover",
      cardDetails: [
        { label: "Used from stock", value: feet(calc.usedLength, 2) },
        { label: "Purchased length", value: feet(calc.purchasedLength, 2) }
      ]
    }
  ];
}

function drawPurchasePage(page, buildName, settings, calc, isFence, pageNumber = 5) {
  drawPdfHeader(page, "FABRICATION PACKET", `PAGE ${pageNumber} - PURCHASE LIST`, buildName);
  const detailColumns = [
    { key: "material", label: "Material", width: 92 },
    { key: "tube", label: "Tube/Size", width: 78 },
    { key: "buy", label: "Buy", width: 70 },
    { key: "used", label: "Used", width: 58 },
    { key: "leftover", label: "Leftover", width: 62 },
    { key: "weight", label: "Buy Weight", width: 62 },
    { key: "cost", label: "Cost", width: 54 },
    { key: "notes", label: "Notes", width: 92 }
  ];

  const summaryRows = purchaseSummaryRowsForPdf(settings, calc, isFence);
  const detailRows = purchaseRowsForPdf(settings, calc, isFence);

  drawPdfSectionTitle(page, 42, 104, "PURCHASE LIST SUMMARY", "Same card-first style as the app Purchase tab");
  const nextY = drawPdfCardGrid(page, 42, 132, summaryRows.filter(Boolean).map(purchaseCard), { width: 528, columns: isFence ? 2 : 3, cardHeight: 116, maxDetails: 3, maxY: 380 }) + 22;
  drawPdfSectionTitle(page, 42, nextY, "PURCHASE DETAIL", "What to buy and what each stick is expected to cover");
  drawPdfTable(page, 42, nextY + 28, detailColumns, detailRows, { width: 528, fontSize: 7, maxLines: 4, maxY: 742 });
}

function buildSummaryCardsForPdf(settings, calc, isFence) {
  if (isFence) {
    const postPlan = firstStockPlan(calc);
    return [
      {
        value: feet(calc.totalLength, 2),
        label: "Fence run",
        details: [
          { label: "Fence sections", value: feet(calc.fenceRunLength, 2) },
          { label: "Gate openings", value: feet(calc.totalGateOpening, 2) }
        ]
      },
      {
        value: `${calc.sections.length}`,
        label: "Sections",
        details: [
          { label: "Max section", value: feet(calc.maxSection, 0) },
          { label: "Longest", value: calc.sections.length ? feet(Math.max(...calc.sections), 2) : "" }
        ]
      },
      {
        value: `${calc.totalPostCount}`,
        label: "Posts",
        details: [
          { label: "Cut length", value: inch(calc.postCutLength, 2) },
          { label: "Material", value: tubeSpecFraction(settings.postWidth, settings.postThickness) }
        ]
      },
      {
        value: `${calc.totalPickets}`,
        label: `${settings.fencePicketMaterial} Pickets`,
        details: [
          { label: "Size", value: `${inchFraction(settings.fencePicketWidth)} x ${inch(settings.fencePicketHeight)}` },
          { label: "Layout", value: "Vertical, no gap" }
        ]
      },
      {
        value: `Qty: ${calc.railCuts}`,
        label: "Fence rails",
        details: [
          { label: "Rails per section", value: `${settings.fenceRailCount}` },
          { label: "Used length", value: feet(calc.sectionTotal * settings.fenceRailCount, 2) }
        ]
      },
      postPlan
        ? {
            value: `${postPlan.best.sticks} x ${postPlan.best.label}`,
            label: "Post stock",
            details: [
              { label: "Weight", value: pounds(calc.totalMetalWeight, 1) },
              { label: "Cost", value: money(calc.metalCost) }
            ]
          }
        : null
    ].filter(Boolean);
  }

  return [
    {
      value: inch(calc.opening, 2),
      label: "Post opening",
      details: [
        { label: "Outside", value: inch(calc.outside, 2) },
        { label: "Gate type", value: calc.doubleGate ? "Double gate" : "Single gate" }
      ]
    },
    {
      value: calc.doubleGate ? `${inch(settings.leftLeafWidth)} / ${inch(settings.rightLeafWidth)}` : inch(settings.leftLeafWidth),
      label: calc.doubleGate ? "Leaf widths" : "Gate width",
      details: calc.doubleGate
        ? [
            { label: "Left leaf", value: inch(settings.leftLeafWidth) },
            { label: "Right leaf", value: inch(settings.rightLeafWidth) }
          ]
        : [
            { label: "Hinge gap", value: inch(calc.hingeGap) },
            { label: "Latch gap", value: inch(calc.latchGap) }
          ]
    },
    {
      value: inch(calc.postCutLength),
      label: "Post cut length",
      details: [
        { label: "Above grade", value: inch(settings.postHeight) },
        { label: "In ground", value: inch(settings.postEmbed) }
      ]
    },
    {
      value: tubeSpecFraction(settings.frameSize, settings.frameThickness),
      label: "Frame",
      details: [
        { label: "Verticals", value: inch(settings.leafHeight) },
        { label: "Horizontals", value: inch(calc.horizontalLength) }
      ]
    },
    {
      value: pounds(calc.totalGateWeight, 1),
      label: "Gate weight",
      details: [
        { label: "Frame", value: pounds(calc.gateFrameWeight, 1) },
        { label: "Pickets", value: pounds(calc.gatePicketWeight, 1) }
      ]
    },
    {
      value: money(calc.metalCost),
      label: "Steel cost",
      details: [
        { label: "Weight", value: pounds(calc.totalMetalWeight, 1) },
        { label: "Rate", value: `${money(settings.cwtCost)} per CWT` }
      ]
    }
  ];
}

function buildNotesRowsForPdf(settings, calc, isFence) {
  if (isFence) {
    const postPlan = firstStockPlan(calc);
    const sectionLengths = calc.sections.map((section, index) => `S${index + 1}: ${feet(section, 2)}`).join("; ");
    const gateNote = calc.gateCount
      ? `${calc.gateCount} gate opening${calc.gateCount === 1 ? "" : "s"} totaling ${feet(calc.totalGateOpening, 2)}. First gate starts ${feet(calc.gateStartFromLeft, 2)} from the left.`
      : "No gate openings in this fence run.";
    return [
      ["Section layout", `${feet(calc.totalLength, 2)} total fence run minus ${feet(calc.totalGateOpening, 2)} of gate openings leaves ${feet(calc.fenceRunLength, 2)} of fence sections.`],
      ["Even section rule", `${calc.sections.length} section${calc.sections.length === 1 ? "" : "s"} at ${calc.sections.length ? feet(calc.sections[0], 2) : "0 ft"} each, with no section over ${feet(calc.maxSection, 0)}.`],
      ["Section lengths", sectionLengths || "No fence sections calculated."],
      ["Gate openings", gateNote],
      ["Posts", `${calc.totalPostCount} posts cut to ${inch(calc.postCutLength, 2)}: ${inch(settings.fenceHeight, 2)} above grade + ${inch(settings.fencePostEmbed, 2)} in ground.`],
      ["Pickets", `${calc.totalPickets} ${settings.fencePicketMaterial} Pickets, ${inchFraction(settings.fencePicketWidth)} wide x ${inch(settings.fencePicketHeight)} tall, vertical, no gap.`],
      ["Rails", `${settings.fenceRailCount} rails per section for ${calc.railCuts} rail cuts total.`],
      ["Post stock", postPlan ? `Buy ${postPlan.best.sticks} x ${postPlan.best.label} for PostMaster metal posts. Estimated post metal cost is ${money(calc.metalCost)}.` : `Estimated post metal cost is ${money(calc.metalCost)}.`]
    ];
  }

  const openingFormula = calc.doubleGate
    ? `${inch(settings.leftLeafWidth)} left leaf + ${inch(settings.rightLeafWidth)} right leaf + two post-to-gate gaps + center gap = ${inch(calc.opening, 2)}`
    : `${inch(settings.leftLeafWidth)} gate leaf + ${settings.hingePostSide} hinge post gap ${inch(settings.hingeGap)} + latch post gap ${inch(settings.latchGap)} = ${inch(calc.opening, 2)}`;
  const picketSpacingNote = calc.doubleGate
    ? `Left ${settings.leftPicketCount} pickets at ${inch(calc.leftPicketGap)} clear spacing. Right ${settings.rightPicketCount} pickets at ${inch(calc.rightPicketGap)} clear spacing.`
    : `${settings.leftPicketCount} pickets at ${inch(calc.leftPicketGap)} clear spacing.`;
  const gateWeightNote = calc.doubleGate
    ? `Left leaf ${pounds(calc.leftGateWeight, 1)}, right leaf ${pounds(calc.rightGateWeight, 1)}, ${pounds(calc.totalGateWeight, 1)} total. Posts and leftover stock are not included.`
    : `Gate leaf ${pounds(calc.leftGateWeight, 1)}. Posts and leftover stock are not included.`;

  return [
    ["Gate type", calc.doubleGate ? "Double gate with left and right leaves." : `${settings.hingePostSide === "left" ? "Left" : "Right"} post is the hinge post.`],
    ["Opening formula", openingFormula],
    ["Outside width", `${inch(calc.opening, 2)} opening + two ${inch(settings.postWidth)} posts = ${inch(calc.outside, 2)}`],
    ["Post length", `${inch(settings.postHeight)} above ground + ${inch(settings.postEmbed)} in ground = ${inch(calc.postCutLength)} post cut length.`],
    ["Frame and pickets", `Frame is ${tubeSpecFraction(settings.frameSize, settings.frameThickness)}. Pickets are ${tubeSpecFraction(settings.picketWidth, settings.picketThickness)} at ${inch(settings.leafHeight - settings.frameSize * 2)} cut length inside the frame.`],
    ["Picket spacing", picketSpacingNote],
    ...(!calc.doubleGate ? [["Single gate swing", `${settings.hingePostSide === "left" ? "Left" : "Right"} post is the hinge post. Left side gap ${inch(calc.leftPostGap)}, right side gap ${inch(calc.rightPostGap)}.`]] : []),
    ["Tube thickness", `Posts ${thicknessLabel(settings.postThickness)} wall, frame ${thicknessLabel(settings.frameThickness)} wall, pickets ${thicknessLabel(settings.picketThickness)} wall.`],
    ["Stock choice", calc.stockPlans.map((plan) => `${plan.name}: buy ${plan.best.sticks} x ${plan.best.label}`).join("; ")],
    ["Gate weight", gateWeightNote],
    ["Steel cost", `${pounds(calc.totalMetalWeight, 1)} purchased weight at ${money(settings.cwtCost)} CWT = ${money(calc.metalCost)} estimated metal cost.`],
    ["Rail assumption", `${settings.railCount} horizontal rail cuts per leaf. Horizontal rails fit between vertical frame members.`]
  ];
}

function drawBuildNotesPage(page, buildName, settings, calc, isFence, pageNumber = 6) {
  drawPdfHeader(page, "FABRICATION PACKET", `PAGE ${pageNumber} - BUILD NOTES`, buildName);
  const buildRows = buildNotesRowsForPdf(settings, calc, isFence).map(([label, details]) => ({ label, details }));
  drawPdfSectionTitle(page, 42, 104, "BUILD SUMMARY", "Key fabrication assumptions from the calculator");
  const notesY = drawPdfCardGrid(page, 42, 132, buildSummaryCardsForPdf(settings, calc, isFence), { width: 528, columns: 3, cardHeight: 84, maxDetails: 2, maxY: 312 }) + 18;
  drawPdfSectionTitle(page, 42, notesY, "BUILD NOTES", "Full notes from the app Build Notes tab");
  drawPdfCompactNoteGrid(page, 42, notesY + 28, buildRows, { width: 528, columns: 2, cardHeight: isFence ? 70 : 62, maxY: 742, maxLines: isFence ? 4 : 3 });
}

function installNotesForPdf(settings, calc, isFence) {
  const embed = isFence ? settings.fencePostEmbed : settings.postEmbed;
  const openingText = isFence
    ? `Verify total fence run before layout: ${feet(calc.totalLength)}. Confirm gate locations and section starts before setting posts.`
    : `Verify post opening before fabrication: ${inch(calc.opening)}. Confirm outside width before cutting frame material.`;
  const swingText = isFence
    ? "Confirm all gate openings, gate swing, latch side, and hardware needs before installing posts."
    : `Confirm swing direction and hinge side before welding tabs: ${settings.hingePostSide === "left" ? "left post hinge side" : "right post hinge side"}.`;

  return [
    ["Verify opening", openingText],
    ["Confirm swing direction", swingText],
    ["Confirm latch side", "Confirm latch side, stop location, drop rod needs, and clearances before fabrication."],
    ["Confirm grade/slope", "Check site grade and slope before cutting posts, pickets, or rails. Adjust post heights only after field verification."],
    ["Post embed depth", `Post embed depth: ${inch(embed)} minimum unless shop drawings, soil conditions, or local requirements call for more.`],
    ["Concrete notes", "Verify footing diameter, depth, drainage, and local code requirements before setting posts."],
    ["Hardware notes", "Confirm hinges, latch, stops, drop rods, caps, and any customer-supplied hardware before fabrication."],
    ["Shop check", "Check all dimensions twice before cutting material. Deburr cuts, verify square, and tack before final weld."],
    ["Finish check", "Confirm prep, coating, paint, and touch-up requirements before delivery or installation."]
  ];
}

function drawInstallNotesPage(page, buildName, settings, calc, isFence, pageNumber = 7) {
  drawPdfHeader(page, "FABRICATION PACKET", `PAGE ${pageNumber} - INSTALL NOTES`, buildName);
  const notes = installNotesForPdf(settings, calc, isFence).map(([label, details]) => ({ label, details }));
  drawPdfSectionTitle(page, 42, 104, "FIELD AND SHOP CHECKLIST", "Final checks before cutting, welding, delivery, or install");
  drawPdfNoteCards(page, 42, 132, notes, { width: 528, maxY: 742, maxLines: 4 });
}

function sanitizeFileName(value) {
  const clean = cleanPdfText(value || "fabrication-packet").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return clean || "fabrication-packet";
}

function generateFabricationPacketPdf({ settings, calc, isFence, materialRows, cutRows, buildName }) {
  const safeBuildName = buildName || `${isFence ? "Fence" : "Gate"} Build`;
  const pages = Array.from({ length: 10 }, () => makePdfPage());

  drawCoverPage(pages[0], safeBuildName, isFence);

  [
    { mode: "2d", label: "2D PREVIEW" },
    { mode: "3d", label: "3D PREVIEW" },
    { mode: "top", label: "TOP DOWN PREVIEW" },
    { mode: "plans", label: "PLANS PREVIEW" }
  ].forEach(({ mode, label }, index) => {
    drawPreviewPage(pages[index + 1], safeBuildName, settings, calc, isFence, mode, label, index + 2);
  });

  drawCutListPage(pages[5], safeBuildName, cutRows, 6);
  drawMaterialsPage(pages[6], safeBuildName, materialRowsForPdf(settings, calc, isFence, materialRows), 7);
  drawPurchasePage(pages[7], safeBuildName, settings, calc, isFence, 8);
  drawBuildNotesPage(pages[8], safeBuildName, settings, calc, isFence, 9);
  drawInstallNotesPage(pages[9], safeBuildName, settings, calc, isFence, 10);

  const pdf = buildPdfDocument(pages);
  downloadBlob(`${sanitizeFileName(safeBuildName)}-fabrication-packet.pdf`, new Blob([pdf], { type: "application/pdf" }));
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
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
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
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadProjects() {
    if (!supabaseClient || !userId) return;
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
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadRequests() {
    if (!supabaseClient || !userId) return;
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
