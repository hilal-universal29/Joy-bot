module.exports = async (Joy, msg, reply, args, command) => {
    const sender = msg.key.remoteJid;

    if (command === "tebakangka") {
        const target = Math.floor(Math.random() * 100);

        Joy.tebakGame = {
            target,
            sender
        };

        await reply(
            "*Tebak Angka 1 - 100*\n*Ketik .tebak [Angka]*"
        );

        return;
    }

    if (command === "tebak") {
        if (
            !Joy.tebakGame ||
            Joy.tebakGame.sender !== sender
        ) {
            return;
        }

        const guess = parseInt(args[0]);

        if (isNaN(guess)) {
            await reply("❌ *Masukkan Angka!*");
            return;
        }

        if (guess === Joy.tebakGame.target) {
            await reply("🎉 *Tebakkan Kamu Benar!*");

            delete Joy.tebakGame;
            return;
        }

        await reply(
            guess > Joy.tebakGame.target
                ? "*>*"
                : "*<*"
        );
    }
};