const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');

const currentDir = __dirname;
const parentDir = path.join(currentDir, '..');
const PluginName = path.basename(parentDir);
const PluginPath = path.join(
    process.env.HOME,
    'Library/Application Support/HotSpot/StreamDock/plugins',
    PluginName
);

function isStreamDockRunning() {
    try {
        const out = execSync('pgrep -f "/Applications/StreamDock.app/Contents/MacOS/StreamDock"', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        });
        return out.trim().length > 0;
    } catch {
        return false;
    }
}

console.log('Installing StreamDock plugin to:', PluginPath);

try {
    if (isStreamDockRunning()) {
        console.error([
            '',
            'ERROR: StreamDock is currently running.',
            'Installing/replacing plugins while StreamDock is open can leave it stuck on quit',
            '(process remains alive → Dock icon cannot relaunch).',
            '',
            'Please fully quit StreamDock first, then re-run: npm run build',
            'If it already refuses to open: killall -9 StreamDock && open -a StreamDock',
            ''
        ].join('\n'));
        process.exit(2);
    }

    const buildDir = path.join(currentDir, 'build');
    if (!fs.existsSync(path.join(buildDir, 'index.js'))) {
        throw new Error('build/index.js missing — run ncc build first');
    }

    // Remove quarantine/disabled leftovers
    const disabled = PluginPath + '.disabled-pending-fix';
    if (fs.existsSync(disabled)) {
        fs.removeSync(disabled);
    }

    fs.removeSync(PluginPath);
    fs.ensureDirSync(PluginPath);

    for (const name of ['manifest.json', 'en.json', 'zh_CN.json', 'readme.md', 'README.md', 'static', 'propertyInspector']) {
        const src = path.join(parentDir, name);
        if (fs.existsSync(src)) {
            fs.copySync(src, path.join(PluginPath, name));
        }
    }

    fs.ensureDirSync(path.join(PluginPath, 'plugin'));
    fs.copySync(buildDir, path.join(PluginPath, 'plugin'));

    console.log(`Plugin "${PluginName}" installed successfully.`);
    console.log('Start StreamDock, then add 「内存使用率」 from category 「系统监控」.');
} catch (err) {
    console.error(`Install failed for "${PluginName}":`, err);
    process.exit(1);
}
