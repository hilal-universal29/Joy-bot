module.exports = async (
    Joy,
    msg,
    reply,
    args
) => {
    const text = args.join(" ").trim();

    if (!text) {
        return reply("Format: .say pesan");
    }

    return Joy.sendMessage(
        msg.key.remoteJid,
        { text }
    );
};