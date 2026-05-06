function archTopYAtRatio(gateTop, scale, settings, side, ratio, leafWidth) {
  return gateTop - (getArchExtraAtRatio(ratio, side, settings, leafWidth) * scale);
}

function archTopPath(x, leafW, gateTop, scale, settings, side, offset = 0) {
  const segments = 24;
  return Array.from({ length: segments + 1 }, (_, index) => {
    const ratio = index / segments;
    const px = x + leafW * ratio;
    const py = gateTop + offset - (getArchExtraAtRatio(ratio, side, settings, leafW / scale) * scale);
    return `${index === 0 ? "M" : "L"} ${px} ${py}`;
  }).join(" ");
}

function Drawing({ settings, calc, zoom, setZoom, viewMode, setViewMode, previewPosition, setPreviewPosition }) {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const { previewRef, previewPositionEvents } = usePersistentPreview([
    calc.outside,
    settings.postHeight,
    settings.leafHeight,
    settings.gateTopStyle,
    settings.archRise,
    settings.leftLeafWidth,
    settings.rightLeafWidth
  ], previewPosition, setPreviewPosition);
  const previewNavigation = usePreviewNavigation(previewRef, setZoom, 60, 300);
  const pad = 72;
  const maxW = 1152;
  const maxH = 396;
  const postTotalHeight = settings.postHeight + settings.postEmbed;
  const aboveGradeHeight = Math.max(settings.postHeight, calc.gateVisualHeight);
  const drawingHeight = aboveGradeHeight + settings.postEmbed;
  const scale = Math.min(maxW / calc.outside, maxH / drawingHeight);
  const postW = settings.postWidth * scale;
  const postH = settings.postHeight * scale;
  const postTotalH = postTotalHeight * scale;
  const leftLeafW = settings.leftLeafWidth * scale;
  const rightLeafW = calc.rightLeafWidth * scale;
  const leafH = settings.leafHeight * scale;
  const groundY = pad + aboveGradeHeight * scale;
  const postTop = groundY - postH;
  const gateTop = groundY - leafH;
  const gatePeakTop = gateTop - calc.archRise * scale;
  const postBottom = postTop + postH;
  const gateBottom = groundY;
  const drawingBottom = groundY + settings.postEmbed * scale;
  const frame = settings.frameSize * scale;
  const leftPostGap = calc.leftPostGap * scale;
  const rightPostGap = calc.rightPostGap * scale;
  const centerGap = calc.centerGap * scale;
  const picketW = settings.picketWidth * scale;
  const leftPicketGap = Math.max(calc.leftPicketGap * scale, 0);
  const rightPicketGap = Math.max(calc.rightPicketGap * scale, 0);
  let x = pad;
  const leftPostX = x;
  x += postW + leftPostGap;
  const firstGateX = x;
  x += leftLeafW;
  if (calc.doubleGate) x += centerGap;
  const secondGateX = x;
  if (calc.doubleGate) x += rightLeafW;
  x += rightPostGap;
  const rightPostX = x;
  const svgW = Math.max(1100, pad * 2 + calc.outside * scale);
  const svgH = Math.max(640, drawingBottom + 128);
  const adjustZoom = (amount) => setZoom((value) => Math.max(60, Math.min(300, value + amount)));
  const resetZoom = () => setZoom(100);

  return (
    <section className={`stage gate-stage ${isPreviewExpanded ? "preview-expanded" : ""}`}>
      <div className="stage-head">
        <div className="preview-title-group">
          <h2 className="stage-title">Live Preview</h2>
        </div>
        <div className="preview-actions">
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
          <PreviewModeControl value={viewMode} onChange={setViewMode} />
          <button
            className="preview-window-toggle"
            type="button"
            aria-pressed={isPreviewExpanded}
            onClick={() => setIsPreviewExpanded((value) => !value)}
          >
            {isPreviewExpanded ? "Exit" : "Full Window"}
          </button>
        </div>
      </div>
      <div className="drawing-scroll" ref={previewRef} {...previewPositionEvents} {...previewNavigation}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          role="img"
          aria-label="Scaled double gate drawing"
          style={{ width: `${zoom}%`, minWidth: `${760 * (zoom / 100)}px`, margin: "auto" }}
        >
          {viewMode === "plans" ? (
            <GateConstructionPlans
              settings={settings}
              calc={calc}
              scale={scale}
              pad={pad}
              postTop={postTop}
              gateTop={gateTop}
              gateBottom={gateBottom}
              drawingBottom={drawingBottom}
              postW={postW}
              postH={postH}
              postTotalH={postTotalH}
              leftPostX={leftPostX}
              rightPostX={rightPostX}
              firstGateX={firstGateX}
              secondGateX={secondGateX}
              leftLeafW={leftLeafW}
              rightLeafW={rightLeafW}
              frame={frame}
              picketW={picketW}
              leftPicketGap={leftPicketGap}
              rightPicketGap={rightPicketGap}
            />
          ) : viewMode === "top" ? (
            <GateTopDown
              settings={settings}
              calc={calc}
              scale={scale}
              pad={pad}
              svgW={svgW}
              postW={postW}
              leftPostX={leftPostX}
              rightPostX={rightPostX}
              firstGateX={firstGateX}
              secondGateX={secondGateX}
              leftLeafW={leftLeafW}
              rightLeafW={rightLeafW}
            />
          ) : viewMode === "3d" ? (
            <GatePerspective
              settings={settings}
              calc={calc}
              scale={scale}
              pad={pad}
              postTop={postTop}
              gateTop={gateTop}
              gateBottom={gateBottom}
              drawingBottom={drawingBottom}
              postW={postW}
              postH={postH}
              postTotalH={postTotalH}
              leftPostX={leftPostX}
              rightPostX={rightPostX}
              firstGateX={firstGateX}
              secondGateX={secondGateX}
              leftLeafW={leftLeafW}
              rightLeafW={rightLeafW}
              frame={frame}
              picketW={picketW}
              leftPicketGap={leftPicketGap}
              rightPicketGap={rightPicketGap}
            />
          ) : (
            <>
          <rect x={leftPostX} y={postTop} width={postW} height={postH} fill="var(--post)" rx="2" />
          <rect x={rightPostX} y={postTop} width={postW} height={postH} fill="var(--post)" rx="2" />
          <line x1={pad - 36} y1={groundY} x2={rightPostX + postW + 36} y2={groundY} stroke="var(--line)" strokeWidth="1.5" />
          <VerticalPlanDimension
            x={leftPostX - 44}
            y1={postTop}
            y2={groundY}
            label={`POST HEIGHT ${inch(settings.postHeight)}`}
          />
          <VerticalPlanDimension
            x={leftPostX - 18}
            y1={gateTop}
            y2={gateBottom}
            label={`GATE HEIGHT ${inch(settings.leafHeight)}`}
          />
          <GapBand
            x1={leftPostX + postW}
            x2={firstGateX}
            y1={gateTop}
            y2={gateBottom}
            label={calc.doubleGate ? "Post gap" : settings.hingePostSide === "left" ? "Hinge gap" : "Latch gap"}
            value={inch(calc.leftPostGap, 2)}
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
            label={calc.doubleGate ? "Post gap" : settings.hingePostSide === "right" ? "Hinge gap" : "Latch gap"}
            value={inch(calc.rightPostGap, 2)}
            side="right"
          />
          <Gate x={firstGateX} label={calc.doubleGate ? "Left leaf" : "Gate"} leafWidth={settings.leftLeafWidth} picketCount={settings.leftPicketCount} settings={settings} scale={scale} gateTop={gateTop} baseY={gateBottom} frame={frame} picketW={picketW} picketGap={leftPicketGap} side={calc.doubleGate ? "left" : "single"} />
          {calc.doubleGate && <Gate x={secondGateX} label="Right leaf" leafWidth={settings.rightLeafWidth} picketCount={settings.rightPicketCount} settings={settings} scale={scale} gateTop={gateTop} baseY={gateBottom} frame={frame} picketW={picketW} picketGap={rightPicketGap} side="right" />}
          <GapLabelsTop
            gateTop={gateTop}
            gatePeakTop={gatePeakTop}
            leftPostX={leftPostX}
            postW={postW}
            firstGateX={firstGateX}
            secondGateX={secondGateX}
            leftLeafW={leftLeafW}
            rightLeafW={rightLeafW}
            rightPostX={rightPostX}
            calc={calc}
            settings={settings}
          />
          <HorizontalDimension x1={pad} x2={pad + calc.outside * scale} y={gateBottom + 64} label={`OUTSIDE ${inch(calc.outside)}`} />
          <HorizontalDimension x1={pad + postW} x2={pad + postW + calc.opening * scale} y={gateBottom + 104} label={`POST OPENING ${inch(calc.opening)}`} />
            </>
          )}
        </svg>
      </div>
      <div className="legend preview-legend">
        <LegendItem color="var(--post)" label="Posts" />
        <LegendItem color="var(--frame)" label="Outer frame" />
        <LegendItem color="var(--rail)" label="Rails" />
        <LegendItem color="var(--picket)" label="Pickets" />
      </div>
    </section>
  );
}

function FenceDrawing({ settings, calc, setSettings, zoom, setZoom, viewMode, setViewMode, previewPosition, setPreviewPosition }) {
  const [draggingGate, setDraggingGate] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
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
  const fencePostTotalH = (settings.fenceHeight + settings.fencePostEmbed) * scale;
  const svgW = maxW + pad * 2;
  const svgH = Math.max(360, fenceTop + fencePostTotalH + 132);
  const adjustZoom = (amount) => setZoom((value) => Math.max(40, Math.min(300, value + amount)));
  const resetZoom = () => setZoom(100);
  const segments = [];
  let sectionNumber = 1;
  let leftX = pad;
  const explicitGateOpenings = Math.max(0, Math.round(Number(settings.fenceGateCount) || 0));
  const hasIntentionalGate = calc.gateCount > 0 && (Boolean(settings.fenceGateBuildId) || explicitGateOpenings > 0);
  const sectionSource = hasIntentionalGate && settings.fenceSectionMode !== "manual"
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
    if (!svgRef.current || !hasIntentionalGate) return;
    event.stopPropagation();
    const gateStart = Math.max(0, Math.min(getPointerFenceInches(event) - gateDragOffsetRef.current, calc.maxGateStart));
    setSettings((current) => ({ ...current, fenceGateStartFeet: Number((gateStart / 12).toFixed(2)) }));
  }

  function startGateDrag(event) {
    const dragTarget = event.target.closest?.("[data-gate-drag-target='true']");
    if (!hasIntentionalGate || !dragTarget) return;
    event.preventDefault();
    event.stopPropagation();
    setDraggingGate(true);
    gateDragOffsetRef.current = getPointerFenceInches(event) - calc.gateStart;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveGateDrag(event) {
    if (!draggingGate || !hasIntentionalGate) return;
    updateGateFromPointer(event);
  }

  function endGateDrag(event) {
    if (!draggingGate) return;
    setDraggingGate(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section className={`stage fence-stage ${isPreviewExpanded ? "preview-expanded" : ""}`}>
      <div className="stage-head">
        <div className="preview-title-group">
          <h2 className="stage-title">Live Preview</h2>
        </div>
        <div className="preview-actions">
          <div className="zoom-controls" aria-label="Preview zoom controls">
            <label htmlFor="fencePreviewZoom">Zoom</label>
            <button className="zoom-step" type="button" onClick={() => adjustZoom(-5)} aria-label="Zoom out 5 percent">-5</button>
            <input id="fencePreviewZoom" type="range" min="40" max="300" step="5" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            <button className="zoom-step" type="button" onClick={() => adjustZoom(5)} aria-label="Zoom in 5 percent">+5</button>
            <button className="zoom-value" type="button" onClick={resetZoom} aria-label="Reset zoom">{zoom}%</button>
          </div>
          <PreviewModeControl value={viewMode} onChange={setViewMode} />
          <button
            className="preview-window-toggle"
            type="button"
            aria-pressed={isPreviewExpanded}
            onClick={() => setIsPreviewExpanded((value) => !value)}
          >
            {isPreviewExpanded ? "Exit" : "Full Window"}
          </button>
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
          {viewMode === "plans" ? (
            <FenceConstructionPlans
              settings={settings}
              calc={calc}
              segments={segments}
              pad={pad}
              scale={scale}
              svgW={svgW}
              fenceTop={fenceTop}
              fenceHeight={fenceHeight}
              postW={postW}
              picketW={picketW}
              railH={railH}
              onPointerDown={startGateDrag}
              dragging={draggingGate}
            />
          ) : viewMode === "top" ? (
            <FenceTopDown
              settings={settings}
              calc={calc}
              segments={segments}
              pad={pad}
              scale={scale}
              svgW={svgW}
              svgH={svgH}
              postW={postW}
              onPointerDown={startGateDrag}
              dragging={draggingGate}
            />
          ) : viewMode === "3d" ? (
            <FencePerspective
              settings={settings}
              calc={calc}
              segments={segments}
              pad={pad}
              scale={scale}
              fenceTop={fenceTop}
              fenceHeight={fenceHeight}
              postW={postW}
              picketW={picketW}
              railH={railH}
              onPointerDown={startGateDrag}
              dragging={draggingGate}
            />
          ) : (
            <>
          <rect x={0} y={fenceTop + fenceHeight} width={svgW} height={28} fill="#e8ecef" />
          {segments
            .filter((segment) => segment.type === "section")
            .map((segment) => (
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
            ))}
          <rect x={pad - postW / 2} y={fenceTop} width={postW} height={fenceHeight} fill="var(--post)" rx="2" />
          {segments
            .filter((segment) => segment.type === "section")
            .map((segment) => (
              <rect key={`post-${segment.index}`} x={segment.x + segment.width - postW / 2} y={fenceTop} width={postW} height={fenceHeight} fill="var(--post)" rx="2" />
            ))}
          {segments
            .filter((segment) => segment.type === "gate")
            .filter(() => !calc.linkedGateCalc)
            .map((segment) => (
              <g key={`gateposts-${segment.index}`}>
                <rect x={segment.x - postW / 2} y={fenceTop} width={postW} height={fenceHeight} fill="var(--post)" rx="2" />
                <rect x={segment.x + segment.width - postW / 2} y={fenceTop} width={postW} height={fenceHeight} fill="var(--post)" rx="2" />
              </g>
            ))}
          {segments
            .filter((segment) => segment.type === "gate")
            .map((segment) => (
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
            ))}
          <VerticalPlanDimension x={pad - 44} y1={fenceTop} y2={fenceTop + fencePostTotalH} label={`POST HEIGHT ${inch(settings.fenceHeight + settings.fencePostEmbed)}`} />
          <HorizontalDimension x1={pad} x2={pad + calc.totalLength * scale} y={fenceTop + fenceHeight + 72} label={`TOTAL FENCE RUN ${feet(calc.totalLength)}`} />
          {hasIntentionalGate && (
            <DimText x={pad + calc.gateStart * scale + (calc.totalGateOpening * scale) / 2} y={fenceTop - 22}>Drag gate: starts at {feet(calc.gateStart, 2)}</DimText>
          )}
            </>
          )}
        </svg>
      </div>
      <div className="legend preview-legend">
        <LegendItem color="var(--post)" label="Posts" />
        <LegendItem color="var(--wood)" label={`${settings.fencePicketMaterial} pickets`} />
        <LegendItem color="var(--rail)" label="Rails" />
        <LegendItem color="var(--frame)" label="Gate openings" />
      </div>
    </section>
  );
}

function PreviewModeControl({ value, onChange }) {
  return (
    <div className="preview-mode-control" role="tablist" aria-label="Preview view mode">
      {[
        ["2d", "2D"],
        ["3d", "3D"],
        ["top", "Top"],
        ["plans", "Plans"]
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={value === id ? "active" : ""}
          onClick={() => onChange(id)}
          aria-pressed={value === id}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Box3D({ x, y, width, height, depth = 18, fill, opacity = 1 }) {
  const sideFill = "rgba(20,20,20,.18)";
  const topFill = "rgba(255,255,255,.28)";

  return (
    <g opacity={opacity}>
      <polygon points={`${x},${y} ${x + depth},${y - depth} ${x + width + depth},${y - depth} ${x + width},${y}`} fill={topFill} />
      <polygon points={`${x + width},${y} ${x + width + depth},${y - depth} ${x + width + depth},${y + height - depth} ${x + width},${y + height}`} fill={sideFill} />
      <rect x={x} y={y} width={width} height={height} fill={fill} rx="2" />
    </g>
  );
}

function GateTopDown({ settings, calc, scale, pad, svgW, postW, leftPostX, rightPostX, firstGateX, secondGateX, leftLeafW, rightLeafW }) {
  const centerY = 285;
  const postDepth = Math.max(settings.postWidth * scale, 4);
  const gateDepth = Math.max(settings.frameSize * scale, 3);
  const openingStart = leftPostX + postW;
  const openingEnd = rightPostX;

  return (
    <g>
      <rect x={pad - 20} y={centerY - 80} width={svgW - pad * 2 + 40} height={160} fill="#f6f4ef" rx="24" />
      <line x1={openingStart} y1={centerY} x2={openingEnd} y2={centerY} stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="7 7" />
      <rect x={leftPostX} y={centerY - postDepth / 2} width={postW} height={postDepth} fill="var(--post)" rx="4" />
      <rect x={rightPostX} y={centerY - postDepth / 2} width={postW} height={postDepth} fill="var(--post)" rx="4" />
      <rect x={firstGateX} y={centerY - gateDepth / 2} width={leftLeafW} height={gateDepth} fill="var(--frame)" rx="4" />
      {calc.doubleGate && <rect x={secondGateX} y={centerY - gateDepth / 2} width={rightLeafW} height={gateDepth} fill="var(--frame)" rx="4" />}
      <HorizontalDimension x1={firstGateX} x2={firstGateX + leftLeafW} y={centerY - 40} label={calc.doubleGate ? `LEFT ${inch(settings.leftLeafWidth)}` : `GATE ${inch(settings.leftLeafWidth)}`} />
      {calc.doubleGate && <HorizontalDimension x1={secondGateX} x2={secondGateX + rightLeafW} y={centerY - 40} label={`RIGHT ${inch(settings.rightLeafWidth)}`} />}
      <HorizontalDimension x1={pad} x2={pad + calc.outside * scale} y={centerY + 34} label={`OUTSIDE ${inch(calc.outside)}`} />
      <HorizontalDimension x1={openingStart} x2={openingEnd} y={centerY + 74} label={`POST OPENING ${inch(calc.opening)}`} />
    </g>
  );
}

function GatePerspective({ settings, calc, scale, pad, postTop, gateTop, gateBottom, drawingBottom, postW, postH, postTotalH, leftPostX, rightPostX, firstGateX, secondGateX, leftLeafW, rightLeafW, frame, picketW, leftPicketGap, rightPicketGap }) {
  const depth = 22;

  return (
    <g>
      <ellipse cx={pad + calc.outside * scale / 2} cy={gateBottom + 26} rx={calc.outside * scale / 2.15} ry="18" fill="rgba(20,20,20,.08)" />
      <Box3D x={leftPostX} y={postTop} width={postW} height={postH} depth={depth} fill="var(--post)" />
      <Box3D x={rightPostX} y={postTop} width={postW} height={postH} depth={depth} fill="var(--post)" />
      <g transform={`translate(${depth * .35} ${-depth * .2})`}>
        <Gate x={firstGateX} label={calc.doubleGate ? "Left leaf" : "Gate"} leafWidth={settings.leftLeafWidth} picketCount={settings.leftPicketCount} settings={settings} scale={scale} gateTop={gateTop} baseY={gateBottom} frame={frame} picketW={picketW} picketGap={leftPicketGap} side={calc.doubleGate ? "left" : "single"} />
        {calc.doubleGate && <Gate x={secondGateX} label="Right leaf" leafWidth={settings.rightLeafWidth} picketCount={settings.rightPicketCount} settings={settings} scale={scale} gateTop={gateTop} baseY={gateBottom} frame={frame} picketW={picketW} picketGap={rightPicketGap} side="right" />}
      </g>
      <VerticalPlanDimension x={leftPostX - 18} y1={gateTop} y2={gateBottom} label={`GATE HEIGHT ${inch(settings.leafHeight)}`} />
      <HorizontalDimension x1={pad} x2={pad + calc.outside * scale} y={gateBottom + 64} label={`OUTSIDE ${inch(calc.outside)}`} />
      <HorizontalDimension x1={pad + postW} x2={pad + postW + calc.opening * scale} y={gateBottom + 104} label={`POST OPENING ${inch(calc.opening)}`} />
    </g>
  );
}

function PlanLabel({ x, y, children, anchor = "middle", rotate }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className="dim plan-label"
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
    >
      {children}
    </text>
  );
}

function PlanDimension({ x1, x2, y, label }) {
  const mid = x1 + (x2 - x1) / 2;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} className="plan-line" />
      <line x1={x1} y1={y - 8} x2={x1} y2={y + 8} className="plan-line" />
      <line x1={x2} y1={y - 8} x2={x2} y2={y + 8} className="plan-line" />
      <path d={`M ${x1 + 12} ${y - 5} L ${x1} ${y} L ${x1 + 12} ${y + 5}`} className="plan-line" fill="none" />
      <path d={`M ${x2 - 12} ${y - 5} L ${x2} ${y} L ${x2 - 12} ${y + 5}`} className="plan-line" fill="none" />
      <PlanLabel x={mid} y={y - 8}>{label}</PlanLabel>
    </g>
  );
}

function HorizontalDimension({ x1, x2, y, label }) {
  return <PlanDimension x1={x1} x2={x2} y={y} label={label} />;
}

function VerticalPlanDimension({ x, y1, y2, label }) {
  const mid = y1 + (y2 - y1) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} className="plan-line" />
      <line x1={x - 8} y1={y1} x2={x + 8} y2={y1} className="plan-line" />
      <line x1={x - 8} y1={y2} x2={x + 8} y2={y2} className="plan-line" />
      <path d={`M ${x - 5} ${y1 + 12} L ${x} ${y1} L ${x + 5} ${y1 + 12}`} className="plan-line" fill="none" />
      <path d={`M ${x - 5} ${y2 - 12} L ${x} ${y2} L ${x + 5} ${y2 - 12}`} className="plan-line" fill="none" />
      <PlanLabel x={x - 12} y={mid} rotate="-90">{label}</PlanLabel>
    </g>
  );
}

function GateConstructionPlans({ settings, calc, scale, pad, postTop, gateTop, gateBottom, drawingBottom, postW, postH, leftPostX, rightPostX, firstGateX, secondGateX, leftLeafW, rightLeafW, frame, picketW, leftPicketGap, rightPicketGap }) {
  const embedH = Math.max(settings.postEmbed * scale, 54);
  const groundY = gateBottom + 16;

  return (
    <g className="construction-plan">
      <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
      <line x1={pad - 80} y1={groundY} x2={rightPostX + postW + 80} y2={groundY} className="plan-heavy" />
      <rect x={leftPostX} y={postTop} width={postW} height={postH + embedH} className="plan-outline" />
      <rect x={rightPostX} y={postTop} width={postW} height={postH + embedH} className="plan-outline" />
      <rect x={leftPostX - postW} y={groundY} width={postW * 3} height={embedH} className="plan-concrete" />
      <rect x={rightPostX - postW} y={groundY} width={postW * 3} height={embedH} className="plan-concrete" />
      <PlanGateLeaf
        x={firstGateX}
        label={calc.doubleGate ? `LEFT LEAF ${inch(settings.leftLeafWidth)}` : `GATE ${inch(settings.leftLeafWidth)}`}
        leafWidth={settings.leftLeafWidth}
        picketCount={settings.leftPicketCount}
        settings={settings}
        scale={scale}
        gateTop={gateTop}
        baseY={gateBottom}
        frame={frame}
        picketW={picketW}
        picketGap={leftPicketGap}
        side={calc.doubleGate ? "left" : "single"}
      />
      {calc.doubleGate && (
        <PlanGateLeaf
          x={secondGateX}
          label={`RIGHT LEAF ${inch(settings.rightLeafWidth)}`}
          leafWidth={settings.rightLeafWidth}
          picketCount={settings.rightPicketCount}
          settings={settings}
          scale={scale}
          gateTop={gateTop}
          baseY={gateBottom}
          frame={frame}
          picketW={picketW}
          picketGap={rightPicketGap}
          side="right"
        />
      )}
      <PlanLabel x={firstGateX + leftLeafW / 2} y={gateTop + frame + 20}>{inch(settings.frameSize)} SQ TUBE</PlanLabel>
      {calc.doubleGate && <PlanLabel x={secondGateX + rightLeafW / 2} y={gateTop + frame + 20}>{inch(settings.frameSize)} SQ TUBE</PlanLabel>}
      <PlanLabel x={leftPostX + postW + 16} y={postTop + postH / 2} rotate="-90">{inch(settings.picketWidth)} PICKETS</PlanLabel>
      <VerticalPlanDimension x={leftPostX - 30} y1={postTop} y2={postTop + postH + embedH} label={`POST CUT ${inch(settings.postHeight + settings.postEmbed)}`} />
      <VerticalPlanDimension x={leftPostX - 8} y1={gateTop} y2={gateBottom} label={`GATE HEIGHT ${inch(settings.leafHeight)}`} />
      <HorizontalDimension x1={pad} x2={pad + calc.outside * scale} y={gateBottom + 64} label={`OUTSIDE ${inch(calc.outside)}`} />
      <HorizontalDimension x1={pad + postW} x2={pad + postW + calc.opening * scale} y={gateBottom + 104} label={`POST OPENING ${inch(calc.opening)}`} />
    </g>
  );
}

function PlanGateLeaf({ x, label, leafWidth, picketCount, settings, scale, gateTop, baseY, frame, picketW, picketGap, side = "single" }) {
  const leafW = leafWidth * scale;
  const leafH = settings.leafHeight * scale;
  const innerW = Math.max(leafW - frame * 2, 0);
  const innerH = Math.max(leafH - frame * 2, 0);
  const inset = settings.layoutMode === "edge" ? 0 : picketGap;
  const railSlots = Math.max(settings.railCount - 2, 0);
  const arched = hasArchedTop(settings);
  const leftTop = arched ? archTopYAtRatio(gateTop, scale, settings, side, 0, leafWidth) : gateTop;
  const rightTop = arched ? archTopYAtRatio(gateTop, scale, settings, side, 1, leafWidth) : gateTop;

  return (
    <g>
      {arched ? (
        <path d={`${archTopPath(x, leafW, gateTop, scale, settings, side)} L ${x + leafW} ${baseY} L ${x} ${baseY} Z`} className="plan-outline-heavy plan-fill-none" />
      ) : (
        <rect x={x} y={gateTop} width={leafW} height={leafH} className="plan-outline-heavy" />
      )}
      <line x1={x + frame} y1={leftTop + frame} x2={x + frame} y2={baseY - frame} className="plan-outline" />
      <line x1={x + leafW - frame} y1={rightTop + frame} x2={x + leafW - frame} y2={baseY - frame} className="plan-outline" />
      <line x1={x + frame} y1={baseY - frame} x2={x + leafW - frame} y2={baseY - frame} className="plan-outline" />
      {arched && <path d={archTopPath(x + frame, innerW, gateTop + frame, scale, settings, side)} className="plan-outline" />}
      {!arched && <rect x={x + frame} y={gateTop + frame} width={innerW} height={innerH} className="plan-fill-none" />}
      {Array.from({ length: railSlots }).map((_, index) => {
        const y = gateTop + frame + ((leafH - frame * 2) * (index + 1) / (settings.railCount - 1));
        return <rect key={index} x={x + frame} y={y - frame / 2} width={innerW} height={frame} className="plan-outline" />;
      })}
      {Array.from({ length: picketCount }).map((_, index) => {
        const picketX = x + frame + inset + index * (picketW + picketGap);
        const ratio = picketRatio(index, picketCount, settings);
        const topY = arched ? archTopYAtRatio(gateTop, scale, settings, side, ratio, leafWidth) + frame : gateTop + frame;
        return (
          <rect
            key={index}
            x={picketX}
            y={topY}
            width={picketW}
            height={Math.max(baseY - frame - topY, 0)}
            className="plan-picket"
          />
        );
      })}
      <HorizontalDimension x1={x} x2={x + leafW} y={baseY + 26} label={label} />
    </g>
  );
}

function FenceConstructionPlans({ settings, calc, segments, pad, scale, svgW, fenceTop, fenceHeight, postW, picketW, railH, onPointerDown, dragging }) {
  const groundY = fenceTop + fenceHeight;
  const embedH = Math.max(settings.fencePostEmbed * scale, 54);
  const railInset = Math.min(6 * scale, fenceHeight / 2);
  const sectionSegments = segments.filter((segment) => segment.type === "section");
  const gateSegments = segments.filter((segment) => segment.type === "gate");
  const railYs = Array.from({ length: settings.fenceRailCount }).map((_, index) => {
    if (settings.fenceRailCount === 1) return fenceTop + fenceHeight / 2;
    return fenceTop + railInset + ((fenceHeight - railInset * 2) * index / (settings.fenceRailCount - 1));
  });

  return (
    <g className="construction-plan">
      <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
      <line x1={pad - 90} y1={groundY} x2={svgW - pad + 90} y2={groundY} className="plan-heavy" />
      {sectionSegments.map((segment) => (
        <PlanFenceSection
          key={`plan-section-${segment.index}`}
          segment={segment}
          settings={settings}
          scale={scale}
          y={fenceTop}
          height={fenceHeight}
          picketW={picketW}
          railH={railH}
          railYs={railYs}
        />
      ))}
      <rect x={pad - postW / 2} y={fenceTop} width={postW} height={fenceHeight + embedH} className="plan-outline-heavy" />
      <rect x={pad - postW * 1.5} y={groundY} width={postW * 3} height={embedH} className="plan-concrete" />
      {sectionSegments.map((segment) => (
        <g key={`plan-post-${segment.index}`}>
          <rect x={segment.x + segment.width - postW / 2} y={fenceTop} width={postW} height={fenceHeight + embedH} className="plan-outline-heavy" />
          <rect x={segment.x + segment.width - postW * 1.5} y={groundY} width={postW * 3} height={embedH} className="plan-concrete" />
        </g>
      ))}
      {gateSegments.map((segment) => (
        <g key={`plan-gate-${segment.index}`} className={`gate-drag-target ${dragging ? "dragging" : ""}`} data-gate-drag-target="true" onPointerDown={onPointerDown}>
          <rect x={segment.x - postW / 2} y={fenceTop} width={postW} height={fenceHeight + embedH} className="plan-outline-heavy" />
          <rect x={segment.x + segment.width - postW / 2} y={fenceTop} width={postW} height={fenceHeight + embedH} className="plan-outline-heavy" />
          <rect x={segment.x - postW * 1.5} y={groundY} width={postW * 3} height={embedH} className="plan-concrete" />
          <rect x={segment.x + segment.width - postW * 1.5} y={groundY} width={postW * 3} height={embedH} className="plan-concrete" />
          <rect x={segment.x + postW} y={fenceTop + railH} width={Math.max(segment.width - postW * 2, 0)} height={Math.max(fenceHeight - railH * 2, 0)} className="plan-outline-heavy" />
          <rect x={segment.x + postW} y={fenceTop + railH} width={Math.max(segment.width - postW * 2, 0)} height={railH} className="plan-outline" />
          <rect x={segment.x + postW} y={groundY - railH * 2} width={Math.max(segment.width - postW * 2, 0)} height={railH} className="plan-outline" />
        </g>
      ))}
      <g className="plan-dimensions">
        {railYs.map((railY, index) => (
          <PlanLabel key={`rail-label-${index}`} x={pad + calc.totalLength * scale / 2} y={railY + 5}>{index === 0 ? "2 x 4 RAIL" : "RAIL"}</PlanLabel>
        ))}
        {sectionSegments.map((segment) => (
          <HorizontalDimension key={`plan-section-dim-${segment.index}`} x1={segment.x} x2={segment.x + segment.width} y={groundY + 28} label={`SECTION ${segment.index} ${feet(segment.length)}`} />
        ))}
        {gateSegments.map((segment) => (
          <HorizontalDimension key={`plan-gate-dim-${segment.index}`} x1={segment.x} x2={segment.x + segment.width} y={fenceTop + fenceHeight / 2} label={`GATE ${feet(segment.length)}`} />
        ))}
        <VerticalPlanDimension x={pad - 38} y1={fenceTop} y2={groundY + embedH} label={`POST HEIGHT ${inch(settings.fenceHeight + settings.fencePostEmbed)}`} />
        <PlanLabel x={pad + 24} y={fenceTop + fenceHeight / 2} rotate="-90">{inchFraction(settings.fencePicketWidth)} PICKETS</PlanLabel>
        <HorizontalDimension x1={pad} x2={pad + calc.totalLength * scale} y={groundY + 72} label={`TOTAL FENCE RUN ${feet(calc.totalLength)}`} />
      </g>
    </g>
  );
}

function PlanFenceSection({ segment, settings, scale, y, height, picketW, railH, railYs }) {
  return (
    <g>
      {Array.from({ length: segment.pickets }).map((_, index) => {
        const x = segment.x + index * picketW;
        const width = Math.min(picketW, Math.max(segment.x + segment.width - x, 0));
        const flatInset = width * 0.24;
        const shoulderY = y + Math.min(flatInset, height * 0.16);
        if (width <= 0) return null;
        return (
          <path
            key={index}
            d={`M ${x} ${y + height} L ${x} ${shoulderY} L ${x + flatInset} ${y} L ${x + width - flatInset} ${y} L ${x + width} ${shoulderY} L ${x + width} ${y + height} Z`}
            className="plan-light-fill"
          />
        );
      })}
      {railYs.map((railY, index) => (
        <rect key={index} x={segment.x} y={railY - railH / 2} width={segment.width} height={railH} className="plan-outline" />
      ))}
    </g>
  );
}

function FenceTopDown({ settings, calc, segments, pad, scale, svgW, svgH, postW, onPointerDown, dragging }) {
  const centerY = svgH / 2;
  const postDepth = Math.max(settings.postWidth * scale, 4);
  const railDepth = Math.max(1.5 * scale, 3);
  const gateDepth = Math.max(settings.frameSize * scale, 3);

  return (
    <g>
      <rect x={pad - 28} y={centerY - 92} width={svgW - pad * 2 + 56} height={184} fill="#f6f4ef" rx="26" />
      <line x1={pad} y1={centerY} x2={pad + calc.totalLength * scale} y2={centerY} stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="8 8" />
      {segments
        .filter((segment) => segment.type === "section")
        .map((segment) => (
          <g key={`top-section-${segment.index}`}>
            <rect x={segment.x} y={centerY - railDepth / 2} width={segment.width} height={railDepth} fill="var(--wood)" rx="3" />
            <rect x={segment.x} y={centerY - 4} width={segment.width} height="8" fill="var(--rail)" />
            <rect x={segment.x + segment.width - postW / 2} y={centerY - postDepth / 2} width={postW} height={postDepth} fill="var(--post)" rx="4" />
            <HorizontalDimension x1={segment.x} x2={segment.x + segment.width} y={centerY + 50} label={`SECTION ${segment.index} ${feet(segment.length)}`} />
          </g>
        ))}
      {segments
        .filter((segment) => segment.type === "gate")
        .map((segment) => (
          <g key={`top-gate-${segment.index}`} className={`gate-drag-target ${dragging ? "dragging" : ""}`} data-gate-drag-target="true" onPointerDown={onPointerDown}>
            <rect x={segment.x} y={centerY - gateDepth / 2} width={segment.width} height={gateDepth} fill="#fff" stroke="var(--frame)" strokeWidth="2" strokeDasharray="8 6" rx="3" />
            <HorizontalDimension x1={segment.x} x2={segment.x + segment.width} y={centerY - 42} label={`GATE ${feet(segment.length)}`} />
          </g>
        ))}
      <rect x={pad - postW / 2} y={centerY - postDepth / 2} width={postW} height={postDepth} fill="var(--post)" rx="4" />
      <HorizontalDimension x1={pad} x2={pad + calc.totalLength * scale} y={centerY + 88} label={`TOTAL FENCE RUN ${feet(calc.totalLength)}`} />
    </g>
  );
}

function FencePerspective({ settings, calc, segments, pad, scale, fenceTop, fenceHeight, postW, picketW, railH, onPointerDown, dragging }) {
  const depth = 20;
  const fencePostTotalH = (settings.fenceHeight + settings.fencePostEmbed) * scale;

  return (
    <g transform="translate(20 -6) skewX(-6)">
      <ellipse cx={pad + calc.totalLength * scale / 2} cy={fenceTop + fenceHeight + 18} rx={calc.totalLength * scale / 2.05} ry="24" fill="rgba(20,20,20,.08)" transform="skewX(6)" />
      {segments
        .filter((segment) => segment.type === "section")
        .map((segment) => (
          <g key={`perspective-section-${segment.index}`}>
            <FenceSection
              segment={segment}
              settings={settings}
              scale={scale}
              y={fenceTop}
              height={fenceHeight}
              postW={postW}
              picketW={picketW}
              railH={railH}
            />
            <Box3D x={segment.x + segment.width - postW / 2} y={fenceTop} width={postW} height={fenceHeight} depth={depth} fill="var(--post)" />
          </g>
        ))}
      <Box3D x={pad - postW / 2} y={fenceTop} width={postW} height={fenceHeight} depth={depth} fill="var(--post)" />
      {segments
        .filter((segment) => segment.type === "gate")
        .map((segment) => (
          <g key={`perspective-gate-${segment.index}`} className={`gate-drag-target ${dragging ? "dragging" : ""}`} data-gate-drag-target="true" onPointerDown={onPointerDown}>
            <rect x={segment.x} y={fenceTop} width={segment.width} height={fenceHeight} fill="rgba(255,255,255,.72)" stroke="var(--frame)" strokeWidth="3" strokeDasharray="8 6" />
            <HorizontalDimension x1={segment.x} x2={segment.x + segment.width} y={fenceTop + fenceHeight / 2} label={`GATE ${feet(segment.length)}`} />
          </g>
        ))}
      <VerticalPlanDimension x={pad - 44} y1={fenceTop} y2={fenceTop + fencePostTotalH} label={`POST HEIGHT ${inch(settings.fenceHeight + settings.fencePostEmbed)}`} />
      <HorizontalDimension x1={pad} x2={pad + calc.totalLength * scale} y={fenceTop + fenceHeight + 84} label={`TOTAL FENCE RUN ${feet(calc.totalLength)}`} />
    </g>
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
      <HorizontalDimension x1={segment.x} x2={segment.x + segment.width} y={y + height + 34} label={`SECTION ${segment.index} ${feet(segment.length)}`} />
    </g>
  );
}

function FenceGateOpening({ segment, y, height, scale, linkedGateSettings, linkedGateCalc, onPointerDown, dragging }) {
  return (
    <g className={`gate-drag-target ${dragging ? "dragging" : ""}`} data-gate-drag-target="true" onPointerDown={onPointerDown}>
      <rect x={segment.x} y={y} width={segment.width} height={height} fill="#fff" stroke="var(--frame)" strokeWidth="3" strokeDasharray="8 6" />
      {linkedGateSettings && linkedGateCalc ? (
        <LinkedGateInFence segment={segment} y={y} height={height} scale={scale} gateSettings={linkedGateSettings} gateCalc={linkedGateCalc} />
      ) : (
        <HorizontalDimension x1={segment.x} x2={segment.x + segment.width} y={y + height / 2} label={`GATE OPENING ${feet(segment.length)}`} />
      )}
    </g>
  );
}

function LinkedGateInFence({ segment, y, height, scale, gateSettings, gateCalc }) {
  const gateTop = y + Math.max(0, height - gateCalc.gateVisualHeight * scale) + gateCalc.archRise * scale;
  const gateBottom = gateTop + gateSettings.leafHeight * scale;
  const frame = gateSettings.frameSize * scale;
  const picketW = gateSettings.picketWidth * scale;
  const postW = gateSettings.postWidth * scale;
  const leftPostGap = gateCalc.leftPostGap * scale;
  const centerGap = gateCalc.centerGap * scale;
  const leftPicketGap = Math.max(gateCalc.leftPicketGap * scale, 0);
  const rightPicketGap = Math.max(gateCalc.rightPicketGap * scale, 0);
  const postTop = y;
  const postHeight = Math.min(height, gateSettings.postHeight * scale);
  const leftPostX = segment.x;
  const rightPostX = segment.x + segment.width - postW;
  const leftX = leftPostX + postW + leftPostGap;
  const rightX = leftX + gateSettings.leftLeafWidth * scale + centerGap;

  return (
    <g>
      <rect x={leftPostX} y={postTop} width={postW} height={postHeight} fill="var(--post)" rx="2" />
      <rect x={rightPostX} y={postTop} width={postW} height={postHeight} fill="var(--post)" rx="2" />
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
        side={gateCalc.doubleGate ? "left" : "single"}
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
        side="right"
      />}
      <HorizontalDimension x1={segment.x} x2={segment.x + segment.width} y={y + height / 2} label={`GATE ${inch(gateCalc.outside)}`} />
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

function Gate({ x, label, leafWidth, picketCount, settings, scale, gateTop, baseY, frame, picketW, picketGap, side = "single", showDimension = true }) {
  const leafW = leafWidth * scale;
  const leafH = settings.leafHeight * scale;
  const innerW = Math.max(leafW - frame * 2, 0);
  const innerH = Math.max(leafH - frame * 2, 0);
  const inset = settings.layoutMode === "edge" ? 0 : picketGap;
  const railSlots = Math.max(settings.railCount - 2, 0);
  const arched = hasArchedTop(settings);
  const leftTop = arched ? archTopYAtRatio(gateTop, scale, settings, side, 0, leafWidth) : gateTop;
  const rightTop = arched ? archTopYAtRatio(gateTop, scale, settings, side, 1, leafWidth) : gateTop;

  return (
    <>
      {arched ? (
        <path
          d={archTopPath(x + frame / 2, Math.max(leafW - frame, 0), gateTop, scale, settings, side, frame / 2)}
          fill="none"
          stroke="var(--frame)"
          strokeWidth={frame}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <rect x={x} y={gateTop} width={leafW} height={frame} fill="var(--frame)" rx="2" />
      )}
      <rect x={x} y={gateTop + leafH - frame} width={leafW} height={frame} fill="var(--frame)" rx="2" />
      <rect x={x} y={leftTop} width={frame} height={Math.max(baseY - leftTop, 0)} fill="var(--frame)" rx="2" />
      <rect x={x + leafW - frame} y={rightTop} width={frame} height={Math.max(baseY - rightTop, 0)} fill="var(--frame)" rx="2" />
      {Array.from({ length: railSlots }).map((_, index) => {
        const y = gateTop + frame + ((leafH - frame * 2) * (index + 1) / (settings.railCount - 1));
        return <rect key={`rail-${index}`} x={x + frame} y={y - frame / 2} width={innerW} height={frame} fill="var(--rail)" rx="2" />;
      })}
      {Array.from({ length: picketCount }).map((_, index) => {
        const ratio = picketRatio(index, picketCount, settings);
        const picketTop = arched ? archTopYAtRatio(gateTop, scale, settings, side, ratio, leafWidth) + frame : gateTop + frame;
        return (
          <rect
            key={`picket-${index}`}
            x={x + frame + inset + index * (picketW + picketGap)}
            y={picketTop}
            width={picketW}
            height={arched ? Math.max(baseY - frame - picketTop, 0) : innerH}
            fill="var(--picket)"
            rx="1"
          />
        );
      })}
      {label && showDimension && <HorizontalDimension x1={x} x2={x + leafW} y={baseY + 30} label={`${label.toUpperCase()} ${inch(leafWidth)}`} />}
      {label && !showDimension && <DimText x={x + leafW / 2} y={baseY + 24}>{label} {inch(leafWidth)}</DimText>}
    </>
  );
}

function GapBand({ x1, x2, y1, y2, label, value, center = false, side = "center" }) {
  const width = Math.max(x2 - x1, 0);

  return (
    <>
      <rect x={x1} y={y1} width={width} height={y2 - y1} fill={center ? "#fff" : "rgba(37, 99, 235, .13)"} />
      <line x1={x1} y1={y1 - 10} x2={x1} y2={y2 + 10} className="plan-note-line" />
      <line x1={x2} y1={y1 - 10} x2={x2} y2={y2 + 10} className="plan-note-line" />
    </>
  );
}

function GapLabelsTop({ gateTop, gatePeakTop = gateTop, leftPostX, postW, firstGateX, secondGateX, leftLeafW, rightLeafW, rightPostX, calc, settings }) {
  const leftLabel = calc.doubleGate ? "POST GAP" : settings.hingePostSide === "left" ? "HINGE GAP" : "LATCH GAP";
  const rightLabel = calc.doubleGate ? "POST GAP" : settings.hingePostSide === "right" ? "HINGE GAP" : "LATCH GAP";
  const rightGateEnd = calc.doubleGate ? secondGateX + rightLeafW : firstGateX + leftLeafW;
  const y = gatePeakTop - 24;

  return (
    <g className="gap-top-labels">
      <text x={(leftPostX + postW + firstGateX) / 2} y={y} textAnchor="middle" className="gap-top-label">{leftLabel} {inch(calc.leftPostGap)}</text>
      {calc.doubleGate && <text x={(firstGateX + leftLeafW + secondGateX) / 2} y={y} textAnchor="middle" className="gap-top-label">CENTER GAP {inch(settings.centerGap)}</text>}
      <text x={(rightGateEnd + rightPostX) / 2} y={y} textAnchor="middle" className="gap-top-label">{rightLabel} {inch(calc.rightPostGap)}</text>
    </g>
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
