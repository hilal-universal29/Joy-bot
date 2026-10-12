module.exports = async (
    Joy,
    msg,
    reply
) => {
    const contextInfo =
        msg.message?.extendedTextMessage?.contextInfo ||
        msg.message?.imageMessage?.contextInfo ||
        msg.message?.videoMessage?.contextInfo;

    const quotedId = contextInfo?.stanzaId;
    const chatJid = msg.key.remoteJid;

    if (!quotedId) {
        return reply(
            "Balas pesan yang ingin dihapus"
        );
    }

    const trackingKey = `${chatJid}:${quotedId}`;

    if (!Joy.sentMessages?.has(trackingKey)) {
        return reply(
            "gagal menghapus pesan."
        );
    }

    const messageKey =
        Joy.sentMessageKeys?.get(trackingKey) || {
            remoteJid: chatJid,
            fromMe: true,
            id: quotedId,
            ...(contextInfo.participant
                ? { participant: contextInfo.participant }
                : {})
        };

    try {
        await Joy.sendMessage(chatJid, {
            delete: messageKey
        });

        return;
    } catch (error) {
        console.error(
            "Gagal menghapus pesan :",
            error.message
        );

        return reply(
            "Pesan gagal dihapus. WhatsApp mungkin tidak mengizinkan penghapusan pesan ini."
        );
    }
};