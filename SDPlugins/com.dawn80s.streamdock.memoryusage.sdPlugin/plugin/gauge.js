const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const PImage = require('pureimage');

const SIZE = 144;
const TRACK_COLOR = 'rgb(55,55,55)';
const BG_COLOR = '#000000';
const TEXT_COLOR = '#FFFFFF';
const DEFAULT_GREEN = 0x00ff00;

let fontReady = null;

function colorIntToCss(color) {
    if (typeof color === 'string' && color.startsWith('#')) return color;
    const n = Number(color);
    if (!Number.isFinite(n)) return '#00ff00';
    const r = (n >> 16) & 0xff;
    const g = (n >> 8) & 0xff;
    const b = n & 0xff;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function pickRingColor(percent, settings = {}) {
    const low = Number(settings.lowThresholdItem ?? 5);
    const high = Number(settings.highThresholdItem ?? 95);
    if (percent >= high) {
        return colorIntToCss(settings.colorHighThreshold ?? 0xff0000);
    }
    if (percent >= low) {
        return colorIntToCss(settings.colorLowThreshold ?? 0xffff00);
    }
    return colorIntToCss(settings.colorNormal ?? DEFAULT_GREEN);
}

async function ensureFont() {
    if (fontReady) return fontReady;
    const candidates = [
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/System/Library/Fonts/Geneva.ttf',
        '/Library/Fonts/Arial Unicode.ttf'
    ];
    for (const file of candidates) {
        if (fs.existsSync(file)) {
            fontReady = PImage.registerFont(file, 'GaugeSans');
            await fontReady.load();
            return fontReady;
        }
    }
    throw new Error('No usable system font found for gauge text');
}

function encodePng(img) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        const stream = new PassThrough();
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
        PImage.encodePNGToStream(img, stream).catch(reject);
    });
}

function strokeArc(ctx, cx, cy, radius, startAngle, endAngle, segments = 64) {
    const span = endAngle - startAngle;
    if (Math.abs(span) < 1e-6) return;
    const steps = Math.max(2, Math.ceil(segments * Math.abs(span) / (Math.PI * 2)));
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const a = startAngle + (span * i) / steps;
        const x = cx + radius * Math.cos(a);
        const y = cy + radius * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

/**
 * Draw original-style Memory circular gauge:
 * black bg + thick ring + optional center "NN%" + optional bottom label
 */
async function renderMemoryGauge(percent, settings = {}) {
    await ensureFont();
    const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    const ringColor = pickRingColor(p, settings);
    const showPercent = settings.showPercent !== false;
    const showGaugeLabel = settings.showGaugeLabel !== false;
    const gaugeLabel = String(settings.gaugeLabel ?? 'Memory');
    const percentFontSize = Math.max(10, Math.min(48, Number(settings.percentFontSize) || 28));
    const labelFontSize = Math.max(8, Math.min(32, Number(settings.labelFontSize) || 16));

    const img = PImage.make(SIZE, SIZE);
    const ctx = img.getContext('2d');

    // background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, SIZE, SIZE);

    const cx = SIZE / 2;
    // If no bottom label, center the ring vertically
    const cy = showGaugeLabel && gaugeLabel ? 62 : SIZE / 2;
    const radius = 46;
    const lineWidth = 12;

    // full track
    ctx.strokeStyle = TRACK_COLOR;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'butt';
    strokeArc(ctx, cx, cy, radius, -Math.PI / 2, (Math.PI * 3) / 2);

    // progress arc: start at top, clockwise
    if (p > 0) {
        const start = -Math.PI / 2;
        const end = start + (Math.PI * 2 * p) / 100;
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'butt';
        strokeArc(ctx, cx, cy, radius, start, end);
    }

    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (showPercent) {
        ctx.font = `${percentFontSize}pt GaugeSans`;
        ctx.fillText(`${p}%`, cx, cy);
    }

    if (showGaugeLabel && gaugeLabel) {
        ctx.font = `${labelFontSize}pt GaugeSans`;
        ctx.fillText(gaugeLabel, cx, 128);
    }

    const png = await encodePng(img);
    return `data:image/png;base64,${png.toString('base64')}`;
}

module.exports = {
    renderMemoryGauge,
    pickRingColor,
    colorIntToCss
};
