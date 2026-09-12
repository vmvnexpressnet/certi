import { Runner, PersonalPhotoOverlayConfig } from '../types';
import { getRunnerSplitData, RunnerSplitData, CheckpointSplit } from './runnerSplits';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface DrawPhotoTelemetryOptions {
  ctx: CanvasRenderingContext2D;
  photoX: number;
  photoW: number;
  photoH: number;
  runner: Runner;
  overlayConfig?: PersonalPhotoOverlayConfig;
}

/**
 * Draws the Running Telemetry HUD & CP Segments Pace Chart directly onto the runner's personal photo.
 * REFINED DESIGN:
 * 1. NO opaque background card: does NOT block the runner's photo or body.
 * 2. Gentle dark gradient (semi-transparent scrim) at the bottom just enough to make bright numbers pop.
 * 3. NO personal info: completely removed name, bib, age, category, finisher tags (those are on the certificate).
 * 4. Larger, high-contrast, crystal-clear typography for all metrics (GunTime, ChipTime, Avg Pace, CP times & paces).
 * 5. Clean, energetic neon pace curve with glowing nodes and clear pace labels.
 */
export function drawPhotoTelemetryHUD(options: DrawPhotoTelemetryOptions): void {
  const { ctx, photoX, photoW, photoH, runner, overlayConfig } = options;

  if (overlayConfig && !overlayConfig.showOverlay) {
    return;
  }

  const splitData: RunnerSplitData = getRunnerSplitData(runner);
  const isTop = overlayConfig?.position === 'top';
  const showChart = overlayConfig?.showChart ?? true;

  // Scale relative to photo width (2160px base for 3:1 collage or 1080px preview)
  const scale = photoW / 2160;

  ctx.save();

  // 1. Soft Gradient Scrim: only a smooth dark vignette at the bottom edge so the photo remains 100% visible
  const scrimH = showChart ? 660 * scale : 340 * scale;
  const scrimY = isTop ? 0 : photoH - scrimH;
  const scrimGrad = ctx.createLinearGradient(
    0,
    isTop ? scrimH : scrimY,
    0,
    isTop ? 0 : photoH
  );
  scrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  scrimGrad.addColorStop(0.3, 'rgba(3, 7, 18, 0.45)');
  scrimGrad.addColorStop(0.7, 'rgba(3, 7, 18, 0.75)');
  scrimGrad.addColorStop(1, 'rgba(2, 6, 16, 0.88)');

  ctx.fillStyle = scrimGrad;
  ctx.fillRect(photoX, scrimY, photoW, scrimH);

  // Content boundaries
  const padX = 80 * scale;
  const contentX = photoX + padX;
  const contentW = photoW - padX * 2;

  // 2. Top Metric Bar (Minimalist, Large Font, No Personal Info):
  // Displays: GUN TIME  •  CHIP TIME  •  AVERAGE PACE
  const topMetricsY = isTop ? 70 * scale : photoH - (showChart ? 580 * scale : 260 * scale);

  const keyMetrics = [
    {
      label: 'GUN TIME',
      value: splitData.gunTime,
      color: '#FFFFFF',
    },
    {
      label: 'CHIP TIME',
      value: splitData.chipTime,
      color: '#4ade80', // vibrant neon emerald/mint
    },
    {
      label: 'AVG PACE',
      value: splitData.avgPace,
      color: '#facc15', // vivid energetic yellow
    },
  ];

  const colWidth = contentW / keyMetrics.length;

  keyMetrics.forEach((metric, idx) => {
    const centerX = contentX + colWidth * idx + colWidth / 2;

    // Label with drop shadow for clarity
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3 * scale;

    ctx.fillStyle = '#94a3b8';
    ctx.font = `800 ${Math.round(20 * scale)}px 'Montserrat', sans-serif`;
    ctx.fillText(metric.label, centerX, topMetricsY);

    // Large high-contrast value
    ctx.fillStyle = metric.color;
    ctx.font = `900 ${Math.round(44 * scale)}px 'Montserrat', 'JetBrains Mono', monospace`;
    ctx.fillText(metric.value, centerX, topMetricsY + 30 * scale);
  });

  // Reset shadows
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  if (!showChart) {
    ctx.restore();
    return;
  }

  // 3. Subtle translucent hairline divider
  const lineY = topMetricsY + 95 * scale;
  const dividerGrad = ctx.createLinearGradient(contentX, 0, contentX + contentW, 0);
  dividerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
  dividerGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.25)');
  dividerGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.25)');
  dividerGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  ctx.strokeStyle = dividerGrad;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(contentX, lineY);
  ctx.lineTo(contentX + contentW, lineY);
  ctx.stroke();

  // 4. Checkpoint Pace Chart Section
  const chartY = lineY + 30 * scale;
  const chartH = 200 * scale;
  const chartBaselineY = chartY + chartH;

  const checkpoints: CheckpointSplit[] = splitData.checkpoints;
  const pointCount = checkpoints.length;

  const chartMarginX = 90 * scale;
  const chartInnerW = contentW - chartMarginX * 2;

  // Min & Max pace for smooth auto-scaling
  const paceSecondsList = checkpoints.map((c) => c.paceSeconds).filter((s) => s > 0);
  const minPaceSec = Math.min(...paceSecondsList, 240);
  const maxPaceSec = Math.max(...paceSecondsList, 600);
  const paceRange = Math.max(maxPaceSec - minPaceSec, 60);

  // Calculate coordinates of each checkpoint node
  const points = checkpoints.map((cp, idx) => {
    const x = contentX + chartMarginX + (idx / (pointCount - 1)) * chartInnerW;
    // Faster pace = higher Y coordinate in chart
    const normalized = (cp.paceSeconds - minPaceSec) / paceRange;
    const y = chartY + 35 * scale + normalized * (chartH - 65 * scale);
    return { cp, x, y };
  });

  // Background subtle guideline dashes
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1 * scale;
  ctx.setLineDash([8 * scale, 8 * scale]);
  [0.3, 0.7].forEach((ratio) => {
    const gy = chartY + ratio * chartH;
    ctx.beginPath();
    ctx.moveTo(contentX, gy);
    ctx.lineTo(contentX + contentW, gy);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Vertical guideline drops from nodes
  points.forEach((pt) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x, chartBaselineY + 15 * scale);
    ctx.stroke();
  });

  // Glowing Gradient Fill Under the Curve
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, chartBaselineY);
  ctx.lineTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i++) {
    const pCurrent = points[i];
    const pNext = points[i + 1];
    const cpX1 = pCurrent.x + (pNext.x - pCurrent.x) / 2;
    const cpY1 = pCurrent.y;
    const cpX2 = pCurrent.x + (pNext.x - pCurrent.x) / 2;
    const cpY2 = pNext.y;
    ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, pNext.x, pNext.y);
  }

  ctx.lineTo(points[points.length - 1].x, chartBaselineY);
  ctx.closePath();

  const areaGrad = ctx.createLinearGradient(0, chartY, 0, chartBaselineY);
  areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
  areaGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.18)');
  areaGrad.addColorStop(1, 'rgba(3, 105, 161, 0.01)');
  ctx.fillStyle = areaGrad;
  ctx.fill();
  ctx.restore();

  // High-Energy Glowing Line
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const pCurrent = points[i];
    const pNext = points[i + 1];
    const cpX1 = pCurrent.x + (pNext.x - pCurrent.x) / 2;
    const cpY1 = pCurrent.y;
    const cpX2 = pCurrent.x + (pNext.x - pCurrent.x) / 2;
    const cpY2 = pNext.y;
    ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, pNext.x, pNext.y);
  }

  // Neon line glow
  ctx.shadowColor = 'rgba(56, 189, 248, 0.95)';
  ctx.shadowBlur = 16 * scale;
  const lineGrad = ctx.createLinearGradient(contentX, 0, contentX + contentW, 0);
  lineGrad.addColorStop(0, '#38bdf8');
  lineGrad.addColorStop(0.5, '#2dd4bf');
  lineGrad.addColorStop(1, '#facc15');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 5 * scale;
  ctx.stroke();
  ctx.restore();

  // Nodes & Floating Pace Callout Badges
  points.forEach((pt, idx) => {
    // Outer halo
    ctx.fillStyle = idx === points.length - 1 ? 'rgba(250, 204, 21, 0.35)' : 'rgba(45, 212, 191, 0.35)';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 16 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Node circle border
    ctx.strokeStyle = idx === points.length - 1 ? '#facc15' : '#38bdf8';
    ctx.lineWidth = 3.5 * scale;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 9 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Node core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Floating Pace Bubble above node (Large text)
    if (idx > 0) {
      const paceVal = pt.cp.pace;
      const bubbleW = 110 * scale;
      const bubbleH = 36 * scale;
      const bubbleX = pt.x - bubbleW / 2;
      const bubbleY = pt.y - bubbleH - 15 * scale;

      ctx.save();
      // Translucent bubble with sharp contrast
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 8 * scale;
      roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 10 * scale);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = idx === points.length - 1 ? 'rgba(250, 204, 21, 0.8)' : 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 1.5 * scale;
      roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 10 * scale);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = idx === points.length - 1 ? '#facc15' : '#78ffd8';
      ctx.font = `900 ${Math.round(17 * scale)}px 'Montserrat', 'JetBrains Mono', monospace`;
      ctx.fillText(`${paceVal}/km`, pt.x, bubbleY + bubbleH / 2);
    }
  });

  // 5. Checkpoint Labels & Clear Big Data (Under Baseline)
  // Large checkpoint names, times, and pace values
  const infoRowY = chartBaselineY + 28 * scale;

  points.forEach((pt, idx) => {
    const isStart = idx === 0;
    const isFinish = idx === points.length - 1;

    // Checkpoint pill title
    const pillW = 120 * scale;
    const pillH = 34 * scale;
    const pillX = pt.x - pillW / 2;
    const pillY = infoRowY;

    ctx.fillStyle = isFinish
      ? 'rgba(234, 179, 8, 0.25)'
      : isStart
      ? 'rgba(148, 163, 184, 0.25)'
      : 'rgba(56, 189, 248, 0.25)';

    ctx.strokeStyle = isFinish
      ? 'rgba(234, 179, 8, 0.8)'
      : isStart
      ? 'rgba(148, 163, 184, 0.7)'
      : 'rgba(56, 189, 248, 0.7)';

    roundRect(ctx, pillX, pillY, pillW, pillH, 17 * scale);
    ctx.fill();
    ctx.lineWidth = 1.5 * scale;
    roundRect(ctx, pillX, pillY, pillW, pillH, 17 * scale);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isFinish ? '#facc15' : isStart ? '#f1f5f9' : '#38bdf8';
    ctx.font = `800 ${Math.round(15 * scale)}px 'Montserrat', sans-serif`;
    ctx.fillText(`${pt.cp.label.toUpperCase()} (${pt.cp.km}K)`, pt.x, pillY + pillH / 2);

    // Large Time Text
    const timeY = pillY + pillH + 28 * scale;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8 * scale;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(26 * scale)}px 'Montserrat', 'JetBrains Mono', monospace`;
    ctx.fillText(pt.cp.time, pt.x, timeY);
    ctx.shadowBlur = 0;

    // Segment Pace info
    const paceDescY = timeY + 28 * scale;
    if (isStart) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `700 ${Math.round(15 * scale)}px 'Montserrat', sans-serif`;
      ctx.fillText('Xuất phát', pt.x, paceDescY);
    } else {
      ctx.fillStyle = isFinish ? '#fde047' : '#78ffd8';
      ctx.font = `800 ${Math.round(17 * scale)}px 'Montserrat', sans-serif`;
      ctx.fillText(`Pace: ${pt.cp.pace}/km`, pt.x, paceDescY);
    }
  });

  ctx.restore();
}
