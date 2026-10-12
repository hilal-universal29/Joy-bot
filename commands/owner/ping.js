const { execFile } = require("child_process");

const HOST = "google.com";

function pingHost(host) {
    const isWindows = process.platform === "win32";

    const args = isWindows
        ? ["-n", "1", "-w", "5000", host]
        : ["-c", "1", "-W", "5", host];

    return new Promise((resolve) => {
        execFile(
            "ping",
            args,
            {
                timeout: 10000,
                windowsHide: true
            },
            (error, stdout, stderr) => {
                if (error && error.code === "ENOENT") {
                    resolve({
                        ok: false,
                        missing: true,
                        output: ""
                    });
                    return;
                }

                resolve({
                    ok: !error,
                    missing: false,
                    output: stdout || stderr || ""
                });
            }
        );
    });
}

module.exports = async (
    Joy,
    msg,
    reply
) => {
    const result = await pingHost(HOST);

    if (result.missing) {
        return reply(
            `Host: ${HOST}\n` +
            "Status: *Tidak dapat dicek* ⚠️"
        );
    }

    const match = String(result.output).match(
        /time[=<]\s*([\d.]+)\s*ms/i
    );

    const latency = match ? `${match[1]} ms` : "-";

    if (result.ok) {
        return reply(
            `Host: ${HOST}\n` +
            "Status: *Online* \n" +
            `Latency: ${latency}`
        );
    }

    return reply(
        `Host: ${HOST}\n` +
        "Status: *Offline* ❌\n" +
        "Koneksi ke internet tidak terdeteksi."
    );
};
