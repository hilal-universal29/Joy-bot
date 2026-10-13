/* =========================================================
   JOY CONSOLE - STATISTICS COLLECTOR
   ---------------------------------------------------------
   Mengumpulkan data NYATA dari proses Node.js, database
   pengguna, dan database aktivitas.

   Tidak ada angka yang dikarang. Jika data belum tersedia,
   nilai dikembalikan sebagai null dan dashboard menampilkan
   "N/A" atau "UNKNOWN".
   ========================================================= */

const fs = require("fs");
const os = require("os");
const path = require("path");

const CONFIG = require("../config/joyConsole");
const logger = require("./logger");
const activity = require("../database/activity");

const projectRoot = path.join(__dirname, "..");
const usersDbPath = path.join(projectRoot, "database", "users.json");

const startedAt = Date.now();

// Status yang diperbarui oleh index.js
const state = {
    connection: "UNKNOWN",
    handler: "READY",
    socket: null
};

// Sampel CPU sebelumnya
let lastCpu = process.cpuUsage();
let lastCpuTime = Date.now();

// Cache nama grup (diisi best-effort dari socket WhatsApp)
const groupNameCache = new Map();
const groupNameInFlight = new Set();

/* ---------------------------------------------------------
   Format helper
   --------------------------------------------------------- */

function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    const mb = value / 1024 / 1024;

    if (mb >= 1024) {
        return `${(mb / 1024).toFixed(2)} GB`;
    }

    return `${mb.toFixed(1)} MB`;
}

function formatUptime(seconds) {
    const total = Math.max(0, Math.floor(seconds));

    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;

    return `${s}s`;
}

function formatTime(iso) {
    if (!iso) return "N/A";

    const date = new Date(iso);

    if (!Number.isFinite(date.getTime())) return "N/A";

    return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function formatRelative(iso) {
    if (!iso) return "N/A";

    const time = new Date(iso).getTime();

    if (!Number.isFinite(time)) return "N/A";

    const diff = Date.now() - time;
    const sec = Math.floor(diff / 1000);

    if (sec < 60) return `${Math.max(0, sec)}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;

    return `${Math.floor(sec / 86400)}d ago`;
}

function within24h(iso) {
    if (!iso) return false;

    const time = new Date(iso).getTime();

    if (!Number.isFinite(time)) return false;

    return Date.now() - time <= 24 * 60 * 60 * 1000;
}

/* ---------------------------------------------------------
   Status dari index.js
   --------------------------------------------------------- */

function setConnection(status) {
    state.connection = status || "UNKNOWN";
}

function getConnection() {
    return state.connection;
}

function setHandlerStatus(status) {
    state.handler = status || "READY";
}

function setSocket(socket) {
    state.socket = socket || null;
}

function getSocket() {
    return state.socket;
}

/* ---------------------------------------------------------
   CPU proses (akurat untuk proses Node.js)
   --------------------------------------------------------- */

function getCpuPercent() {
    const now = Date.now();
    const usage = process.cpuUsage();

    const userDelta = usage.user - lastCpu.user;
    const systemDelta = usage.system - lastCpu.system;

    const elapsedMs = Math.max(1, now - lastCpuTime);

    lastCpu = usage;
    lastCpuTime = now;

    // microsecond -> millisecond, dibanding waktu berjalan.
    const cpuMs = (userDelta + systemDelta) / 1000;

    const percent = (cpuMs / elapsedMs) * 100;

    return Math.max(0, Math.min(999, percent));
}

/* ---------------------------------------------------------
   Database pengguna
   --------------------------------------------------------- */

function readUserDatabase() {
    try {
        if (!fs.existsSync(usersDbPath)) {
            return { ok: true, users: {} };
        }

        const raw = fs.readFileSync(usersDbPath, "utf8");

        const users = JSON.parse(raw);

        return {
            ok: true,
            users:
                users && typeof users === "object"
                    ? users
                    : {}
        };
    } catch (error) {
        return {
            ok: false,
            users: {},
            error: error.message
        };
    }
}

/* ---------------------------------------------------------
   Statistik sistem
   --------------------------------------------------------- */

function getSystemStats() {
    const memory = process.memoryUsage();
    const userDb = readUserDatabase();
    const activityStatus = activity.getStatus();
    const snapshot = activity.getSnapshot();

    const groupCount = Object.keys(snapshot.groups || {}).length;

    return {
        ramRss: formatBytes(memory.rss),
        ramHeap: formatBytes(memory.heapUsed),
        cpu: `${getCpuPercent().toFixed(1)}%`,
        totalUsers: userDb.ok
            ? Object.keys(userDb.users).length
            : null,
        totalGroups: groupCount,
        totalMessages:
            Number(snapshot.totals?.messages) || 0,
        uptime: formatUptime(process.uptime()),
        uptimeSeconds: Math.floor(process.uptime()),
        lastError: logger.getLastError(),
        database: userDb.ok && activityStatus.ok
            ? "READY"
            : "ERROR",
        databaseDetail: userDb.ok
            ? (activityStatus.ok ? null : activityStatus.error)
            : userDb.error,
        handler: state.handler,
        connection: state.connection,
        startedAt
    };
}

/* ---------------------------------------------------------
   Statistik aktivitas (24 jam terakhir)
   --------------------------------------------------------- */

function getActivityStats() {
    const snapshot = activity.getSnapshot();

    const users = Object.values(snapshot.users || {});

    const activeUsers = users.filter((u) =>
        within24h(u.lastActivityAt)
    ).length;

    const groups = Object.entries(snapshot.groups || {});

    const activeGroups = groups.filter(([, g]) =>
        within24h(g.lastMessageAt)
    ).length;

    let latest = null;

    for (const [, g] of groups) {
        if (!g.lastMessageAt) continue;

        if (!latest || g.lastMessageAt > latest) {
            latest = g.lastMessageAt;
        }
    }

    return {
        activeUsers,
        activeGroups,
        latestMessageAt: latest,
        trackedUsers: users.length,
        trackedGroups: groups.length
    };
}

/* ---------------------------------------------------------
   Status layanan
   --------------------------------------------------------- */

function getServiceStatus() {
    const activityStatus = activity.getStatus();
    const userDb = readUserDatabase();

    const services = [
        {
            name: "WhatsApp",
            status: state.connection || "UNKNOWN"
        },
        {
            name: "Database",
            status:
                userDb.ok && activityStatus.ok
                    ? "READY"
                    : "ERROR"
        },
        {
            name: "Message Handler",
            status: state.handler || "UNKNOWN"
        },
        {
            name: "Logger",
            status: logger.getFileStatus().disabled
                ? "ERROR"
                : "READY"
        },
        {
            name: "Group Monitor",
            status: "READY"
        },
        {
            name: "Console",
            status: "READY"
        }
    ];

    return services;
}

/* ---------------------------------------------------------
   Daftar pengguna (gabungan users.json + aktivitas)
   --------------------------------------------------------- */

function getUsers(query = "") {
    const userDb = readUserDatabase();
    const activityUsers = activity.getSnapshot().users || {};

    const ids = new Set([
        ...Object.keys(userDb.users || {}),
        ...Object.keys(activityUsers || {})
    ]);

    const q = String(query || "").trim().toLowerCase();

    const list = [];

    for (const id of ids) {
        const dbUser = userDb.users?.[id] || null;
        const actUser = activityUsers[id] || null;

        const name =
            (dbUser && dbUser.name) ||
            (actUser && actUser.name) ||
            "UNKNOWN";

        if (
            q &&
            !String(id).toLowerCase().includes(q) &&
            !String(name).toLowerCase().includes(q)
        ) {
            continue;
        }

        const consUser = (activity.getConsoleUsers() || []).find(c => c.id === id);
        list.push({
            id,
            name,
            balance: dbUser ? Number(dbUser.balance) || 0 : null,
            registered: Boolean(dbUser),
            lastActivityAt: actUser?.lastActivityAt || null,
            messageCount: Number(actUser?.messageCount) || 0,
            commandCount: Number(actUser?.commandCount) || 0,
            active24h: within24h(actUser?.lastActivityAt),
            index: consUser?.index || null
        });
    }

    list.sort((a, b) => {
        if (a.lastActivityAt && b.lastActivityAt) {
            return a.lastActivityAt < b.lastActivityAt ? 1 : -1;
        }

        if (a.lastActivityAt) return -1;
        if (b.lastActivityAt) return 1;

        return String(a.name).localeCompare(String(b.name));
    });

    return list;
}

/* ---------------------------------------------------------
   Daftar grup
   --------------------------------------------------------- */

function getGroups() {
    const snapshot = activity.getSnapshot();

    const consGroups = activity.getConsoleGroups() || [];
    const list = Object.entries(snapshot.groups || {}).map(
        ([jid, g]) => {
            const cg = consGroups.find(c => c.jid === jid);
            return {
                jid,
                name: g.name || groupNameCache.get(jid) || cg?.name || null,
                messageCount: Number(g.messageCount) || 0,
                incomingCount: Number(g.incomingCount) || 0,
                outgoingCount: Number(g.outgoingCount) || 0,
                lastMessageAt: g.lastMessageAt || null,
                index: cg?.index || null
            };
        }
    );

    list.sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt) {
            return a.lastMessageAt < b.lastMessageAt ? 1 : -1;
        }

        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;

        return b.messageCount - a.messageCount;
    });

    return list;
}

function resolveGroupName(Joy, jid) {
    return new Promise((resolve) => {
        if (!Joy || typeof Joy.groupMetadata !== "function") {
            resolve(null);
            return;
        }

        let settled = false;

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                resolve(null);
            }
        }, 5000);

        if (typeof timer.unref === "function") timer.unref();

        Promise.resolve()
            .then(() => Joy.groupMetadata(jid))
            .then((meta) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);

                const subject = meta?.subject || null;

                if (subject) {
                    groupNameCache.set(jid, subject);
                    try {
                        activity.setGroupName(jid, subject);
                    } catch {}
                }

                resolve(subject);
            })
            .catch(() => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(null);
            });
    });
}

// Cari nama grup yang belum diketahui, tanpa memblokir render.
function requestGroupNames() {
    const Joy = state.socket;

    if (!Joy) return;

    const groups = getGroups();

    for (const group of groups) {
        if (group.name) continue;
        if (groupNameInFlight.has(group.jid)) continue;
        if (groupNameInFlight.size >= 3) break;

        groupNameInFlight.add(group.jid);

        resolveGroupName(Joy, group.jid).finally(() => {
            groupNameInFlight.delete(group.jid);
        });
    }
}

function getTrackedGroupIds() {
    return Object.keys(activity.getSnapshot().groups || {});
}

module.exports = {
    setConnection,
    getConnection,
    setHandlerStatus,
    setSocket,
    getSocket,
    getSystemStats,
    getActivityStats,
    getServiceStatus,
    getUsers,
    getGroups,
    getTrackedGroupIds,
    requestGroupNames,
    formatTime,
    formatRelative,
    formatUptime,
    formatBytes
};
