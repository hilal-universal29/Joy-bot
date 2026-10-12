const axios = require("axios");

const {
    adjustBalance,
    formatRupiah,
    getUser
} = require("../../database/users");

const API_URL = "https://ikhlasapi.web.id/api/games/tebaklogo";
const REWARD = 5000;
const TIME_LIMIT = 60000;

function cleanString(str) {
    return String(str || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

function extractQuestion(payload) {
    const root =
        payload?.result?.data ||
        payload?.result ||
        payload?.data ||
        payload;

    const candidate = Array.isArray(root)
        ? root[0]
        : root;

    if (!candidate || typeof candidate !== "object") {
        return null;
    }

    const image =
        candidate.image ||
        candidate.img ||
        candidate.url ||
        candidate.logo ||
        candidate.imageUrl;

    const answer =
        candidate.jawaban ||
        candidate.answer ||
        candidate.name ||
        candidate.title;

    if (!image || !answer) {
        return null;
    }

    const imageUrl = String(image).trim();
    const answerText = String(answer).trim();

    if (!/^https?:\/\//i.test(imageUrl)) {
        return null;
    }

    return {
        image: imageUrl,
        answer: answerText
    };
}

async function fetchQuestion() {
    const res = await axios.get(API_URL, {
        headers: { Accept: "application/json" },
        timeout: 15000
    });

    if (res.data?.status === false) {
        throw new Error("API mengembalikan status gagal.");
    }

    const question = extractQuestion(res.data);

    if (!question) {
        throw new Error("Struktur respons API tidak dikenali.");
    }

    return question;
}

async function downloadImage(url) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000
    });

    const contentType = String(
        res.headers?.["content-type"] || ""
    );

    if (contentType && !contentType.startsWith("image/")) {
        throw new Error("URL gambar tidak valid.");
    }

    return Buffer.from(res.data);
}

async function loadQuestionImage(maxAttempts = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const question = await fetchQuestion();
            const imageBuffer = await downloadImage(question.image);

            return { question, imageBuffer };
        } catch (err) {
            lastError = err;

            console.error(
                `Percobaan ${attempt} memuat soal Tebak Logo gagal:`,
                err.message
            );
        }
    }

    throw lastError;
}

async function deleteGameMessage(Joy, sender, msgKey) {
    if (!msgKey) return;

    try {
        await Joy.sendMessage(sender, { delete: msgKey });
    } catch (err) {
        console.error(
            "Gagal menghapus pesan gambar Tebak Logo:",
            err.message
        );
    }
}

async function startGame(Joy, msg, reply) {
    const sender = msg.key.remoteJid;
    Joy.tebaklogo = Joy.tebaklogo || {};

    if (Joy.tebaklogo[sender]) {
        return reply(
            "⚠️ *Game Tebak Logo masih berlangsung di chat ini!*\n\n" +
            "• Balas gambar soal dengan nama merek/perusahaan yang benar\n" +
            "• Atau langsung ketik jawabannya di chat\n" +
            "• Ketik *.nyerah* untuk menyerah"
        );
    }

    let question;
    let imageBuffer;

    try {
        const loaded = await loadQuestionImage();
        question = loaded.question;
        imageBuffer = loaded.imageBuffer;
    } catch (err) {
        console.error(
            "Gagal memuat soal Tebak Logo:",
            err.message
        );
        return reply(
            "❌ Gagal memuat soal Tebak Logo. Coba lagi dengan *.tebaklogo*"
        );
    }

    const caption =
        "🎮 *TEBAK LOGO*\n\n" +
        "Logo apakah ini?\n\n" +
        "Balas pesan gambar ini, atau langsung ketik jawabanmu\n" +
        "dengan nama merek atau perusahaan yang benar.\n" +
        "⏳ Waktu: *60 detik*";

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
        if (Joy.tebaklogo && Joy.tebaklogo[sender]) {
            const current = Joy.tebaklogo[sender];
            delete Joy.tebaklogo[sender];

            await deleteGameMessage(Joy, sender, current.msgKey);

            await Joy.sendMessage(sender, {
                text:
                    "⌛ *WAKTU HABIS!*\n\n" +
                    `Jawaban yang benar: *${current.answer}*\n\n` +
                    "Main lagi? Ketik *.tebaklogo*!"
            });
        }
    }, TIME_LIMIT);

    const playerJid = msg.key.participant || msg.key.remoteJid;

    Joy.tebaklogo[sender] = {
        answer: question.answer,
        reward: REWARD,
        starterJid: playerJid,
        msgId: sentMsg?.key?.id,
        msgKey,
        timeout
    };
}

async function handleAnswer(Joy, msg, reply, answerText, isDirect = false) {
    const sender = msg.key.remoteJid;
    Joy.tebaklogo = Joy.tebaklogo || {};

    const game = Joy.tebaklogo[sender];

    if (!game) {
        if (isDirect) return false;

        return reply(
            "❌ Tidak ada game Tebak Logo yang sedang berlangsung di chat ini.\n" +
            "Ketik *.tebaklogo* untuk memulai permainan."
        );
    }

    const guessClean = cleanString(answerText);
    const answerClean = cleanString(game.answer);

    if (!guessClean) {
        if (isDirect) return false;

        return reply(
            "❌ Masukkan jawabanmu!\nContoh: *.tebaklogo Shopee*"
        );
    }

    if (guessClean === answerClean) {
        clearTimeout(game.timeout);
        delete Joy.tebaklogo[sender];

        await deleteGameMessage(Joy, sender, game.msgKey);

        const playerJid =
            msg.key.participant || msg.key.remoteJid;
        const user = getUser(playerJid);
        const playerName = user?.name || "Kamu";

        const balRes = adjustBalance(playerJid, game.reward);

        let rewardText =
            `\n💰 Reward: *${formatRupiah(game.reward)}*`;

        if (balRes.success) {
            rewardText +=
                `\n💳 Saldo: ${formatRupiah(balRes.balance)}`;
        } else {
            rewardText +=
                "\nℹ️ Ketik *.reg* untuk menyimpan hadiah saldo ke akunmu.";
        }

        await reply(
            "🎉 *TEBAKAN KAMU BENAR!* 🎉\n\n" +
            `👤 Pemenang: *${playerName}*\n` +
            `🎯 Jawaban: *${game.answer}*` +
            `${rewardText}\n` +
            "Ingin main lagi? Ketik *.tebaklogo*!"
        );

        return true;
    }

    // Jika pengguna langsung mengetik di chat, jangan balas salah
    // agar percakapan biasa tidak terganggu.
    if (isDirect) {
        return false;
    }

    await reply("❌ *Tebakan salah!* Coba lagi.");
    return false;
}

async function handleNyerah(Joy, msg, reply, { callerJid, isAuthor } = {}) {
    const sender = msg.key.remoteJid;
    Joy.tebaklogo = Joy.tebaklogo || {};

    const game = Joy.tebaklogo[sender];

    if (!game) {
        return reply(
            "❌ Tidak ada game Tebak Logo yang sedang berlangsung di chat ini."
        );
    }

    const caller =
        callerJid || msg.key.participant || msg.key.remoteJid;

    if (!isAuthor && game.starterJid && caller !== game.starterJid) {
        return reply(
            "❌ Hanya pemain yang memulai game ini yang boleh menyerah."
        );
    }

    clearTimeout(game.timeout);
    const { answer, msgKey } = game;
    delete Joy.tebaklogo[sender];

    await deleteGameMessage(Joy, sender, msgKey);

    return reply(
        "🏳️ *KAMU MENYERAH!*\n\n" +
        `🎯 Jawaban : *${answer}*\n\n` +
        "Main lagi? Ketik *.tebaklogo*!"
    );
}

module.exports = async (Joy, msg, reply, args, command, opts = {}) => {
    switch (command) {
        case "nyerah":
        case "surrender":
            return handleNyerah(Joy, msg, reply, opts);

        case "tebaklogo":
        case "tl":
        default:
            if (args.length === 0) {
                return startGame(Joy, msg, reply);
            }
            return handleAnswer(Joy, msg, reply, args.join(" "));
    }
};

module.exports.startGame = startGame;
module.exports.handleAnswer = handleAnswer;
module.exports.handleNyerah = handleNyerah;
