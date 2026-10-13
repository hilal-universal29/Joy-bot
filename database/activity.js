/* =========================================================
   JOYBOT ACTIVITY DATABASE
   ---------------------------------------------------------
   Pencatatan aktivitas pengguna & grup yang PERSISTEN.

   File data: database/activity.json  (diabaikan Git)
   - users  : aktivitas per pengguna
   - groups : jumlah pesan per grup
   - totals : akumulasi pesan sejak 'since'

   Catatan penting:
   - Modul ini TIDAK pernah menimpa file dengan data kosong.
     Jika file rusak, pencatatan disk dinonaktifkan sementara
     dan data lama dibiarkan utuh.
   - Penulisan ke disk dibatasi (debounce) lewat saveInterval
     agar tidak menghambat pemrosesan pesan WhatsApp.
   ========================================================= */

const fs = require("fs");
const path = require("path");

const CONFIG = require("../config/joyConsole");

const projectRoot = path.join(__dirname, "..");
const filePath = path.isAbsolute(CONFIG.activity.file)
    ? CONFIG.activity.file
    : path.join(projectRoot, CONFIG.activity.file);

const defaultData = () => ({
    version: 1,
    users: {},
    groups: {},
    consoleUsers: [],
    consoleGroups: [],
    totals: {
        messages: 0,
        incoming: 0,
        outgoing: 0,
        since: new Date().toISOString()
    }
});

let data = defaultData();
let dirty = false;
let persistenceDisabled = false;
let saveTimer = null;
let lastError = null;

function ensureDir() {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return true;
    } catch (error) {
        lastError = error.message;
        return false;
    }
}

function load() {
    try {
        if (!fs.existsSync(filePath)) {
            data = defaultData();
            return;
        }

        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);

        data = Object.assign(defaultData(), parsed);

        data.users =
            data.users && typeof data.users === "object"
                ? data.users
                : {};

        data.groups =
            data.groups && typeof data.groups === "object"
                ? data.groups
                : {};

        data.consoleUsers = Array.isArray(data.consoleUsers) ? data.consoleUsers : [];
        data.consoleGroups = Array.isArray(data.consoleGroups) ? data.consoleGroups : [];

        data.totals = Object.assign(
            defaultData().totals,
            data.totals || {}
        );
    } catch (error) {
        // File rusak: JANGAN timpa. Nonaktifkan penulisan disk.
        persistenceDisabled = true;
        lastError = error.message;
        data = defaultData();

        try {
            console.error(
                "[activity] Gagal membaca activity.json, pencatatan disk dinonaktifkan:",
                error.message
            );
        } catch {}
    }
}

function saveNow() {
    if (persistenceDisabled) return;

    if (!ensureDir()) {
        persistenceDisabled = true;
        return;
    }

    try {
        fs.writeFileSync(
            filePath,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        dirty = false;
    } catch (error) {
        lastError = error.message;

        try {
            console.error(
                "[activity] Gagal menyimpan activity.json:",
                error.message
            );
        } catch {}
    }
}

function scheduleSave() {
    dirty = true;

    if (saveTimer || persistenceDisabled) return;

    saveTimer = setInterval(() => {
        if (dirty) {
            saveNow();
        }
    }, Math.max(1000, CONFIG.activity.saveInterval || 5000));

    if (typeof saveTimer.unref === "function") {
        saveTimer.unref();
    }
}

/* ---------------------------------------------------------
   Pengguna
   --------------------------------------------------------- */

function registerConsoleUser(id, name) {
    if (!id) return;
    if (data.consoleUsers.find(u => u.id === id)) return;
    data.consoleUsers.push({
        id,
        name: name || id,
        registeredAt: new Date().toISOString(),
        index: data.consoleUsers.length + 1
    });
}

function recordUser(id, name) {
    if (!id) return;

    const key = String(id);
    const now = new Date().toISOString();

    const existing = data.users[key] || {
        name: name || "UNKNOWN",
        messageCount: 0,
        commandCount: 0,
        lastActivityAt: null
    };

    existing.messageCount = Number(existing.messageCount) || 0;
    existing.commandCount = Number(existing.commandCount) || 0;

    existing.messageCount += 1;
    existing.lastActivityAt = now;

    if (name && name !== "Unknown") {
        existing.name = name;
    }

    data.users[key] = existing;
    registerConsoleUser(key, existing.name);
    scheduleSave();
}

function recordCommand(id, name) {
    if (!id) return;

    const key = String(id);
    const now = new Date().toISOString();

    const existing = data.users[key] || {
        name: name || "UNKNOWN",
        messageCount: 0,
        commandCount: 0,
        lastActivityAt: null
    };

    existing.commandCount = Number(existing.commandCount) || 0;
    existing.commandCount += 1;
    existing.lastActivityAt = now;

    if (name && name !== "Unknown") {
        existing.name = name;
    }

    data.users[key] = existing;
    scheduleSave();
}

/* ---------------------------------------------------------
   Grup
   --------------------------------------------------------- */

function recordGroupMessage(jid, direction) {
    if (!jid) return;

    const key = String(jid);
    const now = new Date().toISOString();

    const existing = data.groups[key] || {
        name: null,
        messageCount: 0,
        incomingCount: 0,
        outgoingCount: 0,
        lastMessageAt: null
    };

    existing.messageCount = Number(existing.messageCount) || 0;
    existing.incomingCount = Number(existing.incomingCount) || 0;
    existing.outgoingCount = Number(existing.outgoingCount) || 0;

    existing.messageCount += 1;

    if (direction === "outgoing") {
        existing.outgoingCount += 1;
    } else {
        existing.incomingCount += 1;
    }

    existing.lastMessageAt = now;

    if (!data.consoleGroups.find(g => g.jid === key)) {
        data.consoleGroups.push({
            jid: key,
            name: existing.name || null,
            index: data.consoleGroups.length + 1,
            addedAt: now
        });
    } else {
        const cg = data.consoleGroups.find(g => g.jid === key);
        if (existing.name && cg && !cg.name) cg.name = existing.name;
    }
    data.groups[key] = existing;
    scheduleSave();
}

function setGroupName(jid, name) {
    if (!jid || !name) return;

    const key = String(jid);
    const existing = data.groups[key] || {
        name: null,
        messageCount: 0,
        incomingCount: 0,
        outgoingCount: 0,
        lastMessageAt: null
    };

    if (existing.name !== name) {
        existing.name = name;
        data.groups[key] = existing;
    }
    const cg = data.consoleGroups.find(g => g.jid === key);
    if (cg && cg.name !== name) {
        cg.name = name;
    } else if (!cg) {
        if (!data.consoleGroups.find(g => g.jid === key)) {
            data.consoleGroups.push({
                jid: key,
                name: name,
                index: data.consoleGroups.length + 1,
                addedAt: new Date().toISOString()
            });
        }
    }
    scheduleSave();
}

/* ---------------------------------------------------------
   Total
   --------------------------------------------------------- */

function recordTotals({ incoming = 0, outgoing = 0 } = {}) {
    data.totals.messages =
        (Number(data.totals.messages) || 0) + incoming + outgoing;
    data.totals.incoming =
        (Number(data.totals.incoming) || 0) + incoming;
    data.totals.outgoing =
        (Number(data.totals.outgoing) || 0) + outgoing;

    scheduleSave();
}

/* ---------------------------------------------------------
   Akses
   --------------------------------------------------------- */

function getSnapshot() {
    return data;
}

function getStatus() {
    return {
        ok: !persistenceDisabled && !lastError,
        disabled: persistenceDisabled,
        error: lastError
    };
}

function flush() {
    if (dirty) {
        saveNow();
    }
}

function stop() {
    if (saveTimer) {
        clearInterval(saveTimer);
        saveTimer = null;
    }

    flush();
}

load();

function getConsoleUsers() {
    return data.consoleUsers || [];
}

function getConsoleGroups() {
    return data.consoleGroups || [];
}

module.exports = {
    recordUser,
    recordCommand,
    recordGroupMessage,
    setGroupName,
    recordTotals,
    getSnapshot,
    getStatus,
    flush,
    stop,
    getConsoleUsers,
    getConsoleGroups
};
