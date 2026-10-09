const pino = require("pino");
const sharp = require("sharp");
const { downloadMediaMessage } = require("baileys");

module.exports = async (Joy, msg, reply) => {
    const sender = msg.key.remoteJid;

    try {
        const quoted = msg.message.extendedTextMessage?.contextInfo;

        let targetMessage = msg;
        let imageMessage = msg.message.imageMessage;

        if (!imageMessage && quoted?.quotedMessage) {
            let quotedMessage = quoted.quotedMessage;

            quotedMessage =
                quotedMessage.ephemeralMessage?.message ||
                quotedMessage.viewOnceMessage?.message ||
                quotedMessage.viewOnceMessageV2?.message ||
                quotedMessage;

            imageMessage = quotedMessage.imageMessage;

            if (imageMessage) {
                targetMessage = {
                    key: {
                        remoteJid: sender,
                        id: quoted.stanzaId,
                        participant: quoted.participant
                    },
                    message: quotedMessage
                };
            }
        }

        if (!imageMessage) {
            return reply(
                "⚠️ *Kirim gambar dengan caption .sticker atau balas gambar dengan .sticker*"
            );
        }

        await reply("☕ *Sedang membuat stiker...*");

        const buffer = await downloadMediaMessage(
            targetMessage,
            "buffer",
            {},
            {
                logger: pino({ level: "silent" }),
                reuploadRequest: Joy.updateMediaMessage
            }
        );

        const stickerBuffer = await sharp(buffer)
            .rotate()
            .resize(512, 512, {
                fit: "contain",
                background: {
                    r: 0,
                    g: 0,
                    b: 0,
                    alpha: 0
                }
            })
            .webp({ quality: 80 })
            .toBuffer();

        await Joy.sendMessage(
            sender,
            { sticker: stickerBuffer },
            { quoted: msg }
        );

    } catch (error) {
        console.error("Error Sticker:", error);

        await reply(
            "⚠️ *Gagal membuat stiker. Coba gunakan gambar lain.*"
        );
    }
};