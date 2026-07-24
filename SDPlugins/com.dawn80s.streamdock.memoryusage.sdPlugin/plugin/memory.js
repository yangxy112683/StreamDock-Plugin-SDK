const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

let lastResult = null;

function parseVmStat(output) {
    const map = {};
    for (const line of output.split('\n')) {
        const m = line.match(/^(.+?):\s+(\d+)/);
        if (m) {
            map[m[1].trim()] = Number(m[2]);
        }
    }
    return map;
}

/**
 * macOS memory usage close to Activity Monitor "Memory Used":
 * used = active + wired + compressor
 * percent = used / physical_pages * 100
 */
async function getMemoryUsage() {
    if (process.platform !== 'darwin') {
        throw new Error('Only macOS is supported');
    }

    const [{ stdout: vmOut }, { stdout: memOut }, { stdout: pageOut }] = await Promise.all([
        execFileAsync('/usr/bin/vm_stat', [], { timeout: 3000 }),
        execFileAsync('/usr/sbin/sysctl', ['-n', 'hw.memsize'], { timeout: 3000 }),
        execFileAsync('/usr/bin/pagesize', [], { timeout: 3000 })
    ]);

    const stats = parseVmStat(vmOut);
    const pageSize = Number(pageOut.trim());
    const memBytes = Number(memOut.trim());

    if (!pageSize || !memBytes) {
        throw new Error('Failed to read page size or physical memory');
    }

    const active = stats['Pages active'] ?? 0;
    const wired = stats['Pages wired down'] ?? stats['Pages wired'] ?? 0;
    const compressor = stats['Pages occupied by compressor'] ?? 0;
    const physicalPages = Math.floor(memBytes / pageSize);

    if (physicalPages <= 0) {
        throw new Error('Invalid physical page count');
    }

    const usedPages = active + wired + compressor;
    const raw = (usedPages / physicalPages) * 100;
    const percent = Math.max(0, Math.min(100, Math.round(raw)));

    lastResult = {
        percent,
        usedPages,
        physicalPages,
        usedGB: (usedPages * pageSize) / (1024 ** 3),
        totalGB: memBytes / (1024 ** 3),
        active,
        wired,
        compressor
    };
    return lastResult;
}

function getLastMemoryUsage() {
    return lastResult;
}

module.exports = {
    getMemoryUsage,
    getLastMemoryUsage
};
