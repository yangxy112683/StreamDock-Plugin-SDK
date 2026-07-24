/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

const $local = true, $back = false, $dom = {
    main: document.querySelector('.sdpi-wrapper'),
    gaugeLabel: document.getElementById('gaugeLabel'),
    showGaugeLabel: document.getElementById('showGaugeLabel'),
    showPercent: document.getElementById('showPercent'),
    percentFontSize: document.getElementById('percentFontSize'),
    labelFontSize: document.getElementById('labelFontSize'),
    colorLowThreshold: document.getElementById('colorLowThreshold'),
    lowThresholdItem: document.getElementById('lowThresholdItem'),
    colorHighThreshold: document.getElementById('colorHighThreshold'),
    highThresholdItem: document.getElementById('highThresholdItem')
};

function colorToString(color) {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function stringToColor(colorString) {
    if (!colorString || colorString.length !== 7 || colorString[0] !== '#') {
        return null;
    }
    const r = parseInt(colorString.slice(1, 3), 16);
    const g = parseInt(colorString.slice(3, 5), 16);
    const b = parseInt(colorString.slice(5, 7), 16);
    return (r << 16) | (g << 8) | b;
}

function clampInt(value, min, max, fallback) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

const $propEvent = {
    didReceiveSettings(data) {
        $settings = data.settings || {};

        $dom.gaugeLabel.value = $settings.gaugeLabel !== undefined ? $settings.gaugeLabel : 'Memory';
        if ($settings.gaugeLabel === undefined) $settings.gaugeLabel = 'Memory';

        $dom.showGaugeLabel.checked = $settings.showGaugeLabel !== false;
        if ($settings.showGaugeLabel === undefined) $settings.showGaugeLabel = true;

        $dom.showPercent.checked = $settings.showPercent !== false;
        if ($settings.showPercent === undefined) $settings.showPercent = true;

        $dom.percentFontSize.value = $settings.percentFontSize ?? 28;
        if ($settings.percentFontSize === undefined) $settings.percentFontSize = 28;

        $dom.labelFontSize.value = $settings.labelFontSize ?? 16;
        if ($settings.labelFontSize === undefined) $settings.labelFontSize = 16;

        if ($settings.colorLowThreshold !== undefined) {
            $dom.colorLowThreshold.value = colorToString($settings.colorLowThreshold);
        } else {
            $dom.colorLowThreshold.value = '#ffff00';
            $settings.colorLowThreshold = stringToColor('#ffff00');
        }

        if ($settings.lowThresholdItem !== undefined) {
            $dom.lowThresholdItem.value = $settings.lowThresholdItem;
        } else {
            $settings.lowThresholdItem = 5;
            $dom.lowThresholdItem.value = 5;
        }

        if ($settings.colorHighThreshold !== undefined) {
            $dom.colorHighThreshold.value = colorToString($settings.colorHighThreshold);
        } else {
            $dom.colorHighThreshold.value = '#ff0000';
            $settings.colorHighThreshold = stringToColor('#ff0000');
        }

        if ($settings.highThresholdItem !== undefined) {
            $dom.highThresholdItem.value = $settings.highThresholdItem;
        } else {
            $settings.highThresholdItem = 95;
            $dom.highThresholdItem.value = 95;
        }

        if ($websocket) {
            $websocket.saveData($settings);
        }
    },
    sendToPropertyInspector() {}
};

function persist() {
    $websocket?.saveData($settings);
}

$dom.gaugeLabel.addEventListener('change', function () {
    $settings.gaugeLabel = this.value;
    persist();
});
$dom.gaugeLabel.addEventListener('input', $.debounce(function () {
    $settings.gaugeLabel = $dom.gaugeLabel.value;
    persist();
}, 300));

$dom.showGaugeLabel.addEventListener('change', function () {
    $settings.showGaugeLabel = this.checked;
    persist();
});

$dom.showPercent.addEventListener('change', function () {
    $settings.showPercent = this.checked;
    persist();
});

$dom.percentFontSize.addEventListener('change', function () {
    $settings.percentFontSize = clampInt(this.value, 10, 48, 28);
    this.value = $settings.percentFontSize;
    persist();
});

$dom.labelFontSize.addEventListener('change', function () {
    $settings.labelFontSize = clampInt(this.value, 8, 32, 16);
    this.value = $settings.labelFontSize;
    persist();
});

$dom.colorLowThreshold.addEventListener('change', function () {
    $settings.colorLowThreshold = stringToColor(this.value);
    persist();
});

$dom.lowThresholdItem.addEventListener('change', function () {
    $settings.lowThresholdItem = clampInt(this.value, 0, 100, 5);
    this.value = $settings.lowThresholdItem;
    persist();
});

$dom.colorHighThreshold.addEventListener('change', function () {
    $settings.colorHighThreshold = stringToColor(this.value);
    persist();
});

$dom.highThresholdItem.addEventListener('change', function () {
    $settings.highThresholdItem = clampInt(this.value, 0, 100, 95);
    this.value = $settings.highThresholdItem;
    persist();
});
