/* =========================================================
   JOY CONSOLE - DASHBOARD RENDERER
   ---------------------------------------------------------
   HANYA berisi kode TAMPILAN (pure render). Tidak ada logika
   bot, tidak ada akses WhatsApp, tidak ada timer.

   Setiap bagian diberi penanda komentar "DASHBOARD SECTION".
   Cari komentar tersebut untuk menemukan dan mengubah bagian
   tertentu tanpa menyentuh sisa program.

   Aman dihapus: menghapus sebuah bagian tampilan TIDAK akan
   mematikan pemrosesan pesan, database, atau koneksi
   WhatsApp — dashboard hanya membentuk string untuk dicetak.
   ========================================================= */

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

const CONFIG = require("../config/joyConsole");

const projectRoot = path.join(__dirname, "..");

/* ============================================================
   DASHBOARD SECTION: THEME (WARNA AKSEN)
   Edit CONFIG.accentColor di config/joyConsole.js untuk
   mengganti warna aksen. Bagian ini menerjemahkannya ke chalk.
   ============================================================ */

const theme = {
    accent: chalk[CONFIG.accentColor] || chalk.green,
    accentBold:
        (chalk[CONFIG.accentColor] || chalk.green).bold,
    healthy: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
    muted: chalk.gray,
    text: chalk.white
};

function statusColor(status) {
    switch (String(status || "").toUpperCase()) {
        case "CONNECTED":
        case "OPEN":
        case "READY":
        case "OK":
            return theme.healthy;
        case "CONNECTING":
        case "STARTING":
            return theme.warn;
        case "DISCONNECTED":
        case "ERROR":
            return theme.error;
        default:
            return theme.muted;
    }
}

/* ============================================================
   DASHBOARD SECTION: HEADER AND LOGO
   ------------------------------------------------------------
   Logo kucing dimuat dari aset database/console-logo.json.
   JANGAN mengubah karakter logo. Untuk menyembunyikan logo,
   set layout.showLogo = false di config/joyConsole.js.
   ============================================================ */

let LOGO_LINES = ["[ JOY CONSOLE ]"];
let LOGO_LOADED = false;

function loadLogo() {
    try {
        const file = path.isAbsolute(CONFIG.logoFile)
            ? CONFIG.logoFile
            : path.join(projectRoot, CONFIG.logoFile);

        if (!fs.existsSync(file)) return;

        const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

        if (
            parsed &&
            Array.isArray(parsed.lines) &&
            parsed.lines.length > 1 &&
            parsed.lines.every((l) => typeof l === "string")
        ) {
            LOGO_LINES = parsed.lines;
            LOGO_LOADED = true;
        }
    } catch (error) {
        // Biarkan fallback sederhana; jangan crash.
    }
}

loadLogo();

function center(line, width) {
    const len = stripAnsi(line).length;
    const pad = Math.max(0, Math.floor((width - len) / 2));
    return " ".repeat(pad) + line;
}

function buildLogoHeader(width) {
    // ============================================================
    // DASHBOARD SECTION: BRAND TEXT "JOY UNIVERSE"
    // Ubah/hapus baris di bawah untuk mengubah tulisan brand
    // yang berada di sebelah kanan logo kucing.
    // ============================================================
    const brand = [
        "",
        theme.accentBold("JOY UNIVERSE"),
        theme.muted("WhatsApp Bot"),
        "",
        // ============================================================
        // DASHBOARD SECTION: TITLE "JOY CONSOLE"
        // Ubah teks judul dashboard di baris berikut.
        // ============================================================
        theme.accentBold("JOY CONSOLE"),
        theme.muted("Terminal Dashboard"),
        "",
        theme.muted("Type 'help' for commands")
    ];

    const brandOffset = 4;
    const gap = "    ";

    const lines = [];

    for (let i = 0; i < LOGO_LINES.length; i++) {
        const brandIndex = i - brandOffset;

        const brandLine =
            brandIndex >= 0 && brandIndex < brand.length
                ? brand[brandIndex]
                : "";

        const left = theme.accent(LOGO_LINES[i]);

        lines.push(
            brandLine
                ? left + gap + brandLine
                : left
        );
    }

    // Pusatkan blok secara horizontal.
    const blockWidth = lines.reduce((max, l) => {
        return Math.max(max, stripAnsi(l).length);
    }, 0);

    const pad = Math.max(0, Math.floor((width - blockWidth) / 2));

    return lines.map((l) => " ".repeat(pad) + l);
}

function buildCompactHeader(width) {
    const lines = [
        theme.accentBold("JOY UNIVERSE  ·  JOY CONSOLE"),
        theme.muted("Joybot Terminal Dashboard"),
        theme.muted("Type 'help' for commands")
    ];

    return lines.map((l) => center(l, width));
}

/* ============================================================
   DASHBOARD SECTION: SYSTEM STATISTICS
   Edit this section to change or remove system statistics.
   ============================================================ */

function systemFields(s) {
    // Setiap field aman dihapus satu per satu.
    return [
        // DASHBOARD FIELD: Process RAM
        // Remove this field and its rendering code if you do not want it displayed.
        ["RAM", theme.text(s.ramRss)],

        // DASHBOARD FIELD: Heap memory
        ["Heap", theme.muted(s.ramHeap)],

        // DASHBOARD FIELD: CPU usage (proses)
        ["CPU", theme.text(s.cpu)],

        // DASHBOARD FIELD: Total registered users
        ["Users", theme.text(
            s.totalUsers === null ? "N/A" : String(s.totalUsers)
        )],

        // DASHBOARD FIELD: Total known groups
        ["Groups", theme.text(String(s.totalGroups))],

        // DASHBOARD FIELD: Total processed messages
        ["Messages", theme.text(String(s.totalMessages))],

        // DASHBOARD FIELD: Uptime
        ["Uptime", theme.text(s.uptime)],

        // DASHBOARD FIELD: WhatsApp connection status
        ["WhatsApp", statusColor(s.connection)(s.connection)]
    ];
}

function buildSection(title, lines) {
    const header =
        theme.accentBold(
            `── ${title} ${"─".repeat(Math.max(0, 54 - title.length))}`
        );

    return [header, ...lines, ""];
}

function buildSystemSection(s) {
    const fields = systemFields(s);

    const lines = [];
    const cols = 2;
    const colWidth = 38;

    for (let i = 0; i < fields.length; i += cols) {
        const row = [];

        for (let c = 0; c < cols && i + c < fields.length; c++) {
            const [label, value] = fields[i + c];
            const cell =
                theme.muted(padRight(label, 11)) + value;

            row.push(padRight(cell, colWidth));
        }

        lines.push("  " + row.join("").trimEnd());
    }

    return buildSection("SYSTEM STATISTICS", lines);
}

/* ============================================================
   DASHBOARD SECTION: ACTIVITY STATISTICS
   Statistik 24 jam terakhir. Jika data belum tersedia -> N/A.
   ============================================================ */

function buildActivitySection(a) {
    const lines = [
        // DASHBOARD FIELD: Online users (last 24h)
        "  " +
            theme.muted("Online Users       : ") +
            theme.text(
                a.trackedUsers === 0
                    ? "N/A"
                    : String(a.activeUsers)
            ),

        // DASHBOARD FIELD: Online groups (last 24h)
        "  " +
            theme.muted("Online Groups      : ") +
            theme.text(
                a.trackedGroups === 0
                    ? "N/A"
                    : String(a.activeGroups)
            ),

        // DASHBOARD FIELD: Offline users (last 24h)
        "  " +
            theme.muted("Offline Users      : ") +
            theme.text(
                a.trackedUsers === 0
                    ? "N/A"
                    : String(
                          Math.max(
                              0,
                              a.trackedUsers - a.activeUsers
                          )
                      )
            ),

        // DASHBOARD FIELD: Offline groups (last 24h)
        "  " +
            theme.muted("Offline Groups     : ") +
            theme.text(
                a.trackedGroups === 0
                    ? "N/A"
                    : String(
                          Math.max(
                              0,
                              a.trackedGroups - a.activeGroups
                          )
                      )
            ),

        // DASHBOARD FIELD: Latest message time
        "  " +
            theme.muted("Latest Message     : ") +
            theme.text(
                a.latestMessageAt
                    ? formatClock(a.latestMessageAt)
                    : "N/A"
            )
    ];

    return buildSection("ACTIVITY STATISTICS", lines);
}

/* ============================================================
   DASHBOARD SECTION: GROUP SUMMARY
   Ringkasan grup yang tercatat. Set layout.showGroupSummary =
   false di config untuk menyembunyikan.
   ============================================================ */

function buildGroupSummarySection(groups) {
    const lines = [];

    if (!groups.length) {
        lines.push("  " + theme.muted("No groups recorded yet."));
    } else {
        const top = groups.slice(0, 3);

        for (const g of top) {
            const name = g.name || "UNKNOWN";

            lines.push(
                "  " +
                    theme.text(truncate(name, 28)) +
                    theme.muted(" · ") +
                    theme.text(`${g.messageCount} msgs`) +
                    theme.muted(
                        ` · ${g.lastMessageAt
                            ? formatClock(g.lastMessageAt)
                            : "N/A"}`
                    )
            );
        }
    }

    return buildSection("GROUP SUMMARY", lines);
}

/* ============================================================
   DASHBOARD SECTION: LAST ERROR INFO
   Menampilkan error terakhir yang tercatat oleh logger.
   ============================================================ */

function buildErrorSection(lastError) {
    const lines = [];

    if (!lastError) {
        lines.push("  " + theme.muted("No errors recorded."));
    } else {
        lines.push(
            "  " +
                theme.muted(formatClock(lastError.time) + "  ") +
                theme.error(truncate(lastError.message, 70))
        );
    }

    return buildSection("LAST ERROR", lines);
}

/* ============================================================
   DASHBOARD SECTION: LOG PANE (WARNING / ERROR)
   Menampilkan log WARNING & ERROR terbaru. Set
   layout.showLogPane = false di config untuk menyembunyikan.
   ============================================================ */

function buildLogSection(entries) {
    const lines = [];

    if (!entries.length) {
        lines.push("  " + theme.muted("No warnings or errors."));
    } else {
        for (const entry of entries.slice(-CONFIG.layout.maxLogRows)) {
            const color =
                entry.level === "error"
                    ? theme.error
                    : theme.warn;

            lines.push(
                "  " +
                    theme.muted(formatClock(entry.time)) +
                    " " +
                    color(entry.level.toUpperCase().padEnd(7)) +
                    theme.text(truncate(entry.message, 58))
            );
        }
    }

    return buildSection("LOG (WARN/ERROR)", lines);
}

/* ============================================================
   DASHBOARD SECTION: FOOTER AND COMMAND PROMPT
   Teks petunjuk di atas baris prompt. Prompt ">" sendiri
   dikelola oleh readline di console/index.js.
   ============================================================ */

function buildFooter(width) {
    const text =
        theme.muted(
            "commands: /help · /home · /back · /clear · /groups · /users · /monitor · /logs · /exit"
        );

    return [theme.accent("─".repeat(Math.min(width, 76))), text];
}

/* ---------------------------------------------------------
   Helper kecil
   --------------------------------------------------------- */

function stripAnsi(str) {
    return String(str).replace(/\x1b\[[0-9;]*m/g, "");
}

function padRight(str, len) {
    const visible = stripAnsi(str).length;
    return str + " ".repeat(Math.max(0, len - visible));
}

function truncate(str, len) {
    const s = String(str);
    return s.length > len ? s.slice(0, Math.max(0, len - 1)) + "…" : s;
}

function formatClock(iso) {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "N/A";

    return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

/* =========================================================
   VIEWS
   ---------------------------------------------------------
   Setiap view mengembalikan array of string (baris).
   Tambahkan view baru di sini lalu daftarkan di console/commands.js.
   ========================================================= */

function renderDashboard(data, opts) {
    const { width, height } = opts;

    const lines = [""];

    // HEADER
    // Logo hanya ditampilkan jika terminal cukup tinggi, agar
    // statistik tetap terlihat pada terminal kecil (fixed layout,
    // bukan layout responsif).
    const enoughRoom =
        Number.isFinite(height) &&
        height >= LOGO_LINES.length + 18;

    if (CONFIG.layout.showLogo && LOGO_LOADED && enoughRoom) {
        lines.push(...buildLogoHeader(width));
    } else {
        lines.push(...buildCompactHeader(width));
    }

    lines.push("");

    // BODY
    lines.push(...buildSystemSection(data.system));
    lines.push(...buildActivitySection(data.activity));
    // SERVICE STATUS dihilangkan sesuai permintaan

    if (CONFIG.layout.showGroupSummary) {
        lines.push(...buildGroupSummarySection(data.groups));
    }

    lines.push(...buildErrorSection(data.lastError));

    if (CONFIG.layout.showLogPane) {
        lines.push(
            ...buildLogSection(
                data.logs || []
            )
        );
    }

    lines.push(...buildFooter(width));

    return clamp(lines, height);
}

function renderGroups(data, opts) {
    const groups = data.groups || [];
    const max = CONFIG.layout.maxGroupRows;

    const lines = [
        "",
        center(theme.accentBold("GROUP LIST"), opts.width),
        ""
    ];

    if (!groups.length) {
        lines.push("  " + theme.muted("No groups recorded yet."));
    } else {
        groups.slice(0, max).forEach((g, i) => {
            const idx = g.index ? `[G${g.index}]` : `[${i + 1}]`;
            lines.push(
                "  " +
                    theme.muted(padRight(idx, 7)) +
                    theme.text(truncate(g.name || "UNKNOWN", 28)) +
                    theme.muted(" · ") +
                    theme.text(`${g.messageCount} msgs`) +
                    theme.muted(
                        ` · ${g.lastMessageAt ? formatClock(g.lastMessageAt) : "N/A"}`
                    )
            );

            lines.push(
                "      " +
                    theme.muted(truncate(g.jid, 60))
            );
        });
    }

    lines.push("", ...footerHint());

    return clamp(lines, opts.height);
}

function renderUsers(data, opts) {
    const users = data.users || [];
    const max = CONFIG.layout.maxUserRows;

    const lines = [
        "",
        center(
            theme.accentBold(
                data.userQuery
                    ? `USER LIST · "${data.userQuery}"`
                    : "USER LIST"
            ),
            opts.width
        ),
        ""
    ];

    if (!users.length) {
        lines.push(
            "  " +
                theme.muted(
                    data.userQuery
                        ? "No matching user."
                        : "No users recorded yet."
                )
        );
    } else {
        users.slice(0, max).forEach((u) => {
            const status = u.registered
                ? theme.healthy("REGISTERED")
                : theme.warn("UNREGISTERED");

            const uidx = u.index ? `[U${u.index}]` : "";
            lines.push(
                "  " +
                    theme.muted(padRight(uidx, 6)) +
                    theme.text(truncate(u.name, 18)) +
                    theme.muted(" · ") +
                    theme.muted(u.id) +
                    "  " +
                    status
            );

            lines.push(
                "      " +
                    theme.muted(
                        `msgs:${u.messageCount} · cmds:${u.commandCount} · last:${u.lastActivityAt ? formatClock(u.lastActivityAt) : "N/A"}`
                    )
            );
        });
    }

    lines.push("", ...footerHint());

    return clamp(lines, opts.height);
}

// Bungkus teks ke beberapa baris tanpa memotong isi chat.
function wrapText(text, width) {
    const clean = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
    const limit = Math.max(1, width);

    if (!clean) return [""];

    const rows = [];
    let line = "";

    for (const word of clean.split(" ")) {
        if (!line) {
            line = word;
        } else if (line.length + 1 + word.length <= limit) {
            line += " " + word;
        } else {
            rows.push(line);
            line = word;
        }

        while (line.length > limit) {
            rows.push(line.slice(0, limit));
            line = line.slice(limit);
        }
    }

    if (line) rows.push(line);

    return rows.length ? rows : [""];
}

// Susun satu pesan (bisa beberapa baris) agar tidak terpotong layar.
function appendMonitorMessage(lines, message, width) {
    let dir = message.direction === "outgoing"
        ? chalk.blue("[JOY]")
        : chalk.green("[IN ]");

    if (
        message.direction !== "outgoing" &&
        message.senderId === "222079890813069"
    ) {
        dir = chalk.magenta("[AUTHOR]");
    }

    const time = formatClock(message.time);

    // Sisakan ruang untuk isi pesan; perpendek nama pengirim bila
    // terminal sempit agar teks tidak keluar dari lebar layar.
    const fixed = 2 + time.length + 1 + stripAnsi(dir).length + 1 + 2;
    const senderLimit = Math.min(
        16,
        Math.max(4, width - 1 - fixed - 10)
    );
    const sender = truncate(message.sender || "UNKNOWN", senderLimit);

    const prefixLength = `  ${time} ${stripAnsi(dir)} ${sender}: `.length;
    const bodyWidth = Math.max(1, width - 1 - prefixLength);
    const indent = " ".repeat(prefixLength);

    const chunks = wrapText(message.body || "", bodyWidth);

    lines.push(
        "  " +
            theme.muted(time) +
            " " +
            dir +
            " " +
            theme.text(sender) +
            theme.muted(": ") +
            theme.text(chunks[0])
    );

    for (let i = 1; i < chunks.length; i++) {
        lines.push(indent + theme.text(chunks[i]));
    }
}

function renderMonitor(data, opts) {
    const group = data.monitorGroup;
    const messages = data.monitorMessages || [];

    const width = opts.width || 80;
    const height = opts.height || 24;

    const header = [
        "",
        center(
            theme.accentBold(
                truncate(
                    `GROUP MONITOR · ${group ? (group.name || "UNKNOWN") : "N/A"}`,
                    Math.max(10, width - 2)
                )
            ),
            width
        ),
        "  " +
            theme.muted(truncate(group ? group.jid : "", Math.max(10, width - 4))),
        ""
    ];

    const footer = [
        "",
        theme.muted("  'back' to return · 'home' for dashboard")
    ];

    const body = [];

    if (!group) {
        body.push("  " + theme.muted("No group selected."));
    } else if (!messages.length) {
        body.push(
            "  " +
                theme.muted("No messages captured yet. Waiting...")
        );
    } else {
        for (const m of messages) {
            appendMonitorMessage(body, m, width);
        }
    }

    // Tampilkan baris terbaru saja agar pesan terakhir tidak terpotong.
    const available = Math.max(1, height - header.length - footer.length);

    const visible = body.length > available
        ? body.slice(body.length - available)
        : body;

    return clamp([...header, ...visible, ...footer], height);
}

function renderLogs(data, opts) {
    const entries = data.logs || [];

    const lines = [
        "",
        center(theme.accentBold("LOGS"), opts.width),
        ""
    ];

    if (!entries.length) {
        lines.push("  " + theme.muted("No log entries."));
    } else {
        for (const entry of entries.slice(-CONFIG.layout.maxLogRows)) {
            const color = statusColor(
                entry.level === "error"
                    ? "ERROR"
                    : entry.level === "warn"
                        ? "CONNECTING"
                        : "READY"
            );

            lines.push(
                "  " +
                    theme.muted(formatClock(entry.time)) +
                    " " +
                    color(entry.level.toUpperCase().padEnd(7)) +
                    theme.text(truncate(entry.message, 60))
            );
        }
    }

    lines.push("", ...footerHint());

    return clamp(lines, opts.height);
}

function renderHelp(data, opts) {
    const lines = [
        "",
        center(theme.accentBold("JOY CONSOLE COMMANDS"), opts.width),
        ""
    ];

    const categories = data.help || [];

    for (const category of categories) {
        lines.push("  " + theme.accentBold(category.title));

        for (const item of category.items) {
            lines.push(
                "    " +
                    theme.text(padRight(item.usage, 24)) +
                    theme.muted(item.description)
            );
        }

        lines.push("");
    }

    return clamp(lines, opts.height);
}

function footerHint() {
    return [
        theme.muted("  '/home' dashboard · '/back' previous · '/help' commands")
    ];
}

// Batasi tinggi frame ke tinggi terminal agar tidak menggulir.
function clamp(lines, height) {
    if (!height || height <= 0) return lines;

    if (lines.length <= height) return lines;

    return lines.slice(0, height);
}

module.exports = {
    renderDashboard,
    renderGroups,
    renderUsers,
    renderMonitor,
    renderLogs,
    renderHelp,
    stripAnsi,
    theme
};
