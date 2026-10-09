
const { registerUser, formatRupiah } = require("../../database/users");

module.exports = async (Joy, msg, reply) => {
    const jid = msg.key.participant || msg.key.remoteJid;
    const name = msg.pushName || "Pengguna";

    try {
        const result = registerUser(jid, name);

        if (!result.success) {
            await reply(
                "Kamu sudah terdaftar di Database!\n\n" +
                `Nama: ${result.user.name}\n` +
                `Saldo: ${formatRupiah(result.user.balance)}`
            );
            return;
        }

        await reply(
            "✅ *REGISTRASI BERHASIL*\n\n" +
            `Nama: ${result.user.name}\n` +
            `Saldo awal: ${formatRupiah(result.user.balance)}\n` +
            `Tanggal daftar: ${new Date(result.user.registeredAt).toLocaleDateString("id-ID", {
                timeZone: "Asia/Jakarta",
                day: "2-digit",
                month: "short",
                year: "numeric"
            })}\n\n` +
            "Sekarang kamu bisa menggunakan *.menu* untuk melihat profilmu."
        );
    } catch (error) {
        console.error("Registrasi gagal:", error);
        await reply("❌ Registrasi gagal karena terjadi kesalahan pada database.");
    }
};