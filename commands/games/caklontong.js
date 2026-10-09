const axios = require("axios");
const fs = require("fs");
const path = require("path");

const DATABASE_DIR = path.join(
    __dirname,
    "../../database/games"
);

const DATABASE_FILE = path.join(
    DATABASE_DIR,
    "caklontong.json"
);

// GAME CONFIG

const GAME_DURATION = 60 * 1000;
const MAX_CLUE = 2;


const activeGames = new Map();

//database function

function ensureDatabase() {
    if (!fs.existsSync(DATABASE_DIR)) {
        fs.mkdirSync(DATABASE_DIR, {
            recursive: true
        });
    }

    if (!fs.existsSync(DATABASE_FILE)) {
        fs.writeFileSync(
            DATABASE_FILE,
            JSON.stringify(
                {
                    groups: {}
                },
                null,
                2
            )
        );
    }
}

function loadDatabase() {
    ensureDatabase();

    try {
        const data = fs.readFileSync(
            DATABASE_FILE,
            "utf8"
        );

        return JSON.parse(data);
    } catch (error) {
        console.error(
            "Gagal membaca database Cak Lontong:",
            error
        );

        return {
            groups: {}
        };
    }
}

function saveDatabase(data) {
    ensureDatabase();

    fs.writeFileSync(
        DATABASE_FILE,
        JSON.stringify(
            data,
            null,
            2
        )
    );
}

//user answer helper

function getUserId(msg) {
    return (
        msg.key.participant ||
        msg.key.remoteJid
    );
}

function getUserNumber(userId) {
    return String(userId)
        .split("@")[0]
        .split(":")[0];
}

function normalizeAnswer(text) {
    return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}


// SCORE SYSTEM


function addScore(
    chatId,
    userId,
    pushName,
    points
) {
    const db = loadDatabase();

    if (!db.groups) {
        db.groups = {};
    }

    if (!db.groups[chatId]) {
        db.groups[chatId] = {
            players: {}
        };
    }

    if (!db.groups[chatId].players) {
        db.groups[chatId].players = {};
    }

    const playerId = getUserNumber(userId);

    if (!db.groups[chatId].players[playerId]) {
        db.groups[chatId].players[playerId] = {
            name: pushName || playerId,
            score: 0
        };
    }

    const player =
        db.groups[chatId].players[playerId];

    player.name =
        pushName ||
        player.name ||
        playerId;

    player.score += points;

    saveDatabase(db);

    return player.score;
}

// LEADERBOARD

function getLeaderboard(chatId) {
    const db = loadDatabase();

    const group = db.groups?.[chatId];

    if (!group?.players) {
        return [];
    }

    return Object.entries(
        group.players
    )
        .map(([id, player]) => ({
            id,
            name: player.name || id,
            score: Number(player.score) || 0
        }))
        .sort((a, b) => b.score - a.score);
}

// CLUE SYSTEM

function createClue(answer, clueCount) {
    const chars = [...answer];

    if (chars.length === 0) {
        return "";
    }

    const revealedCount = Math.min(
        clueCount,
        chars.length
    );

    return chars
        .map((char, index) => {
            const revealFrom =
                chars.length - revealedCount;

            if (
                index >= revealFrom ||
                char === " "
            ) {
                return char;
            }

            return "_";
        })
        .join(" ");
}


// FETCH CAK LONTONG

async function fetchQuestion() {
    const url =
        "https://ikhlasapi.web.id/api/games/caklontong";

    const response = await axios.get(url, {
        timeout: 15000
    });

    console.log(
        "Cak Lontong API Response:",
        response.data
    );

    const result =
        response.data?.result;

    if (
        !result ||
        !result.soal ||
        !result.jawaban
    ) {
        throw new Error(
            "Format API Cak Lontong tidak sesuai."
        );
    }

    return {
        soal: result.soal,
        jawaban: result.jawaban,
        deskripsi:
            result.deskripsi ||
            "Tidak ada deskripsi."
    };
}


// START GAME


async function startGame(
    Joy,
    msg,
    reply
) {
    const chatId =
        msg.key.remoteJid;


    if (activeGames.has(chatId)) {
        await reply(
            "masih ada game Cak Lontong yang sedang berjalan!\n\n" +
            "silakan jawab soal sebelumnya atau tunggu sampai waktunya habis."
        );

        return;
    }

    try {
        const question =
            await fetchQuestion();

        // Kirim soal sebagai pesan baru
        const sentMessage =
            await Joy.sendMessage(
                chatId,
                {
                    text:
                        "🧠 *CAK LONTONG*\n\n" +
                        `❓ ${question.soal}\n\n` +
                        "💡 Jawab dengan *mereply pesan soal ini*.\n" +
                        "🔍 Ketik *.clue* dengan mereply pesan soal untuk mendapatkan petunjuk.\n\n" +
                        "⏱️ Waktu: *60 detik*\n\n" +
                        "🏆 Skor:\n" +
                        "• Tanpa clue → *+3*\n" +
                        "• 1 clue → *+2*\n" +
                        "• 2 clue → *+1*"
                }
            );

        const game = {
            chatId,

            messageId:
                sentMessage?.key?.id,

            soal: question.soal,

            jawaban: question.jawaban,

            jawabanNormalized:
                normalizeAnswer(
                    question.jawaban
                ),

            deskripsi:
                question.deskripsi,

            startedAt: Date.now(),

            clueUsed: {},

            timer: null
        };

        // Timer 
        game.timer = setTimeout(
            async () => {
                const currentGame =
                    activeGames.get(chatId);

                if (
                    currentGame !== game
                ) {
                    return;
                }

                activeGames.delete(chatId);

                try {
                    await Joy.sendMessage(
                        chatId,
                        {
                            text:
                                "⏰ *WAKTU HABIS!*\n\n" +
                                `❓ ${game.soal}\n\n` +
                                `✅ Jawaban: *${game.jawaban}*\n` +
                                `💬 ${game.deskripsi}`
                        }
                    );
                } catch (error) {
                    console.error(
                        "Gagal mengirim pesan timer:",
                        error
                    );
                }
            },
            GAME_DURATION
        );

        activeGames.set(
            chatId,
            game
        );

    } catch (error) {
        console.error(
            "Cak Lontong Error:",
            error
        );

        await reply(
            "❌ Gagal mengambil soal Cak Lontong.\n" +
            "Silakan coba lagi nanti."
        );
    }
}

// HANDLE ANSWER

async function handleAnswer(
    Joy,
    msg
) {
    const chatId =
        msg.key.remoteJid;

    const game =
        activeGames.get(chatId);

    if (!game) {
        return false;
    }

    const contextInfo =
        msg.message?.extendedTextMessage
            ?.contextInfo;

    const quotedId =
        contextInfo?.stanzaId;

    if (
        !quotedId ||
        quotedId !== game.messageId
    ) {
        return false;
    }

    const body =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";

    const answer =
        body.trim();

    if (!answer) {
        return false;
    }

    if (answer.startsWith(".")) {
        return false;
    }

    const userId =
        getUserId(msg);

    const pushName =
        msg.pushName ||
        "Pemain";

    const userKey =
        getUserNumber(userId);

    const normalized =
        normalizeAnswer(answer);

    // correct answer
    if (
        normalized ===
        game.jawabanNormalized
    ) {
        const cluesUsed =
            game.clueUsed[userKey] || 0;

        let points = 3;

        if (cluesUsed === 1) {
            points = 2;
        } else if (cluesUsed >= 2) {
            points = 1;
        }

        const totalScore =
            addScore(
                chatId,
                userId,
                pushName,
                points
            );

        clearTimeout(
            game.timer
        );

        activeGames.delete(
            chatId
        );

        await Joy.sendMessage(
            chatId,
            {
                text:
                    "🎉 *BENAR!*\n\n" +
                    `👤 Pemain: *${pushName}*\n` +
                    `✅ Jawaban: *${game.jawaban}*\n\n` +
                    `🏆 +${points} poin\n` +
                    `📊 Total skor: *${totalScore}*\n\n` +
                    `💬 ${game.deskripsi}`
            },
            {
                quoted: msg
            }
        );

        return true;
    }

    // wronganswer
    await Joy.sendMessage(
        chatId,
        {
            text:
                "❌ *Jawaban masih salah!*\n\n" +
                "Coba lagi 😹😹😹😹😹😹"
        },
        {
            quoted: msg
        }
    );

    return true;
}

// HANDLE CLUE

async function handleClue(
    Joy,
    msg,
    reply
) {
    const chatId =
        msg.key.remoteJid;

    const game =
        activeGames.get(chatId);

    if (!game) {
        await reply(
            "❌ Tidak ada game Cak Lontong yang sedang berjalan."
        );

        return true;
    }

    const contextInfo =
        msg.message?.extendedTextMessage
            ?.contextInfo;

    const quotedId =
        contextInfo?.stanzaId;

    // Clue hanya berlaku jika
    // mereply pesan soal aktif
    if (
        !quotedId ||
        quotedId !== game.messageId
    ) {
        await reply(
            "💡 Silakan gunakan *.clue* dengan *mereply pesan soal Cak Lontong yang sedang aktif*."
        );

        return true;
    }

    const userId =
        getUserId(msg);

    const userKey =
        getUserNumber(userId);

    const currentClue =
        game.clueUsed[userKey] || 0;

    if (
        currentClue >= MAX_CLUE
    ) {
        await reply(
            "🚫 *Clue sudah habis!*\n\n" +
            "Kamu hanya bisa menggunakan clue maksimal *2 kali* untuk soal ini."
        );

        return true;
    }

    const newClue =
        currentClue + 1;

    game.clueUsed[userKey] =
        newClue;

    const clueText =
        createClue(
            game.jawaban,
            newClue
        );

    await reply(
        `🔍 *CLUE ${newClue}/2*\n\n` +
        `${clueText}\n\n` +
        `💡 Clue dibuka dari huruf paling belakang.\n` +
        `🎯 Jika benar sekarang: *+${newClue === 1 ? 2 : 1} poin*`
    );

    return true;
}

// LEADERBOARD MESSAGE

async function showLeaderboard(
    msg,
    reply
) {
    const chatId =
        msg.key.remoteJid;

    const leaderboard =
        getLeaderboard(chatId);

    if (
        leaderboard.length === 0
    ) {
        await reply(
            "🏆 *LEADERBOARD CAK LONTONG*\n\n" +
            "Belum ada pemain yang memiliki skor di chat ini."
        );

        return;
    }

    const medals = [
        "🥇",
        "🥈",
        "🥉"
    ];

    let text =
        "🏆 *LEADERBOARD CAK LONTONG*\n\n";

    leaderboard
        .slice(0, 10)
        .forEach(
            (player, index) => {
                const medal =
                    medals[index] ||
                    `${index + 1}.`;

                text +=
                    `${medal} *${player.name}* — ${player.score} poin\n`;
            }
        );

    text +=
        "\n📌 Leaderboard ini khusus untuk chat/group ini.";

    await reply(text);
}

// COMMAND HANDLER

async function caklontong(
    Joy,
    msg,
    reply,
    args,
    command
) {
    switch (command) {
        case "teka":
            await startGame(
                Joy,
                msg,
                reply
            );
            break;

        case "clue":
            await handleClue(
                Joy,
                msg,
                reply
            );
            break;

        case "tekatop":
        case "leaderboard":
        case "lbteka":
            await showLeaderboard(
                msg,
                reply
            );
            break;

        default:
            break;
    }
}

// EXPORT

module.exports = caklontong;

module.exports.handleAnswer =
    handleAnswer;

module.exports.handleClue =
    handleClue;

module.exports.startGame =
    startGame;

module.exports.getLeaderboard =
    getLeaderboard;