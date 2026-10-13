const {
    adjustBalance,
    formatRupiah,
    getUser,
    recordQumathWin
} = require("../../database/users");

// Konfigurasi tiap mode kuis matematika
const MODES = {
    easy: {
        key: "easy",
        label: "EASY",
        reward: 5000,
        time: 60000
    },
    medium: {
        key: "medium",
        label: "MEDIUM",
        reward: 10000,
        time: 60000
    },
    hard: {
        key: "hard",
        label: "HARD",
        reward: 20000,
        time: 90000
    },
    expert: {
        key: "expert",
        label: "EXPERT",
        reward: 30000,
        time: 120000
    },
    master: {
        key: "master",
        label: "MASTER",
        reward: 40000,
        time: 180000
    },
    insane: {
        key: "insane",
        label: "INSANE",
        reward: 50000,
        time: 240000
    }
};

function normalizeMode(input) {
    const mode = String(input || "").toLowerCase().trim();

    if (["e", "easy", "mudah"].includes(mode)) return "easy";
    if (["m", "medium", "med", "sedang"].includes(mode)) return "medium";
    if (["h", "hard", "sulit"].includes(mode)) return "hard";
    if (["ex", "expert", "ekspert"].includes(mode)) return "expert";
    if (["ma", "master"].includes(mode)) return "master";
    if (["in", "insane", "gila", "extreme"].includes(mode)) return "insane";

    return null;
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

// ==================== GENERATOR SOAL ====================

// Mudah: penjumlahan/pengurangan/perkalian angka kecil
function generateEasy() {
    const type = pick(["+", "-", "×"]);

    if (type === "+") {
        const a = rand(1, 20);
        const b = rand(1, 20);
        return { soal: `${a} + ${b} = ?`, jawaban: a + b };
    }

    if (type === "-") {
        const a = rand(5, 20);
        const b = rand(1, a);
        return { soal: `${a} - ${b} = ?`, jawaban: a - b };
    }

    const a = rand(1, 5);
    const b = rand(1, 5);
    return { soal: `${a} × ${b} = ?`, jawaban: a * b };
}

// Sedang: angka 2 digit, perkalian & pembagian
function generateMedium() {
    const type = pick(["+", "-", "×", "÷"]);

    if (type === "+") {
        const a = rand(10, 99);
        const b = rand(10, 99);
        return { soal: `${a} + ${b} = ?`, jawaban: a + b };
    }

    if (type === "-") {
        const a = rand(20, 99);
        const b = rand(10, a - 1);
        return { soal: `${a} - ${b} = ?`, jawaban: a - b };
    }

    if (type === "×") {
        const a = rand(3, 12);
        const b = rand(3, 12);
        return { soal: `${a} × ${b} = ?`, jawaban: a * b };
    }

    const hasil = rand(3, 12);
    const pembagi = rand(2, 12);
    return {
        soal: `${hasil * pembagi} ÷ ${pembagi} = ?`,
        jawaban: hasil
    };
}

// Sulit: operasi campuran, perkalian besar, persen
function generateHard() {
    const type = pick(["×", "mixed", "triple", "÷", "percent"]);

    if (type === "×") {
        const a = rand(12, 50);
        const b = rand(12, 50);
        return { soal: `${a} × ${b} = ?`, jawaban: a * b };
    }

    if (type === "mixed") {
        const a = rand(5, 25);
        const b = rand(5, 25);
        const c = rand(3, 12);
        return {
            soal: `(${a} + ${b}) × ${c} = ?`,
            jawaban: (a + b) * c
        };
    }

    if (type === "triple") {
        const a = rand(10, 50);
        const b = rand(2, 12);
        const c = rand(2, 12);
        return {
            soal: `${a} + ${b} × ${c} = ?`,
            jawaban: a + b * c
        };
    }

    if (type === "÷") {
        const hasil = rand(5, 30);
        const pembagi = rand(5, 20);
        return {
            soal: `${hasil * pembagi} ÷ ${pembagi} = ?`,
            jawaban: hasil
        };
    }

    const persen = pick([10, 20, 50]);
    const nilai = rand(2, 30) * 10;
    return {
        soal: `${persen}% dari ${nilai} = ?`,
        jawaban: (nilai * persen) / 100
    };
}

// Expert: perkalian 2 digit, operasi campuran lebih sulit
function generateExpert() {
    const type = pick(["×", "mixed", "triple", "÷", "percent"]);
    
    if (type === "×") {
        const a = rand(25, 99);
        const b = rand(12, 50);
        return { soal: `${a} × ${b} = ?`, jawaban: a * b };
    }
    
    if (type === "mixed") {
        const a = rand(15, 50);
        const b = rand(10, 40);
        const c = rand(8, 20);
        return {
            soal: `(${a} + ${b}) × ${c} = ?`,
            jawaban: (a + b) * c
        };
    }
    
    if (type === "triple") {
        const a = rand(50, 150);
        const b = rand(5, 25);
        const c = rand(5, 25);
        return {
            soal: `${a} + ${b} × ${c} = ?`,
            jawaban: a + b * c
        };
    }
    
    if (type === "÷") {
        const pembagi = rand(8, 25);
        const hasil = rand(15, 60);
        return {
            soal: `${hasil * pembagi} ÷ ${pembagi} = ?`,
            jawaban: hasil
        };
    }
    
    const persen = pick([15, 25, 30, 40]);
    const nilai = rand(10, 50) * 10;
    return {
        soal: `${persen}% dari ${nilai} = ?`,
        jawaban: (nilai * persen) / 100
    };
}

// Master: soal lebih kompleks
function generateMaster() {
    const type = pick(["××", "mixed2", "triple2", "pangkat", "÷"]);
    
    if (type === "××") {
        const a = rand(50, 150);
        const b = rand(25, 99);
        return { soal: `${a} × ${b} = ?`, jawaban: a * b };
    }
    
    if (type === "mixed2") {
        let a = rand(20, 80);
        let b = rand(15, 60);
        let c = rand(10, 30);
        while ((a * b) % c !== 0) {
            a = rand(20, 80);
            b = rand(15, 60);
            c = rand(10, 30);
        }
        return {
            soal: `(${a} × ${b}) ÷ ${c} = ?`,
            jawaban: (a * b) / c
        };
    }
    
    if (type === "triple2") {
        const a = rand(100, 500);
        const b = rand(12, 40);
        const c = rand(8, 30);
        return {
            soal: `${a} - ${b} × ${c} = ?`,
            jawaban: a - b * c
        };
    }
    
    if (type === "pangkat") {
        const a = rand(2, 12);
        const b = rand(2, 3);
        return {
            soal: `${a}^${b} = ?`,
            jawaban: Math.pow(a, b)
        };
    }
    
    const pembagi = rand(12, 40);
    const hasil = rand(25, 99);
    return {
        soal: `${hasil * pembagi} ÷ ${pembagi} = ?`,
        jawaban: hasil
    };
}

// Insane: sangat sulit
function generateInsane() {
    const type = pick(["big×", "campuran", "kuadrat", "akar", "mixed3"]);
    
    if (type === "big×") {
        const a = rand(150, 999);
        const b = rand(50, 199);
        return { soal: `${a} × ${b} = ?`, jawaban: a * b };
    }
    
    if (type === "campuran") {
        const a = rand(50, 200);
        const b = rand(20, 100);
        const c = rand(15, 80);
        const d = rand(5, 25);
        return {
            soal: `(${a} + ${b}) × (${c} - ${d}) = ?`,
            jawaban: (a + b) * (c - d)
        };
    }
    
    if (type === "kuadrat") {
        const a = rand(13, 25);
        return {
            soal: `${a}² = ?`,
            jawaban: a * a
        };
    }
    
    if (type === "akar") {
        const kuadrat = rand(13, 30) * rand(13, 30);
        const akar = Math.sqrt(kuadrat);
        if (akar % 1 === 0) {
            return {
                soal: `√${kuadrat} = ?`,
                jawaban: akar
            };
        }
        const a = rand(11, 29);
        return {
            soal: `${a}² = ?`,
            jawaban: a * a
        };
    }
    
    const a = rand(500, 2000);
    const b = rand(25, 150);
    const c = rand(10, 60);
    return {
        soal: `${a} ÷ ${b} × ${c} = ?`,
        jawaban: Math.floor((a / b) * c)
    };
}

function generateQuestion(mode) {
    const key = normalizeMode(mode) || "easy";

    let question;
    if (key === "easy") question = generateEasy();
    else if (key === "medium") question = generateMedium();
    else if (key === "hard") question = generateHard();
    else if (key === "expert") question = generateExpert();
    else if (key === "master") question = generateMaster();
    else if (key === "insane") question = generateInsane();
    else question = generateEasy();

    return { ...question, mode: key };
}

// ==================== UTILITAS ====================

function parseNumber(input) {
    const cleaned = String(input || "").replace(/[^0-9]/g, "");

    if (!cleaned) return null;

    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
}

async function deleteGameMessage(Joy, sender, msgKey) {
    if (!msgKey) return;
    try {
        await Joy.sendMessage(sender, { delete: msgKey });
    } catch (err) {
        console.error("Gagal menghapus pesan soal kuis matematika:", err.message);
    }
}

function buildModeGuide() {
    return (
        "*KUIS MATEMATIKA*\n\n" +
        "Pilih mode kesulitan:\n" +
        "• *.qumath e* — Easy\n" +
        "• *.qumath m* — Medium\n" +
        "• *.qumath h* — Hard\n" +
        "• *.qumath ex* — Expert\n" +
        "• *.qumath ma* — Master\n" +
        "• *.qumath in* — Insane\n\n" +
        "Contoh: *.qumath ex*"
    );
}

// ==================== GAME FLOW ====================

async function startGame(Joy, msg, reply, modeArg) {
    const sender = msg.key.remoteJid;
    Joy.qumath = Joy.qumath || {};

    const mode = normalizeMode(modeArg);

    if (!mode) {
        return reply(buildModeGuide());
    }

    if (Joy.qumath[sender]) {
        const cur = Joy.qumath[sender];
        const cfg = MODES[cur.mode] || MODES.easy;

        return reply(
            "*Kuis Matematika masih berlangsung di chat ini!*\n\n" +
            `Mode: *${cfg.label}*\n` +
            `Soal:\n*${cur.soal}*\n\n` +
            "Langsung ketik jawabanmu (angka) atau balas pesan soal!\n" +
            "Ketik *.nyerah* jika menyerah."
        );
    }

    const cfg = MODES[mode];
    const question = generateQuestion(mode);

    const quizText =
        `Mode: *${cfg.label}*\n\n` +
        `Soal:\n*${question.soal}*\n\n` +
        `Hadiah: *${formatRupiah(cfg.reward)}*\n` +
        `Waktu: *${Math.round(cfg.time / 1000)} Detik*` 

    const sentMsg = await Joy.sendMessage(
        sender,
        { text: quizText },
        { quoted: msg }
    );

    const timeout = setTimeout(async () => {
        if (Joy.qumath && Joy.qumath[sender]) {
            const cur = Joy.qumath[sender];
            delete Joy.qumath[sender];

            await deleteGameMessage(Joy, sender, cur.msgKey);

            await Joy.sendMessage(sender, {
                text:
                    "*Waktu Habis!*\n\n" +
                    `Jawaban yang benar: *${cur.jawaban}*\n\n` +
                    "Main lagi? Ketik *.qumath e/m/h/ex/ma/in*!"
            });
        }
    }, cfg.time);

    const starterJid = msg.key.participant || msg.key.remoteJid;

    Joy.qumath[sender] = {
        mode: question.mode,
        soal: question.soal,
        jawaban: question.jawaban,
        reward: cfg.reward,
        starterJid,
        msgId: sentMsg?.key?.id,
        msgKey: sentMsg?.key || {
            remoteJid: sender,
            fromMe: true,
            id: sentMsg?.key?.id
        },
        timeout
    };
}

async function handleAnswer(Joy, msg, reply, answerText, isDirect = false) {
    const sender = msg.key.remoteJid;
    Joy.qumath = Joy.qumath || {};

    const game = Joy.qumath[sender];

    if (!game) {
        if (!isDirect) {
            return reply(
                "*Tidak ada kuis matematika yang sedang berlangsung di chat ini.*\n" +
                "Ketik *.qumath e/m/h/ex/ma/in* untuk memulai."
            );
        }
        return false;
    }

    const guess = parseNumber(answerText);

    if (guess === null) {
        if (!isDirect) {
            return reply("*Masukkan jawaban berupa angka!*");
        }
        return false;
    }

    if (guess === Number(game.jawaban)) {
        clearTimeout(game.timeout);
        delete Joy.qumath[sender];

        await deleteGameMessage(Joy, sender, game.msgKey);

        const cfg = MODES[game.mode] || MODES.easy;
        const playerJid = msg.key.participant || msg.key.remoteJid;
        const user = getUser(playerJid);
        const playerName = user?.name || "Kamu";

        const balRes = adjustBalance(playerJid, game.reward);
        const totalWins = recordQumathWin(playerJid, game.mode, sender);

        let rewardText = `\nHadiah: *${formatRupiah(game.reward)}*`;
        if (balRes.success) {
            rewardText += `\nSaldo: ${formatRupiah(balRes.balance)}`;
        } else {
            rewardText += "\nKetik *.reg* untuk menyimpan hadiah saldo ke akunmu.";
        }

        return reply(
            "*JAWABAN BENAR!*\n\n" +
            `Pemenang: *${playerName}*\n` +
            `Mode: *${cfg.label}*\n` +
            `Jawaban: *${game.jawaban}*\n` +
            `Total Menang ${cfg.label}: *${totalWins}x*` +
            `${rewardText}\n\n` +
            "Ingin main lagi? Ketik *.qumath e/m/h/ex/ma/in*!"
        );``
    }

    // Jawaban salah
    if (isDirect) {
        return false;
    }

    return reply("*Jawaban salah!* Coba lagi.");
}

async function handleNyerah(Joy, msg, reply, { callerJid, isAuthor } = {}) {
    const sender = msg.key.remoteJid;
    Joy.qumath = Joy.qumath || {};

    const game = Joy.qumath[sender];

    if (!game) {
        return reply(
            "*Tidak ada kuis matematika yang sedang berlangsung di chat ini.*"
        );
    }

    const caller = callerJid || msg.key.participant || msg.key.remoteJid;

    if (!isAuthor && game.starterJid && caller !== game.starterJid) {
        return reply("*Hanya pemain yang memulai kuis ini yang boleh menyerah.*");
    }

    clearTimeout(game.timeout);
    const { jawaban, msgKey } = game;
    delete Joy.qumath[sender];

    await deleteGameMessage(Joy, sender, msgKey);

    return reply(
        "*KAMU MENYERAH!*\n\n" +
        `Jawaban yang benar: *${jawaban}*\n\n` +
        "Main lagi? Ketik *.qumath e/m/h/ex/ma/in*!"
    );
}

module.exports = async (Joy, msg, reply, args = [], command = "qumath", opts = {}) => {
    const cmd = String(command || "").toLowerCase();

    if (cmd === "nyerah" || cmd === "surrender") {
        return handleNyerah(Joy, msg, reply, opts);
    }

    if (cmd === "clue" || cmd === "hint") {
        return reply("*Game Kuis Matematika tidak memiliki fitur clue.*");
    }

    if (args.length === 0) {
        return startGame(Joy, msg, reply, null);
    }

    return startGame(Joy, msg, reply, args[0]);
};

module.exports.startGame = startGame;
module.exports.handleAnswer = handleAnswer;
module.exports.handleNyerah = handleNyerah;
module.exports.normalizeMode = normalizeMode;
module.exports.MODES = MODES;
