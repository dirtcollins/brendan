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

function drawPicketsInPdfLeaf(page, frameX, frameY, leafWidth, leafHeight, count, settings, gap, scale, side = "single") {
  const frameSize = settings.frameSize * scale;
  const picketWidth = Math.max(settings.picketWidth * scale, 1.2);
  const innerX = frameX + frameSize;
  const innerW = Math.max(0, leafWidth * scale - frameSize * 2);
  const innerH = Math.max(0, leafHeight * scale - frameSize * 2);
  const baseY = frameY + leafHeight * scale;
  const arched = hasArchedTop(settings);
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
    const ratio = picketRatio(index, count, settings);
    const topY = arched ? frameY - getArchExtraAtRatio(ratio, side, settings, leafWidth) * scale + frameSize : frameY + frameSize;
    page.rect(x, topY, picketWidth, arched ? Math.max(baseY - frameSize - topY, 0) : innerH, false);
  }
}

function drawPdfArchedTop(page, x, width, gateTop, settings, scale, side) {
  const segments = 16;
  let previous = null;
  for (let index = 0; index <= segments; index += 1) {
    const ratio = index / segments;
    const point = {
      x: x + width * ratio,
      y: gateTop - getArchExtraAtRatio(ratio, side, settings, width / scale) * scale
    };
    if (previous) page.line(previous.x, previous.y, point.x, point.y);
    previous = point;
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
  const aboveGradeHeight = Math.max(settings.postHeight, calc.gateVisualHeight);
  const drawingWidth = Math.max(calc.outside, 1);
  const drawingHeight = aboveGradeHeight + settings.postEmbed;
  const scale = Math.min((area.width - 130) / drawingWidth, (area.height - 112) / drawingHeight);
  const outsideX = area.x + 94;
  const topY = area.y + 48;
  const groundY = topY + aboveGradeHeight * scale;
  const gateTopY = groundY - settings.leafHeight * scale;
  const gatePeakY = gateTopY - calc.archRise * scale;
  const postTopY = groundY - settings.postHeight * scale;
  const postW = settings.postWidth * scale;
  const frameW = settings.frameSize * scale;
  const leftPostX = outsideX;
  const openingX = leftPostX + postW;
  const rightPostX = openingX + calc.opening * scale;
  const postBottomY = groundY + settings.postEmbed * scale;
  const gateBottomY = groundY;
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
    page.rect(rightPostX + postW, gateTopY + 7, 9, settings.leafHeight * scale, true);
  }

  page.strokeColor(0.9, 0.9, 0.9);
  page.lineWidth(0.6);
  page.line(area.x, groundY, area.x + area.width, groundY);

  page.strokeColor(0.1, 0.1, 0.1);
  page.fillColor(0.95, 0.96, 0.97);
  page.lineWidth(1);
  page.rect(leftPostX, postTopY, postW, postHeight * scale, false);
  page.rect(rightPostX, postTopY, postW, postHeight * scale, false);
  page.strokeColor(0.72, 0.72, 0.72);
  page.lineWidth(0.5);
  page.line(leftPostX, groundY, leftPostX, postBottomY);
  page.line(rightPostX + postW, groundY, rightPostX + postW, postBottomY);

  page.strokeColor(0, 0, 0);
  page.lineWidth(Math.max(1.4, frameW));
  if (calc.archedTop) {
    const drawLeafFrame = (leafX, leafW, side) => {
      const leftTop = gateTopY - getArchExtraAtRatio(0, side, settings, leafW / scale) * scale;
      const rightTop = gateTopY - getArchExtraAtRatio(1, side, settings, leafW / scale) * scale;
      page.line(leafX, leftTop, leafX, gateBottomY);
      page.line(leafX + leafW, rightTop, leafX + leafW, gateBottomY);
      page.line(leafX, gateBottomY, leafX + leafW, gateBottomY);
      drawPdfArchedTop(page, leafX, leafW, gateTopY, settings, scale, side);
    };
    drawLeafFrame(leftLeafX, leftLeafW, calc.doubleGate ? "left" : "single");
    if (calc.doubleGate) drawLeafFrame(rightLeafX, rightLeafW, "right");
  } else {
    page.rect(leftLeafX, gateTopY, leftLeafW, settings.leafHeight * scale, false);
    if (calc.doubleGate) {
      page.rect(rightLeafX, gateTopY, rightLeafW, settings.leafHeight * scale, false);
    }
  }

  drawPicketsInPdfLeaf(page, leftLeafX, gateTopY, calc.leftLeafWidth, settings.leafHeight, settings.leftPicketCount, settings, calc.leftPicketGap, scale, calc.doubleGate ? "left" : "single");
  if (calc.doubleGate) {
    drawPicketsInPdfLeaf(page, rightLeafX, gateTopY, calc.rightLeafWidth, settings.leafHeight, settings.rightPicketCount, settings, calc.rightPicketGap, scale, "right");
  }

  page.fillColor(0, 0, 0);
  page.text(leftLeafX + leftLeafW / 2, gateTopY + 16, `FRAME: ${inchFraction(settings.frameSize)} SQ TUBE`, 9, true, "center");
  if (calc.doubleGate) {
    page.text(rightLeafX + rightLeafW / 2, gateTopY + 16, `FRAME: ${inchFraction(settings.frameSize)} SQ TUBE`, 9, true, "center");
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
  drawDimensionV(page, area.x + 34, postTopY, groundY, `POST HEIGHT: ${inch(settings.postHeight)}`);
  drawDimensionV(page, area.x + 58, calc.archedTop ? gatePeakY : gateTopY, gateBottomY, calc.archedTop ? `PEAK HEIGHT: ${inch(calc.gateVisualHeight)}` : `GATE HEIGHT: ${inch(settings.leafHeight)}`);

  page.text(openingX + calc.leftPostGap * scale / 2, gatePeakY - 18, `POST GAP: ${inch(calc.leftPostGap)}`, 9, true, "center");
  if (calc.doubleGate) {
    page.text(leftLeafX + leftLeafW + centerGapW / 2, gatePeakY - 18, `CENTER GAP: ${inch(calc.centerGap)}`, 9, true, "center");
    page.text(rightLeafX + rightLeafW + calc.rightPostGap * scale / 2, gatePeakY - 18, `POST GAP: ${inch(calc.rightPostGap)}`, 9, true, "center");
  } else {
    page.text(leftLeafX + leftLeafW + calc.rightPostGap * scale / 2, gatePeakY - 18, `LATCH GAP: ${inch(calc.rightPostGap)}`, 9, true, "center");
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
        { label: calc.archedTop ? "Top arc" : "Horizontals", value: calc.archedTop ? inch(calc.leftTopRailLength) : inch(calc.horizontalLength) }
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
  const picketCutNote = calc.archedTop
    ? `Picket cuts vary from ${lengthRangeLabel(calc.picketSummary.min, calc.picketSummary.max)} under the arched top.`
    : `Pickets are ${tubeSpecFraction(settings.picketWidth, settings.picketThickness)} at ${inch(settings.leafHeight - settings.frameSize * 2)} cut length inside the frame.`;
  const topStyleNote = calc.archedTop
    ? `Arched top rises ${inch(calc.archRise)} above the side height. Top rail arc length is ${calc.doubleGate ? `${inch(calc.leftTopRailLength)} left / ${inch(calc.rightTopRailLength)} right` : inch(calc.leftTopRailLength)}.`
    : "Flat top gate.";
  const gateWeightNote = calc.doubleGate
    ? `Left leaf ${pounds(calc.leftGateWeight, 1)}, right leaf ${pounds(calc.rightGateWeight, 1)}, ${pounds(calc.totalGateWeight, 1)} total. Posts and leftover stock are not included.`
    : `Gate leaf ${pounds(calc.leftGateWeight, 1)}. Posts and leftover stock are not included.`;

  return [
    ["Gate type", calc.doubleGate ? "Double gate with left and right leaves." : `${settings.hingePostSide === "left" ? "Left" : "Right"} post is the hinge post.`],
    ["Opening formula", openingFormula],
    ["Outside width", `${inch(calc.opening, 2)} opening + two ${inch(settings.postWidth)} posts = ${inch(calc.outside, 2)}`],
    ["Post length", `${inch(settings.postHeight)} above ground + ${inch(settings.postEmbed)} in ground = ${inch(calc.postCutLength)} post cut length.`],
    ["Top style", topStyleNote],
    ["Frame and pickets", `Frame is ${tubeSpecFraction(settings.frameSize, settings.frameThickness)}. ${picketCutNote}`],
    ["Picket spacing", picketSpacingNote],
    ...(!calc.doubleGate ? [["Single gate swing", `${settings.hingePostSide === "left" ? "Left" : "Right"} post is the hinge post. Left side gap ${inch(calc.leftPostGap)}, right side gap ${inch(calc.rightPostGap)}.`]] : []),
    ["Tube thickness", `Posts ${thicknessLabel(settings.postThickness)} wall, frame ${thicknessLabel(settings.frameThickness)} wall, pickets ${thicknessLabel(settings.picketThickness)} wall.`],
    ["Stock choice", calc.stockPlans.map((plan) => `${plan.name}: buy ${plan.best.sticks} x ${plan.best.label}`).join("; ")],
    ["Gate weight", gateWeightNote],
    ["Steel cost", `${pounds(calc.totalMetalWeight, 1)} purchased weight at ${money(settings.cwtCost)} CWT = ${money(calc.metalCost)} estimated metal cost.`],
    ["Rail assumption", calc.archedTop ? `${calc.straightRailCount} straight rail cut${calc.straightRailCount === 1 ? "" : "s"} plus one arched top rail per leaf.` : `${settings.railCount} horizontal rail cuts per leaf. Horizontal rails fit between vertical frame members.`]
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
