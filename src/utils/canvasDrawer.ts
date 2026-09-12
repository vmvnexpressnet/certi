import { Runner, CertificateConfig } from '../types';

export interface DrawOptions {
  canvas: HTMLCanvasElement;
  runner: Runner;
  config: CertificateConfig;
  customImageObj?: HTMLImageElement | null;
  generatedImageObj?: HTMLImageElement | null;
  scale?: number; // scale multiplier for export
}

/**
 * Draws the finisher certificate onto the provided canvas.
 */
export const drawCertificate = async (options: DrawOptions): Promise<void> => {
  const { canvas, runner, config, customImageObj, generatedImageObj } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // 1. Draw Background
  if (config.bgMode === 'custom' && customImageObj && customImageObj.complete && customImageObj.naturalWidth > 0) {
    // Draw user uploaded image
    ctx.drawImage(customImageObj, 0, 0, width, height);
  } else if (config.bgMode === 'generated' && generatedImageObj && generatedImageObj.complete && generatedImageObj.naturalWidth > 0) {
    ctx.drawImage(generatedImageObj, 0, 0, width, height);
  } else {
    // Render official graphic certificate layout (Canvas Vector Representation)
    drawOfficialVectorBackground(ctx, width, height);
  }

  // 2. Draw Dynamic Data
  // In the uploaded certificate, the designated blank area is centered vertically around 32% - 46% of height.
  // We use config.nameY, config.distanceY, config.statsY (as percentage of height, default ~34%, 39%, 44%)
  
  const centerY = height * (config.nameY / 100);
  const distY = height * (config.distanceY / 100);
  const statsY = height * (config.statsY / 100);
  const fontMultiplier = config.fontSizeMultiplier || 1.0;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1/ Tên Vận động viên (giới tính bên cạnh). VD: Bùi Minh Đức (M)
  const displayName = config.uppercaseName ? runner.name.toUpperCase() : runner.name;
  const genderTag = runner.gender ? ` (${runner.gender})` : '';
  const fullNameWithGender = `${displayName}${genderTag}`;

  // Font setup for Name - bold nhẹ (600) theo yêu cầu
  const nameFontSize = Math.round(width * 0.052 * fontMultiplier);
  ctx.font = `600 ${nameFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;

  // Draw subtle shadow for contrast
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  // Màu tên theo yêu cầu: #78ffd8
  ctx.fillStyle = config.nameColor || '#78ffd8';
  ctx.fillText(fullNameWithGender, width / 2, centerY);

  // 2/ Cự ly chạy của VĐV. VD: Đã hoàn thành | Has Completed Half Marathon
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  // Cỡ chữ cự ly to lên bằng với text kết quả (valFontSize: width * 0.033)
  const distFontSize = Math.round(width * 0.033 * fontMultiplier);
  ctx.font = `500 ${distFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;

  // Chữ đã hoàn thành ... để màu trắng bình thường và không có gạch dưới
  ctx.fillStyle = config.distanceColor || '#FFFFFF';
  const distText = runner.distanceDisplay || `Đã hoàn thành | Has Completed ${runner.distance}`;
  ctx.fillText(distText, width / 2, distY);

  // Bỏ gạch dưới (chỉ vẽ nếu người dùng chủ động bật)
  if (config.showDistanceUnderline) {
    const sepWidth = width * 0.28;
    const sepY = distY + distFontSize * 1.3;
    const grad = ctx.createLinearGradient(width / 2 - sepWidth / 2, sepY, width / 2 + sepWidth / 2, sepY);
    grad.addColorStop(0, 'rgba(56, 239, 125, 0)');
    grad.addColorStop(0.5, config.accentColor || 'rgba(56, 239, 125, 0.7)');
    grad.addColorStop(1, 'rgba(56, 239, 125, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - sepWidth / 2, sepY);
    ctx.lineTo(width / 2 + sepWidth / 2, sepY);
    ctx.stroke();
  }

  // 3/ Các thành tích: BIB NUMBER, CHIPTIME, FINISH TIME (GunTime), OVERALL RANK, GENDER RANK, AG, AGE GROUP RANK
  const stats = [
    { label: 'BIB NUMBER', val: String(runner.bib || '-') },
    { label: 'CHIPTIME', val: String(runner.chipTime || '--:--:--') },
    { label: 'FINISH TIME', val: String(runner.gunTime || '--:--:--') },
    { label: 'OVERALL RANK', val: String(runner.overallRank || '-') },
    { label: 'GENDER RANK', val: String(runner.genderRank || '-') },
    { label: 'AG', val: String(runner.ag || '-') },
    { label: 'AGE GROUP RANK', val: String(runner.ageGroupRank || '-') },
  ];

  const isVertical = (config.statsLayout || 'vertical') === 'vertical';

  if (isVertical) {
    // ====================================================
    // BỐ CỤC DẠNG DỌC (VERTICAL LIST - KHÔNG BACKGROUND)
    // Ví dụ:
    // BIB NUMBER : 90110
    // CHIPTIME : 6:25:24
    // FINISH TIME : 6:25:47
    // OVERALL RANK : 292
    // GENDER RANK : 238
    // AG : M40-49
    // AGE GROUP RANK : 100
    // ====================================================
    const lineSpacing = config.statsLineSpacing || 1.0;
    const rowHeight = Math.max(10, Math.round(width * 0.046 * fontMultiplier * lineSpacing) - 3);
    const labelFontSize = Math.round(width * 0.027 * fontMultiplier);
    const valFontSize = Math.round(width * 0.033 * fontMultiplier);

    // Tính toán độ rộng label và value để căn giữa hoàn hảo
    ctx.font = `600 ${labelFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
    let maxLabelW = 0;
    stats.forEach((s) => {
      const w = ctx.measureText(`${s.label} :`).width;
      if (w > maxLabelW) maxLabelW = w;
    });

    // Text kết quả bỏ bold đi (regular 500)
    ctx.font = `500 ${valFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
    let maxValW = 0;
    stats.forEach((s) => {
      const w = ctx.measureText(` ${s.val}`).width;
      if (w > maxValW) maxValW = w;
    });

    const gap = Math.round(width * 0.030);
    const totalBlockW = maxLabelW + gap + maxValW;
    const splitX = Math.round((width - totalBlockW) / 2 + maxLabelW);

    const totalH = stats.length * rowHeight;
    const startY = statsY - totalH * 0.5 + 3;

    // Nếu người dùng chủ động bật khung nền (mặc định tắt)
    if (config.showStatsCard) {
      const cardPaddingX = Math.round(width * 0.045);
      const cardPaddingY = Math.round(rowHeight * 0.35);
      const cardW = Math.min(width * 0.90, totalBlockW + cardPaddingX * 2);
      const cardH = totalH + cardPaddingY * 1.6;
      const cardStartX = (width - cardW) / 2;
      const cardStartY = startY - cardPaddingY * 0.5;

      ctx.fillStyle = 'rgba(6, 26, 48, 0.62)';
      roundRect(ctx, cardStartX, cardStartY, cardW, cardH, 14);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1;
      roundRect(ctx, cardStartX, cardStartY, cardW, cardH, 14);
      ctx.stroke();
    }

    stats.forEach((stat, i) => {
      const currentY = startY + rowHeight * (i + 0.5);

      // 1. Label: Chữ trắng (#FFFFFF)
      ctx.font = `600 ${labelFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = config.statsLabelColor || '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1.5;
      ctx.fillText(`${stat.label} :`, splitX, currentY);

      // 2. Value: Số màu #fddfac - bỏ bold (regular/medium 500)
      ctx.font = `500 ${valFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = config.statsValueColor || '#fddfac';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 1.5;
      ctx.fillText(` ${stat.val}`, splitX + gap * 0.35, currentY);
    });
  } else {
    // ====================================================
    // BỐ CỤC DẠNG LƯỚI NGANG (HORIZONTAL GRID)
    // ====================================================
    const containerW = width * 0.90;
    const colW = containerW / stats.length;
    const startX = (width - containerW) / 2;

    const cardH = width * 0.095 * fontMultiplier;
    const cardY = statsY - cardH * 0.45;
    
    if (config.showStatsCard) {
      ctx.fillStyle = 'rgba(6, 26, 48, 0.65)';
      roundRect(ctx, startX, cardY, containerW, cardH, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      roundRect(ctx, startX, cardY, containerW, cardH, 12);
      ctx.stroke();
    }

    stats.forEach((stat, i) => {
      const colCenterX = startX + colW * i + colW / 2;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 1.5;

      const labelFontSize = Math.round(width * 0.015 * fontMultiplier);
      ctx.font = `600 ${labelFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = config.statsLabelColor || '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(stat.label, colCenterX, cardY + cardH * 0.32);

      const valFontSize = Math.round(width * 0.024 * fontMultiplier);
      ctx.font = `500 ${valFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = config.statsValueColor || '#fddfac';
      ctx.textAlign = 'center';
      ctx.fillText(stat.val, colCenterX, cardY + cardH * 0.70);
    });
  }

  ctx.restore();
};

/**
 * Draws the vector layout of VnExpress Marathon Quy Nhon 2026 Certificate
 */
function drawOfficialVectorBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Deep ocean gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#041a33');
  bgGrad.addColorStop(0.25, '#052b4c');
  bgGrad.addColorStop(0.5, '#073e66');
  bgGrad.addColorStop(0.75, '#042747');
  bgGrad.addColorStop(1, '#02162a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle ocean wave texture / light highlights
  ctx.save();
  const radGrad = ctx.createRadialGradient(width * 0.5, height * 0.2, 50, width * 0.5, height * 0.2, width * 0.8);
  radGrad.addColorStop(0, 'rgba(20, 110, 160, 0.25)');
  radGrad.addColorStop(1, 'rgba(4, 26, 51, 0)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, width, height * 0.5);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // --- TOP LOGOS ROW ---
  const topY = height * 0.055;
  ctx.font = "bold 26px 'Montserrat', sans-serif";
  ctx.fillStyle = '#FFFFFF';
  
  // Left: VNEXPRESS logo styling
  ctx.font = "bold 20px 'Montserrat', sans-serif";
  ctx.fillText("VNEXPRESS", width * 0.22, topY);
  
  // Center: FPT Online
  ctx.font = "bold 22px 'Montserrat', sans-serif";
  ctx.fillStyle = '#f97316';
  ctx.fillText("FPT", width * 0.48, topY);
  ctx.font = "14px 'Montserrat', sans-serif";
  ctx.fillStyle = '#d1d5db';
  ctx.fillText("Online", width * 0.55, topY);

  // Right: VnExpress Marathon
  ctx.font = "bold 18px 'Montserrat', sans-serif";
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText("VnExpress Marathon", width * 0.78, topY);

  // --- EVENT TITLE ---
  const titleY = height * 0.115;
  ctx.font = "700 24px 'Montserrat', sans-serif";
  ctx.fillStyle = '#e2e8f0';
  ctx.letterSpacing = "2px";
  ctx.fillText("VNEXPRESS MARATHON", width / 2, titleY);

  // QUY NHON 20 26
  ctx.font = "900 68px 'Montserrat', sans-serif";
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText("QUY NHON", width / 2 - 38, titleY + 52);

  // Year stacked
  ctx.font = "900 28px 'Montserrat', sans-serif";
  ctx.fillStyle = '#38ef7d';
  ctx.fillText("20", width / 2 + 185, titleY + 38);
  ctx.fillText("26", width / 2 + 185, titleY + 66);

  // --- FINISHER CERTIFICATE ---
  const finisherY = height * 0.205;
  ctx.font = "900 64px 'Montserrat', sans-serif";
  
  // Finisher gradient
  const finisherGrad = ctx.createLinearGradient(width * 0.3, 0, width * 0.7, 0);
  finisherGrad.addColorStop(0, '#2dd4bf');
  finisherGrad.addColorStop(1, '#a7f3d0');
  ctx.fillStyle = finisherGrad;
  ctx.fillText("FINISHER", width / 2, finisherY);

  ctx.font = "900 60px 'Montserrat', sans-serif";
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText("CERTIFICATE", width / 2, finisherY + 58);

  // Thin glow line
  const glowY = finisherY + 95;
  const lineGrad = ctx.createLinearGradient(width * 0.2, glowY, width * 0.8, glowY);
  lineGrad.addColorStop(0, 'rgba(45, 212, 191, 0)');
  lineGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.8)');
  lineGrad.addColorStop(1, 'rgba(45, 212, 191, 0)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.2, glowY);
  ctx.lineTo(width * 0.8, glowY);
  ctx.stroke();

  // Subtext: BAN TỔ CHỨC CHỨNG NHẬN / PROUDLY CERTIFIES...
  const certTextY = glowY + 35;
  ctx.font = "700 20px 'Montserrat', sans-serif";
  ctx.fillStyle = '#f8fafc';
  ctx.fillText("BAN TỔ CHỨC CHỨNG NHẬN", width / 2, certTextY);

  ctx.font = "500 16px 'Montserrat', sans-serif";
  ctx.fillStyle = '#94a3b8';
  ctx.fillText("PROUDLY CERTIFIES THE HOLDER OF THIS CERTIFICATE", width / 2, certTextY + 24);

  // --- SIGNATURE SECTION (Lower middle, around 58% - 66%) ---
  const signDateY = height * 0.575;
  ctx.font = "600 20px 'Montserrat', sans-serif";
  ctx.fillStyle = '#f1f5f9';
  ctx.fillText("Quy Nhơn, ngày 13 tháng 9 năm 2026", width / 2, signDateY);

  const signTitleY = signDateY + 45;
  const leftX = width * 0.30;
  const rightX = width * 0.70;

  // Sign titles
  ctx.font = "700 16px 'Montserrat', sans-serif";
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText("TRƯỞNG BAN TỔ CHỨC", leftX, signTitleY);
  ctx.fillText("GIÁM ĐỐC ĐƯỜNG CHẠY", rightX, signTitleY);

  ctx.font = "500 12px 'Montserrat', sans-serif";
  ctx.fillStyle = '#94a3b8';
  ctx.fillText("HEAD OF THE ORGANIZING BOARD", leftX, signTitleY + 18);
  ctx.fillText("RACE DIRECTOR", rightX, signTitleY + 18);

  // Signatures representation
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  
  // Left signature (Phạm Trọng Nghiệp)
  ctx.beginPath();
  ctx.moveTo(leftX - 45, signTitleY + 58);
  ctx.bezierCurveTo(leftX - 25, signTitleY + 35, leftX - 10, signTitleY + 80, leftX + 15, signTitleY + 50);
  ctx.bezierCurveTo(leftX + 25, signTitleY + 40, leftX + 50, signTitleY + 55, leftX + 80, signTitleY + 52);
  ctx.stroke();

  // Right signature (Dương Hải Anh)
  ctx.beginPath();
  ctx.moveTo(rightX - 35, signTitleY + 70);
  ctx.lineTo(rightX - 15, signTitleY + 35);
  ctx.lineTo(rightX + 5, signTitleY + 75);
  ctx.lineTo(rightX + 20, signTitleY + 40);
  ctx.lineTo(rightX + 45, signTitleY + 68);
  ctx.stroke();

  // Signer names
  ctx.font = "700 18px 'Montserrat', sans-serif";
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText("Phạm Trọng Nghiệp", leftX, signTitleY + 95);
  ctx.fillText("Dương Hải Anh", rightX, signTitleY + 95);

  // --- BOTTOM COASTAL ROAD GRAPHIC (68% - 100%) ---
  drawCoastalRoad(ctx, width, height);

  ctx.restore();
}

/**
 * Draws the aerial coastal highway / road graphic at the bottom
 */
function drawCoastalRoad(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const bottomStartY = height * 0.70;

  // Ocean coastline gradient
  const seaGrad = ctx.createLinearGradient(0, bottomStartY, width, height);
  seaGrad.addColorStop(0, '#0284c7');
  seaGrad.addColorStop(0.4, '#06b6d4');
  seaGrad.addColorStop(0.7, '#0891b2');
  seaGrad.addColorStop(1, '#0e7490');
  ctx.fillStyle = seaGrad;
  
  ctx.beginPath();
  ctx.moveTo(0, bottomStartY);
  ctx.bezierCurveTo(width * 0.3, bottomStartY - 30, width * 0.7, bottomStartY + 20, width, bottomStartY);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Coastline rocks / sand shore
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.moveTo(width * 0.45, bottomStartY + 25);
  ctx.bezierCurveTo(width * 0.55, bottomStartY + 45, width * 0.65, bottomStartY + 95, width * 0.58, bottomStartY + 150);
  ctx.bezierCurveTo(width * 0.52, bottomStartY + 210, width * 0.62, bottomStartY + 280, width * 0.55, height);
  ctx.lineTo(width * 0.40, height);
  ctx.closePath();
  ctx.fill();

  // Green island foliage
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.ellipse(width * 0.35, bottomStartY + 160, width * 0.15, height * 0.08, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Curved road "07" structure
  const roadWidth = width * 0.18;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = roadWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(0, bottomStartY + 40);
  ctx.lineTo(width * 0.45, bottomStartY + 40);
  ctx.bezierCurveTo(width * 0.58, bottomStartY + 40, width * 0.55, bottomStartY + 180, width * 0.32, height);
  ctx.stroke();

  // Road white lane markings
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 16]);
  ctx.beginPath();
  ctx.moveTo(0, bottomStartY + 40);
  ctx.lineTo(width * 0.45, bottomStartY + 40);
  ctx.bezierCurveTo(width * 0.58, bottomStartY + 40, width * 0.55, bottomStartY + 180, width * 0.32, height);
  ctx.stroke();
  ctx.setLineDash([]); // reset

  // Road outer curb
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, bottomStartY + 40 - roadWidth / 2);
  ctx.lineTo(width * 0.45, bottomStartY + 40 - roadWidth / 2);
  ctx.bezierCurveTo(width * 0.58 + roadWidth / 2, bottomStartY + 40, width * 0.55 + roadWidth / 2, bottomStartY + 180, width * 0.32 + roadWidth / 2, height);
  ctx.stroke();
}

/**
 * Utility for drawing rounded rectangles on canvas
 */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

export interface PhotoFilters {
  brightness?: number; // default 100 (50 - 150)
  contrast?: number;   // default 100 (50 - 150)
  saturation?: number; // default 100 (0 - 200)
  warmth?: number;     // default 0 (-50 to +50)
  smoothing?: number;  // default 0 (0 to 10)
}

export interface DrawCollageOptions {
  canvas: HTMLCanvasElement;
  runner: Runner;
  config: CertificateConfig;
  personalImageObj?: HTMLImageElement | null;
  photoZoom?: number; // default 1.0
  photoOffsetX?: number; // offset in px
  photoOffsetY?: number; // offset in px
  photoSide?: 'left' | 'right'; // default 'left' (photo 2W on left, cert 1W on right)
  photoFilters?: PhotoFilters; // user-adjusted photo filters
  customImageObj?: HTMLImageElement | null;
  generatedImageObj?: HTMLImageElement | null;
}

/**
 * Draws the Certificate Collage: Personal Photo (2x Certificate Width) + Finisher Certificate (1x Width)
 * Total Width = 3x Certificate Width, Height = Certificate Height (1x Height).
 * The personal photo area shows solely the runner's photo with optional manual user adjustments.
 */
export const drawCollageFrame = async (options: DrawCollageOptions): Promise<void> => {
  const {
    canvas,
    runner,
    config,
    personalImageObj,
    photoZoom = 1.0,
    photoOffsetX = 0,
    photoOffsetY = 0,
    photoSide = 'left',
    photoFilters,
    customImageObj,
    generatedImageObj,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Base certificate natural dimensions
  const certW = (customImageObj && customImageObj.complete && customImageObj.naturalWidth > 0)
    ? customImageObj.naturalWidth
    : 1080;
  const certH = (customImageObj && customImageObj.complete && customImageObj.naturalHeight > 0)
    ? customImageObj.naturalHeight
    : 2400;

  // Personal photo has double the width of the certificate, same height
  const photoW = certW * 2;
  const photoH = certH;

  // Combined total dimensions: 3x width, 1x height
  const totalW = photoW + certW;
  const totalH = certH;

  if (canvas.width !== totalW || canvas.height !== totalH) {
    canvas.width = totalW;
    canvas.height = totalH;
  }

  // Clear canvas
  ctx.clearRect(0, 0, totalW, totalH);

  const isPhotoLeft = photoSide === 'left';
  const photoX = isPhotoLeft ? 0 : certW;
  const certX = isPhotoLeft ? photoW : 0;

  // 1. Draw Certificate on its designated 1/3 section
  const offscreenCert = document.createElement('canvas');
  offscreenCert.width = certW;
  offscreenCert.height = certH;

  await drawCertificate({
    canvas: offscreenCert,
    runner,
    config,
    customImageObj,
    generatedImageObj,
  });

  ctx.drawImage(offscreenCert, certX, 0, certW, totalH);

  // 2. Draw Personal Photo on its designated 2/3 section
  ctx.save();
  ctx.beginPath();
  ctx.rect(photoX, 0, photoW, totalH);
  ctx.clip();

  // Draw background color #f4f4f4 underneath the inserted photo
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(photoX, 0, photoW, totalH);

  if (personalImageObj && personalImageObj.complete && personalImageObj.naturalWidth > 0) {
    const imgW = personalImageObj.naturalWidth;
    const imgH = personalImageObj.naturalHeight;

    // Cover scale to fill the 2W x 1H area
    const baseScale = Math.max(photoW / imgW, totalH / imgH);
    const scale = baseScale * photoZoom;
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const centerX = photoX + photoW / 2 + photoOffsetX;
    const centerY = totalH / 2 + photoOffsetY;

    // Prepare manual filter values (default is 100% / 0 - no automatic filter)
    const brightness = photoFilters?.brightness ?? 100;
    const contrast = photoFilters?.contrast ?? 100;
    const saturation = photoFilters?.saturation ?? 100;
    const smoothing = photoFilters?.smoothing ?? 0;
    const warmth = photoFilters?.warmth ?? 0;

    const filterParts: string[] = [];
    if (brightness !== 100) filterParts.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filterParts.push(`contrast(${contrast}%)`);
    if (saturation !== 100) filterParts.push(`saturate(${saturation}%)`);
    if (smoothing > 0) {
      // 0-10 smoothing mapped to soft radius on 2400px canvas
      filterParts.push(`blur(${smoothing * 1.5}px)`);
    }

    if (filterParts.length > 0) {
      ctx.filter = filterParts.join(' ');
    } else {
      ctx.filter = 'none';
    }

    ctx.drawImage(personalImageObj, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
    ctx.filter = 'none';

    // Warmth / Color temperature tint (if user adjusted)
    if (warmth !== 0) {
      ctx.save();
      if (warmth > 0) {
        ctx.fillStyle = `rgba(255, 175, 75, ${Math.min(0.28, (warmth / 50) * 0.22)})`;
        ctx.globalCompositeOperation = 'color';
        ctx.fillRect(photoX, 0, photoW, totalH);
      } else {
        ctx.fillStyle = `rgba(56, 189, 248, ${Math.min(0.28, (Math.abs(warmth) / 50) * 0.22)})`;
        ctx.globalCompositeOperation = 'color';
        ctx.fillRect(photoX, 0, photoW, totalH);
      }
      ctx.restore();
    }
  } else {
    // Elegant light placeholder background #f4f4f4
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(photoX, 0, photoW, totalH);

    // Decorative subtle rings
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(photoX + photoW / 2, totalH * 0.44, 340, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#d4d4d4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(photoX + photoW / 2, totalH * 0.44, 400, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle photo icon circle
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(photoX + photoW / 2, totalH * 0.38, 64, 0, Math.PI * 2);
    ctx.fill();

    // Guidance text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${Math.round(totalH * 0.024)}px 'Montserrat', sans-serif`;
    ctx.fillText('ẢNH CÁ NHÂN (TỈ LỆ 2:1 CẠNH CERTIFICATE)', photoX + photoW / 2, totalH * 0.52);

    ctx.fillStyle = '#0f766e';
    ctx.font = `600 ${Math.round(totalH * 0.016)}px 'Montserrat', sans-serif`;
    ctx.fillText('Bấm "Chọn ảnh cá nhân" hoặc kéo thả ảnh chạy bộ vào đây', photoX + photoW / 2, totalH * 0.56);

    ctx.fillStyle = '#64748b';
    ctx.font = `500 ${Math.round(totalH * 0.013)}px 'Montserrat', sans-serif`;
    ctx.fillText('Có thể kéo chuột trực tiếp trên ảnh để căn chỉnh & dùng thanh trượt để phóng to', photoX + photoW / 2, totalH * 0.595);
  }

  ctx.restore();
};

export interface DrawSquareFrameOptions {
  canvas: HTMLCanvasElement;
  runner: Runner;
  config: CertificateConfig;
  personalImageObj?: HTMLImageElement | null;
  photoZoom?: number; // default 1.0
  photoOffsetX?: number; // offset in px
  photoOffsetY?: number; // offset in px
  photoSide?: 'left' | 'right'; // default 'left'
  showPhotoBadge?: boolean; // default true
  customImageObj?: HTMLImageElement | null;
  generatedImageObj?: HTMLImageElement | null;
}

/**
 * Draws the 1:1 Square Social Media Frame (Width = 2x certificate width, sharp square corners)
 * One half is user's personal running photo, the other half is the finisher certificate.
 */
export const drawSquareSocialFrame = async (options: DrawSquareFrameOptions): Promise<void> => {
  const {
    canvas,
    runner,
    config,
    personalImageObj,
    photoZoom = 1.0,
    photoOffsetX = 0,
    photoOffsetY = 0,
    photoSide = 'left',
    showPhotoBadge = true,
    customImageObj,
    generatedImageObj,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width; // Square canvas: width == height (e.g. 2160)
  const halfWidth = size / 2; // e.g. 1080 (Matches cert width, so frame is double cert width!)

  // Clear canvas
  ctx.clearRect(0, 0, size, size);

  const photoX = photoSide === 'left' ? 0 : halfWidth;
  const certX = photoSide === 'left' ? halfWidth : 0;

  // 1. Draw Certificate on its designated half
  const offscreenCert = document.createElement('canvas');
  offscreenCert.width = halfWidth;
  offscreenCert.height = size;

  await drawCertificate({
    canvas: offscreenCert,
    runner,
    config,
    customImageObj,
    generatedImageObj,
  });

  ctx.drawImage(offscreenCert, certX, 0, halfWidth, size);

  // 2. Draw Personal Photo on the other half
  ctx.save();
  ctx.beginPath();
  ctx.rect(photoX, 0, halfWidth, size);
  ctx.clip();

  // Background color #f4f4f4 under photo
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(photoX, 0, halfWidth, size);

  if (personalImageObj && personalImageObj.complete && personalImageObj.naturalWidth > 0) {
    const imgW = personalImageObj.naturalWidth;
    const imgH = personalImageObj.naturalHeight;

    // Cover scale
    const baseScale = Math.max(halfWidth / imgW, size / imgH);
    const scale = baseScale * photoZoom;
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const centerX = photoX + halfWidth / 2 + photoOffsetX;
    const centerY = size / 2 + photoOffsetY;

    ctx.drawImage(personalImageObj, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
  } else {
    // Athletic gradient placeholder background
    const placeholderGrad = ctx.createLinearGradient(photoX, 0, photoX + halfWidth, size);
    placeholderGrad.addColorStop(0, '#0a1d37');
    placeholderGrad.addColorStop(0.5, '#072448');
    placeholderGrad.addColorStop(1, '#051329');
    ctx.fillStyle = placeholderGrad;
    ctx.fillRect(photoX, 0, halfWidth, size);

    // Decorative track curves
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(photoX + halfWidth / 2, size * 0.42, 220, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle runner graphic
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(photoX + halfWidth / 2, size * 0.36, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(photoX + halfWidth / 2 - 50, size * 0.44);
    ctx.lineTo(photoX + halfWidth / 2 + 50, size * 0.44);
    ctx.lineTo(photoX + halfWidth / 2 + 80, size * 0.58);
    ctx.lineTo(photoX + halfWidth / 2 - 80, size * 0.58);
    ctx.closePath();
    ctx.fill();

    // Guidance text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(size * 0.024)}px 'Montserrat', sans-serif`;
    ctx.fillText('ẢNH CHẠY BỘ CỦA BẠN', photoX + halfWidth / 2, size * 0.63);

    ctx.fillStyle = '#38bdf8';
    ctx.font = `600 ${Math.round(size * 0.016)}px 'Montserrat', sans-serif`;
    ctx.fillText('Nhấp vào "Chọn ảnh cá nhân" hoặc Kéo thả ảnh vào đây', photoX + halfWidth / 2, size * 0.67);
  }

  // 3. Optional Overlay Badge on the Photo
  if (showPhotoBadge) {
    // Bottom scrim gradient
    const scrimHeight = size * 0.24;
    const scrimGrad = ctx.createLinearGradient(0, size - scrimHeight, 0, size);
    scrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    scrimGrad.addColorStop(0.35, 'rgba(3, 15, 30, 0.7)');
    scrimGrad.addColorStop(1, 'rgba(2, 10, 20, 0.95)');
    ctx.fillStyle = scrimGrad;
    ctx.fillRect(photoX, size - scrimHeight, halfWidth, scrimHeight);

    // Pill badge: FINISHER 2026
    const badgeY = size - scrimHeight + 35;
    const badgeW = 240;
    const badgeH = 42;
    const badgeX = photoX + (halfWidth - badgeW) / 2;

    ctx.fillStyle = 'rgba(6, 182, 212, 0.95)';
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 21);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 18px 'Montserrat', sans-serif`;
    ctx.fillText('★ FINISHER 2026 ★', photoX + halfWidth / 2, badgeY + badgeH / 2);

    // Runner Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(size * 0.022)}px 'Montserrat', sans-serif`;
    ctx.fillText(runner.name.toUpperCase(), photoX + halfWidth / 2, size - 100);

    // Distance & Time
    ctx.fillStyle = '#fddfac';
    ctx.font = `600 ${Math.round(size * 0.016)}px 'Montserrat', sans-serif`;
    ctx.fillText(`${runner.distance} • BIB: ${runner.bib} • Chip: ${runner.chipTime}`, photoX + halfWidth / 2, size - 60);
  }

  ctx.restore();
};
