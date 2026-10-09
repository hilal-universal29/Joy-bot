
const {
    claimDaily,
    formatRupiah
} = require("../../database/users");

module.exports = async (Joy, msg, reply) => {
    const jid = msg.key.participant || msg.key.remoteJid;

    const result = claimDaily(jid);

    if (!result.success) {
        if (result.reason === "unregistered") {
            return reply("Kamu belum terdaftar. Ketik *.reg* terlebih dahulu.");
        }

        if (result.reason === "cooldown") {
            const minutes = Math.ceil(result.remaining / 60000);
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;

            return reply(
                "⏳ Kamu sudah mengambil hadiah harian.\n" +
                `Coba lagi dalam ${hours} jam ${remainingMinutes} menit.`
            );
        }

        return reply("❌ Hadiah harian gagal diproses.");
    }

    await reply(
        "🎁 *DAILY REWARD*\n\n" +
        `Hadiah kamu: *${formatRupiah(result.reward)}*\n` +
        `balance sekarang: *${formatRupiah(result.balance)}*\n\n` +
        "Sampai jumpa di hadiah berikutnya!"
    );
};