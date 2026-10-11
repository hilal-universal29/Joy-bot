module.exports = async (
    Joy,
    msg,
    reply
) => {
    const chatJid =
        msg.key.remoteJid || "Tidak tersedia";

    const senderJid =
        msg.key.participant ||
        msg.key.remoteJid ||
        "Tidak tersedia";

    const chatType = chatJid.endsWith("@g.us")
        ? "Grup"
        : chatJid.endsWith("@s.whatsapp.net")
            ? "Pribadi"
            : "Lainnya";

    return reply(
        "*CHAT INFORMATION*\n\n" +
        `Tipe chat: ${chatType}\n` +
        `Chat JID: ${chatJid}\n` +
        `Sender JID: ${senderJid}`
    );
};