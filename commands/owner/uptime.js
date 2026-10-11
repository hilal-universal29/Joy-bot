module.exports = async (
    Joy,
    msg,
    reply
) => {
    const totalSeconds = Math.floor(
        process.uptime()
    );

    const days = Math.floor(
        totalSeconds / 86400
    );

    const hours = Math.floor(
        (totalSeconds % 86400) / 3600
    );

    const minutes = Math.floor(
        (totalSeconds % 3600) / 60
    );

    const seconds = totalSeconds % 60;

    return reply(
        "*JOYBOT UPTIME*\n\n" +
        `${days} hari, ${hours} jam, ` +
        `${minutes} menit, ${seconds} detik`
    );
};