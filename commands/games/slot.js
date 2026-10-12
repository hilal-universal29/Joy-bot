const {
    adjustBalance,
    getBalance,
    getUser,
    formatRupiah
} = require("../../database/users");

const BET_OPTIONS = [1000, 5000, 10000, 25000, 50000];

// Bobot tiap simbol: semakin tinggi hadiahnya, semakin langka simbolnya.
const SYMBOLS = [
    { emoji: "7️⃣", weight: 1 },
    { emoji: "💎", weight: 2 },
    { emoji: "👑", weight: 3 },
    { emoji: "🔔", weight: 4 },
    { emoji: "🍒", weight: 5 },
    { emoji: "⭐", weight: 6 },
    { emoji: "🍀", weight: 6 },
    { emoji: "🍇", weight: 7 },
    { emoji: "🍉", weight: 7 },
    { emoji: "🍊", weight: 8 },
    { emoji: "🍋", weight: 8 }
];

const TOTAL_WEIGHT = SYMBOLS.reduce(
    (sum, item) => sum + item.weight,
    0
);

const TRIPLE_PAYOUT = {
    "7️⃣": 20,
    "💎": 10,
    "👑": 7,
    "🔔": 5,
    "🍒": 3,
    "🍋": 2,
    "🍊": 2,
    "🍉": 2,
    "🍇": 2,
    "⭐": 2,
    "🍀": 2
};

const TRIPLE_NAME = {
    "7️⃣": "JACKPOT LUCKY 777!",
    "💎": "JACKPOT DIAMOND!",
    "👑": "TRIPLE CROWN!",
    "🔔": "TRIPLE BELL!",
    "🍒": "TRIPLE CHERRY!",
    "🍋": "TRIPLE LEMON!",
    "🍊": "TRIPLE ORANGE!",
    "🍉": "TRIPLE WATERMELON!",
    "🍇": "TRIPLE GRAPE!",
    "⭐": "TRIPLE STAR!",
    "🍀": "TRIPLE CLOVER!"
};

const PAIR_MULTIPLIER = 1.5;
const RESULT_TTL_MS = 60000;

// Mencegah dua putaran berjalan bersamaan untuk pengguna yang sama.
const activeSpins = new Set();

function pickSymbol() {
    let roll = Math.random() * TOTAL_WEIGHT;

    for (const symbol of SYMBOLS) {
        roll -= symbol.weight;

        if (roll < 0) {
            return symbol.emoji;
        }
    }

    return SYMBOLS[SYMBOLS.length - 1].emoji;
}

function spinSymbols() {
    return [pickSymbol(), pickSymbol(), pickSymbol()];
}

function evaluateSpin(symbols) {
    const [a, b, c] = symbols;

    if (a === b && b === c) {
        return {
            type: "triple",
            symbol: a,
            multiplier: TRIPLE_PAYOUT[a] || 2,
            name: TRIPLE_NAME[a] || "TRIPLE!"
        };
    }

    if (a === b || b === c || a === c) {
        return {
            type: "pair",
            symbol: null,
            multiplier: PAIR_MULTIPLIER,
            name: "DUA SIMBOL SAMA"
        };
    }

    return {
        type: "none",
        symbol: null,
        multiplier: 0,
        name: "TIDAK ADA KOMBINASI"
    };
}

function computePayout(bet, multiplier) {
    return Math.round(bet * multiplier);
}

// Menerima angka biasa (1000) maupun singkatan (1k, 5k, 10k, dst).
function parseBet(value) {
    const text = String(value ?? "").trim().toLowerCase();
    const match = text.match(/^(\d+(?:[.,]\d+)?)\s*([kmb])?$/);

    if (!match) return NaN;

    const numberText = match[1];
    const suffix = match[2];

    if (!suffix && !/^\d+$/.test(numberText)) {
        return NaN;
    }

    const multipliers = {
        k: 1_000,
        m: 1_000_000,
        b: 1_000_000_000
    };

    const multiplier = multipliers[suffix] || 1;
    const amount = Number(numberText.replace(",", ".")) * multiplier;

    return Number.isSafeInteger(amount) ? amount : NaN;
}

function buildGuide() {
    const bets = BET_OPTIONS
        .map(amount => `• .777 ${amount}`)
        .join("\n");

    return (
        "Masukkan nominal\n" +
        "Contoh : .777 1k\n" +
        "Nominal Tersedia : 1k, 5k, 10k, 25k, 50k"
    );
}

function buildInvalidBet() {
    const bets = BET_OPTIONS
        .map(amount => `• .777 ${amount}`)
        .join("\n");

    return (
        "❌ *Nominal taruhan tidak valid.*" 
    );
}

function mentionJid(jid) {
    return `@${String(jid).split("@")[0].split(":")[0]}`;
}

function scheduleDelete(Joy, sender, key) {
    if (!key) return;

    setTimeout(async () => {
        try {
            await Joy.sendMessage(sender, { delete: key });
        } catch (err) {
            console.error("Gagal menghapus pesan slot:", err.message);
        }
    }, RESULT_TTL_MS);
}

async function handleSpin(Joy, msg, reply, betText) {
    const sender = msg.key.remoteJid;
    const playerJid = msg.key.participant || msg.key.remoteJid;

    const bet = parseBet(betText);

    if (!Number.isSafeInteger(bet) || !BET_OPTIONS.includes(bet)) {
        return reply(buildInvalidBet());
    }

    if (activeSpins.has(playerJid)) {
        return reply("⏳ Putaran sebelumnya masih diproses. Tunggu sebentar.");
    }

    activeSpins.add(playerJid);

    try {
        const deduct = adjustBalance(playerJid, -bet);

        if (!deduct.success) {
            if (deduct.reason === "unregistered") {
                return reply(
                    "❌ Kamu belum terdaftar.\n" +
                    "Ketik *.reg* terlebih dahulu untuk bermain."
                );
            }

            if (deduct.reason === "insufficient") {
                const current = getBalance(playerJid);
                const saldo = current.success
                    ? formatRupiah(current.balance)
                    : formatRupiah(0);

                return reply(
                    "❌ *Saldo kamu tidak mencukupi.*" 
                );
            }

            return reply("❌ Putaran gagal diproses.");
        }

        const symbols = spinSymbols();
        const result = evaluateSpin(symbols);
        const payout = computePayout(bet, result.multiplier);

        let balance = deduct.balance;

        if (payout > 0) {
            const reward = adjustBalance(playerJid, payout);

            if (reward.success) {
                balance = reward.balance;
            }
        }

        const user = getUser(playerJid);
        const playerName = user?.name || "Kamu";

        const header =
            `👤 Pemain: ${mentionJid(playerJid)}\n` +
            `💸 Taruhan: ${formatRupiah(bet)}\n\n` +
            `🎲 [ ${symbols.join(" | ")} ]\n\n`;

        // const footer = `\n💳 Saldo: ${formatRupiah(balance)}`;

        let body;

        if (result.type === "none") {
            body =
                `💸 Kehilangan: ${formatRupiah(bet)}`;
        } else {
            const profit = payout - bet;

            body =
                `✨ ${result.name}\n` +
                `💰 Keuntungan: ${formatRupiah(payout)}`
                //`📈 Keuntungan: ${formatRupiah(profit)}`;
        }

        const text = header + body;

        const sentMsg = await Joy.sendMessage(
            sender,
            {
                text,
                mentions: [playerJid]
            },
            { quoted: msg }
        );

        scheduleDelete(Joy, sender, sentMsg?.key);

        return sentMsg;
    } finally {
        activeSpins.delete(playerJid);
    }
}

module.exports = async (Joy, msg, reply, args) => {
    if (args.length === 0) {
        return reply(buildGuide());
    }

    return handleSpin(Joy, msg, reply, String(args[0]).trim());
};

module.exports.BET_OPTIONS = BET_OPTIONS;
module.exports.SYMBOLS = SYMBOLS;
module.exports.spinSymbols = spinSymbols;
module.exports.evaluateSpin = evaluateSpin;
module.exports.computePayout = computePayout;
module.exports.parseBet = parseBet;
module.exports.buildGuide = buildGuide;
