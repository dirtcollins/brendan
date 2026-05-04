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
  centerGap: 0.5,
  frameSize: 1.5,
  frameThickness: 0.083,
  picketWidth: 0.625,
  picketThickness: 0.065,
  leftPicketCount: 9,
  rightPicketCount: 9,
  manualPicketSpacing: false,
  railCount: 2,
  layoutMode: "auto",
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
  saved: ["M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"],
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

  function startPan(event) {
    if (event.button !== 0 || event.target.closest?.(".gate-drag-target")) return;
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

  function wheelZoom(event) {
    if (!previewRef.current) return;
    event.preventDefault();
    const amount = event.deltaY > 0 ? -5 : 5;
    setZoom((value) => Math.max(minZoom, Math.min(maxZoom, value + amount)));
  }

  return {
    onPointerDown: startPan,
    onPointerMove: movePan,
    onPointerUp: endPan,
    onPointerCancel: endPan,
    onWheel: wheelZoom
  };
}

function normalizeSettings(settings) {
  const normalized = { ...DEFAULTS, ...settings };
  if (settings.leafWidth && !settings.leftLeafWidth) normalized.leftLeafWidth = Number(settings.leafWidth);
  if (settings.leafWidth && !settings.rightLeafWidth) normalized.rightLeafWidth = Number(settings.leafWidth);
  if (settings.hingeGap !== undefined && settings.postGap === undefined) normalized.postGap = Number(settings.hingeGap);
  if (settings.sameLeafWidth === undefined) {
    normalized.sameLeafWidth = Number(normalized.leftLeafWidth) === Number(normalized.rightLeafWidth);
  }
  if (settings.picketCount && !settings.leftPicketCount) normalized.leftPicketCount = Number(settings.picketCount);
  if (settings.picketCount && !settings.rightPicketCount) normalized.rightPicketCount = Number(settings.picketCount);
  normalized.manualPicketSpacing = Boolean(settings.manualPicketSpacing);
  normalized.buildMode = normalized.buildMode === "fence" ? "fence" : "gate";
  normalized.gateType = normalized.gateType === "single" ? "single" : "double";
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

function inch(value, digits = 3) {
  return `${fmt(value, digits)}"`;
}

function inchFraction(value, denominator = 16) {
  if (!Number.isFinite(Number(value))) return "ERR";
  const whole = Math.trunc(Number(value));
  const fraction = Number(value) - whole;
  let numerator = Math.round(fraction * denominator);
  let adjustedWhole = whole;

  if (numerator === denominator) {
    adjustedWhole += 1;
    numerator = 0;
  }

  if (numerator === 0) return `${adjustedWhole}"`;

  const divisor = gcd(numerator, denominator);
  const simpleNumerator = numerator / divisor;
  const simpleDenominator = denominator / divisor;
  return adjustedWhole > 0
    ? `${adjustedWhole}-${simpleNumerator}/${simpleDenominator}"`
    : `${simpleNumerator}/${simpleDenominator}"`;
}

function feet(value, digits = 2) {
  return `${fmt(value / 12, digits)} ft`;
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
  const opening = leftLeafWidth + rightLeafWidth + (settings.postGap * 2) + centerGap;
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
  const gateWidth = linkedGateCalc ? linkedGateCalc.opening : Math.max(Number(settings.fenceGateWidthFeet) || 0, 0) * 12;
  const totalGateOpening = Math.min(totalLength, gateCount * gateWidth);
  const maxGateStart = Math.max(totalLength - totalGateOpening, 0);
  const gateStart = gateCount > 0
    ? Math.max(0, Math.min((Number(settings.fenceGateStartFeet) || 0) * 12, maxGateStart))
    : 0;
  const leftRunLength = gateCount > 0 ? gateStart : totalLength;
  const rightRunLength = gateCount > 0 ? Math.max(totalLength - gateStart - totalGateOpening, 0) : 0;
  const fenceRunLength = Math.max(totalLength - totalGateOpening, 0);
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
    totalGateOpening,
    gateCount,
    gateWidth,
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
  if (settings.fenceSectionMode === "manual" && Math.abs(calc.sectionTotal + calc.totalGateOpening - calc.totalLength) > 0.5) {
    messages.push({ type: "warn", text: `Manual sections plus gates equal ${feet(calc.sectionTotal + calc.totalGateOpening, 2)}, not ${feet(calc.totalLength, 2)}.` });
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
    ...(calc.gateCount > 0 ? [[calc.linkedGateCalc ? "Saved gate" : "Gate openings", calc.gateCount, "Gate space in fence run", feet(calc.gateWidth, 2), "", calc.linkedGateCalc ? "Using selected saved gate build" : "Gate fabrication stays in Gate mode"]] : [])
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

function useSupabaseFeatureRequests(userId) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadRequests() {
    if (!supabaseClient || !userId) return;
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabaseClient
      .from("feature_requests")
      .select("id, title, details, priority, status, build_type, build_name, created_at")
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
  }, [userId]);

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
    const redirectTo = window.location.href.split("#")[0];
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
    const redirectTo = window.location.href.split("#")[0];
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    if (error) {
      setStatus(error.message);
      setLoading(false);
    }
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
            <span><Icon name="settings" />Secure Supabase login</span>
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
                Continue with Google
              </button>
              <div className="auth-divider"><span>or use email</span></div>
            </>
          )}
          <label className="auth-field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" required />
          </label>
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
          <p className="auth-fineprint">Free accounts can save projects and requests. Your projects are protected by Supabase row-level security.</p>
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

function App() {
  const { session, authLoading, passwordRecovery, setPasswordRecovery } = useAuthSession();

  if (!supabaseClient) {
    return <AuthShell title="Supabase is not configured" message="Add your Supabase URL and publishable key in src/supabase-config.js." />;
  }

  if (authLoading) {
    return <AuthShell title="Loading" message="Checking your saved login session." />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (passwordRecovery) {
    return <UpdatePasswordScreen onComplete={() => setPasswordRecovery(false)} />;
  }

  return <BuilderApp session={session} />;
}

function BuilderApp({ session }) {
  const [settings, setSettings] = useSavedSettings();
  const {
    builds: savedBuilds,
    setBuilds: setSavedBuilds,
    loading: projectsLoading,
    error: projectsError,
    refresh: refreshProjects
  } = useSupabaseProjects(session.user.id);
  const {
    requests: featureRequests,
    setRequests: setFeatureRequests,
    loading: requestsLoading,
    error: requestsError,
    refresh: refreshFeatureRequests
  } = useSupabaseFeatureRequests(session.user.id);
  const [currentBuildId, setCurrentBuildId] = useState("");
  const [buildName, setBuildName] = useState("");
  const [activeTab, setActiveTab] = useState("materials");
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [gateZoom, setGateZoom] = useState(100);
  const [fenceZoom, setFenceZoom] = useState(100);
  const [gatePreviewPosition, setGatePreviewPosition] = useState({ left: null, top: null });
  const [fencePreviewPosition, setFencePreviewPosition] = useState({ left: null, top: null });
  const savedGateBuilds = useMemo(() => savedBuilds.filter((build) => normalizeSettings(build.settings).buildMode === "gate"), [savedBuilds]);
  const linkedFenceGateBuild = useMemo(() => (
    savedGateBuilds.find((build) => build.id === settings.fenceGateBuildId) || null
  ), [savedGateBuilds, settings.fenceGateBuildId]);
  const linkedFenceGateSettings = linkedFenceGateBuild ? normalizeSettings(linkedFenceGateBuild.settings) : null;
  const gateCalc = useMemo(() => calculate(settings), [settings]);
  const fenceCalc = useMemo(() => calculateFence(settings, linkedFenceGateSettings), [settings, linkedFenceGateSettings]);
  const isFence = settings.buildMode === "fence";
  const calc = isFence ? fenceCalc : gateCalc;
  const messages = useMemo(() => (
    isFence ? getFenceMessages(settings, fenceCalc) : getMessages(settings, gateCalc)
  ), [settings, isFence, gateCalc, fenceCalc]);
  const materialRows = useMemo(() => (
    isFence ? getFenceMaterialRows(settings, fenceCalc) : getMaterialRows(settings, gateCalc)
  ), [settings, isFence, gateCalc, fenceCalc]);
  const cutRows = useMemo(() => (
    isFence ? getFenceCutRows(settings, fenceCalc) : getCutRows(settings, gateCalc)
  ), [settings, isFence, gateCalc, fenceCalc]);

  useEffect(() => {
    if (settings.manualPicketSpacing) return;

    setSettings((current) => {
      const balanced = balancePicketsForSettings(current);
      if (
        balanced.leftPicketCount === current.leftPicketCount
        && balanced.rightPicketCount === current.rightPicketCount
      ) {
        return current;
      }
      return balanced;
    });
  }, [
    settings.leftLeafWidth,
    settings.rightLeafWidth,
    settings.gateType,
    settings.frameSize,
    settings.picketWidth,
    settings.layoutMode,
    settings.leftPicketCount,
    settings.rightPicketCount,
    settings.manualPicketSpacing,
    setSettings
  ]);

  function updateField(id, value) {
    setSettings((current) => {
      const textFields = new Set(["buildMode", "gateType", "fenceSectionMode", "fenceManualSections", "fencePicketMaterial", "fenceGateBuildId"]);
      if (textFields.has(id)) return { ...current, [id]: value };
      const wholeFields = new Set(["leftPicketCount", "rightPicketCount", "railCount", "fenceGateCount", "fenceRailCount"]);
      const rebalanceFields = new Set(["leftLeafWidth", "rightLeafWidth", "frameSize", "picketWidth"]);
      const parsed = wholeFields.has(id) ? Math.max(0, Math.round(Number(value) || 0)) : Number(value);
      const nextValue = Number.isNaN(parsed) ? 0 : parsed;
      let next = { ...current, [id]: nextValue };
      if (id === "leftLeafWidth" && current.sameLeafWidth) {
        next = { ...next, rightLeafWidth: nextValue };
      }
      return rebalanceFields.has(id) && !current.manualPicketSpacing ? balancePicketsForSettings(next) : next;
    });
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULTS);
    setCurrentBuildId("");
    setBuildName("");
  }

  async function saveBuild() {
    const cleanName = buildName.trim() || `${isFence ? "Fence" : "Gate"} Build ${savedBuilds.length + 1}`;
    const projectData = normalizeSettings(settings);
    setSaveStatus("Saving");
    if (currentBuildId && savedBuilds.some((build) => build.id === currentBuildId)) {
      const { error } = await supabaseClient
        .from("projects")
        .update({ name: cleanName, type: isFence ? "fence" : "gate", data: projectData })
        .eq("id", currentBuildId);
      if (error) {
        setSaveStatus(`Save failed: ${error.message}`);
        return;
      }
      await refreshProjects();
      setBuildName(cleanName);
      setSaveStatus("Saved");
      return;
    }

    const { data, error } = await supabaseClient
      .from("projects")
      .insert({ user_id: session.user.id, name: cleanName, type: isFence ? "fence" : "gate", data: projectData })
      .select("id, name, type, data, created_at")
      .single();
    if (error) {
      setSaveStatus(`Save failed: ${error.message}`);
      return;
    }
    setSavedBuilds((current) => [projectRowToBuild(data), ...current]);
    setCurrentBuildId(data.id);
    setBuildName(cleanName);
    setSaveStatus("Saved");
  }

  async function saveBuildAsNew() {
    const cleanName = buildName.trim() || `${isFence ? "Fence" : "Gate"} Build ${savedBuilds.length + 1}`;
    setSaveStatus("Saving");
    const { data, error } = await supabaseClient
      .from("projects")
      .insert({ user_id: session.user.id, name: cleanName, type: isFence ? "fence" : "gate", data: normalizeSettings(settings) })
      .select("id, name, type, data, created_at")
      .single();
    if (error) {
      setSaveStatus(`Save failed: ${error.message}`);
      return;
    }
    setSavedBuilds((current) => [projectRowToBuild(data), ...current]);
    setCurrentBuildId(data.id);
    setBuildName(cleanName);
    setSaveStatus("Saved");
  }

  function loadBuild(build) {
    setSettings(normalizeSettings(build.settings));
    setCurrentBuildId(build.id);
    setBuildName(build.name);
  }

  function loadBuildById(id) {
    const build = savedBuilds.find((item) => item.id === id);
    if (build) loadBuild(build);
  }

  async function deleteBuild(id) {
    const { error } = await supabaseClient.from("projects").delete().eq("id", id);
    if (error) {
      setSaveStatus(`Delete failed: ${error.message}`);
      return;
    }
    setSavedBuilds((current) => current.filter((build) => build.id !== id));
    if (id === currentBuildId) {
      setCurrentBuildId("");
      setBuildName("");
    }
  }

  function exportMaterials() {
    if (isFence) {
      downloadCSV("fence-materials.csv", [
        ["Item", "Qty", "Material", "Length", "Wall Thickness", "Notes"],
        ...materialRows,
        ["Post stock to buy", fenceCalc.stockPlans[0].best.sticks, tubeSpec(settings.postWidth, settings.postThickness), feet(fenceCalc.stockPlans[0].best.stockLength, 0), thicknessLabel(settings.postThickness), `${feet(fenceCalc.purchasedLength, 2)} purchased, ${feet(fenceCalc.stockWaste, 2)} leftover`]
      ]);
      return;
    }
    downloadCSV("gate-materials.csv", [
      ["Item", "Qty", "Material", "Length", "Wall Thickness", "Notes"],
      ...materialRows,
      ...calc.stockPlans.map((plan) => [
        `${plan.name} stock to buy`,
        plan.best.sticks,
        tubeSpec(plan.size, plan.thickness),
        feet(plan.best.stockLength, 0),
        thicknessLabel(plan.thickness),
        `${feet(plan.best.purchased, 2)} purchased, ${feet(plan.best.used, 2)} used, ${feet(plan.best.waste, 2)} leftover`
      ]),
      ["Gate weight", 1, pounds(calc.totalGateWeight, 1), "", "", calc.doubleGate ? `Left ${pounds(calc.leftGateWeight, 1)}, right ${pounds(calc.rightGateWeight, 1)}; posts excluded` : "Single gate leaf; posts excluded"],
      ["Total steel weight to buy", "", pounds(calc.totalMetalWeight, 1), "", "", `${feet(calc.purchasedLength, 2)} purchased, ${feet(calc.stockWaste, 2)} leftover`],
      ["Estimated metal cost", "", money(calc.metalCost), "", "", `${money(settings.cwtCost)} per CWT`]
    ]);
  }

  function exportCuts() {
    downloadCSV(`${isFence ? "fence" : "gate"}-cut-list.csv`, [["#", "Part", "Qty", "Length", "Width", "Wall Thickness", "Stock Needed", "Type", "Notes"], ...cutRows]);
  }

  async function addFeatureRequest(request) {
    const payload = {
      user_id: session.user.id,
      title: request.title,
      details: request.details,
      priority: request.priority,
      status: "New",
      build_type: settings.buildMode,
      build_name: buildName.trim()
    };
    const { data, error } = await supabaseClient
      .from("feature_requests")
      .insert(payload)
      .select("id, title, details, priority, status, build_type, build_name, created_at")
      .single();
    if (error) throw error;
    setFeatureRequests((current) => [featureRowToRequest(data), ...current]);
  }

  async function deleteFeatureRequest(id) {
    const { error } = await supabaseClient.from("feature_requests").delete().eq("id", id);
    if (error) throw error;
    setFeatureRequests((current) => current.filter((request) => request.id !== id));
  }

function exportFeatureRequests() {
    downloadCSV("feature-requests.csv", [
      ["Title", "Priority", "Status", "Build Type", "Build Name", "Details", "Created"],
      ...featureRequests.map((request) => [
        request.title,
        request.priority,
        request.status,
        request.buildMode,
        request.buildName,
        request.details,
        formatDateTime(request.createdAt)
      ])
    ]);
  }


  const panelViews = {
    saved: { icon: "saved", title: "Saved Builds" },
    requests: { icon: "request", title: "Feature Requests" },
    settings: { icon: "settings", title: "Settings" }
  };
  const panelView = panelViews[activeTab];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="window-dots" aria-hidden="true">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
        </div>
        <div className="brand">
          <div className="mark">
            <img src="./src/assets/logo4.svg" alt="Fence & Gate Builder" />
          </div>
          <div>
            <h1>Fence & Gate Builder</h1>
            <div className="subtitle">Fabrication layout, materials, and cut lists</div>
          </div>
        </div>
        <div className="actions">
          <div className="save-state"><span />{saveStatus}</div>
          <label className="build-name-field">
            <span>Build name</span>
            <input
              type="text"
              value={buildName}
              placeholder="Customer or build name"
              onChange={(event) => setBuildName(event.target.value)}
            />
          </label>
          <button className="btn primary" onClick={saveBuild}><Icon name="save" />Save Build</button>
          <label className="open-build-field">
            <span>Open build</span>
            <select
              value={currentBuildId}
              onChange={(event) => loadBuildById(event.target.value)}
              disabled={savedBuilds.length === 0}
            >
              <option value="">{savedBuilds.length === 0 ? "No saved builds" : "Choose saved build"}</option>
              {savedBuilds
                .slice()
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .map((build) => (
                  <option key={build.id} value={build.id}>{build.name}</option>
                ))}
            </select>
          </label>
          <button className="btn new-build" onClick={saveBuildAsNew}><Icon name="plus" />New Build</button>
          <button className="btn" onClick={reset}><Icon name="reset" />Reset</button>
          <button className="btn" onClick={exportMaterials}><Icon name="upload" />Export CSV</button>
          <button className="btn" onClick={exportCuts}><Icon name="upload" />Cut List CSV</button>
          <button className="btn" onClick={() => window.print()}><Icon name="print" />Print</button>
          <button className="btn" onClick={() => supabaseClient.auth.signOut()}>Logout</button>
        </div>
      </header>

      <PrimaryNav
        buildMode={settings.buildMode}
        activeTab={activeTab}
        onBuildMode={(mode) => {
          updateField("buildMode", mode);
          if (panelViews[activeTab]) setActiveTab("materials");
        }}
        onView={setActiveTab}
      />
      {isFence ? <FenceSummary settings={settings} calc={fenceCalc} /> : <Summary settings={settings} calc={gateCalc} />}

      <div className="workspace">
        {isFence
          ? <FenceControls settings={settings} updateField={updateField} setSettings={setSettings} messages={messages} savedGateBuilds={savedGateBuilds} />
          : <Controls settings={settings} updateField={updateField} setSettings={setSettings} messages={messages} />}
        <main className="main">
          {isFence
            ? <FenceDrawing settings={settings} calc={fenceCalc} setSettings={setSettings} linkedGateBuild={linkedFenceGateBuild} zoom={fenceZoom} setZoom={setFenceZoom} previewPosition={fencePreviewPosition} setPreviewPosition={setFencePreviewPosition} />
            : <Drawing settings={settings} calc={gateCalc} zoom={gateZoom} setZoom={setGateZoom} previewPosition={gatePreviewPosition} setPreviewPosition={setGatePreviewPosition} />}
          <section className="panel">
            {panelView ? (
              <div className="panel-titlebar">
                <Icon name={panelView.icon} />
                <strong>{panelView.title}</strong>
              </div>
            ) : (
              <div className="tabs" role="tablist">
                {[
                  ["materials", "Materials"],
                  ["purchase", "Purchase"],
                  ["cutlist", "Cut List"],
                  ["notes", "Build Notes"]
                ].map(([id, label]) => (
                  <button
                    className={`tab ${activeTab === id ? "active" : ""}`}
                    key={id}
                    onClick={() => setActiveTab(id)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="panel-body">
              {activeTab === "materials" && (isFence ? <FenceMaterials settings={settings} calc={fenceCalc} rows={materialRows} /> : <Materials settings={settings} calc={gateCalc} rows={materialRows} />)}
              {activeTab === "purchase" && (isFence ? <FencePurchase settings={settings} calc={fenceCalc} /> : <Purchase settings={settings} calc={gateCalc} />)}
              {activeTab === "cutlist" && <CutList rows={cutRows} />}
              {activeTab === "saved" && (
                <SavedBuilds
                  builds={savedBuilds}
                  currentBuildId={currentBuildId}
                  onLoad={loadBuild}
                  onDelete={deleteBuild}
                  loading={projectsLoading}
                  error={projectsError}
                />
              )}
              {activeTab === "settings" && <SettingsPanel settings={settings} updateField={updateField} />}
              {activeTab === "requests" && (
                <FeatureRequests
                  requests={featureRequests}
                  onAdd={addFeatureRequest}
                  onDelete={deleteFeatureRequest}
                  onExport={exportFeatureRequests}
                  loading={requestsLoading}
                  error={requestsError}
                />
              )}
              {activeTab === "notes" && (isFence ? <FenceBuildNotes settings={settings} calc={fenceCalc} /> : <BuildNotes settings={settings} calc={gateCalc} />)}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function PrimaryNav({ buildMode, activeTab, onBuildMode, onView }) {
  const items = [
    { id: "gate", label: "Gate", icon: "gate", type: "mode" },
    { id: "fence", label: "Fence", icon: "fence", type: "mode" },
    { id: "saved", label: "Saved", icon: "saved", type: "view" },
    { id: "requests", label: "Requests", icon: "request", type: "view" },
    { id: "settings", label: "Settings", icon: "settings", type: "view" }
  ];

  return (
    <section className="mode-switch" aria-label="Primary navigation">
      {items.map((item) => {
        const active = item.type === "mode"
          ? !["saved", "requests", "settings"].includes(activeTab) && buildMode === item.id
          : activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`mode-button ${active ? "active" : ""}`}
            aria-label={item.label}
            title={item.label}
            onClick={() => (item.type === "mode" ? onBuildMode(item.id) : onView(item.id))}
          >
            <Icon name={item.icon} />
            {item.label}
          </button>
        );
      })}
    </section>
  );
}

function Summary({ settings, calc }) {
  return (
    <section className="summary" aria-label="Gate summary">
      <Metric label="Gate Type" value={calc.doubleGate ? "Double" : "Single"} />
      <Metric label="Total Outside" value={inch(calc.outside, 2)} />
      <Metric label="Post Opening" value={inch(calc.opening, 2)} />
      <Metric label={calc.doubleGate ? "Left Width" : "Gate Width"} value={inch(settings.leftLeafWidth, 2)} />
      {calc.doubleGate && <Metric label="Right Width" value={inch(settings.rightLeafWidth, 2)} />}
      <Metric label="Picket Gaps" value={calc.picketGap >= 0 ? (calc.doubleGate ? `${inch(calc.leftPicketGap, 2)} / ${inch(calc.rightPicketGap, 2)}` : inch(calc.leftPicketGap, 2)) : "ERR"} />
      <Metric label="Total Pickets" value={calc.totalPickets} />
      <Metric label="Frame Tube" value={feet(calc.frameTubeWithWaste, 2)} />
      <Metric label={calc.doubleGate ? "Left Gate" : "Gate Weight"} value={pounds(calc.leftGateWeight, 1)} />
      {calc.doubleGate && <Metric label="Right Gate" value={pounds(calc.rightGateWeight, 1)} />}
      {calc.doubleGate && <Metric label="Both Gates" value={pounds(calc.totalGateWeight, 1)} />}
      <Metric label="Buy Weight" value={pounds(calc.totalMetalWeight, 1)} />
      <Metric label="Metal Cost" value={money(calc.metalCost)} />
    </section>
  );
}

function FenceSummary({ settings, calc }) {
  return (
    <section className="summary" aria-label="Fence summary">
      <Metric label="Fence Length" value={feet(calc.totalLength, 2)} />
      <Metric label="Fence Sections" value={calc.sections.length} />
      <Metric label="Longest Section" value={feet(calc.longestSection, 2)} />
      <Metric label="Max Section" value={feet(calc.maxSection, 0)} />
      <Metric label="Gates" value={`${calc.gateCount} x ${feet(calc.gateWidth, 2)}`} />
      <Metric label="Posts" value={calc.totalPostCount} />
      <Metric label="Post Cut" value={inch(calc.postCutLength, 2)} />
      <Metric label="Pickets" value={calc.totalPickets} />
      <Metric label="Picket Type" value={settings.fencePicketMaterial} />
      <Metric label="Picket Width" value={inchFraction(settings.fencePicketWidth)} />
      <Metric label="Post Weight" value={pounds(calc.totalMetalWeight, 1)} />
      <Metric label="Post Cost" value={money(calc.metalCost)} />
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Controls({ settings, updateField, setSettings, messages }) {
  const doubleGate = isDoubleGate(settings);

  function balancePicketSpacing() {
    setSettings((current) => balancePicketsForSettings({ ...current, manualPicketSpacing: false }));
  }

  function toggleManualPicketSpacing(checked) {
    setSettings((current) => (
      checked
        ? { ...current, manualPicketSpacing: true }
        : balancePicketsForSettings({ ...current, manualPicketSpacing: false })
    ));
  }

  function toggleSameLeafWidth(checked) {
    setSettings((current) => {
      const next = {
        ...current,
        sameLeafWidth: checked,
        rightLeafWidth: checked ? current.leftLeafWidth : current.rightLeafWidth
      };
      return current.manualPicketSpacing ? next : balancePicketsForSettings(next);
    });
  }

  return (
    <aside className="sidebar">
      <section className="section">
        <SectionTitle icon="ruler">Opening</SectionTitle>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="gateType">Gate type</label>
            <select id="gateType" value={settings.gateType} onChange={(event) => updateField("gateType", event.target.value)}>
              <option value="double">Double gate</option>
              <option value="single">Single gate</option>
            </select>
          </div>
          <NumberField id="postWidth" label="Post width" value={settings.postWidth} onChange={updateField} />
          <ThicknessField id="postThickness" label="Post wall thickness" value={settings.postThickness} onChange={updateField} />
          <NumberField id="postHeight" label="Post above ground" value={settings.postHeight} onChange={updateField} min="1" />
          <NumberField id="postEmbed" label="Post in ground" value={settings.postEmbed} onChange={updateField} min="0" />
          <NumberField id="leftLeafWidth" label={doubleGate ? "Left gate width" : "Gate width"} value={settings.leftLeafWidth} onChange={updateField} min="1" />
          {doubleGate && <NumberField id="rightLeafWidth" label="Right gate width" value={settings.rightLeafWidth} onChange={updateField} min="1" disabled={settings.sameLeafWidth} />}
          {doubleGate && (
            <label className="check-field full" htmlFor="sameLeafWidth">
              <input
                id="sameLeafWidth"
                type="checkbox"
                checked={settings.sameLeafWidth}
                onChange={(event) => toggleSameLeafWidth(event.target.checked)}
              />
              <span>Both gates are the same width</span>
            </label>
          )}
          <NumberField id="leafHeight" label="Gate leaf height" value={settings.leafHeight} onChange={updateField} min="1" />
          <NumberField id="postGap" label="Post-to-gate gap" value={settings.postGap} onChange={updateField} />
          {doubleGate && <NumberField id="centerGap" label="Center gap" value={settings.centerGap} onChange={updateField} />}
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="frame">Frame & Pickets</SectionTitle>
        <div className="form-grid">
          <NumberField id="frameSize" label="Frame tube size" value={settings.frameSize} onChange={updateField} min="0.125" />
          <ThicknessField id="frameThickness" label="Frame wall thickness" value={settings.frameThickness} onChange={updateField} />
          <NumberField id="picketWidth" label="Picket width" value={settings.picketWidth} onChange={updateField} min="0.125" />
          <ThicknessField id="picketThickness" label="Picket wall thickness" value={settings.picketThickness} onChange={updateField} />
          <label className="check-field full" htmlFor="manualPicketSpacing">
            <input
              id="manualPicketSpacing"
              type="checkbox"
              checked={settings.manualPicketSpacing}
              onChange={(event) => toggleManualPicketSpacing(event.target.checked)}
            />
            <span>Override picket spacing</span>
          </label>
          <div className="field range-field">
            <label htmlFor="leftPicketCount">{doubleGate ? "Left pickets" : "Pickets"}</label>
            <div className="range-row">
              <input
                id="leftPicketCount"
                type="range"
                min="1"
                max="40"
                value={settings.leftPicketCount}
                disabled={!settings.manualPicketSpacing}
                onChange={(event) => updateField("leftPicketCount", event.target.value)}
              />
              <div className="pill">{settings.leftPicketCount}</div>
            </div>
          </div>
          {doubleGate && <div className="field range-field">
            <label htmlFor="rightPicketCount">Right pickets</label>
            <div className="range-row">
              <input
                id="rightPicketCount"
                type="range"
                min="1"
                max="40"
                value={settings.rightPicketCount}
                disabled={!settings.manualPicketSpacing}
                onChange={(event) => updateField("rightPicketCount", event.target.value)}
              />
              <div className="pill">{settings.rightPicketCount}</div>
            </div>
          </div>}
          <button className="btn field full balance-spacing-btn" type="button" onClick={balancePicketSpacing}>Balance spacing</button>
          <NumberField id="railCount" label="Horizontal rails per leaf" value={settings.railCount} onChange={updateField} min="2" max="6" step="1" />
          <div className="field full">
            <label htmlFor="layoutMode">Picket layout</label>
            <select
              id="layoutMode"
              value={settings.layoutMode}
              onChange={(event) => setSettings((current) => {
                const next = { ...current, layoutMode: event.target.value };
                return current.manualPicketSpacing ? next : balancePicketsForSettings(next);
              })}
            >
              <option value="auto">Auto space between frame sides</option>
              <option value="edge">First and last picket touch frame</option>
            </select>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="dollar">Steel Cost</SectionTitle>
        <div className="form-grid">
          <NumberField id="cwtCost" label="Cost per CWT" value={settings.cwtCost} onChange={updateField} min="0" step="1" full />
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="chart">Results</SectionTitle>
        <div className="status">
          {messages.map((message) => (
            <div className={`message ${message.type}`} key={message.text}>{message.text}</div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function FenceControls({ settings, updateField, setSettings, messages, savedGateBuilds }) {
  function chooseGateBuild(id) {
    const build = savedGateBuilds.find((item) => item.id === id);
    if (!build) {
      setSettings((current) => ({ ...current, fenceGateBuildId: "", fenceGateCount: current.fenceGateCount || 0 }));
      return;
    }
    const gateSettings = normalizeSettings(build.settings);
    const gateCalc = calculate(gateSettings);
    setSettings((current) => ({
      ...current,
      fenceGateBuildId: id,
      fenceGateCount: 1,
      fenceGateWidthFeet: Number((gateCalc.opening / 12).toFixed(2))
    }));
  }

  return (
    <aside className="sidebar">
      <section className="section">
        <SectionTitle icon="ruler">Fence Run</SectionTitle>
        <div className="form-grid">
          <NumberField id="fenceLengthFeet" label="Total fence length (ft)" value={settings.fenceLengthFeet} onChange={updateField} min="1" step="0.25" />
          <NumberField id="fenceMaxSectionFeet" label="Max section length (ft)" value={settings.fenceMaxSectionFeet} onChange={updateField} min="1" step="0.25" />
          <NumberField id="fenceHeight" label="Fence height" value={settings.fenceHeight} onChange={updateField} min="1" />
          <NumberField id="fencePostEmbed" label="Posts in ground" value={settings.fencePostEmbed} onChange={updateField} min="0" />
          <div className="field full">
            <label htmlFor="fenceSectionMode">Section sizing</label>
            <select id="fenceSectionMode" value={settings.fenceSectionMode} onChange={(event) => updateField("fenceSectionMode", event.target.value)}>
              <option value="auto">Even sections under max length</option>
              <option value="manual">Manual section sizes</option>
            </select>
          </div>
          <label className="field full" htmlFor="fenceManualSections">
            <span>Manual section sizes (ft)</span>
            <input
              id="fenceManualSections"
              type="text"
              value={settings.fenceManualSections}
              placeholder="Example: 7.5, 7.5, 8, 6"
              disabled={settings.fenceSectionMode !== "manual"}
              onChange={(event) => updateField("fenceManualSections", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="wood">Pickets</SectionTitle>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="fencePicketMaterial">Wood</label>
            <select id="fencePicketMaterial" value={settings.fencePicketMaterial} onChange={(event) => updateField("fencePicketMaterial", event.target.value)}>
              <option value="Cedar">Cedar</option>
              <option value="Redwood">Redwood</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="fencePicketWidth">Picket width</label>
            <select id="fencePicketWidth" value={String(settings.fencePicketWidth)} onChange={(event) => updateField("fencePicketWidth", event.target.value)}>
              <option value="3.5">3-1/2"</option>
              <option value="5.5">5-1/2"</option>
            </select>
          </div>
          <NumberField id="fencePicketHeight" label="Picket height" value={settings.fencePicketHeight} onChange={updateField} min="1" />
          <NumberField id="fenceRailCount" label="Rails per section" value={settings.fenceRailCount} onChange={updateField} min="2" max="4" step="1" />
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="link">Gates In Fence</SectionTitle>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="fenceGateBuildId">Saved gate build</label>
            <select id="fenceGateBuildId" value={settings.fenceGateBuildId} onChange={(event) => chooseGateBuild(event.target.value)}>
              <option value="">No saved gate selected</option>
              {savedGateBuilds.map((build) => {
                const gateCalc = calculate(normalizeSettings(build.settings));
                return <option key={build.id} value={build.id}>{build.name} - {feet(gateCalc.opening, 2)} opening</option>;
              })}
            </select>
          </div>
          <NumberField id="fenceGateCount" label="Gate openings" value={settings.fenceGateBuildId ? 1 : settings.fenceGateCount} onChange={updateField} min="0" max="20" step="1" disabled={Boolean(settings.fenceGateBuildId)} />
          <NumberField id="fenceGateWidthFeet" label="Each gate width (ft)" value={settings.fenceGateWidthFeet} onChange={updateField} min="0" step="0.25" disabled={Boolean(settings.fenceGateBuildId)} />
          <NumberField id="fenceGateStartFeet" label="Gate starts from left (ft)" value={settings.fenceGateStartFeet} onChange={updateField} min="0" step="0.25" full />
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="posts">PostMaster Cost</SectionTitle>
        <div className="form-grid">
          <NumberField id="postWidth" label="Post width" value={settings.postWidth} onChange={updateField} />
          <ThicknessField id="postThickness" label="Post wall thickness" value={settings.postThickness} onChange={updateField} />
          <NumberField id="cwtCost" label="Metal cost per CWT" value={settings.cwtCost} onChange={updateField} min="0" step="1" full />
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="chart">Results</SectionTitle>
        <div className="status">
          {messages.map((message) => (
            <div className={`message ${message.type}`} key={message.text}>{message.text}</div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function NumberField({ id, label, value, onChange, min = "0", max, step = "0.125", full = false, disabled = false }) {
  const unit = numberFieldUnit(id);
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className={`input-with-unit ${unit ? "has-unit" : ""}`}>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(id, event.target.value)}
        />
        {unit && <span className="input-unit">{unit}</span>}
      </div>
    </div>
  );
}

function numberFieldUnit(id) {
  if (["cwtCost", "railCount", "fenceRailCount", "fenceGateCount"].includes(id)) return "";
  if (id.endsWith("Feet") || ["fenceLengthFeet", "fenceMaxSectionFeet"].includes(id)) return "ft";
  return "in";
}

function ThicknessField({ id, label, value, onChange }) {
  const selectedValue = THICKNESS_OPTIONS.some((option) => option.value === Number(value))
    ? String(value)
    : String(THICKNESS_OPTIONS[0].value);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={selectedValue} onChange={(event) => onChange(id, event.target.value)}>
        {THICKNESS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Drawing({ settings, calc, zoom, setZoom, previewPosition, setPreviewPosition }) {
  const { previewRef, previewPositionEvents } = usePersistentPreview([
    calc.outside,
    settings.postHeight,
    settings.leafHeight,
    settings.leftLeafWidth,
    settings.rightLeafWidth
  ], previewPosition, setPreviewPosition);
  const previewNavigation = usePreviewNavigation(previewRef, setZoom, 60, 300);
  const pad = 72;
  const maxW = 1152;
  const maxH = 396;
  const scale = Math.min(maxW / calc.outside, maxH / Math.max(settings.postHeight, settings.leafHeight));
  const postTop = pad;
  const gateTop = postTop;
  const postW = settings.postWidth * scale;
  const postH = settings.postHeight * scale;
  const leftLeafW = settings.leftLeafWidth * scale;
  const rightLeafW = calc.rightLeafWidth * scale;
  const leafH = settings.leafHeight * scale;
  const postBottom = postTop + postH;
  const gateBottom = gateTop + leafH;
  const drawingBottom = postTop + Math.max(settings.postHeight, settings.leafHeight) * scale;
  const frame = settings.frameSize * scale;
  const postGap = settings.postGap * scale;
  const centerGap = calc.centerGap * scale;
  const picketW = settings.picketWidth * scale;
  const leftPicketGap = Math.max(calc.leftPicketGap * scale, 0);
  const rightPicketGap = Math.max(calc.rightPicketGap * scale, 0);
  let x = pad;
  const leftPostX = x;
  x += postW + postGap;
  const firstGateX = x;
  x += leftLeafW;
  if (calc.doubleGate) x += centerGap;
  const secondGateX = x;
  if (calc.doubleGate) x += rightLeafW;
  x += postGap;
  const rightPostX = x;
  const svgW = Math.max(1100, pad * 2 + calc.outside * scale);
  const svgH = Math.max(640, drawingBottom + 128);
  const adjustZoom = (amount) => setZoom((value) => Math.max(60, Math.min(300, value + amount)));
  const resetZoom = () => setZoom(100);

  return (
    <section className="stage">
      <div className="stage-head">
        <div>
          <h2 className="stage-title">Live Preview</h2>
          <div className="legend">
            <LegendItem color="var(--post)" label="Posts" />
            <LegendItem color="var(--frame)" label="Outer frame" />
            <LegendItem color="var(--rail)" label="Rails" />
            <LegendItem color="var(--picket)" label="Pickets" />
          </div>
        </div>
        <div className="zoom-controls" aria-label="Preview zoom controls">
          <label htmlFor="previewZoom">Zoom</label>
          <button className="zoom-step" type="button" onClick={() => adjustZoom(-5)} aria-label="Zoom out 5 percent">-5</button>
          <input
            id="previewZoom"
            type="range"
            min="60"
            max="300"
            step="5"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
          <button className="zoom-step" type="button" onClick={() => adjustZoom(5)} aria-label="Zoom in 5 percent">+5</button>
          <button className="zoom-value" type="button" onClick={resetZoom} aria-label="Reset zoom">{zoom}%</button>
        </div>
      </div>
      <div className="drawing-scroll" ref={previewRef} {...previewPositionEvents} {...previewNavigation}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          role="img"
          aria-label="Scaled double gate drawing"
          style={{ width: `${zoom}%`, minWidth: `${760 * (zoom / 100)}px`, margin: "auto" }}
        >
          <rect x={leftPostX} y={postTop} width={postW} height={postH} fill="var(--post)" rx="2" />
          <rect x={rightPostX} y={postTop} width={postW} height={postH} fill="var(--post)" rx="2" />
          <DimText x={leftPostX + postW / 2} y={postTop - 12}>{inch(settings.postWidth, 2)}</DimText>
          <DimText x={rightPostX + postW / 2} y={postTop - 12}>{inch(settings.postWidth, 2)}</DimText>
          <VerticalDimension
            x={leftPostX - 44}
            y1={postTop}
            y2={postBottom}
            label="Post height"
            value={inch(settings.postHeight, 2)}
          />
          <VerticalDimension
            x={leftPostX - 18}
            y1={gateTop}
            y2={gateBottom}
            label="Gate height"
            value={inch(settings.leafHeight, 2)}
          />
          <GapBand
            x1={leftPostX + postW}
            x2={firstGateX}
            y1={gateTop}
            y2={gateBottom}
            label="Post gap"
            value={inch(settings.postGap, 2)}
            side="left"
          />
          {calc.doubleGate && <GapBand
            x1={firstGateX + leftLeafW}
            x2={secondGateX}
            y1={gateTop}
            y2={gateBottom}
            label="Center gap"
            value={inch(settings.centerGap, 2)}
            center
          />}
          <GapBand
            x1={(calc.doubleGate ? secondGateX + rightLeafW : firstGateX + leftLeafW)}
            x2={rightPostX}
            y1={gateTop}
            y2={gateBottom}
            label="Post gap"
            value={inch(settings.postGap, 2)}
            side="right"
          />
          <Gate x={firstGateX} label={calc.doubleGate ? "Left leaf" : "Gate"} leafWidth={settings.leftLeafWidth} picketCount={settings.leftPicketCount} settings={settings} scale={scale} gateTop={gateTop} baseY={gateBottom} frame={frame} picketW={picketW} picketGap={leftPicketGap} />
          {calc.doubleGate && <Gate x={secondGateX} label="Right leaf" leafWidth={settings.rightLeafWidth} picketCount={settings.rightPicketCount} settings={settings} scale={scale} gateTop={gateTop} baseY={gateBottom} frame={frame} picketW={picketW} picketGap={rightPicketGap} />}
          <line x1={pad} y1={drawingBottom + 44} x2={pad + calc.outside * scale} y2={drawingBottom + 44} stroke="var(--line-strong)" />
          <DimText x={pad + (calc.outside * scale) / 2} y={drawingBottom + 62}>Outside {inch(calc.outside, 2)}</DimText>
          <line x1={pad + postW} y1={drawingBottom + 80} x2={pad + postW + calc.opening * scale} y2={drawingBottom + 80} stroke="var(--line-strong)" />
          <DimText x={pad + postW + (calc.opening * scale) / 2} y={drawingBottom + 98}>Post opening {inch(calc.opening, 2)}</DimText>
        </svg>
      </div>
    </section>
  );
}

function FenceDrawing({ settings, calc, setSettings, zoom, setZoom, previewPosition, setPreviewPosition }) {
  const [draggingGate, setDraggingGate] = useState(false);
  const { previewRef, previewPositionEvents } = usePersistentPreview([
    calc.totalLength,
    calc.totalGateOpening,
    settings.fenceHeight,
    settings.fenceGateStartFeet,
    settings.fenceSectionMode
  ], previewPosition, setPreviewPosition);
  const previewNavigation = usePreviewNavigation(previewRef, setZoom, 40, 300);
  const svgRef = useRef(null);
  const gateDragOffsetRef = useRef(0);
  const pad = 70;
  const maxW = 2400;
  const scale = calc.totalLength > 0 ? maxW / calc.totalLength : 1;
  const fenceTop = 72;
  const fenceHeight = settings.fenceHeight * scale;
  const postW = Math.max(settings.postWidth * scale, 5);
  const picketW = Math.max(settings.fencePicketWidth * scale, 3);
  const railH = Math.max(3, 3.5 * scale);
  const svgW = maxW + pad * 2;
  const svgH = Math.max(360, fenceTop + fenceHeight + 132);
  const adjustZoom = (amount) => setZoom((value) => Math.max(40, Math.min(300, value + amount)));
  const resetZoom = () => setZoom(100);
  const segments = [];
  let sectionNumber = 1;
  let leftX = pad;
  const sectionSource = calc.gateCount > 0 && settings.fenceSectionMode !== "manual"
    ? [
      ...calc.leftSections.map((length) => ({ length, side: "left" })),
      { type: "gate" },
      ...calc.rightSections.map((length) => ({ length, side: "right" }))
    ]
    : calc.sections.map((length) => ({ length, side: "full" }));

  sectionSource.forEach((item) => {
    if (item.type === "gate") {
      segments.push({ type: "gate", index: 1, x: pad + calc.gateStart * scale, width: calc.totalGateOpening * scale, length: calc.totalGateOpening });
      leftX = pad + (calc.gateStart + calc.totalGateOpening) * scale;
      return;
    }
    segments.push({
      type: "section",
      index: sectionNumber,
      x: leftX,
      width: item.length * scale,
      length: item.length,
      pickets: Math.ceil(item.length / Number(settings.fencePicketWidth))
    });
    leftX += item.length * scale;
    sectionNumber += 1;
  });

  function getPointerFenceInches(event) {
    if (!svgRef.current) return 0;
    const point = svgRef.current.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM().inverse());
    return (svgPoint.x - pad) / scale;
  }

  function updateGateFromPointer(event) {
    if (!svgRef.current || calc.gateCount <= 0) return;
    const gateStart = Math.max(0, Math.min(getPointerFenceInches(event) - gateDragOffsetRef.current, calc.maxGateStart));
    setSettings((current) => ({ ...current, fenceGateStartFeet: Number((gateStart / 12).toFixed(2)) }));
  }

  function startGateDrag(event) {
    if (calc.gateCount <= 0) return;
    setDraggingGate(true);
    gateDragOffsetRef.current = getPointerFenceInches(event) - calc.gateStart;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveGateDrag(event) {
    if (!draggingGate) return;
    updateGateFromPointer(event);
  }

  function endGateDrag(event) {
    setDraggingGate(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section className="stage">
      <div className="stage-head">
        <div>
          <h2 className="stage-title">Live Preview</h2>
          <div className="legend">
            <LegendItem color="var(--post)" label="Posts" />
            <LegendItem color="var(--wood)" label={`${settings.fencePicketMaterial} pickets`} />
            <LegendItem color="var(--rail)" label="Rails" />
            <LegendItem color="var(--frame)" label="Gate openings" />
          </div>
        </div>
        <div className="zoom-controls" aria-label="Preview zoom controls">
          <label htmlFor="fencePreviewZoom">Zoom</label>
          <button className="zoom-step" type="button" onClick={() => adjustZoom(-5)} aria-label="Zoom out 5 percent">-5</button>
          <input id="fencePreviewZoom" type="range" min="40" max="300" step="5" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <button className="zoom-step" type="button" onClick={() => adjustZoom(5)} aria-label="Zoom in 5 percent">+5</button>
          <button className="zoom-value" type="button" onClick={resetZoom} aria-label="Reset zoom">{zoom}%</button>
        </div>
      </div>
      <div className="drawing-scroll fence-scroll" ref={previewRef} {...previewPositionEvents} {...previewNavigation}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          role="img"
          aria-label="Scaled fence drawing"
          style={{ width: `${zoom}%`, minWidth: `${1100 * (zoom / 100)}px`, margin: "auto" }}
          onPointerMove={moveGateDrag}
          onPointerUp={endGateDrag}
          onPointerCancel={endGateDrag}
        >
          <rect x={0} y={fenceTop + fenceHeight} width={svgW} height={28} fill="#e8ecef" />
          {segments.map((segment) => (
            segment.type === "section" ? (
              <FenceSection
                key={`section-${segment.index}`}
                segment={segment}
                settings={settings}
                scale={scale}
                y={fenceTop}
                height={fenceHeight}
                postW={postW}
                picketW={picketW}
                railH={railH}
              />
            ) : (
              <FenceGateOpening
                key={`gate-${segment.index}`}
                segment={segment}
                y={fenceTop}
                height={fenceHeight}
                scale={scale}
                linkedGateSettings={calc.linkedGateSettings}
                linkedGateCalc={calc.linkedGateCalc}
                onPointerDown={startGateDrag}
                dragging={draggingGate}
              />
            )
          ))}
          <rect x={pad - postW / 2} y={fenceTop} width={postW} height={fenceHeight} fill="var(--post)" rx="2" />
          {segments
            .filter((segment) => segment.type === "section")
            .map((segment) => (
              <rect key={`post-${segment.index}`} x={segment.x + segment.width - postW / 2} y={fenceTop} width={postW} height={fenceHeight} fill="var(--post)" rx="2" />
            ))}
          {segments
            .filter((segment) => segment.type === "gate")
            .map((segment) => (
              <g key={`gateposts-${segment.index}`}>
                <rect x={segment.x - postW / 2} y={fenceTop} width={postW} height={fenceHeight} fill="var(--post)" rx="2" />
                <rect x={segment.x + segment.width - postW / 2} y={fenceTop} width={postW} height={fenceHeight} fill="var(--post)" rx="2" />
              </g>
            ))}
          <VerticalDimension x={pad - 44} y1={fenceTop} y2={fenceTop + fenceHeight} label="Fence height" value={inch(settings.fenceHeight, 2)} />
          <line x1={pad} y1={fenceTop + fenceHeight + 56} x2={pad + calc.totalLength * scale} y2={fenceTop + fenceHeight + 56} stroke="var(--line-strong)" />
          <DimText x={pad + (calc.totalLength * scale) / 2} y={fenceTop + fenceHeight + 78}>Total fence run {feet(calc.totalLength, 2)}</DimText>
          {calc.gateCount > 0 && (
            <DimText x={pad + calc.gateStart * scale + (calc.totalGateOpening * scale) / 2} y={fenceTop - 22}>Drag gate: starts at {feet(calc.gateStart, 2)}</DimText>
          )}
        </svg>
      </div>
    </section>
  );
}

function FenceSection({ segment, settings, scale, y, height, postW, picketW, railH }) {
  const railInset = Math.min(6 * scale, height / 2);
  const railYs = Array.from({ length: settings.fenceRailCount }).map((_, index) => {
    if (settings.fenceRailCount === 1) return y + height / 2;
    return y + railInset + ((height - railInset * 2) * index / (settings.fenceRailCount - 1));
  });

  return (
    <g>
      {Array.from({ length: segment.pickets }).map((_, index) => {
        const x = segment.x + index * picketW;
        const width = Math.min(picketW, Math.max(segment.x + segment.width - x, 0));
        const flatInset = width * 0.25;
        const shoulderY = y + Math.min(flatInset, height * 0.16);
        if (width <= 0) return null;
        return (
          <path
            key={index}
            d={`M ${x} ${y + height} L ${x} ${shoulderY} L ${x + flatInset} ${y} L ${x + width - flatInset} ${y} L ${x + width} ${shoulderY} L ${x + width} ${y + height} Z`}
            fill="var(--wood)"
            stroke="rgba(0,0,0,.18)"
            strokeWidth="0.75"
          />
        );
      })}
      {railYs.map((railY, index) => (
        <rect key={index} x={segment.x} y={railY - railH / 2} width={segment.width} height={railH} fill="var(--rail)" rx="2" />
      ))}
      <DimText x={segment.x + segment.width / 2} y={y + height + 34}>Section {segment.index} {feet(segment.length, 2)}</DimText>
    </g>
  );
}

function FenceGateOpening({ segment, y, height, scale, linkedGateSettings, linkedGateCalc, onPointerDown, dragging }) {
  return (
    <g className={`gate-drag-target ${dragging ? "dragging" : ""}`} onPointerDown={onPointerDown}>
      <rect x={segment.x} y={y} width={segment.width} height={height} fill="#fff" stroke="var(--frame)" strokeWidth="3" strokeDasharray="8 6" />
      {linkedGateSettings && linkedGateCalc ? (
        <LinkedGateInFence segment={segment} y={y} height={height} scale={scale} gateSettings={linkedGateSettings} gateCalc={linkedGateCalc} />
      ) : (
        <DimText x={segment.x + segment.width / 2} y={y + height / 2}>Gate opening {feet(segment.length, 2)}</DimText>
      )}
    </g>
  );
}

function LinkedGateInFence({ segment, y, height, scale, gateSettings, gateCalc }) {
  const gateTop = y + Math.max(0, height - gateSettings.leafHeight * scale);
  const gateBottom = gateTop + gateSettings.leafHeight * scale;
  const frame = gateSettings.frameSize * scale;
  const picketW = gateSettings.picketWidth * scale;
  const postGap = gateSettings.postGap * scale;
  const centerGap = gateCalc.centerGap * scale;
  const leftPicketGap = Math.max(gateCalc.leftPicketGap * scale, 0);
  const rightPicketGap = Math.max(gateCalc.rightPicketGap * scale, 0);
  const leftX = segment.x + postGap;
  const rightX = leftX + gateSettings.leftLeafWidth * scale + centerGap;

  return (
    <g>
      <Gate
        x={leftX}
        label=""
        leafWidth={gateSettings.leftLeafWidth}
        picketCount={gateSettings.leftPicketCount}
        settings={gateSettings}
        scale={scale}
        gateTop={gateTop}
        baseY={gateBottom}
        frame={frame}
        picketW={picketW}
        picketGap={leftPicketGap}
      />
      {gateCalc.doubleGate && <Gate
        x={rightX}
        label=""
        leafWidth={gateSettings.rightLeafWidth}
        picketCount={gateSettings.rightPicketCount}
        settings={gateSettings}
        scale={scale}
        gateTop={gateTop}
        baseY={gateBottom}
        frame={frame}
        picketW={picketW}
        picketGap={rightPicketGap}
      />}
      <DimText x={segment.x + segment.width / 2} y={y + height / 2}>Saved gate {feet(segment.length, 2)}</DimText>
    </g>
  );
}

function VerticalDimension({ x, y1, y2, label, value }) {
  const midY = y1 + (y2 - y1) / 2;

  return (
    <>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke="var(--line-strong)" />
      <line x1={x - 8} y1={y1} x2={x + 8} y2={y1} stroke="var(--line-strong)" />
      <line x1={x - 8} y1={y2} x2={x + 8} y2={y2} stroke="var(--line-strong)" />
      <line x1={x + 8} y1={y1} x2={x + 16} y2={y1} stroke="var(--line-strong)" strokeDasharray="4 4" />
      <line x1={x + 8} y1={y2} x2={x + 16} y2={y2} stroke="var(--line-strong)" strokeDasharray="4 4" />
      <text
        x={x - 9}
        y={midY}
        textAnchor="middle"
        className="vertical-dim"
        transform={`rotate(-90 ${x - 9} ${midY})`}
      >
        {label} {value}
      </text>
    </>
  );
}

function Gate({ x, label, leafWidth, picketCount, settings, scale, gateTop, baseY, frame, picketW, picketGap }) {
  const leafW = leafWidth * scale;
  const leafH = settings.leafHeight * scale;
  const innerW = Math.max(leafW - frame * 2, 0);
  const innerH = Math.max(leafH - frame * 2, 0);
  const inset = settings.layoutMode === "edge" ? 0 : picketGap;
  const picketTop = gateTop + frame;
  const picketH = innerH;
  const railSlots = Math.max(settings.railCount - 2, 0);

  return (
    <>
      <rect x={x} y={gateTop} width={leafW} height={frame} fill="var(--frame)" rx="2" />
      <rect x={x} y={gateTop + leafH - frame} width={leafW} height={frame} fill="var(--frame)" rx="2" />
      <rect x={x} y={gateTop} width={frame} height={leafH} fill="var(--frame)" rx="2" />
      <rect x={x + leafW - frame} y={gateTop} width={frame} height={leafH} fill="var(--frame)" rx="2" />
      {Array.from({ length: railSlots }).map((_, index) => {
        const y = gateTop + frame + ((leafH - frame * 2) * (index + 1) / (settings.railCount - 1));
        return <rect key={`rail-${index}`} x={x + frame} y={y - frame / 2} width={innerW} height={frame} fill="var(--rail)" rx="2" />;
      })}
      {Array.from({ length: picketCount }).map((_, index) => (
        <rect
          key={`picket-${index}`}
          x={x + frame + inset + index * (picketW + picketGap)}
          y={picketTop}
          width={picketW}
          height={picketH}
          fill="var(--picket)"
          rx="1"
        />
      ))}
      {label && <DimText x={x + leafW / 2} y={baseY + 24}>{label} {inch(leafWidth, 2)}</DimText>}
    </>
  );
}

function GapBand({ x1, x2, y1, y2, label, value, center = false, side = "center" }) {
  const width = Math.max(x2 - x1, 0);
  const midX = x1 + width / 2;
  const calloutX = center ? midX : side === "left" ? x1 - 14 : x2 + 14;
  const calloutY = center ? y1 - 34 : y2 - 46;
  const textAnchor = center ? "middle" : side === "left" ? "end" : "start";
  const measureY = center ? y1 - 10 : calloutY - 8;

  return (
    <>
      <rect x={x1} y={y1} width={width} height={y2 - y1} fill={center ? "#fff" : "rgba(37, 99, 235, .13)"} />
      <line x1={x1} y1={y1 - 10} x2={x1} y2={y2 + 10} stroke="var(--line-strong)" strokeDasharray="4 4" />
      <line x1={x2} y1={y1 - 10} x2={x2} y2={y2 + 10} stroke="var(--line-strong)" strokeDasharray="4 4" />
      <line x1={x1} y1={measureY} x2={x2} y2={measureY} stroke="var(--line-strong)" />
      <line x1={midX} y1={measureY} x2={calloutX} y2={calloutY - 8} stroke="var(--line-strong)" />
      <text x={calloutX} y={calloutY} textAnchor={textAnchor} className="gap-label">{label}</text>
      <text x={calloutX} y={calloutY + 16} textAnchor={textAnchor} className="gap-value">{value}</text>
    </>
  );
}

function DimText({ x, y, children }) {
  return <text x={x} y={y} textAnchor="middle" className="dim">{children}</text>;
}

function LegendItem({ color, label }) {
  return (
    <span className="legend-item">
      <span className="swatch" style={{ background: color }} />
      {label}
    </span>
  );
}

function partColorKey(type = "") {
  const value = type.toLowerCase();
  if (value.includes("post")) return "post";
  if (value.includes("frame")) return "frame";
  if (value.includes("picket")) return "picket";
  if (value.includes("rail")) return "rail";
  return "metal";
}

function PartSwatch({ type, label }) {
  const key = partColorKey(type);
  return (
    <span className={`part-swatch part-swatch-${key}`} aria-label={label || type} title={label || type} />
  );
}

function Materials({ settings, calc, rows }) {
  const gateWeightItems = calc.doubleGate
    ? [
      ["Left leaf", pounds(calc.leftGateWeight, 1)],
      ["Right leaf", pounds(calc.rightGateWeight, 1)],
      ["Frame", pounds(calc.gateFrameWeight, 1)],
      ["Pickets", pounds(calc.gatePicketWeight, 1)]
    ]
    : [
      ["Gate leaf", pounds(calc.leftGateWeight, 1)],
      ["Frame", pounds(calc.gateFrameWeight, 1)],
      ["Pickets", pounds(calc.gatePicketWeight, 1)]
    ];
  return (
    <div className="cards">
      {rows.map((row) => <MaterialCard row={row} key={row[0]} />)}
      <article className="item-card item-card-frame">
        <strong>{pounds(calc.totalGateWeight, 1)}</strong>
        <span className="item-label"><PartSwatch type="Frame" />Gate weights</span>
        <SpecList items={gateWeightItems} />
      </article>
      <article className="item-card">
        <strong>{pounds(calc.totalMetalWeight, 1)}</strong>
        <span>Steel weight to buy</span>
        <SpecList items={[
          ["Full sticks", feet(calc.purchasedLength, 2)],
          ["Cut length", feet(calc.usedLength, 2)],
          ["Leftover", feet(calc.stockWaste, 2)]
        ]} />
      </article>
      <article className="item-card">
        <strong>{money(calc.metalCost)}</strong>
        <span>Estimated metal cost</span>
        <SpecList items={[
          ["Rate", `${money(settings.cwtCost)} per CWT`],
          ["Basis", "Full sticks"]
        ]} />
      </article>
    </div>
  );
}

function FenceMaterials({ settings, calc, rows }) {
  return (
    <div className="cards">
      {rows.map((row) => <MaterialCard row={row} key={row[0]} />)}
      <article className="item-card item-card-post">
        <strong>{calc.stockPlans[0].best.sticks} x {calc.stockPlans[0].best.label}</strong>
        <span className="item-label"><PartSwatch type="Post" />Post stock to buy</span>
        <SpecList items={[
          ["Full sticks", feet(calc.purchasedLength, 2)],
          ["Cut length", feet(calc.usedLength, 2)],
          ["Leftover", feet(calc.stockWaste, 2)]
        ]} />
      </article>
      <article className="item-card">
        <strong>{money(calc.metalCost)}</strong>
        <span>Estimated post cost</span>
        <SpecList items={[
          ["Weight", pounds(calc.totalMetalWeight, 1)],
          ["Rate", `${money(settings.cwtCost)} per CWT`]
        ]} />
      </article>
    </div>
  );
}

function MaterialCard({ row }) {
  const [name, qty, material, length, wall, notes] = row;
  const materialText = wall ? String(material).replace(`, ${wall} wall`, "") : material;
  return (
    <article className={`item-card item-card-${partColorKey(name)}`}>
      <strong>Qty: {qty}</strong>
      <span className="item-label"><PartSwatch type={name} />{name}</span>
      <SpecList items={[
        ["Material", materialText],
        length ? ["Cut length", length] : null,
        wall ? ["Wall", wall] : null,
        notes ? ["Notes", notes] : null
      ]} />
    </article>
  );
}

function SpecList({ items }) {
  return (
    <dl className="spec-list">
      {items.filter(Boolean).map(([label, value]) => (
        <div className="spec-row" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Purchase({ settings, calc }) {
  return (
    <div className="purchase-view">
      <div className="cards purchase-summary">
        <article className="item-card">
          <strong>{money(calc.metalCost)}</strong>
          <span>Estimated metal cost</span>
          <p>Full sticks calculated at {money(settings.cwtCost)} per CWT</p>
        </article>
        <article className="item-card">
          <strong>{pounds(calc.totalMetalWeight, 1)}</strong>
          <span>Steel weight to buy</span>
          <p>{feet(calc.purchasedLength, 2)} purchased length</p>
        </article>
        <article className="item-card">
          <strong>{feet(calc.stockWaste, 2)}</strong>
          <span>Expected leftover</span>
          <p>{feet(calc.usedLength, 2)} used from purchased stock</p>
        </article>
      </div>

      <div className="table-wrap purchase-table">
        <table>
          <thead>
            <tr>
              <th>Color</th>
              <th>Material</th>
              <th>Tube</th>
              <th>Buy</th>
              <th>Used</th>
              <th>Leftover</th>
              <th>Buy Weight</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {calc.stockPlans.map((plan) => (
              <tr key={plan.name}>
                <td><PartSwatch type={plan.name} label={plan.name} /></td>
                <td>{plan.name}</td>
                <td>{tubeSpecFraction(plan.size, plan.thickness)}</td>
                <td>{plan.best.sticks} x {plan.best.label}</td>
                <td className="num">{feet(plan.best.used, 2)}</td>
                <td className="num">{feet(plan.best.waste, 2)}</td>
                <td className="num">{pounds(plan.purchasedWeight, 1)}</td>
                <td className="num">{money((plan.purchasedWeight / 100) * settings.cwtCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FencePurchase({ settings, calc }) {
  const postPlan = calc.stockPlans[0];
  return (
    <div className="purchase-view">
      <div className="cards purchase-summary">
        <article className="item-card">
          <strong>{postPlan.best.sticks} x {postPlan.best.label}</strong>
          <span>Post stock</span>
          <p>{tubeSpecFraction(settings.postWidth, settings.postThickness)}</p>
        </article>
        <article className="item-card">
          <strong>{calc.totalPickets}</strong>
          <span>{settings.fencePicketMaterial} dog-ear pickets</span>
          <p>{inchFraction(settings.fencePicketWidth)} wide, no gaps</p>
        </article>
        <article className="item-card">
          <strong>{calc.railCuts}</strong>
          <span>Rail pieces</span>
          <p>{settings.fenceRailCount} rails per section</p>
        </article>
      </div>
      <div className="table-wrap purchase-table">
        <table>
          <thead>
            <tr><th>Color</th><th>Material</th><th>Buy</th><th>Used</th><th>Leftover</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><PartSwatch type="Post" label="Post" /></td>
              <td>Posts</td>
              <td>{postPlan.best.sticks} x {postPlan.best.label}</td>
              <td className="num">{feet(postPlan.best.used, 2)}</td>
              <td className="num">{feet(postPlan.best.waste, 2)}</td>
              <td>{money(calc.metalCost)} estimated metal cost</td>
            </tr>
            <tr>
              <td><PartSwatch type="Picket" label="Picket" /></td>
              <td>{settings.fencePicketMaterial} dog-ear pickets</td>
              <td>{calc.totalPickets} pickets</td>
              <td className="num">{feet(calc.totalPickets * settings.fencePicketHeight, 2)}</td>
              <td className="num">By lumber order</td>
              <td>{inchFraction(settings.fencePicketWidth)} wide, vertical, no spacing</td>
            </tr>
            <tr>
              <td><PartSwatch type="Rail" label="Rail" /></td>
              <td>Fence rails</td>
              <td>{calc.railCuts} rail cuts</td>
              <td className="num">{feet(calc.sectionTotal * settings.fenceRailCount, 2)}</td>
              <td className="num">By lumber order</td>
              <td>Cut to each section length</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CutList({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>#</th><th>Color</th><th>Part</th><th>Qty</th><th>Length</th><th>Width</th><th>Wall</th><th>Stock Needed</th><th>Type</th><th>Notes</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              <td className="num">{row[0]}</td>
              <td><PartSwatch type={row[7]} label={row[7]} /></td>
              <td>{row[1]}</td>
              <td className="num">{row[2]}</td>
              <td className="num">{row[3]}</td>
              <td className="num">{row[4]}</td>
              <td className="num">{row[5]}</td>
              <td>{row[6]}</td>
              <td>{row[7]}</td>
              <td>{row[8]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsPanel({ settings, updateField }) {
  return (
    <div className="settings-panel">
      <div className="settings-grid">
        <section className="settings-card">
          <SectionTitle icon="dollar">Metal Defaults</SectionTitle>
          <div className="form-grid">
            <NumberField id="cwtCost" label="Cost per CWT" value={settings.cwtCost} onChange={updateField} min="0" step="1" full />
            <NumberField id="postWidth" label="Default post width" value={settings.postWidth} onChange={updateField} min="0.5" />
            <ThicknessField id="postThickness" label="Default post wall" value={settings.postThickness} onChange={updateField} />
          </div>
        </section>
        <section className="settings-card">
          <SectionTitle icon="gate">Gate Defaults</SectionTitle>
          <div className="form-grid">
            <NumberField id="postEmbed" label="Post in ground" value={settings.postEmbed} onChange={updateField} min="0" />
            <NumberField id="centerGap" label="Center gap" value={settings.centerGap} onChange={updateField} />
            <NumberField id="postGap" label="Post-to-gate gap" value={settings.postGap} onChange={updateField} />
            <NumberField id="railCount" label="Rails per leaf" value={settings.railCount} onChange={updateField} min="2" max="6" step="1" />
          </div>
        </section>
        <section className="settings-card">
          <SectionTitle icon="fence">Fence Defaults</SectionTitle>
          <div className="form-grid">
            <NumberField id="fencePostEmbed" label="Posts in ground" value={settings.fencePostEmbed} onChange={updateField} min="0" />
            <NumberField id="fenceMaxSectionFeet" label="Max section length" value={settings.fenceMaxSectionFeet} onChange={updateField} min="1" step="0.25" />
            <NumberField id="fenceRailCount" label="Rails per section" value={settings.fenceRailCount} onChange={updateField} min="2" max="4" step="1" />
          </div>
        </section>
        <section className="settings-card">
          <SectionTitle icon="ruler">Shop Assumptions</SectionTitle>
          <SpecList items={[
            ["Steel stock lengths", STOCK_LENGTH_OPTIONS.map((option) => option.label).join(" or ")],
            ["Picket spacing goal", `${PICKET_TARGET_GAP} in minimum clear spacing`],
            ["Fence pickets", "Vertical dog-ear pickets with no gap"],
            ["Saved builds", "Stored in this browser for this app address"]
          ]} />
        </section>
      </div>
    </div>
  );
}

function SavedBuilds({ builds, currentBuildId, onLoad, onDelete, loading, error }) {
  const [search, setSearch] = useState("");
  const filteredBuilds = builds
    .filter((build) => build.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return (
    <div className="saved-builds">
      <div className="saved-head">
        <div>
          <strong>{builds.length} saved {builds.length === 1 ? "build" : "builds"}</strong>
          <span>Load any saved gate or fence back into the calculator.</span>
        </div>
        <label className="saved-search">
          <span>Search</span>
          <input
            type="search"
            value={search}
            placeholder="Find a saved build"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      {loading && <div className="message ok">Loading saved projects...</div>}
      {error && <div className="message bad">{error}</div>}
      {filteredBuilds.length === 0 ? (
        <div className="empty-state">
          {builds.length === 0 ? "No saved builds yet." : "No saved builds match that search."}
        </div>
      ) : (
        <div className="build-list">
          {filteredBuilds.map((build) => {
            const buildSettings = normalizeSettings(build.settings);
            const buildCalc = buildSettings.buildMode === "fence" ? calculateFence(buildSettings) : calculate(buildSettings);
            const isCurrent = build.id === currentBuildId;
            const detail = buildSettings.buildMode === "fence"
              ? `${feet(buildCalc.totalLength, 2)} fence, ${buildCalc.sections.length} sections, ${buildCalc.totalPickets} pickets`
              : buildCalc.doubleGate
                ? `${inch(buildCalc.opening, 2)} opening, left ${inch(buildCalc.leftLeafWidth, 2)}, right ${inch(buildCalc.rightLeafWidth, 2)}, ${buildSettings.leftPicketCount}/${buildSettings.rightPicketCount} pickets`
                : `${inch(buildCalc.opening, 2)} opening, single ${inch(buildCalc.leftLeafWidth, 2)}, ${buildSettings.leftPicketCount} pickets`;
            return (
              <article className={`build-row ${isCurrent ? "active" : ""}`} key={build.id}>
                <div>
                  <strong>{build.name}</strong>
                  <span>{detail}</span>
                  <span>Updated {formatDateTime(build.updatedAt)}</span>
                </div>
                <div className="build-actions">
                  {isCurrent && <span className="current-badge">Open</span>}
                  <button className="btn" type="button" onClick={() => onLoad(build)}>Load</button>
                  <button className="btn danger" type="button" onClick={() => onDelete(build.id)}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeatureRequests({ requests, onAdd, onDelete, onExport, loading, error }) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      await onAdd({ title, details, priority });
      setTitle("");
      setDetails("");
      setPriority("Normal");
      setStatus("Feature request submitted.");
    } catch (requestError) {
      setStatus(requestError.message || "Could not submit feature request.");
    }
    setBusy(false);
  }

  async function remove(id) {
    setBusy(true);
    setStatus("");
    try {
      await onDelete(id);
    } catch (requestError) {
      setStatus(requestError.message || "Could not delete feature request.");
    }
    setBusy(false);
  }

  return (
    <div className="feature-requests">
      <form className="request-form" onSubmit={submit}>
        <div className="saved-head">
          <div>
            <strong>Request a feature</strong>
            <span>Requests are saved in Supabase under your account.</span>
          </div>
          <button className="btn" type="button" onClick={onExport} disabled={requests.length === 0}>Export CSV</button>
        </div>
        <label className="auth-field">
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Short feature name" required />
        </label>
        <label className="auth-field">
          <span>Details</span>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="What should this app do?" rows="4" />
        </label>
        <label className="auth-field">
          <span>Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
          </select>
        </label>
        {status && <div className="auth-status">{status}</div>}
        {error && <div className="message bad">{error}</div>}
        <button className="btn new-build" type="submit" disabled={busy}>{busy ? "Saving..." : "Submit Request"}</button>
      </form>
      <div className="build-list">
        {loading && <div className="message ok">Loading feature requests...</div>}
        {requests.length === 0 && !loading ? (
          <div className="empty-state">No feature requests yet.</div>
        ) : requests.map((request) => (
          <article className="build-row" key={request.id}>
            <div>
              <strong>{request.title}</strong>
              <span>{request.details || "No details provided."}</span>
              <span>{request.priority} priority · {request.status} · {request.buildMode} · {formatDateTime(request.createdAt)}</span>
            </div>
            <div className="build-actions">
              <button className="btn danger" type="button" disabled={busy} onClick={() => remove(request.id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function BuildNotes({ settings, calc }) {
  const openingFormula = calc.doubleGate
    ? `${inch(settings.leftLeafWidth)} left leaf + ${inch(settings.rightLeafWidth)} right leaf + two post-to-gate gaps + center gap = ${inch(calc.opening, 2)}`
    : `${inch(settings.leftLeafWidth)} gate leaf + two post-to-gate gaps = ${inch(calc.opening, 2)}`;
  const picketSpacingNote = calc.doubleGate
    ? `Left ${settings.leftPicketCount} pickets at ${inch(calc.leftPicketGap)} clear spacing. Right ${settings.rightPicketCount} pickets at ${inch(calc.rightPicketGap)} clear spacing.`
    : `${settings.leftPicketCount} pickets at ${inch(calc.leftPicketGap)} clear spacing.`;
  const gateWeightNote = calc.doubleGate
    ? `Left leaf ${pounds(calc.leftGateWeight, 1)}, right leaf ${pounds(calc.rightGateWeight, 1)}, ${pounds(calc.totalGateWeight, 1)} total. Posts and leftover stock are not included.`
    : `Gate leaf ${pounds(calc.leftGateWeight, 1)}. Posts and leftover stock are not included.`;
  const notes = [
    ["Opening formula", openingFormula],
    ["Outside width", `${inch(calc.opening, 2)} opening + two ${inch(settings.postWidth)} posts = ${inch(calc.outside, 2)}`],
    ["Post length", `${inch(settings.postHeight)} above ground + ${inch(settings.postEmbed)} in ground = ${inch(calc.postCutLength)} post cut length.`],
    ["Picket spacing", picketSpacingNote],
    ["Tube thickness", `Posts ${thicknessLabel(settings.postThickness)} wall, frame ${thicknessLabel(settings.frameThickness)} wall, pickets ${thicknessLabel(settings.picketThickness)} wall.`],
    ["Stock choice", calc.stockPlans.map((plan) => `${plan.name}: buy ${plan.best.sticks} x ${plan.best.label}`).join("; ")],
    ["Gate weight", gateWeightNote],
    ["Steel cost", `${pounds(calc.totalMetalWeight, 1)} purchased weight at ${money(settings.cwtCost)} CWT = ${money(calc.metalCost)} estimated metal cost.`],
    ["Rail assumption", `${settings.railCount} horizontal rail cuts per leaf. Horizontal rails fit between vertical frame members.`]
  ];

  return (
    <div className="notes">
      {notes.map(([label, text]) => (
        <div className="note-row" key={label}>
          <strong>{label}</strong>
          <div>{text}</div>
        </div>
      ))}
    </div>
  );
}

function FenceBuildNotes({ settings, calc }) {
  const notes = [
    ["Section layout", `${feet(calc.totalLength, 2)} total fence run minus ${feet(calc.totalGateOpening, 2)} of gate openings leaves ${feet(calc.fenceRunLength, 2)} of fence sections.`],
    ["Even section rule", `${calc.sections.length} section${calc.sections.length === 1 ? "" : "s"} at ${calc.sections.length ? feet(calc.sections[0], 2) : "0 ft"} each, with no section over ${feet(calc.maxSection, 0)}.`],
    ["Posts", `${calc.totalPostCount} posts cut to ${inch(calc.postCutLength, 2)}: ${inch(settings.fenceHeight, 2)} above grade + ${inch(settings.fencePostEmbed, 2)} in ground.`],
    ["Pickets", `${calc.totalPickets} ${settings.fencePicketMaterial} standard dog-ear pickets, ${inchFraction(settings.fencePicketWidth)} wide, vertical, no gap.`],
    ["Rails", `${settings.fenceRailCount} rails per section for ${calc.railCuts} rail cuts total.`],
    ["Post stock", `Buy ${calc.stockPlans[0].best.sticks} x ${calc.stockPlans[0].best.label} for PostMaster metal posts. Estimated post metal cost is ${money(calc.metalCost)}.`]
  ];

  return (
    <div className="notes">
      {notes.map(([label, text]) => (
        <div className="note-row" key={label}>
          <strong>{label}</strong>
          <div>{text}</div>
        </div>
      ))}
    </div>
  );
}
