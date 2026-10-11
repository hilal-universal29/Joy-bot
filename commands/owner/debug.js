module.exports = async (
    Joy,
    msg,
    reply
) => {
    const memory = process.memoryUsage();

    const uptimeSeconds = Math.floor(
        process.uptime()
    );

    const days = Math.floor(
        uptimeSeconds / 86400
    );

    const hours = Math.floor(
        (uptimeSeconds % 86400) / 3600
    );

    const minutes = Math.floor(
        (uptimeSeconds % 3600) / 60
    );

    const seconds = uptimeSeconds % 60;

    const socketState = Joy.ws?.readyState;

    const connectionStatus = {
        0: "Connecting",
        1: "Connected",
        2: "Closing",
        3: "Closed"
    };

    return reply(
        "*JOYBOT DEBUG*\n\n" +
        `PID: ${process.pid}\n` +
        `Node.js: ${process.version}\n` +
        `Platform: ${process.platform}\n` +
        `Arsitektur: ${process.arch}\n` +
        `WhatsApp socket: ${connectionStatus[socketState] || "Unknown"}\n` +
        `Uptime: ${days}h ${hours}j ${minutes}m ${seconds}d\n` +
        `RAM RSS: ${Math.round(memory.rss / 1024 / 1024)} MB\n` +
        `Heap: ${Math.round(memory.heapUsed / 1024 / 1024)} MB`
    );
};