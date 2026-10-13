/* =========================================================
   JOY CONSOLE - COMMAND SYSTEM
   ---------------------------------------------------------
   Perintah terminal KHUSUS Joy Console. Terpisah total dari
   perintah WhatsApp (yang memakai prefix ".").

   Setiap command punya: name, category, usage, description,
   dan fungsi run(ctx, args).
   ========================================================= */

const registry = [
    // ============================================================
    // COMMAND GROUP: SYSTEM
    // ============================================================
    {
        name: "home",
        category: "System",
        usage: "/home",
        description: "Return to the main dashboard",
        run(ctx) {
            ctx.goHome();
        }
    },
    {
        name: "back",
        category: "System",
        usage: "/back",
        description: "Return to the previous view",
        run(ctx) {
            ctx.goBack();
        }
    },
    {
        name: "clear",
        category: "System",
        usage: "/clear",
        description: "Clear the terminal and redraw the dashboard",
        run(ctx) {
            ctx.clearScreen();
        }
    },
    {
        name: "exit",
        category: "System",
        usage: "/exit",
        description: "Close Joy Console (Joybot keeps running)",
        run(ctx) {
            ctx.exitConsole();
        }
    },

    // ============================================================
    // COMMAND GROUP: GROUPS
    // ============================================================
    {
        name: "groups",
        category: "Groups",
        usage: "/groups",
        description: "List recorded groups",
        run(ctx) {
            ctx.setView("groups");
        }
    },
    {
        name: "monitor",
        category: "Groups",
        usage: "/monitor <number|jid|name>",
        description: "Open the live group monitor",
        run(ctx, args) {
            ctx.openMonitor(args.join(" "));
        }
    },

    // ============================================================
    // COMMAND GROUP: USERS
    // ============================================================
    {
        name: "users",
        category: "Users",
        usage: "/users [name|id]",
        description: "List users, optionally search by name or ID",
        run(ctx, args) {
            ctx.openUsers(args.join(" "));
        }
    },

    // ============================================================
    // COMMAND GROUP: LOGS
    // ============================================================
    {
        name: "logs",
        category: "Logs",
        usage: "/logs [error|warn|info|message] [count]",
        description: "Show recent log entries",
        run(ctx, args) {
            ctx.openLogs(args);
        }
    },

    // ============================================================
    // COMMAND GROUP: HELP
    // ============================================================
    {
        name: "openchat",
        category: "Groups",
        usage: "/openchat <id|name|index>",
        description: "Open chat history and enable sending from console",
        run(ctx, args) {
            ctx.openChat(args.join(" "));
        }
    },
    {
        name: "send",
        category: "Groups",
        usage: "/send <message>",
        description: "Send message to currently opened chat",
        run(ctx, args) {
            if (args.length === 0) {
                ctx.setNotice("Usage: /send <message>");
                return;
            }
            ctx.sendMessage(args.join(" "));
        }
    },
    {
        name: "help",
        category: "Help",
        usage: "/help",
        description: "Show all Joy Console commands",
        run(ctx) {
            ctx.setView("help");
        }
    }
];

const CATEGORY_ORDER = ["System", "Groups", "Users", "Logs", "Help"];

function find(name) {
    const normalized = String(name || "").startsWith("/")
        ? String(name).slice(1).toLowerCase()
        : String(name).toLowerCase();

    return registry.find((c) => c.name === normalized) || null;
}

function getHelpCategories() {
    return CATEGORY_ORDER
        .map((title) => ({
            title,
            items: registry
                .filter((c) => c.category === title)
                .map((c) => ({
                    usage: c.usage,
                    description: c.description
                }))
        }))
        .filter((category) => category.items.length > 0);
}

function levenshtein(a, b) {
    const s = String(a);
    const t = String(b);

    const dp = Array.from({ length: s.length + 1 }, (_, i) =>
        Array.from({ length: t.length + 1 }, (_, j) =>
            i === 0 ? j : j === 0 ? i : 0
        )
    );

    for (let i = 1; i <= s.length; i++) {
        for (let j = 1; j <= t.length; j++) {
            const cost = s[i - 1] === t[j - 1] ? 0 : 1;

            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }

    return dp[s.length][t.length];
}

function suggest(input) {
    const word = String(input).toLowerCase();

    let best = null;
    let bestScore = Infinity;

    for (const command of registry) {
        const score = levenshtein(word, command.name);

        if (score < bestScore) {
            bestScore = score;
            best = command.name;
        }
    }

    // Hanya sarankan jika cukup dekat.
    return bestScore <= 3 ? best : null;
}

function parse(line) {
    return String(line)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
}

// Mengembalikan pesan status (string) atau null.
function dispatch(ctx, line) {
    const parts = parse(line);

    if (parts.length === 0) return null;

    const name = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = find(name);

    if (!command) {
        const hint = suggest(name.startsWith("/") ? name.slice(1) : name);

        return hint
            ? `Unknown command '${name}'. Did you mean '/${hint}'?`
            : `Unknown command '${name}'. Type '/help' for available commands.`;
    }

    return command.run(ctx, args) || null;
}

module.exports = {
    registry,
    find,
    dispatch,
    getHelpCategories,
    suggest
};
