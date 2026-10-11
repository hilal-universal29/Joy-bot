const fs = require("fs");
const path = require("path");

const {
    adjustBalance,
    formatRupiah,
    getUser,
    recordQuizWin
} = require("../../database/users");

const quizPath = path.join(
    __dirname,
    "../../database/games/quiz.json"
);

function loadQuestions() {
    if (!fs.existsSync(quizPath)) {
        return [];
    }

    try {
        const raw = fs.readFileSync(quizPath, "utf8");
        return JSON.parse(raw);
    } catch (e) {
        console.error("Gagal memuat quiz.json:", e);
        return [];
    }
}

function cleanString(str) {
    return String(str || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

function maskAnswer(ans) {
    const text = String(ans || "").trim();
    const words = text.split(/\s+/);

    return words
        .map(w => {
            if (w.length <= 2) {
                return w[0] + "_";
            }
            return (
                w[0] +
                " " +
                "_ ".repeat(Math.max(1, w.length - 2)).trim() +
                " " +
                w[w.length - 1]
            );
        })
        .join("   ");
}

// Clue level 1: huruf pertama & terakhir tiap kata
// Clue level 2: tambah huruf tengah ganjil yang terungkap
function maskAnswerLevel(ans, level) {
    const text = String(ans || "").trim();
    const words = text.split(/\s+/);

    return words.map(w => {
        if (w.length <= 2) return w[0] + (level >= 2 ? w[1] || "_" : "_");

        return w.split("").map((c, i) => {
            if (i === 0 || i === w.length - 1) return c;
            if (level >= 2 && i % 2 === 1) return c; // ungkap huruf di posisi ganjil
            return "_";
        }).join(" ");
    }).join("   ");
}

async function deleteQuizMessage(Joy, sender, msgKey) {
    if (!msgKey) return;
    try {
        await Joy.sendMessage(sender, { delete: msgKey });
    } catch (err) {
        console.error("Gagal menghapus pesan soal kuis:", err.message);
    }
}

async function startQuiz(Joy, msg, reply) {
    const sender = msg.key.remoteJid;
    Joy.activeQuiz = Joy.activeQuiz || {};

    if (Joy.activeQuiz[sender]) {
        const cur = Joy.activeQuiz[sender];
        return reply(
            "⚠️ *Kuis masih berlangsung di chat ini!*\n\n" +
            `Soal:\n*${cur.soal}*\n\n` +
            "Langsung ketik jawabanmu di chat ini atau balas pesan kuis!\n" +
            "Ketik *.nyerah* jika menyerah."
        );
    }

    const questions = loadQuestions();

    if (!questions || questions.length === 0) {
        return reply("❌ Data soal kuis tidak ditemukan.");
    }

    const question =
        questions[Math.floor(Math.random() * questions.length)];

    const hint = maskAnswer(question.jawaban);

    const quizText =
        "*KUIS TRIVIA*\n\n" +
        `Soal:\n*${question.soal}*\n\n` +
        "💰 Hadiah: *Rp 5.000*\n" +
        "⏳ Waktu: *60 Detik*\n" ;

    const sentMsg = await Joy.sendMessage(
        sender,
        { text: quizText },
        { quoted: msg }
    );

    const timeout = setTimeout(async () => {
        if (Joy.activeQuiz && Joy.activeQuiz[sender]) {
            const cur = Joy.activeQuiz[sender];
            delete Joy.activeQuiz[sender];

            await deleteQuizMessage(Joy, sender, cur.msgKey);

            await Joy.sendMessage(sender, {
                text:
                    "⌛ *Time's up!*\n\n" +
                    `Jawaban yang benar: *${cur.jawaban}*\n\n` 
            });
        }
    }, 60000);

    const starterJid = msg.key.participant || msg.key.remoteJid;

    Joy.activeQuiz[sender] = {
        id: question.id,
        soal: question.soal,
        jawaban: question.jawaban,
        reward: 5000,
        clueUsed: 0,
        starterJid,
        msgId: sentMsg?.key?.id,
        msgKey: sentMsg?.key || { remoteJid: sender, fromMe: true, id: sentMsg?.key?.id },
        timeout
    };
}

async function handleAnswer(Joy, msg, reply, answerText, isDirect = false) {
    const sender = msg.key.remoteJid;
    Joy.activeQuiz = Joy.activeQuiz || {};

    const quiz = Joy.activeQuiz[sender];

    if (!quiz) {
        if (!isDirect) {
            return reply(
                "❌ Tidak ada kuis yang sedang berlangsung di chat ini.\n" +
                "Ketik *.quiz* untuk memulai permainan."
            );
        }
        return false;
    }

    const guessClean = cleanString(answerText);
    const answerClean = cleanString(quiz.jawaban);

    if (!guessClean) {
        if (!isDirect) {
            return reply("❌ Masukkan jawaban kuis!");
        }
        return false;
    }

    if (guessClean === answerClean) {
        clearTimeout(quiz.timeout);
        delete Joy.activeQuiz[sender];

        await deleteQuizMessage(Joy, sender, quiz.msgKey);

        const playerJid = msg.key.participant || msg.key.remoteJid;
        const user = getUser(playerJid);
        const playerName = user?.name || "Kamu";

        const balRes = adjustBalance(playerJid, quiz.reward);
        const groupScore = recordQuizWin(playerJid, sender);

        let saldoInfo = balRes.success
            ? `\n💳 Total Saldo: *${formatRupiah(balRes.balance)}*`
            : "\nℹ️ Ketik *.reg* untuk menyimpan hadiah saldo ke akunmu.";

        const isGroup = sender.endsWith("@g.us");
        const scoreScope = isGroup ? "di grup ini" : "";

        await reply(
            "🎉 *JAWABAN KUIS BENAR!* 🎉\n\n" +
            `👤 Pemenang: *${playerName}*\n` +
            `🎯 Jawaban: *${quiz.jawaban}*\n` +
            `💰 Hadiah: *Rp 5.000*`
        );

        return true;
    }

    // Jika jawaban salah:
    // Jika user mengetik pesan biasa (isDirect), jangan balas salah agar tidak mengganggu chat grup
    if (isDirect) {
        return false;
    }

    // Jika user me-reply soal kuis atau memakai command .quiz jawaban, beri feedback salah
    await reply("❌ *Jawaban salah!* Coba lagi.");
    return false;
}

async function handleNyerah(Joy, msg, reply, { callerJid, isAuthor } = {}) {
    const sender = msg.key.remoteJid;
    Joy.activeQuiz = Joy.activeQuiz || {};

    const quiz = Joy.activeQuiz[sender];

    if (!quiz) {
        return reply(
            "❌ Tidak ada kuis yang sedang berlangsung di chat ini."
        );
    }

    const caller = callerJid || msg.key.participant || msg.key.remoteJid;

    if (!isAuthor && quiz.starterJid && caller !== quiz.starterJid) {
        return reply("❌ Hanya pemain yang memulai kuis ini yang boleh menyerah.");
    }

    clearTimeout(quiz.timeout);
    const { soal, jawaban, msgKey } = quiz;
    delete Joy.activeQuiz[sender];

    await deleteQuizMessage(Joy, sender, msgKey);

    return reply(
        "🏳️ *KAMU MENYERAH!*\n\n" +
        `🎯 Jawaban yang benar: *${jawaban}*\n\n` +
        "Main lagi? Ketik *.quiz*!"
    );
}

module.exports = async (Joy, msg, reply, args, command) => {
    const cmd = String(command || "").toLowerCase();

    if (args.length === 0) {
        return startQuiz(Joy, msg, reply);
    }

    return handleAnswer(Joy, msg, reply, args.join(" "), false);
};

module.exports.startQuiz = startQuiz;
module.exports.handleAnswer = handleAnswer;
module.exports.handleNyerah = handleNyerah;
