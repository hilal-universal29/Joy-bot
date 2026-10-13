/* =========================================================
   JOY CONSOLE LOGGER
   ---------------------------------------------------------
   Tanggung jawab:
   - Menangkap output console.* Joybot.
   - Menyimpan log penting ke file persisten + rotasi ukuran.
   - Menyediakan buffer di memori untuk ditampilkan di console.
   - Mencatat error terakhir beserta waktu.

   Logger TIDAK bertanggung jawab menggambar dashboard.
   ========================================================= */

const fs = require("fs");
const path = require("path");
const util = require("util");

const CONFIG = require("../config/joyConsole");

const projectRoot = path.join(__dirname, "..");

const logFilePath = path.isAbsolute(CONFIG.log.file)
    ? CONFIG.log.file
    : path.join(projectRoot, CONFIG.log.file);

const LEVEL_PRIORITY = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    message: 4
};

// Pesan sesi Baileys yang sengaja dibungkam (perilaku lama dipertahankan).
const SUPPRESSED_SESSION_MESSAGES = [
    "Closing session:",
    "Closing stale open session",
    "Closing open session in favor of incoming prekey bundle",
    "Decrypted message with closed session",
    "Removing old closed session:",
    "Opening session:"
];

const MAX_BUFFER = Math.max(50, CONFIG.log.bufferSize || 500);
const DEDUPE_WINDOW_MS = 2000;

let entries = [];
let lastEntry = null;
let lastError = null;

let installed = false;
let frameActive = false;
const originalConsole = {};

let writeQueue = [];
let writing = false;
let currentSize = null;
let fileLoggingDisabled = false;

/* ---------------------------------------------------------
   Format & filter
   --------------------------------------------------------- */

function formatArgs(args) {
    try {
        return util.format(...args);
    } catch (error) {
        try {
            return args.map(String).join(" ");
        } catch {
            return "";
        }
    }
}

function shouldSuppress(text) {
    return SUPPRESSED_SESSION_MESSAGES.some((prefix) =>
        text.includes(prefix)
    );
}

/* ---------------------------------------------------------
   Buffer
   --------------------------------------------------------- */

function pushEntry(level, text) {
    const now = Date.now();

    if (
        lastEntry &&
        lastEntry.level === level &&
        lastEntry.message === text &&
        now - lastEntry.at < DEDUPE_WINDOW_MS
    ) {
        lastEntry.repeat = (lastEntry.repeat || 1) + 1;
        lastEntry.time = new Date().toISOString();
        lastEntry.at = now;
        return lastEntry;
    }

    const entry = {
        time: new Date().toISOString(),
        at: now,
        level,
        message: text,
        repeat: 1
    };

    entries.push(entry);

    if (entries.length > MAX_BUFFER) {
        entries.splice(0, entries.length - MAX_BUFFER);
    }

    lastEntry = entry;
    return entry;
}

/* ---------------------------------------------------------
   File (async, dengan rotasi)
   --------------------------------------------------------- */

function ensureLogDir() {
    try {
        const dir = path.dirname(logFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return true;
    } catch (error) {
        fileLoggingDisabled = true;
        return false;
    }
}

function rotateIfNeeded(incomingBytes) {
    try {
        if (currentSize === null) {
            currentSize = fs.existsSync(logFilePath)
                ? fs.statSync(logFilePath).size
                : 0;
        }

        if (currentSize + incomingBytes <= CONFIG.log.maxBytes) {
            return false;
        }

        const maxFiles = Math.max(1, CONFIG.log.maxFiles || 3);

        for (let i = maxFiles - 1; i >= 1; i--) {
            const older = `${logFilePath}.${i}`;
            const newer = i === 1
                ? logFilePath
                : `${logFilePath}.${i - 1}`;

            if (fs.existsSync(newer)) {
                try {
                    if (fs.existsSync(older)) fs.unlinkSync(older);
                    fs.renameSync(newer, older);
                } catch {}
            }
        }

        currentSize = 0;
        return true;
    } catch (error) {
        return false;
    }
}

function drainQueue() {
    if (writing || writeQueue.length === 0) return;

    if (fileLoggingDisabled || !ensureLogDir()) {
        writeQueue = [];
        return;
    }

    const chunk = writeQueue.join("");
    writeQueue = [];
    writing = true;

    rotateIfNeeded(Buffer.byteLength(chunk));

    fs.appendFile(logFilePath, chunk, (error) => {
        writing = false;

        if (error) {
            fileLoggingDisabled = true;
        } else {
            currentSize =
                (currentSize === null
                    ? 0
                    : currentSize) + Buffer.byteLength(chunk);
        }

        if (writeQueue.length > 0) drainQueue();
    });
}

function queueWrite(text) {
    writeQueue.push(text);

    if (writeQueue.length > 500) {
        writeQueue.splice(0, writeQueue.length - 500);
    }

    drainQueue();
}

function toFile(entry) {
    if (
        entry.level === "message" &&
        !CONFIG.log.persistMessages
    ) {
        return;
    }

    const repeat = entry.repeat > 1
        ? ` (x${entry.repeat})`
        : "";

    queueWrite(
        `[${entry.time}] [${entry.level.toUpperCase()}] ` +
        `${entry.message}${repeat}\n`
    );
}

/* ---------------------------------------------------------
   API publik
   --------------------------------------------------------- */

function log(level, message) {
    const safeLevel = Object.prototype.hasOwnProperty.call(
        LEVEL_PRIORITY,
        level
    )
        ? level
        : "info";

    const entry = pushEntry(safeLevel, String(message));

    if (safeLevel === "error") {
        lastError = {
            time: entry.time,
            message: entry.message
        };
    }

    toFile(entry);
    return entry;
}

function install() {
    if (installed) return;
    installed = true;

    const mapping = {
        log: "info",
        info: "info",
        warn: "warn",
        error: "error",
        debug: "debug"
    };

    for (const method of Object.keys(mapping)) {
        originalConsole[method] = console[method].bind(console);

        console[method] = (...args) => {
            const text = formatArgs(args);

            if (!text || shouldSuppress(text)) {
                return;
            }

            log(mapping[method], text);

            // Non-interaktif: tetap tampilkan seperti perilaku lama.
            if (!frameActive) {
                originalConsole[method](...args);
            }
        };
    }
}

// Apakah output terminal normal boleh dilewatkan? Dipakai index.js bila perlu.
function writeRaw(text) {
    originalConsole.log ? originalConsole.log(text) : process.stdout.write(text + "\n");
}

function setFrameActive(active) {
    frameActive = Boolean(active);
}

function getBuffer() {
    return entries.slice();
}

function getRecent(options = {}) {
    const {
        level = null,
        limit = 20,
        includeMessage = false
    } = options;

    let minPriority = null;

    if (level && Object.prototype.hasOwnProperty.call(LEVEL_PRIORITY, level)) {
        minPriority = LEVEL_PRIORITY[level];
    }

    let list = entries.filter((entry) => {
        if (entry.level === "message" && !includeMessage && level !== "message") {
            return false;
        }

        if (minPriority !== null) {
            return LEVEL_PRIORITY[entry.level] <= minPriority;
        }

        return true;
    });

    return list.slice(-limit);
}

function getLastError() {
    return lastError;
}

function getFileStatus() {
    return {
        path: logFilePath,
        disabled: fileLoggingDisabled
    };
}

function stop() {
    // Pastikan antrean tulisan terakhir selesai.
    try {
        if (writeQueue.length > 0 && !fileLoggingDisabled) {
            const chunk = writeQueue.join("");
            writeQueue = [];
            ensureLogDir();
            fs.appendFileSync(logFilePath, chunk);
        }
    } catch {}
}

module.exports = {
    install,
    log,
    writeRaw,
    setFrameActive,
    getBuffer,
    getRecent,
    getLastError,
    getFileStatus,
    stop,
    LEVEL_PRIORITY
};
