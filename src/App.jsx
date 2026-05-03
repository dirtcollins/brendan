const { useEffect, useMemo, useState } = React;

const PICKET_TARGET_GAP = 5;
const MAX_PICKET_COUNT = 40;

const DEFAULTS = {
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
  cwtCost: 88
};

const STORAGE_KEY = "gate-fabrication-react-v1";
const BUILDS_STORAGE_KEY = "gate-fabrication-react-saved-builds-v1";
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
  ["postThickness", "frameThickness", "picketThickness"].forEach((key) => {
    const current = Number(normalized[key]);
    const exact = THICKNESS_OPTIONS.find((option) => option.value === current);
    normalized[key] = exact ? exact.value : DEFAULTS[key];
  });
  return normalized;
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
  return {
    ...settings,
    leftPicketCount: getBalancedPicketCount({
      leafWidth: settings.leftLeafWidth,
      frameSize: settings.frameSize,
      picketWidth: settings.picketWidth,
      layoutMode: settings.layoutMode
    }),
    rightPicketCount: getBalancedPicketCount({
      leafWidth: settings.rightLeafWidth,
      frameSize: settings.frameSize,
      picketWidth: settings.picketWidth,
      layoutMode: settings.layoutMode
    })
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
  const leftLeafWidth = settings.leftLeafWidth;
  const rightLeafWidth = settings.rightLeafWidth;
  const opening = leftLeafWidth + rightLeafWidth + (settings.postGap * 2) + settings.centerGap;
  const outside = opening + (settings.postWidth * 2);
  const innerHeight = settings.leafHeight - (settings.frameSize * 2);
  const leftSpaces = settings.layoutMode === "edge" ? Math.max(settings.leftPicketCount - 1, 1) : settings.leftPicketCount + 1;
  const rightSpaces = settings.layoutMode === "edge" ? Math.max(settings.rightPicketCount - 1, 1) : settings.rightPicketCount + 1;
  const leftPicketTotalWidth = settings.leftPicketCount * settings.picketWidth;
  const rightPicketTotalWidth = settings.rightPicketCount * settings.picketWidth;
  const leftInnerWidth = leftLeafWidth - (settings.frameSize * 2);
  const rightInnerWidth = rightLeafWidth - (settings.frameSize * 2);
  const leftPicketGap = (leftInnerWidth - leftPicketTotalWidth) / leftSpaces;
  const rightPicketGap = (rightInnerWidth - rightPicketTotalWidth) / rightSpaces;
  const railInsideLengths = [leftInnerWidth, rightInnerWidth];
  const verticalLength = settings.leafHeight;
  const postCutLength = settings.postHeight + settings.postEmbed;
  const postTube = postCutLength * 2;
  const frameTube = (verticalLength * 4) + (railInsideLengths.reduce((sum, length) => sum + length, 0) * settings.railCount);
  const picketTube = innerHeight * (settings.leftPicketCount + settings.rightPicketCount);
  const wasteMultiplier = 1 + (settings.waste / 100);
  const stockPlans = [
    stockPlan("Posts", settings.postWidth, settings.postThickness, [
      { length: postCutLength, qty: 2 }
    ]),
    stockPlan("Frame tube", settings.frameSize, settings.frameThickness, [
      { length: verticalLength, qty: 4 },
      { length: leftInnerWidth, qty: settings.railCount },
      { length: rightInnerWidth, qty: settings.railCount }
    ]),
    stockPlan("Picket tube", settings.picketWidth, settings.picketThickness, [
      { length: innerHeight, qty: settings.leftPicketCount + settings.rightPicketCount }
    ])
  ];
  const postWeight = squareTubeWeight(postTube, settings.postWidth, settings.postThickness);
  const leftFrameWeight = squareTubeWeight((verticalLength * 2) + (leftInnerWidth * settings.railCount), settings.frameSize, settings.frameThickness);
  const rightFrameWeight = squareTubeWeight((verticalLength * 2) + (rightInnerWidth * settings.railCount), settings.frameSize, settings.frameThickness);
  const leftPicketWeight = squareTubeWeight(innerHeight * settings.leftPicketCount, settings.picketWidth, settings.picketThickness);
  const rightPicketWeight = squareTubeWeight(innerHeight * settings.rightPicketCount, settings.picketWidth, settings.picketThickness);
  const leftGateWeight = leftFrameWeight + leftPicketWeight;
  const rightGateWeight = rightFrameWeight + rightPicketWeight;
  const gateFrameWeight = squareTubeWeight(frameTube, settings.frameSize, settings.frameThickness);
  const gatePicketWeight = squareTubeWeight(picketTube, settings.picketWidth, settings.picketThickness);
  const totalGateWeight = gateFrameWeight + gatePicketWeight;
  const gateLeafWeight = totalGateWeight / 2;
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
    totalPickets: settings.leftPicketCount + settings.rightPicketCount
  };
}

function getMessages(settings, calc) {
  const messages = [];
  if (settings.leafHeight >= settings.postHeight) {
    messages.push({ type: "warn", text: "Gate height is equal to or taller than the posts." });
  }
  if (calc.leftInnerWidth <= 0 || calc.rightInnerWidth <= 0 || calc.innerHeight <= 0) {
    messages.push({ type: "bad", text: "Frame size leaves no usable interior space." });
  }
  if (settings.postThickness * 2 >= settings.postWidth || settings.frameThickness * 2 >= settings.frameSize || settings.picketThickness * 2 >= settings.picketWidth) {
    messages.push({ type: "bad", text: "One tube wall thickness is too large for its outside size." });
  }
  if (calc.leftPicketGap < 0 || calc.rightPicketGap < 0) {
    messages.push({ type: "bad", text: "Pickets are too wide or too many for this gate width." });
  } else if (calc.leftPicketGap < PICKET_TARGET_GAP || calc.rightPicketGap < PICKET_TARGET_GAP) {
    messages.push({ type: "warn", text: `Picket gap is under the 5" goal. Left ${inch(calc.leftPicketGap)}, right ${inch(calc.rightPicketGap)}.` });
  } else if (calc.leftPicketGap > 6.5 || calc.rightPicketGap > 6.5) {
    messages.push({ type: "warn", text: `Picket gap is wide. Left ${inch(calc.leftPicketGap)}, right ${inch(calc.rightPicketGap)}.` });
  }
  return messages.length ? messages : [{ type: "ok", text: "Layout looks buildable with the current assumptions." }];
}

function getMaterialRows(settings, calc) {
  const sameLeafWidths = Number(settings.leftLeafWidth) === Number(settings.rightLeafWidth);
  const samePicketSpacing = fmt(calc.leftPicketGap, 3) === fmt(calc.rightPicketGap, 3);
  const rows = [
    ["Posts", 2, tubeSpec(settings.postWidth, settings.postThickness), inch(calc.postCutLength), thicknessLabel(settings.postThickness), `${inch(settings.postHeight)} above grade + ${inch(settings.postEmbed)} embed`],
    ["Frame verticals", 4, tubeSpec(settings.frameSize, settings.frameThickness), inch(calc.verticalLength), thicknessLabel(settings.frameThickness), "Two per leaf"]
  ];

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

function getCutRows(settings, calc) {
  const stockByName = Object.fromEntries(calc.stockPlans.map((plan) => [plan.name, `${plan.best.sticks} x ${plan.best.label}`]));
  const sameLeafWidths = Number(settings.leftLeafWidth) === Number(settings.rightLeafWidth);
  const samePicketSpacing = fmt(calc.leftPicketGap, 3) === fmt(calc.rightPicketGap, 3);
  const rows = [
    ["1", "Post", 2, inch(calc.postCutLength), inch(settings.postWidth), thicknessLabel(settings.postThickness), stockByName.Posts, "Post", `${inch(settings.postHeight)} above grade + ${inch(settings.postEmbed)} embed`],
    ["2", "Gate frame vertical", 4, inch(calc.verticalLength), inch(settings.frameSize), thicknessLabel(settings.frameThickness), stockByName["Frame tube"], "Frame", "Miter or butt joint per shop standard"]
  ];

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

function useSavedBuilds() {
  const [builds, setBuilds] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(BUILDS_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeBuild) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(BUILDS_STORAGE_KEY, JSON.stringify(builds));
  }, [builds]);

  return [builds, setBuilds];
}

function useSavedSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      return normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return [settings, setSettings];
}

function App() {
  const [settings, setSettings] = useSavedSettings();
  const [savedBuilds, setSavedBuilds] = useSavedBuilds();
  const [currentBuildId, setCurrentBuildId] = useState("");
  const [buildName, setBuildName] = useState("");
  const [activeTab, setActiveTab] = useState("materials");
  const calc = useMemo(() => calculate(settings), [settings]);
  const messages = useMemo(() => getMessages(settings, calc), [settings, calc]);
  const materialRows = useMemo(() => getMaterialRows(settings, calc), [settings, calc]);
  const cutRows = useMemo(() => getCutRows(settings, calc), [settings, calc]);

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
      const wholeFields = new Set(["leftPicketCount", "rightPicketCount", "railCount"]);
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

  function saveBuild() {
    const now = new Date().toISOString();
    const cleanName = buildName.trim() || `Gate Build ${savedBuilds.length + 1}`;
    if (currentBuildId && savedBuilds.some((build) => build.id === currentBuildId)) {
      setSavedBuilds((current) => current.map((build) => (
        build.id === currentBuildId
          ? { ...build, name: cleanName, settings: normalizeSettings(settings), updatedAt: now }
          : build
      )));
      setBuildName(cleanName);
      return;
    }

    const id = makeBuildId();
    setSavedBuilds((current) => [
      { id, name: cleanName, settings: normalizeSettings(settings), createdAt: now, updatedAt: now },
      ...current
    ]);
    setCurrentBuildId(id);
    setBuildName(cleanName);
  }

  function saveBuildAsNew() {
    const now = new Date().toISOString();
    const cleanName = buildName.trim() || `Gate Build ${savedBuilds.length + 1}`;
    const id = makeBuildId();
    setSavedBuilds((current) => [
      { id, name: cleanName, settings: normalizeSettings(settings), createdAt: now, updatedAt: now },
      ...current
    ]);
    setCurrentBuildId(id);
    setBuildName(cleanName);
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

  function deleteBuild(id) {
    setSavedBuilds((current) => current.filter((build) => build.id !== id));
    if (id === currentBuildId) {
      setCurrentBuildId("");
      setBuildName("");
    }
  }

  function exportMaterials() {
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
      ["Left gate weight", 1, pounds(calc.leftGateWeight, 1), "", "", `${pounds(calc.rightGateWeight, 1)} right gate; posts excluded`],
      ["Total steel weight to buy", "", pounds(calc.totalMetalWeight, 1), "", "", `${feet(calc.purchasedLength, 2)} purchased, ${feet(calc.stockWaste, 2)} leftover`],
      ["Estimated metal cost", "", money(calc.metalCost), "", "", `${money(settings.cwtCost)} per CWT`]
    ]);
  }

  function exportCuts() {
    downloadCSV("gate-cut-list.csv", [["#", "Part", "Qty", "Length", "Width", "Wall Thickness", "Stock Needed", "Type", "Notes"], ...cutRows]);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="mark">
            <img src="./src/assets/gate-logo.jpg" alt="" aria-hidden="true" />
          </div>
          <div>
            <h1>Gate Fabrication App</h1>
            <div className="subtitle">Double-swing gate calculator, layout, material takeoff, and cut list</div>
          </div>
        </div>
        <div className="actions">
          <label className="build-name-field">
            <span>Build name</span>
            <input
              type="text"
              value={buildName}
              placeholder="Customer or gate name"
              onChange={(event) => setBuildName(event.target.value)}
            />
          </label>
          <button className="btn primary" onClick={saveBuild}>Save Build</button>
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
          <button className="btn" onClick={saveBuildAsNew}>Save As New</button>
          <button className="btn" onClick={reset}>Reset</button>
          <button className="btn" onClick={exportMaterials}>Materials CSV</button>
          <button className="btn" onClick={exportCuts}>Cut List CSV</button>
          <button className="btn" onClick={() => window.print()}>Print</button>
        </div>
      </header>

      <Summary settings={settings} calc={calc} />

      <div className="workspace">
        <Controls settings={settings} updateField={updateField} setSettings={setSettings} messages={messages} />
        <main className="main">
          <Drawing settings={settings} calc={calc} />
          <section className="panel">
            <div className="tabs" role="tablist">
              {[
                ["materials", "Materials"],
                ["purchase", "Purchase"],
                ["cutlist", "Cut List"],
                ["notes", "Build Notes"],
                ["saved", "Saved Builds"]
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
            <div className="panel-body">
              {activeTab === "materials" && <Materials settings={settings} calc={calc} rows={materialRows} />}
              {activeTab === "purchase" && <Purchase settings={settings} calc={calc} />}
              {activeTab === "cutlist" && <CutList rows={cutRows} />}
              {activeTab === "saved" && (
                <SavedBuilds
                  builds={savedBuilds}
                  currentBuildId={currentBuildId}
                  onLoad={loadBuild}
                  onDelete={deleteBuild}
                />
              )}
              {activeTab === "notes" && <BuildNotes settings={settings} calc={calc} />}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Summary({ settings, calc }) {
  return (
    <section className="summary" aria-label="Gate summary">
      <Metric label="Total Outside" value={inch(calc.outside, 2)} />
      <Metric label="Post Opening" value={inch(calc.opening, 2)} />
      <Metric label="Left Width" value={inch(settings.leftLeafWidth, 2)} />
      <Metric label="Right Width" value={inch(settings.rightLeafWidth, 2)} />
      <Metric label="Picket Gaps" value={calc.picketGap >= 0 ? `${inch(calc.leftPicketGap, 2)} / ${inch(calc.rightPicketGap, 2)}` : "ERR"} />
      <Metric label="Total Pickets" value={calc.totalPickets} />
      <Metric label="Frame Tube" value={feet(calc.frameTubeWithWaste, 2)} />
      <Metric label="Left Gate" value={pounds(calc.leftGateWeight, 1)} />
      <Metric label="Right Gate" value={pounds(calc.rightGateWeight, 1)} />
      <Metric label="Both Gates" value={pounds(calc.totalGateWeight, 1)} />
      <Metric label="Buy Weight" value={pounds(calc.totalMetalWeight, 1)} />
      <Metric label="Metal Cost" value={money(calc.metalCost)} />
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
        <h2 className="section-title">Opening</h2>
        <div className="form-grid">
          <NumberField id="postWidth" label="Post width" value={settings.postWidth} onChange={updateField} />
          <ThicknessField id="postThickness" label="Post wall thickness" value={settings.postThickness} onChange={updateField} />
          <NumberField id="postHeight" label="Post above ground" value={settings.postHeight} onChange={updateField} min="1" />
          <NumberField id="postEmbed" label="Post in ground" value={settings.postEmbed} onChange={updateField} min="0" />
          <NumberField id="leftLeafWidth" label="Left gate width" value={settings.leftLeafWidth} onChange={updateField} min="1" />
          <NumberField id="rightLeafWidth" label="Right gate width" value={settings.rightLeafWidth} onChange={updateField} min="1" disabled={settings.sameLeafWidth} />
          <label className="check-field full" htmlFor="sameLeafWidth">
            <input
              id="sameLeafWidth"
              type="checkbox"
              checked={settings.sameLeafWidth}
              onChange={(event) => toggleSameLeafWidth(event.target.checked)}
            />
            <span>Both gates are the same width</span>
          </label>
          <NumberField id="leafHeight" label="Gate leaf height" value={settings.leafHeight} onChange={updateField} min="1" />
          <NumberField id="postGap" label="Post-to-gate gap" value={settings.postGap} onChange={updateField} />
          <NumberField id="centerGap" label="Center gap" value={settings.centerGap} onChange={updateField} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Frame & Pickets</h2>
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
          <div className="field">
            <label htmlFor="leftPicketCount">Left pickets</label>
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
          <div className="field">
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
          </div>
          <button className="btn field full" type="button" onClick={balancePicketSpacing}>Balance spacing</button>
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
        <h2 className="section-title">Waste</h2>
        <div className="form-grid">
          <NumberField id="waste" label="Waste allowance" value={settings.waste} onChange={updateField} max="50" step="1" full />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Steel Cost</h2>
        <div className="form-grid">
          <NumberField id="cwtCost" label="Cost per CWT" value={settings.cwtCost} onChange={updateField} min="0" step="1" full />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Results</h2>
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
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={id}>{label}</label>
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
    </div>
  );
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

function Drawing({ settings, calc }) {
  const [zoom, setZoom] = useState(100);
  const pad = 72;
  const maxW = 1152;
  const maxH = 396;
  const scale = Math.min(maxW / calc.outside, maxH / Math.max(settings.postHeight, settings.leafHeight));
  const postTop = pad;
  const gateTop = postTop;
  const postW = settings.postWidth * scale;
  const postH = settings.postHeight * scale;
  const leftLeafW = settings.leftLeafWidth * scale;
  const rightLeafW = settings.rightLeafWidth * scale;
  const leafH = settings.leafHeight * scale;
  const postBottom = postTop + postH;
  const gateBottom = gateTop + leafH;
  const drawingBottom = postTop + Math.max(settings.postHeight, settings.leafHeight) * scale;
  const frame = settings.frameSize * scale;
  const postGap = settings.postGap * scale;
  const centerGap = settings.centerGap * scale;
  const picketW = settings.picketWidth * scale;
  const leftPicketGap = Math.max(calc.leftPicketGap * scale, 0);
  const rightPicketGap = Math.max(calc.rightPicketGap * scale, 0);
  let x = pad;
  const leftPostX = x;
  x += postW + postGap;
  const firstGateX = x;
  x += leftLeafW + centerGap;
  const secondGateX = x;
  x += rightLeafW + postGap;
  const rightPostX = x;
  const adjustZoom = (amount) => setZoom((value) => Math.max(60, Math.min(220, value + amount)));
  const resetZoom = () => setZoom(100);

  return (
    <section className="stage">
      <div className="stage-head">
        <div>
          <h2 className="stage-title">Fabrication Drawing</h2>
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
            max="220"
            step="5"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
          <button className="zoom-step" type="button" onClick={() => adjustZoom(5)} aria-label="Zoom in 5 percent">+5</button>
          <button className="zoom-value" type="button" onClick={resetZoom} aria-label="Reset zoom">{zoom}%</button>
        </div>
      </div>
      <div className="drawing-scroll">
        <svg
          viewBox="0 0 1100 640"
          role="img"
          aria-label="Scaled double gate drawing"
          style={{ width: `${zoom}%`, minWidth: `${760 * (zoom / 100)}px` }}
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
          <GapBand
            x1={firstGateX + leftLeafW}
            x2={secondGateX}
            y1={gateTop}
            y2={gateBottom}
            label="Center gap"
            value={inch(settings.centerGap, 2)}
            center
          />
          <GapBand
            x1={secondGateX + rightLeafW}
            x2={rightPostX}
            y1={gateTop}
            y2={gateBottom}
            label="Post gap"
            value={inch(settings.postGap, 2)}
            side="right"
          />
          <Gate x={firstGateX} label="Left leaf" leafWidth={settings.leftLeafWidth} picketCount={settings.leftPicketCount} settings={settings} scale={scale} gateTop={gateTop} baseY={gateBottom} frame={frame} picketW={picketW} picketGap={leftPicketGap} />
          <Gate x={secondGateX} label="Right leaf" leafWidth={settings.rightLeafWidth} picketCount={settings.rightPicketCount} settings={settings} scale={scale} gateTop={gateTop} baseY={gateBottom} frame={frame} picketW={picketW} picketGap={rightPicketGap} />
          <line x1={pad} y1={drawingBottom + 44} x2={pad + calc.outside * scale} y2={drawingBottom + 44} stroke="var(--line-strong)" />
          <DimText x={pad + (calc.outside * scale) / 2} y={drawingBottom + 62}>Outside {inch(calc.outside, 2)}</DimText>
          <line x1={pad + postW} y1={drawingBottom + 80} x2={pad + postW + calc.opening * scale} y2={drawingBottom + 80} stroke="var(--line-strong)" />
          <DimText x={pad + postW + (calc.opening * scale) / 2} y={drawingBottom + 98}>Post opening {inch(calc.opening, 2)}</DimText>
          <DimText x={pad + calc.outside * scale} y={drawingBottom + 124}>Scale: 1" = {fmt(scale, 2)} px</DimText>
        </svg>
      </div>
    </section>
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
      <DimText x={x + leafW / 2} y={baseY + 24}>{label} {inch(leafWidth, 2)}</DimText>
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
  return "metal";
}

function PartSwatch({ type, label }) {
  const key = partColorKey(type);
  return (
    <span className={`part-swatch part-swatch-${key}`} aria-label={label || type} title={label || type} />
  );
}

function Materials({ settings, calc, rows }) {
  return (
    <div className="cards">
      {rows.map((row) => (
        <article className={`item-card item-card-${partColorKey(row[0])}`} key={row[0]}>
          <strong>{row[1]}</strong>
          <span className="item-label"><PartSwatch type={row[0]} />{row[0]}</span>
          <p>{row[2]} {row[3] ? `at ${row[3]}` : ""}</p>
          <p>{row[4] ? `${row[4]} wall` : row[5]}</p>
          {row[4] && <p>{row[5]}</p>}
        </article>
      ))}
      <article className="item-card">
        <strong>{feet(calc.frameTubeWithWaste, 2)}</strong>
        <span>Frame tube w/ waste</span>
        <p>{feet(calc.frameTube, 2)} raw length before allowance</p>
      </article>
      <article className="item-card">
        <strong>{feet(calc.picketTubeWithWaste, 2)}</strong>
        <span>Picket stock w/ waste</span>
        <p>{feet(calc.picketTube, 2)} raw length before allowance</p>
      </article>
      <article className="item-card item-card-frame">
        <strong>{pounds(calc.totalGateWeight, 1)}</strong>
        <span className="item-label"><PartSwatch type="Frame" />Gate weights</span>
        <p>Left {pounds(calc.leftGateWeight, 1)}, right {pounds(calc.rightGateWeight, 1)}</p>
        <p>Frame {pounds(calc.gateFrameWeight, 1)}, pickets {pounds(calc.gatePicketWeight, 1)}</p>
      </article>
      <article className="item-card">
        <strong>{pounds(calc.totalMetalWeight, 1)}</strong>
        <span>Steel weight to buy</span>
        <p>{feet(calc.purchasedLength, 2)} purchased, {feet(calc.stockWaste, 2)} leftover</p>
      </article>
      <article className="item-card">
        <strong>{money(calc.metalCost)}</strong>
        <span>Estimated metal cost</span>
        <p>Full sticks calculated at {money(settings.cwtCost)} per CWT</p>
      </article>
    </div>
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

function SavedBuilds({ builds, currentBuildId, onLoad, onDelete }) {
  const [search, setSearch] = useState("");
  const filteredBuilds = builds
    .filter((build) => build.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return (
    <div className="saved-builds">
      <div className="saved-head">
        <div>
          <strong>{builds.length} saved {builds.length === 1 ? "build" : "builds"}</strong>
          <span>Load any gate back into the calculator.</span>
        </div>
        <label className="saved-search">
          <span>Search</span>
          <input
            type="search"
            value={search}
            placeholder="Find a saved gate"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      {filteredBuilds.length === 0 ? (
        <div className="empty-state">
          {builds.length === 0 ? "No saved gate builds yet." : "No saved builds match that search."}
        </div>
      ) : (
        <div className="build-list">
          {filteredBuilds.map((build) => {
            const buildCalc = calculate(build.settings);
            const isCurrent = build.id === currentBuildId;
            return (
              <article className={`build-row ${isCurrent ? "active" : ""}`} key={build.id}>
                <div>
                  <strong>{build.name}</strong>
                  <span>
                    {inch(buildCalc.opening, 2)} opening, left {inch(buildCalc.leftLeafWidth, 2)}, right {inch(buildCalc.rightLeafWidth, 2)},
                    {" "}{build.settings.leftPicketCount}/{build.settings.rightPicketCount} pickets
                  </span>
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

function BuildNotes({ settings, calc }) {
  const notes = [
    ["Opening formula", `${inch(settings.leftLeafWidth)} left leaf + ${inch(settings.rightLeafWidth)} right leaf + two post-to-gate gaps + center gap = ${inch(calc.opening, 2)}`],
    ["Outside width", `${inch(calc.opening, 2)} opening + two ${inch(settings.postWidth)} posts = ${inch(calc.outside, 2)}`],
    ["Post length", `${inch(settings.postHeight)} above ground + ${inch(settings.postEmbed)} in ground = ${inch(calc.postCutLength)} post cut length.`],
    ["Picket spacing", `Left ${settings.leftPicketCount} pickets at ${inch(calc.leftPicketGap)} clear spacing. Right ${settings.rightPicketCount} pickets at ${inch(calc.rightPicketGap)} clear spacing.`],
    ["Tube thickness", `Posts ${thicknessLabel(settings.postThickness)} wall, frame ${thicknessLabel(settings.frameThickness)} wall, pickets ${thicknessLabel(settings.picketThickness)} wall.`],
    ["Stock choice", calc.stockPlans.map((plan) => `${plan.name}: buy ${plan.best.sticks} x ${plan.best.label}`).join("; ")],
    ["Gate weight", `Left leaf ${pounds(calc.leftGateWeight, 1)}, right leaf ${pounds(calc.rightGateWeight, 1)}, ${pounds(calc.totalGateWeight, 1)} total. Posts and leftover stock are not included.`],
    ["Steel cost", `${pounds(calc.totalMetalWeight, 1)} purchased weight at ${money(settings.cwtCost)} CWT = ${money(calc.metalCost)} estimated metal cost.`],
    ["Rail assumption", `${settings.railCount} horizontal rail cuts per leaf. Horizontal rails fit between vertical frame members.`],
    ["Waste allowance", `${fmt(settings.waste, 0)}% added to frame and picket stock totals.`]
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
