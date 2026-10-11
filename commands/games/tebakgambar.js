const fs = require("fs");
const path = require("path");
const axios = require("axios");

const {
    adjustBalance,
    consumeItem,
    formatRupiah,
    getUser,
    recordTebakGambarWin
} = require("../../database/users");

const questionsPath = path.join(
    __dirname,
    "../../database/games/tebakgambar.json"
);

function loadQuestions() {
    if (!fs.existsSync(questionsPath)) {
        return [];
    }

    try {
        const raw = fs.readFileSync(questionsPath, "utf8");
        return JSON.parse(raw);
    } catch (e) {
        console.error("Gagal memuat tebakgambar.json:", e);
        return [];
    }
}

function cleanString(str) {
    return String(str || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

function maskAnswer(answer, level = 0) {
    return String(answer || "")
        .toUpperCase()
        .split(" ")
        .map(word => {
            if (word.length <= 2) {
                return word
                    .split("")
                    .map((c, i) => (i === 0 || level >= 1 ? c : "_"))
                    .join(" ");
            }

            return word
                .split("")
                .map((c, i) => {
                    if (i === 0 || i === word.length - 1) return c;
                    if (level >= 1 && (i % 2 === 1 || "AIUEO".includes(c))) return c;
                    if (level >= 2) return c;
                    return "_";
                })
                .join(" ");
        })
        .join("   ");
}

async function deleteGameMessage(Joy, sender, msgKey) {
    if (!msgKey) return;
    try {
        await Joy.sendMessage(sender, {
            delete: msgKey
        });
    } catch (err) {
        console.error("Gagal menghapus pesan gambar tebak gambar:", err.message);
    }
}

async function startGame(Joy, msg, reply) {
    const sender = msg.key.remoteJid;
    Joy.tebakgambar = Joy.tebakgambar || {};

    if (Joy.tebakgambar[sender]) {
        return reply(
            "⚠️ *Game Tebak Gambar masih berlangsung di chat ini!*\n\n" +
            "• Ketik *.tg [jawaban]* untuk menebak\n" +
            "• Ketik *.clue* untuk petunjuk (-1 Clue)\n" +
            "• Ketik *.nyerah* untuk menyerah"
        );
    }

    const questions = loadQuestions();

    if (!questions || questions.length === 0) {
        return reply("❌ Data soal Tebak Gambar tidak ditemukan.");
    }

    const question = questions[Math.floor(Math.random() * questions.length)];

    let imageBuffer;
    try {
        const res = await axios.get(question.img, {
            responseType: "arraybuffer",
            timeout: 15000
        });
        imageBuffer = Buffer.from(res.data);
    } catch (err) {
        console.error("Gagal mengunduh gambar Tebak Gambar:", err.message);
        return reply("❌ Gagal memuat gambar soal. Coba lagi dengan *.tebakgambar*");
    }

    const initialHint = maskAnswer(question.jawaban, 0);

    const caption =
        "🖼️ *TEBAK GAMBAR*\n\n" +
        "Hadiah: *Rp 5.000*\n" +
        "Waktu: *120 Detik*\n\n" +
        "💡 Petunjuk Awal:\n" +
        `\`${initialHint}\`\n\n` +
        "• Ketik *.tg [jawaban]* atau balas gambar ini untuk menebak\n" +
        "• Ketik *.clue* untuk menggunakan petunjuk (-1 Clue)\n" +
        "• Ketik *.nyerah* jika menyerah";

    const sentMsg = await Joy.sendMessage(
        sender,
        {
            image: imageBuffer,
            caption
        },
        { quoted: msg }
    );

    const msgKey = sentMsg?.key || {
        remoteJid: sender,
        fromMe: true,
        id: sentMsg?.key?.id
    };

    const timeout = setTimeout(async () => {
        if (Joy.tebakgambar && Joy.tebakgambar[sender]) {
            const current = Joy.tebakgambar[sender];
            delete Joy.tebakgambar[sender];

            await deleteGameMessage(Joy, sender, current.msgKey);

            await Joy.sendMessage(sender, {
                text:
                    "⌛ *WAKTU HABIS!*\n\n" +
                    `Jawaban yang benar: *${current.jawaban}*\n` +
                    `Keterangan: ${current.deskripsi || "-"}\n\n` +
                    "Main lagi? Ketik *.tebakgambar*!"
            });
        }
    }, 120000);

    const playerJid = msg.key.participant || msg.key.remoteJid;

    Joy.tebakgambar[sender] = {
        index: question.index,
        jawaban: question.jawaban,
        deskripsi: question.deskripsi,
        clueGiven: 0,
        reward: 5000,
        starterJid: playerJid,
        msgId: sentMsg?.key?.id,
        msgKey,
        timeout
    };
}

async function handleAnswer(Joy, msg, reply, answerText) {
    const sender = msg.key.remoteJid;
    Joy.tebakgambar = Joy.tebakgambar || {};

    const game = Joy.tebakgambar[sender];

    if (!game) {
        return reply(
            "❌ Tidak ada game Tebak Gambar yang sedang berlangsung di chat ini.\n" +
            "Ketik *.tebakgambar* untuk memulai permainan."
        );
    }

    const guessClean = cleanString(answerText);
    const answerClean = cleanString(game.jawaban);

    if (!guessClean) {
        return reply("❌ Masukkan jawabanmu!\nContoh: *.tg tantangan seru*");
    }

    if (guessClean === answerClean) {
        clearTimeout(game.timeout);
        delete Joy.tebakgambar[sender];

        await deleteGameMessage(Joy, sender, game.msgKey);

        const playerJid = msg.key.participant || msg.key.remoteJid;
        const user = getUser(playerJid);
        const playerName = user?.name || "Kamu";

        const totalWins = recordTebakGambarWin(playerJid);
        const balRes = adjustBalance(playerJid, game.reward);
        let rewardText = `\n💰 Reward: *${formatRupiah(game.reward)}*`;

        if (balRes.success) {
            rewardText += `\n💳 Saldo: ${formatRupiah(balRes.balance)}`;
        } else {
            rewardText += "\nℹ️ Ketik *.reg* untuk menyimpan hadiah saldo ke akunmu.";
        }

        const winStatText = totalWins ? `\n🏆 Total Menang TG: *${totalWins}x*` : "";

        return reply(
            "🎉 *TEBAKAN KAMU BENAR!* 🎉\n\n" +
            `👤 Pemenang: *${playerName}*\n` +
            `🎯 Jawaban: *${game.jawaban}*\n` +
            `📝 Keterangan: ${game.deskripsi || "-"}` +
            `${rewardText}\n` +
            "Ingin main lagi? Ketik *.tebakgambar*!"
        );
    }

    return reply("❌ *Tebakan salah!* Coba lagi.");
}

async function handleClue(Joy, msg, reply) {
    const sender = msg.key.remoteJid;
    Joy.tebakgambar = Joy.tebakgambar || {};

    const game = Joy.tebakgambar[sender];

    if (!game) {
        return reply(
            "❌ Tidak ada game Tebak Gambar yang sedang berlangsung di chat ini.\n" +
            "Ketik *.tebakgambar* untuk memulai permainan."
        );
    }

    if (game.clueGiven >= 1) {
        return reply(
            "❌ *Clue untuk game ini sudah digunakan!*\n\n" +
            "Clue hanya bisa dipakai *1x per game*."
        );
    }

    const playerJid = msg.key.participant || msg.key.remoteJid;
    const consume = consumeItem(playerJid, "clue", 1);

    if (!consume.success) {
        if (consume.reason === "unregistered") {
            return reply(
                "❌ Kamu belum terdaftar.\n" +
                "Ketik *.reg* terlebih dahulu untuk memiliki akun dan membeli Clue."
            );
        }

        return reply(
            "❌ *Kamu tidak memiliki Clue!*\n\n" +
            "💡 Kamu bisa membeli Clue di Shop menggunakan saldo:\n" +
            "Ketik: *.shop buy clue 1* (Harga: Rp 10.000)\n\n" +
            "Cek inventori kamu dengan *.inventory*"
        );
    }

    game.clueGiven += 1;
    const hint = maskAnswer(game.jawaban, game.clueGiven);

    const text =
        "Clue -1\n" +
        `Sisa Clue: *${consume.remaining}*\n\n` +
        "Petunjuk Huruf:\n" +
        `\`${hint}\``;

    return reply(text);
}

async function handleNyerah(Joy, msg, reply, { callerJid, isAuthor } = {}) {
    const sender = msg.key.remoteJid;
    Joy.tebakgambar = Joy.tebakgambar || {};

    const game = Joy.tebakgambar[sender];

    if (!game) {
        return reply(
            "❌ Tidak ada game Tebak Gambar yang sedang berlangsung di chat ini."
        );
    }

    const caller = callerJid || msg.key.participant || msg.key.remoteJid;

    if (!isAuthor && game.starterJid && caller !== game.starterJid) {
        return reply("❌ Hanya pemain yang memulai game ini yang boleh menyerah.");
    }

    clearTimeout(game.timeout);
    const { jawaban, deskripsi, msgKey } = game;
    delete Joy.tebakgambar[sender];

    await deleteGameMessage(Joy, sender, msgKey);

    return reply(
        "🏳️ *KAMU MENYERAH!*\n\n" +
        `🎯 Jawaban : *${jawaban}*\n` +
        `📝 Keterangan: ${deskripsi || "-"}\n\n` +
        "Main lagi? Ketik *.tebakgambar*!"
    );
}

module.exports = async (Joy, msg, reply, args, command, opts = {}) => {
    switch (command) {
        case "clue":
        case "hint":
            return handleClue(Joy, msg, reply);

        case "nyerah":
        case "surrender":
            return handleNyerah(Joy, msg, reply, opts);

        case "jawab":
            if (args.length === 0) {
                return reply("Masukkan tebakanmu!\nContoh: *.jawab tantangan seru*");
            }
            return handleAnswer(Joy, msg, reply, args.join(" "));

        case "tebakgambar":
        case "tg":
        default:
            if (args.length === 0) {
                return startGame(Joy, msg, reply);
            }
            return handleAnswer(Joy, msg, reply, args.join(" "));
    }
};

module.exports.handleAnswer = handleAnswer;
module.exports.handleClue = handleClue;
module.exports.handleNyerah = handleNyerah;
module.exports.startGame = startGame;
