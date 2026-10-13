const fs = require("fs");
const path = require("path");

const databasePath = path.join(__dirname, "users.json");

function readUsers() {
    if (!fs.existsSync(databasePath)) {
        fs.writeFileSync(databasePath, "{}", "utf8");
    }

    const data = fs.readFileSync(databasePath, "utf8");

    try {
        return JSON.parse(data);
    } catch (error) {
        console.error("Database pengguna rusak:", error);
        throw error;
    }
}

function writeUsers(users) {
    fs.writeFileSync(
        databasePath,
        JSON.stringify(users, null, 2),
        "utf8"
    );
}

function getUserId(jid) {
    if (!jid || typeof jid !== "string") return null;

    const id = jid.split("@")[0].split(":")[0];
    return id || null;
}

// Kunci skor per grup. Chat pribadi (bukan @g.us) dihitung sebagai "global".
function toGroupKey(groupId) {
    const key = String(groupId || "");
    return key.endsWith("@g.us") ? key : "global";
}

function getUser(jid) {
    const id = getUserId(jid);

    if (!id) return null;

    return readUsers()[id] || null;
}

function getBalance(jid) {
    const id = getUserId(jid);

    if (!id) {
        return {
            success: false,
            reason: "invalid"
        };
    }

    const user = readUsers()[id];

    if (!user) {
        return {
            success: false,
            reason: "unregistered"
        };
    }

    return {
        success: true,
        balance: Number(user.balance) || 0,
        name: user.name
    };
}

function registerUser(jid, name) {
    const id = getUserId(jid);

    if (!id) {
        throw new Error("ID pengguna tidak ditemukan.");
    }

    const users = readUsers();

    if (users[id]) {
        return {
            success: false,
            user: users[id]
        };
    }

    const user = {
        id,
        name: String(name || "Pengguna").trim(),
        balance: 0,
        registeredAt: new Date().toISOString(),
        lastDailyAt: null
    };

    users[id] = user;
    writeUsers(users);

    return {
        success: true,
        user
    };
}

function getActiveDays(registeredAt) {
    const time = new Date(registeredAt).getTime();

    if (!Number.isFinite(time)) return 0;

    return Math.max(
        0,
        Math.floor((Date.now() - time) / 86400000)
    );
}

function formatRupiah(amount) {
    return "Rp " + Number(amount || 0).toLocaleString("id-ID");
}

function rollDailyReward() {
    const roll = Math.random() * 100;

    if (roll < 40) return 1000;
    if (roll < 70) return 2500;
    if (roll < 88) return 5000;
    if (roll < 97) return 10000;
    if (roll < 99.5) return 50000;

    return 100000;
}

function claimDaily(jid) {
    const id = getUserId(jid);

    if (!id) {
        return { success: false, reason: "invalid" };
    }

    const users = readUsers();
    const user = users[id];

    if (!user) {
        return { success: false, reason: "unregistered" };
    }

    const now = Date.now();

    const last = user.lastDailyAt
        ? new Date(user.lastDailyAt).getTime()
        : 0;

    const cooldown = 24 * 60 * 60 * 1000;

    if (
        Number.isFinite(last) &&
        last > 0 &&
        now - last < cooldown
    ) {
        return {
            success: false,
            reason: "cooldown",
            remaining: cooldown - (now - last)
        };
    }

    const reward = rollDailyReward();

    user.balance =
        Math.max(0, Number(user.balance) || 0) + reward;

    user.lastDailyAt = new Date(now).toISOString();

    writeUsers(users);

    return {
        success: true,
        reward,
        balance: user.balance
    };
}

function transferBalance(fromJid, toJid, amount) {
    const fromId = getUserId(fromJid);
    const toId = getUserId(toJid);

    if (!fromId || !toId) {
        return { success: false, reason: "invalid" };
    }

    if (fromId === toId) {
        return { success: false, reason: "self" };
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
        return { success: false, reason: "amount" };
    }

    const users = readUsers();

    const sender = users[fromId];
    const recipient = users[toId];

    if (!sender) {
        return {
            success: false,
            reason: "sender_unregistered"
        };
    }

    if (!recipient) {
        return {
            success: false,
            reason: "recipient_unregistered"
        };
    }

    sender.balance = Number(sender.balance) || 0;
    recipient.balance = Number(recipient.balance) || 0;

    if (sender.balance < amount) {
        return {
            success: false,
            reason: "insufficient"
        };
    }

    sender.balance -= amount;
    recipient.balance += amount;

    writeUsers(users);

    return {
        success: true,
        senderBalance: sender.balance,
        recipientBalance: recipient.balance,
        recipientName: recipient.name
    };
}

function adjustBalance(jid, amount) {
    const id = getUserId(jid);

    if (!id) {
        return { success: false, reason: "invalid" };
    }

    if (!Number.isSafeInteger(amount) || amount === 0) {
        return { success: false, reason: "amount" };
    }

    const users = readUsers();
    const user = users[id];

    if (!user) {
        return { success: false, reason: "unregistered" };
    }

    const current = Number(user.balance) || 0;
    const next = current + amount;

    if (next < 0) {
        return {
            success: false,
            reason: "insufficient"
        };
    }

    user.balance = next;

    writeUsers(users);

    return {
        success: true,
        balance: user.balance,
        name: user.name
    };
}

function getInventory(jid) {
    const id = getUserId(jid);

    if (!id) {
        return {
            success: false,
            reason: "invalid"
        };
    }

    const user = readUsers()[id];

    if (!user) {
        return {
            success: false,
            reason: "unregistered"
        };
    }

    return {
        success: true,
        inventory:
            user.inventory &&
            typeof user.inventory === "object" &&
            !Array.isArray(user.inventory)
                ? user.inventory
                : {}
    };
}

function purchaseItem(jid, itemId, quantity, price) {
    const id = getUserId(jid);

    if (!id) {
        return { success: false, reason: "invalid" };
    }

    if (
        !Number.isSafeInteger(quantity) ||
        quantity <= 0 ||
        !Number.isSafeInteger(price) ||
        price <= 0
    ) {
        return { success: false, reason: "amount" };
    }

    const total = quantity * price;

    if (!Number.isSafeInteger(total)) {
        return { success: false, reason: "amount" };
    }

    const users = readUsers();
    const user = users[id];

    if (!user) {
        return { success: false, reason: "unregistered" };
    }

    user.balance = Number(user.balance) || 0;

    if (user.balance < total) {
        return {
            success: false,
            reason: "insufficient",
            balance: user.balance
        };
    }

    if (
        !user.inventory ||
        typeof user.inventory !== "object" ||
        Array.isArray(user.inventory)
    ) {
        user.inventory = {};
    }

    const currentCount =
        Number(user.inventory[itemId]) || 0;

    if (
        !Number.isSafeInteger(currentCount) ||
        currentCount < 0 ||
        !Number.isSafeInteger(currentCount + quantity)
    ) {
        return { success: false, reason: "amount" };
    }

    user.balance -= total;

    user.inventory[itemId] =
        currentCount + quantity;

    writeUsers(users);

    return {
        success: true,
        total,
        balance: user.balance,
        inventoryCount: user.inventory[itemId]
    };
}

function consumeItem(jid, itemId, quantity = 1) {
    const id = getUserId(jid);

    if (!id) {
        return { success: false, reason: "invalid" };
    }

    if (
        !Number.isSafeInteger(quantity) ||
        quantity <= 0
    ) {
        return { success: false, reason: "amount" };
    }

    const users = readUsers();
    const user = users[id];

    if (!user) {
        return { success: false, reason: "unregistered" };
    }

    const inventory =
        user.inventory &&
        typeof user.inventory === "object" &&
        !Array.isArray(user.inventory)
            ? user.inventory
            : {};

    const currentCount =
        Number(inventory[itemId]) || 0;

    if (currentCount < quantity) {
        return { success: false, reason: "insufficient" };
    }

    const remaining = currentCount - quantity;

    if (remaining === 0) {
        delete inventory[itemId];
    } else {
        inventory[itemId] = remaining;
    }

    user.inventory = inventory;
    writeUsers(users);

    return {
        success: true,
        remaining
    };
}

// Skor Tebak Gambar per grup. Format lama (number) hanya berlaku untuk "global".
function readTebakGambarScore(user, groupKey) {
    const data = user?.tebakGambarWins;

    if (data && typeof data === "object" && !Array.isArray(data)) {
        return Number(data[groupKey]) || 0;
    }

    // Format lama: angka global
    if (groupKey === "global") return Number(data) || 0;

    return 0;
}

function recordTebakGambarWin(jid, groupId) {
    const id = getUserId(jid);

    if (!id) return false;

    const users = readUsers();

    if (!users[id]) return false;

    if (
        !users[id].tebakGambarWins ||
        typeof users[id].tebakGambarWins !== "object" ||
        Array.isArray(users[id].tebakGambarWins)
    ) {
        // Migrasi dari format lama (number) ke per grup
        const legacy = Number(users[id].tebakGambarWins) || 0;
        users[id].tebakGambarWins = {};
        if (legacy > 0) users[id].tebakGambarWins.global = legacy;
    }

    const groupKey = toGroupKey(groupId);
    const newScore = (Number(users[id].tebakGambarWins[groupKey]) || 0) + 1;
    users[id].tebakGambarWins[groupKey] = newScore;

    writeUsers(users);

    return newScore;
}

function getTopUsersByBalance(memberIds = null, limit = 10, excludeIds = null) {
    const users = readUsers();
    let list = Object.values(users);

    if (memberIds && memberIds instanceof Set) {
        list = list.filter(u => memberIds.has(u.id));
    }

    if (excludeIds && excludeIds instanceof Set) {
        list = list.filter(u => !excludeIds.has(u.id));
    }

    return list
        .map(u => ({
            id: u.id,
            name: u.name || "Pengguna",
            balance: Number(u.balance) || 0,
            tebakGambarWins: readTebakGambarScore(u, "global"),
            registeredAt: u.registeredAt
        }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, limit);
}

function getTopUsersByTG(groupId, memberIds = null, limit = 10, excludeIds = null) {
    const groupKey = toGroupKey(groupId);
    const users = readUsers();
    let list = Object.values(users);

    if (memberIds && memberIds instanceof Set) {
        list = list.filter(u => memberIds.has(u.id));
    }

    if (excludeIds && excludeIds instanceof Set) {
        list = list.filter(u => !excludeIds.has(u.id));
    }

    return list
        .map(u => ({
            id: u.id,
            name: u.name || "Pengguna",
            balance: Number(u.balance) || 0,
            tebakGambarWins: readTebakGambarScore(u, groupKey),
            registeredAt: u.registeredAt
        }))
        .sort((a, b) => b.tebakGambarWins - a.tebakGambarWins)
        .slice(0, limit);
}

function getUserTGRank(jid, groupId, memberIds = null, excludeIds = null) {
    const id = getUserId(jid);

    if (!id) return null;

    const groupKey = toGroupKey(groupId);
    const users = readUsers();
    let list = Object.values(users);

    if (memberIds && memberIds instanceof Set) {
        list = list.filter(u => memberIds.has(u.id));
    }

    if (excludeIds && excludeIds instanceof Set) {
        list = list.filter(u => !excludeIds.has(u.id));
    }

    const sorted = list
        .map(u => ({
            id: u.id,
            score: readTebakGambarScore(u, groupKey)
        }))
        .sort((a, b) => b.score - a.score);

    const index = sorted.findIndex(u => u.id === id);

    if (index === -1) return null;

    return {
        rank: index + 1,
        total: sorted.length,
        score: sorted[index].score
    };
}

function getUserRankByField(jid, field = "balance", memberIds = null, excludeIds = null) {
    const id = getUserId(jid);

    if (!id) return null;

    const users = readUsers();
    let list = Object.values(users);

    if (memberIds && memberIds instanceof Set) {
        list = list.filter(u => memberIds.has(u.id));
    }

    if (excludeIds && excludeIds instanceof Set) {
        list = list.filter(u => !excludeIds.has(u.id));
    }

    const sorted = list
        .map(u => ({
            id: u.id,
            value: Number(u[field]) || 0
        }))
        .sort((a, b) => b.value - a.value);

    const index = sorted.findIndex(u => u.id === id);

    if (index === -1) return null;

    return {
        rank: index + 1,
        total: sorted.length
    };
}

function getTopUsers(limit = 10) {
    return getTopUsersByBalance(null, limit);
}

function getUserRank(jid) {
    return getUserRankByField(jid, "balance", null);
}

function recordQuizWin(jid, groupId) {
    const id = getUserId(jid);

    if (!id) return 0;

    const users = readUsers();

    if (!users[id]) return 0;

    if (!users[id].quizWins || typeof users[id].quizWins !== "object" || Array.isArray(users[id].quizWins)) {
        users[id].quizWins = {};
    }

    const groupKey = groupId || "global";
    const newScore = (Number(users[id].quizWins[groupKey]) || 0) + 1;
    users[id].quizWins[groupKey] = newScore;

    writeUsers(users);

    return newScore;
}

function getTopUsersByQuiz(groupId, memberIds = null, limit = 10, excludeIds = null) {
    const users = readUsers();
    let list = Object.values(users);

    if (memberIds && memberIds instanceof Set) {
        list = list.filter(u => memberIds.has(u.id));
    }

    if (excludeIds && excludeIds instanceof Set) {
        list = list.filter(u => !excludeIds.has(u.id));
    }

    const groupKey = groupId || "global";

    return list
        .map(u => ({
            id: u.id,
            name: u.name || "Pengguna",
            balance: Number(u.balance) || 0,
            quizScore: Number(u.quizWins?.[groupKey]) || 0,
            registeredAt: u.registeredAt
        }))
        .sort((a, b) => b.quizScore - a.quizScore)
        .slice(0, limit);
}

function getUserQuizRank(jid, groupId, memberIds = null, excludeIds = null) {
    const id = getUserId(jid);

    if (!id) return null;

    const users = readUsers();
    let list = Object.values(users);

    if (memberIds && memberIds instanceof Set) {
        list = list.filter(u => memberIds.has(u.id));
    }

    if (excludeIds && excludeIds instanceof Set) {
        list = list.filter(u => !excludeIds.has(u.id));
    }

    const groupKey = groupId || "global";

    const sorted = list
        .map(u => ({
            id: u.id,
            score: Number(u.quizWins?.[groupKey]) || 0
        }))
        .sort((a, b) => b.score - a.score);

    const index = sorted.findIndex(u => u.id === id);

    if (index === -1) return null;

    return {
        rank: index + 1,
        total: sorted.length,
        score: sorted[index].score
    };
}

function normalizeQumathMode(mode) {
    const value = String(mode || "").toLowerCase().trim();

    if (["e", "easy", "mudah"].includes(value)) return "easy";
    if (["m", "medium", "med", "sedang"].includes(value)) return "medium";
    if (["h", "hard", "sulit"].includes(value)) return "hard";
    if (["ex", "expert", "ekspert"].includes(value)) return "expert";
    if (["ma", "master"].includes(value)) return "master";
    if (["in", "insane", "gila", "extreme"].includes(value)) return "insane";

    return null;
}

// Skor Qumath per grup per mode.
// Format baru: qumathWins = { [groupKey]: { easy, medium, hard } }
// Format lama: qumathWins = { easy, medium, hard } (dianggap milik "global")
function isLegacyQumath(data) {
    return ["easy", "medium", "hard", "expert", "master", "insane"].some(
        m => typeof data?.[m] === "number"
    );
}

function readQumathScore(user, groupKey, modeKey) {
    const data = user?.qumathWins;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return 0;
    }

    if (isLegacyQumath(data)) {
        return groupKey === "global" ? Number(data[modeKey]) || 0 : 0;
    }

    const perGroup = data[groupKey];

    if (!perGroup || typeof perGroup !== "object" || Array.isArray(perGroup)) {
        return 0;
    }

    return Number(perGroup[modeKey]) || 0;
}

function recordQumathWin(jid, mode, groupId) {
    const id = getUserId(jid);
    const modeKey = normalizeQumathMode(mode);

    if (!id || !modeKey) return 0;

    const users = readUsers();

    if (!users[id]) return 0;

    let store = users[id].qumathWins;

    if (!store || typeof store !== "object" || Array.isArray(store)) {
        store = {};
    } else if (isLegacyQumath(store)) {
        // Migrasi format lama ke per grup ("global" dipertahankan)
        const legacy = store;
        store = {};
        const migrated = {};

        for (const m of ["easy", "medium", "hard", "expert", "master", "insane"]) {
            const value = Number(legacy[m]) || 0;
            if (value > 0) migrated[m] = value;
        }

        if (Object.keys(migrated).length > 0) store.global = migrated;
    }

    const groupKey = toGroupKey(groupId);

    if (
        !store[groupKey] ||
        typeof store[groupKey] !== "object" ||
        Array.isArray(store[groupKey])
    ) {
        store[groupKey] = {};
    }

    const newScore = (Number(store[groupKey][modeKey]) || 0) + 1;
    store[groupKey][modeKey] = newScore;

    users[id].qumathWins = store;
    writeUsers(users);

    return newScore;
}

function getTopUsersByQumath(mode, groupId, memberIds = null, limit = 10, excludeIds = null) {
    const modeKey = normalizeQumathMode(mode);

    if (!modeKey) return [];

    const groupKey = toGroupKey(groupId);
    const users = readUsers();
    let list = Object.values(users);

    if (memberIds && memberIds instanceof Set) {
        list = list.filter(u => memberIds.has(u.id));
    }

    if (excludeIds && excludeIds instanceof Set) {
        list = list.filter(u => !excludeIds.has(u.id));
    }

    return list
        .map(u => ({
            id: u.id,
            name: u.name || "Pengguna",
            balance: Number(u.balance) || 0,
            qumathScore: readQumathScore(u, groupKey, modeKey),
            registeredAt: u.registeredAt
        }))
        .sort((a, b) => b.qumathScore - a.qumathScore)
        .slice(0, limit);
}

function getUserQumathRank(jid, mode, groupId, memberIds = null, excludeIds = null) {
    const id = getUserId(jid);
    const modeKey = normalizeQumathMode(mode);

    if (!id || !modeKey) return null;

    const groupKey = toGroupKey(groupId);
    const users = readUsers();
    let list = Object.values(users);

    if (memberIds && memberIds instanceof Set) {
        list = list.filter(u => memberIds.has(u.id));
    }

    if (excludeIds && excludeIds instanceof Set) {
        list = list.filter(u => !excludeIds.has(u.id));
    }

    const sorted = list
        .map(u => ({
            id: u.id,
            score: readQumathScore(u, groupKey, modeKey)
        }))
        .sort((a, b) => b.score - a.score);

    const index = sorted.findIndex(u => u.id === id);

    if (index === -1) return null;

    return {
        rank: index + 1,
        total: sorted.length,
        score: sorted[index].score
    };
}

module.exports = {
    getUserId,
    getUser,
    getBalance,
    registerUser,
    getActiveDays,
    formatRupiah,
    claimDaily,
    transferBalance,
    getInventory,
    purchaseItem,
    consumeItem,
    adjustBalance,
    getTopUsers,
    getUserRank,
    recordTebakGambarWin,
    getTopUsersByBalance,
    getTopUsersByTG,
    getUserTGRank,
    getUserRankByField,
    recordQuizWin,
    getTopUsersByQuiz,
    getUserQuizRank,
    normalizeQumathMode,
    recordQumathWin,
    getTopUsersByQumath,
    getUserQumathRank
};