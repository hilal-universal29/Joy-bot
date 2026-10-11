const {
    getTopUsersByBalance,
    getTopUsersByTG,
    getTopUsersByQuiz,
    getUserRankByField,
    getUserQuizRank,
    getUser,
    formatRupiah
} = require("./users");

module.exports = async (Joy, msg, reply, args = [], command = "ldbalance") => {
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const isGroup = msg.key.remoteJid?.endsWith("@g.us");

    // Daftar ID bot / sistem yang tidak boleh masuk ke leaderboard manapun
    const excludeIds = new Set(["255989211242546"]);
    if (Joy?.user?.id) {
        const botPhone = Joy.user.id.split("@")[0].split(":")[0];
        if (botPhone) excludeIds.add(botPhone);
    }

    // Filter anggota jika dieksekusi di dalam grup WhatsApp
    let memberIds = null;
    let groupName = "";

    if (isGroup) {
        try {
            const metadata = await Joy.groupMetadata(msg.key.remoteJid);
            if (metadata?.participants) {
                memberIds = new Set();
                groupName = metadata.subject || "Grup";

                for (const p of metadata.participants) {
                    const id = (p.id || "").split("@")[0].split(":")[0];
                    if (id) memberIds.add(id);
                    if (p.phoneNumber) {
                        memberIds.add(p.phoneNumber.split("@")[0].split(":")[0]);
                    }
                }
            }
        } catch (e) {
            console.error(
                "Gagal mendapatkan groupMetadata untuk leaderboard:",
                e.message
            );
        }
    }

    const cmd = String(command || "").toLowerCase();
    const isTG =
        cmd === "leadtg" ||
        cmd === "leadertg" ||
        cmd === "lbtg" ||
        (cmd === "leaderboard" && (args[0] === "tg" || args[0] === "tebakgambar"));

    const isQuiz =
        cmd === "leadquiz" ||
        cmd === "ldquiz" ||
        cmd === "leaderquiz" ||
        cmd === "lbquiz" ||
        (cmd === "leaderboard" && args[0] === "quiz");

    const medals = ["🥇", "🥈", "🥉"];
    const user = getUser(senderJid);

    // ====================================================================
    // 1. LEADERBOARD TEBAK GAMBAR (.leadtg)
    // ====================================================================
    if (isTG) {
        // Ambil top 10 pemenang tebak gambar terbanyak (Joybot dikecualikan)
        const topUsers = getTopUsersByTG(memberIds, 10, excludeIds);
        const userRank = getUserRankByField(senderJid, "tebakGambarWins", memberIds, excludeIds);

        if (!topUsers || topUsers.length === 0) {
            return reply(
                isGroup
                    ? "Belum ada anggota di grup ini yang memiliki skor Tebak Gambar atau terdaftar di Joy.\nMainkan game dengan *.tebakgambar*!"
                    : "Belum ada data pemain Tebak Gambar yang terdaftar."
            );
        }

        let text = isGroup
            ? `🏆 *LEADERBOARD TEBAK GAMBAR GRUP* 🏆\n👥 _${groupName}_\n\n`
            : "🏆 *LEADERBOARD TEBAK GAMBAR GLOBAL* 🏆\n\n";

        topUsers.forEach((u, index) => {
            const medal = medals[index] || `${index + 1}.`;
            text += `${medal} *${u.name}*\n`;
            text += `   └ Menang: *${u.tebakGambarWins || 0}x*\n`;
        });

        text += "\n────────────────\n";
        if (user && userRank) {
            const scope = isGroup ? "anggota grup terdaftar" : "pengguna";
            text += `📌 *Peringkat Anda:* #${userRank.rank} dari ${userRank.total} ${scope}\n`;
            text += `🎯 *Total Menang:* ${Number(user.tebakGambarWins) || 0} kali`;
        } else {
            text += "ℹ️ Anda belum terdaftar. Ketik *.reg* untuk bergabung!";
        }

        return reply(text);
    }

    // ====================================================================
    // 2. LEADERBOARD KUIS KHUSUS PER GRUP (.leadquiz / .ldquiz)
    // ====================================================================
    else if (isQuiz) {
        if (!isGroup) {
            return reply(
                "📌 *LEADERBOARD KUIS*\n\n" +
                "Skor kuis dihitung khusus per grup WhatsApp agar data antar-grup tidak tercampur.\n\n" +
                "Silakan buka grup Anda dan ketik *.leadquiz* atau *.ldquiz*!"
            );
        }

        const groupId = msg.key.remoteJid;
        // Ambil pemenang kuis khusus di grup ini saja (tidak digabung dengan grup lain)
        const topUsers = getTopUsersByQuiz(groupId, memberIds, 10, excludeIds);
        const userRank = getUserQuizRank(senderJid, groupId, memberIds, excludeIds);

        if (!topUsers || topUsers.length === 0) {
            return reply(
                `Belum ada anggota di grup "${groupName}" yang memiliki poin kuis.\n` +
                "Mulai permainan kuis dengan *.quiz*!"
            );
        }

        let text =
            `🏆 *LEADERBOARD KUIS GRUP* 🏆\n` +
            `👥 _${groupName}_\n\n`;

        topUsers.forEach((u, index) => {
            const medal = medals[index] || `${index + 1}.`;
            text += `${medal} *${u.name}*\n`;
            text += `   └ Skor Kuis: *${u.quizScore || 0} Menang*\n`;
        });

        text += "\n────────────────\n";
        if (user && userRank) {
            text += `📌 *Peringkat Anda:* #${userRank.rank} dari ${userRank.total} anggota terdaftar\n`;
            text += `🎯 *Skor Anda di grup ini:* ${userRank.score || 0} kali menang`;
        } else {
            text += "ℹ️ Anda belum terdaftar. Ketik *.reg* untuk bergabung!";
        }

        return reply(text);
    }

    // ====================================================================
    // 3. LEADERBOARD SALDO (.ldbalance)
    // ====================================================================
    else {
        // Ambil top 10 pengguna dengan saldo terbanyak (Joybot dikecualikan)
        const topUsers = getTopUsersByBalance(memberIds, 10, excludeIds);
        const userRank = getUserRankByField(senderJid, "balance", memberIds, excludeIds);

        if (!topUsers || topUsers.length === 0) {
            return reply(
                isGroup
                    ? "Belum ada anggota di grup ini yang terdaftar di Joy.\nKetik *.reg* untuk mendaftar!"
                    : "Belum ada data pengguna yang terdaftar."
            );
        }

        let text = isGroup
            ? `🏆 *LEADERBOARD SALDO GRUP* 🏆\n👥 _${groupName}_\n\n`
            : "🏆 *LEADERBOARD SALDO GLOBAL* 🏆\n\n";

        topUsers.forEach((u, index) => {
            const medal = medals[index] || `${index + 1}.`;
            text += `${medal} *${u.name}*\n`;
            text += `   └ Saldo: *${formatRupiah(u.balance)}*\n`;
        });

        text += "\n────────────────\n";
        if (user && userRank) {
            const scope = isGroup ? "anggota grup terdaftar" : "pengguna";
            text += `📌 *Peringkat Anda:* #${userRank.rank} dari ${userRank.total} ${scope}\n`;
            text += `💰 *Saldo Anda:* ${formatRupiah(user.balance)}`;
        } else {
            text += "ℹ️ Anda belum terdaftar. Ketik *.reg* untuk bergabung!";
        }

        return reply(text);
    }
};
