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

module.exports = {
    getUserId,
    getUser,
    getBalance,
    registerUser,
    getActiveDays,
    formatRupiah,
    claimDaily,
    transferBalance,
    adjustBalance
};