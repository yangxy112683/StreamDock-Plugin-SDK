const { Plugins, Actions, log } = require('./utils/plugin');
const { getMemoryUsage, getLastMemoryUsage } = require('./memory');
const { renderMemoryGauge } = require('./gauge');

const plugin = new Plugins();

const POLL_MS = 1000;
const DEFAULTS = {
    lowThresholdItem: 5,
    highThresholdItem: 95,
    colorLowThreshold: 0xffff00,
    colorHighThreshold: 0xff0000,
    colorNormal: 0x00ff00,
    gaugeLabel: 'Memory',
    showGaugeLabel: true,
    showPercent: true,
    percentFontSize: 28,
    labelFontSize: 16
};

/** @type {Map<string, object>} */
const contexts = new Map();
/** @type {Map<string, string>} last image signature per context to skip redundant setImage */
const lastSig = new Map();
let timer = null;
let lastAlertAt = 0;
let refreshing = false;
let shutDown = false;

function mergeSettings(raw) {
    return {
        ...DEFAULTS,
        ...(raw || {})
    };
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function shutdown() {
    if (shutDown) return;
    shutDown = true;
    stopTimer();
    contexts.clear();
    lastSig.clear();
}

Plugins.onShutdown = shutdown;
process.on('SIGTERM', () => { shutdown(); process.exit(0); });
process.on('SIGINT', () => { shutdown(); process.exit(0); });

async function refreshAll() {
    if (shutDown || refreshing || contexts.size === 0) return;
    refreshing = true;
    let result;
    try {
        result = await getMemoryUsage();
    } catch (err) {
        log.error('getMemoryUsage failed:', err);
        result = getLastMemoryUsage();
        const now = Date.now();
        if (!result && now - lastAlertAt > 10000) {
            lastAlertAt = now;
            for (const context of contexts.keys()) {
                plugin.showAlert(context);
            }
        }
        if (!result) {
            refreshing = false;
            return;
        }
    } finally {
        refreshing = false;
    }

    if (shutDown) return;

    for (const [context, settings] of contexts.entries()) {
        try {
            const sig = [
                result.percent,
                settings.lowThresholdItem,
                settings.highThresholdItem,
                settings.colorLowThreshold,
                settings.colorHighThreshold,
                settings.gaugeLabel,
                settings.showGaugeLabel,
                settings.showPercent,
                settings.percentFontSize,
                settings.labelFontSize
            ].join('|');
            if (lastSig.get(context) === sig) continue;
            const image = await renderMemoryGauge(result.percent, settings);
            if (shutDown) return;
            // Do not call setTitle — UserTitleEnabled lets StreamDock manage the key title/font
            plugin.setImage(context, image);
            lastSig.set(context, sig);
        } catch (err) {
            log.error('renderMemoryGauge failed:', err);
        }
    }
}

function startTimer() {
    if (timer || shutDown) return;
    refreshAll();
    timer = setInterval(refreshAll, POLL_MS);
    if (typeof timer.unref === 'function') timer.unref();
}

function stopTimerIfIdle() {
    if (contexts.size === 0) {
        stopTimer();
    }
}

plugin.action = new Actions({
    default: { ...DEFAULTS },
    _willAppear({ context, payload }) {
        if (shutDown) return;
        contexts.set(context, mergeSettings(payload?.settings));
        lastSig.delete(context);
        startTimer();
        refreshAll();
    },
    _willDisappear({ context }) {
        contexts.delete(context);
        lastSig.delete(context);
        stopTimerIfIdle();
    },
    _didReceiveSettings({ context, payload }) {
        if (!contexts.has(context) || shutDown) return;
        contexts.set(context, mergeSettings(payload?.settings));
        lastSig.delete(context);
        refreshAll();
    }
});
