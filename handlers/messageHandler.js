const processingCommands = new Set();
const MAX_MESSAGE_AGE_SECONDS = 20;

const reg = require("../commands/system/reg");
const daily = require("../commands/economy/daily");
const transaction = require("../commands/economy/transaction");
const bot = require("../config/bot");
const stats = require("../commands/system/stats");
const menu = require("../commands/system/menu");
const aiHandler = require("../commands/ai/aiHandler");
const quote = require("../commands/games/quote");
const caklontong = require("../commands/games/caklontong");
const tebakangka = require("../commands/games/tebakangka");
const sticker = require("../commands/media/sticker");
const tomed = require("../commands/media/tomed");
const brat = require("../commands/media/brat");
const ttdl = require("../commands/media/ttdl");

async function messageHandler(Joy, m) {
    const msg = m.messages[0];

    if (!msg?.message) return;

    //ignoer 20 s command
    const messageTimestamp = Number(msg.messageTimestamp);

    if (
        Number.isFinite(messageTimestamp) &&
        messageTimestamp > 0
    ) {
        const ageSeconds =
            Date.now() / 1000 - messageTimestamp;

        if (ageSeconds > MAX_MESSAGE_AGE_SECONDS) {
            return;
        }
    }

    const sender = msg.key.remoteJid;

    const actualSender =
        msg.key.participant || sender;

    const authorNumber = "222079890813069";

    const senderNumber = String(actualSender)
        .split("@")[0]
        .split(":")[0];

    const isAuthor =
        senderNumber === authorNumber;

    const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

    const text = body.trim();

    const reply = async (text) => {
        await Joy.sendMessage(
            sender,
            { text },
            { quoted: msg }
        );
    };

    const contextInfo =
        msg.message.extendedTextMessage?.contextInfo ||
        msg.message.imageMessage?.contextInfo ||
        msg.message.videoMessage?.contextInfo;

    const quotedId = contextInfo?.stanzaId;
    // 10/9
    const quotedMessage = contextInfo?.quotedMessage;

    const quotedText =
        quotedMessage?.conversation ||
        quotedMessage?.extendedTextMessage?.text ||
        quotedMessage?.imageMessage?.caption ||
        quotedMessage?.videoMessage?.caption ||
        "";
    // Handle jawaban Cak Lontong
    const handledCakLontong =
        await caklontong.handleAnswer(Joy, msg);

    if (handledCakLontong) {
        return;
    }

    // Periksa apakah pesan merupakan balasan ke pesan Joy
    const isReplyToBot =
        quotedId &&
        Joy.sentMessages?.has(
            `${sender}:${quotedId}`
        );

    // AI otomatis saat pengguna membalas pesan Joy
    if (
        isReplyToBot &&
        text &&
        !text.startsWith(bot.prefix)
    ) {
        await aiHandler.handleReply(
            Joy,
            msg,
            reply,
            text,
            quotedText
        );

        return;
    }

    // Abaikan pesan yang bukan command
    if (!text.startsWith(bot.prefix)) return;

    const commandText =
        text.slice(bot.prefix.length).trim();

    if (!commandText) return;

    const parts = commandText.split(/\s+/);

    const command =
        parts[0].toLowerCase();

    const args =
        parts.slice(1);

    const commandKey = `${sender}:${senderNumber}`;

    if (processingCommands.has(commandKey)) {
        return;
    }

    processingCommands.add(commandKey);
    try {
    switch (command) {

          // QUOTE
        case "quote":
            await quote(
                Joy,
                msg,
                reply,
                args
            );
            break;

        // TEBAK ANGKA
        case "tebakangka":
        case "tebak":
            await tebakangka(
                Joy,
                msg,
                reply,
                args,
                command
            );
            break;

        // STATS
        case "stats":
            await stats(
                Joy,
                msg,
                reply,
                args,
                command,
                { isAuthor }
            );
            break;

        // AI CHAT
        case "ai":
            await aiHandler.handleCommand(
                Joy,
                msg,
                reply,
                args,
                command,
                {
                    errorMessage:
                        "⚠ *Gagal Saat Melakukan Proses*"
                }
            );
            break;

        // REGISTRASI
        case "reg":
            await reg(
                Joy,
                msg,
                reply
            );
            break;

        // MENU
        case "menu":
            await menu(
                Joy,
                msg,
                reply
            );
            break;

        // DAILY REWARD
        case "daily":
            await daily(
                Joy,
                msg,
                reply
            );
            break;

        // TRANSAKSI DAN balance
        case "tf":
        case "tmsl":
        case "krsl":
        case "balance":
            await transaction(
                Joy,
                msg,
                reply,
                args,
                command,
                { isAuthor }
            );
            break;

        // STICKER
        case "sticker":
        case "s":
            await sticker(
                Joy,
                msg,
                reply
            );
            break;

        // STICKER TO IMAGE
        case "tomed":
        case "toimg":
            await tomed(
                Joy,
                msg,
                reply
            );
            break;

        // BRAT
        case "brat":
            await brat(
                Joy,
                msg,
                reply,
                args
            );
            break;

        // TIKTOK DOWNLOADER
        case "ttdl":
            await ttdl(
                Joy,
                msg,
                reply,
                args
            );
            break;

        // CAK LONTONG
        case "teka":
        case "clue":
        case "tekatop":
        case "leaderboard":
        case "lbteka":
            await caklontong(
                Joy,
                msg,
                reply,
                args,
                command
            );
            break;

        default:
            break;

    }
    } finally {
        processingCommands.delete(commandKey);
    }   
}

module.exports = messageHandler;