
const Joymenu = require("../../database/Menu/Joymenu");

const {
    getUser,
    getActiveDays,
    formatRupiah
} = require("../../database/users");

module.exports = async (Joy, msg, reply) => {
    const jid = msg.key.participant || msg.key.remoteJid;
    const user = getUser(jid);

    if (!user) {
        await reply(
            "Kamu belum terdaftar di Joy.\n\n" +
            "Ketik *.reg* terlebih dahulu untuk membuat akun."
        );
        return;
    }

    const sekarang = new Date();

    const jamWIB = Number(
        new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            hourCycle: "h23"
        }).format(sekarang)
    );

    let ucapan;

    if (jamWIB >= 4 && jamWIB < 11) {
        ucapan = "Selamat Pagi";
    } else if (jamWIB >= 11 && jamWIB < 15) {
        ucapan = "Selamat Siang";
    } else if (jamWIB >= 15 && jamWIB < 18) {
        ucapan = "Selamat Sore";
    } else {
        ucapan = "Selamat Malam";
    }

    const waktu = sekarang.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

    const tanggal = sekarang.toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

    const registrasi = new Date(user.registeredAt)
        .toLocaleDateString("id-ID", {
            timeZone: "Asia/Jakarta",
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

    const menu = Joymenu
        .replace("{{UCAPAN}}", ucapan)
        .replace("{{WAKTU}}", waktu)
        .replace("{{TANGGAL}}", tanggal)
        .replace("{{NAMA}}", user.name)
        .replace("{{SALDO}}", formatRupiah(user.balance))
        .replace("{{REGISTRASI}}", registrasi)
        .replace("{{MASA_AKTIF}}", String(getActiveDays(user.registeredAt)));

    await Joy.sendMessage(
        msg.key.remoteJid,
        { text: menu },
        { quoted: msg }
    );
};