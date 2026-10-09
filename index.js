const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require("baileys");

const fs = require("fs");
const path = require("path");
const os = require("os");
const pino = require("pino");
const chalk = require("chalk");
const readline = require("readline");

const messageHandler = require("./handlers/messageHandler");

const usePairingCode = true;


/* =========================================================
   JOYBOT CONFIG
========================================================= */

const BOT_NAME = "JOYBOT";
const BOT_VERSION = "v1.0.0";
const AUTHOR = "Hilal";

const PROJECT_ROOT = __dirname;

const SPINNER = [
  "◐",
  "◓",
  "◑",
  "◒"
];


/* =========================================================
   UTILITY
========================================================= */

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


async function typeText(text, delay = 20) {
  for (const char of text) {
    process.stdout.write(char);
    await sleep(delay);
  }

  process.stdout.write("\n");
}


/* =========================================================
   PACKAGE INFORMATION
========================================================= */

function getPackageCount() {
  try {
    const packagePath = path.join(
      PROJECT_ROOT,
      "package.json"
    );

    if (!fs.existsSync(packagePath)) {
      return 0;
    }

    const packageJson = JSON.parse(
      fs.readFileSync(
        packagePath,
        "utf8"
      )
    );

    const dependencies = Object.keys(
      packageJson.dependencies || {}
    );

    const devDependencies = Object.keys(
      packageJson.devDependencies || {}
    );

    return new Set([
      ...dependencies,
      ...devDependencies
    ]).size;

  } catch (error) {
    return 0;
  }
}


/* =========================================================
   GET INSTALLED PACKAGE VERSION
========================================================= */

function getPackageVersion(packageName) {
  try {
    const packagePath = path.join(
      PROJECT_ROOT,
      "node_modules",
      packageName,
      "package.json"
    );

    if (!fs.existsSync(packagePath)) {
      return "Unknown";
    }

    const packageJson = JSON.parse(
      fs.readFileSync(
        packagePath,
        "utf8"
      )
    );

    return packageJson.version || "Unknown";

  } catch (error) {
    return "Unknown";
  }
}


/* =========================================================
   FIND JAVASCRIPT FILES
========================================================= */

function getJSFiles(directory) {
  let files = [];

  if (!fs.existsSync(directory)) {
    return files;
  }

  const entries = fs.readdirSync(
    directory,
    {
      withFileTypes: true
    }
  );

  for (const entry of entries) {
    const fullPath = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {

      if (
        entry.name === "node_modules" ||
        entry.name === "sessions" ||
        entry.name === ".git"
      ) {
        continue;
      }

      files = files.concat(
        getJSFiles(fullPath)
      );
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(".js")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}


/* =========================================================
   COUNT LINES OF CODE
========================================================= */

function countCodeLines(filePath) {
  try {
    const content = fs.readFileSync(
      filePath,
      "utf8"
    );

    const lines = content.split(
      /\r?\n/
    );

    let count = 0;
    let insideBlockComment = false;

    for (let line of lines) {

      line = line.trim();

      // Baris kosong
      if (!line) {
        continue;
      }

      // Sedang berada di dalam block comment
      if (insideBlockComment) {

        if (line.includes("*/")) {
          insideBlockComment = false;
        }

        continue;
      }

      // Block comment
      if (line.startsWith("/*")) {

        if (!line.includes("*/")) {
          insideBlockComment = true;
        }

        continue;
      }

      // Single line comment
      if (
        line.startsWith("//") ||
        line.startsWith("*")
      ) {
        continue;
      }

      count++;
    }

    return count;

  } catch (error) {
    return 0;
  }
}


/* =========================================================
   SOURCE STATISTICS
========================================================= */

function getSourceStats() {
  const files = getJSFiles(
    PROJECT_ROOT
  );

  let totalLines = 0;

  for (const file of files) {
    totalLines += countCodeLines(
      file
    );
  }

  return {
    files: files.length,
    lines: totalLines
  };
}


/* =========================================================
   MEMORY
========================================================= */

function getMemoryUsage() {
  const memory =
    process.memoryUsage().rss;

  return `${Math.round(
    memory / 1024 / 1024
  )} MB`;
}


/* =========================================================
   FOLDER STRUCTURE
========================================================= */

function getProjectFolders() {

  const folders = [
    "commands",
    "database",
    "config",
    "handlers",
    "utils"
  ];

  const result = [];

  for (const folder of folders) {

    const folderPath =
      path.join(
        PROJECT_ROOT,
        folder
      );

    if (fs.existsSync(folderPath)) {
      result.push(folder);
    }
  }

  if (
    fs.existsSync(
      path.join(
        PROJECT_ROOT,
        "index.js"
      )
    )
  ) {
    result.push("index.js");
  }

  return result;
}


/* =========================================================
   SYSTEM INFORMATION
========================================================= */

function getSystemInfo() {

  const source =
    getSourceStats();

  return {

    packages:
      getPackageCount(),

    sourceFiles:
      source.files,

    lines:
      source.lines,

    platform:
      os.platform(),

    architecture:
      os.arch(),

    node:
      process.version,

    baileys:
      getPackageVersion(
        "baileys"
      ),

    memory:
      getMemoryUsage(),

    folders:
      getProjectFolders()
  };
}


/* =========================================================
   JOY ASCII LOGO
========================================================= */

const LOGO_ART = [

  "   +====-                                             -==****=",

  "  =+*****+=+                                        =-***++*+=",

  "   *********==                                     -**+**+*+*+",

  "   =****+*+***+=                                 =*++**++*++=",

  "   +******+++*+#*=                             =+*++++*+**++*=",

  "    +***+***#*++***=                         -=*+******+++*++",

  "     *#***+*##****+**=                       =+*+********++**=",

  "     +**#+*+#****#+*+**=*      :--:      -=*++++****+**+**++=",

  "     -***#**#*##*##+++++=-=+:-:==*=-:-=--=+++**#+***+*****+=",

  "      +#*****##+#*#***++++=====++*+-===+=====*****#*+*****=+-",

  "      -+*******#*##*+*++=++===++*%*+=++=++==++***##**++***+==",

  "       ++#**+***#**++*+++++++=++#%%**++=*=++==++++*-=+*+***++",

  "       +******#**#++**=**+=*#*=##%%%%#*++*==+=+=+++++*=****=+",

  "      -+*#****+*+**+++*+*++*##+*#@%%%#++*#*++++=+++++++***++",

  "        +###***++****#*##++##%*#%@@@@%**#%##***++=+++++**+-",

  "         +*#***+++**+++*#%%%%%%%@@@@@%@@%+=++=+**===+++++==",

  "         =+*+*+*+**+====+-%%@@%@@@@@@%%*+=--=+:+*++=-=++=+=",

  "         =+++====+*=-:..++-%%@%@@@@%%%#=+-:.-==+#+-=-==+=--",

  "         :=====+#%*+=--+++=*%@%@@%%%%%+=++===+=*##+=---=--",

  "         ---===+#%%*-+++=*++%%%%%%%#%#++:====+*%%*+++----",

  "           -==+++*%%%%@%@%**%########%#%%@%%%%%*++*=+-",

  "            ==+****#@@@@@@%%########*##%%@@@%%%#*+**++",

  "             ==**###%@%@@@%%#*####*#*%%%%@%%%##****+==",

  "              =+****##%%%@@@*++****++#@%@%%%***++*==",

  "              *++*+#*#%%%%%%%##++++##%%%%%%%#+*#+*=-"

];


/* =========================================================
   FASTFETCH BANNER
========================================================= */

async function renderLogoWithText() {

  const info =
    getSystemInfo();

  const folders =
    info.folders;

  const bannerText = [

    chalk.cyan(
      "Author        : "
    ) +
    chalk.white(
      AUTHOR
    ),

    chalk.cyan(
      "Version       : "
    ) +
    chalk.white(
      BOT_VERSION
    ),

    chalk.cyan(
      "Node.js       : "
    ) +
    chalk.white(
      info.node
    ),

    chalk.cyan(
      "Baileys       : "
    ) +
    chalk.white(
      info.baileys
    ),

    "",

    chalk.cyan(
      "Platform      : "
    ) +
    chalk.white(
      info.platform
    ),

    chalk.cyan(
      "Architecture  : "
    ) +
    chalk.white(
      info.architecture
    ),

    chalk.cyan(
      "Memory        : "
    ) +
    chalk.white(
      info.memory
    ),

    "",

    chalk.cyan(
      "Packages      : "
    ) +
    chalk.yellow(
      info.packages
    ),

    chalk.cyan(
      "Source Files  : "
    ) +
    chalk.yellow(
      info.sourceFiles
    ),

    chalk.cyan(
      "Lines of Code : "
    ) +
    chalk.yellow(
      info.lines.toLocaleString()
    ),

    "",

    chalk.cyan.bold(
      "Project Structure"
    ),

    ...folders.map(
      (folder, index) => {

        const last =
          index ===
          folders.length - 1;

        return (
          chalk.gray(
            last
              ? "└── "
              : "├── "
          ) +
          chalk.white(folder)
        );
      }
    )
  ];


  const textStart = 70;


  for (
    let i = 0;
    i < LOGO_ART.length;
    i++
  ) {

    const line =
      chalk.cyan(
        LOGO_ART[i]
      );

    const spacing =
      " ".repeat(
        Math.max(
          1,
          textStart -
          LOGO_ART[i].length
        )
      );

    process.stdout.write(
      line +
      spacing +
      (
        bannerText[i] ||
        ""
      ) +
      "\n"
    );

    // Animasi banner seperti kode kamu
    await sleep(40);
  }
}


/* =========================================================
   LOADING SPINNER
========================================================= */

async function loadingStep(
  text
) {

  for (
    let i = 0;
    i < 8;
    i++
  ) {

    const spinner =
      SPINNER[
        i % SPINNER.length
      ];

    process.stdout.write(
      `\r${chalk.cyan(spinner)} ${chalk.white(text)}`
    );

    await sleep(45);
  }

  process.stdout.write(
    `\r${chalk.green("✓")} ${chalk.white(text)}\n`
  );
}


/* =========================================================
   SYSTEM STATUS
========================================================= */

async function showSystemStatus() {

  console.log(
    chalk.cyan(
      "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )
  );

  await sleep(150);


  const systems = [

    "Initializing...",

    "Loading configuration...",

    "Loading command handler...",

    "Loading database...",

    "Loading AI engine..."

  ];


  for (
    const system of systems
  ) {

    await loadingStep(
      system
    );

    await sleep(80);
  }


  console.log("");


  const modules = [

    "AI SYSTEM",

    "GAME SYSTEM",

    "MEDIA SYSTEM",

    "DOWNLOADER"

  ];


  for (
    const module of modules
  ) {

    await typeText(
      chalk.green(
        `  [ ✓ ] ${module}`
      ),
      10
    );

    await sleep(20);
  }


  console.log(
    chalk.cyan(
      "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )
  );


  await sleep(100);


  await typeText(
    chalk.yellow(
      "  [ WHATSAPP ] Connecting..."
    ),
    20
  );


  await sleep(100);
}


/* =========================================================
   SHOW BANNER
========================================================= */

async function showBanner() {

  console.clear();

  await renderLogoWithText();

  await sleep(250);

  await showSystemStatus();
}


/* =========================================================
   PHONE NUMBER INPUT
========================================================= */

async function question(prompt) {

  process.stdout.write(
    prompt
  );

  const rl =
    readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });


  return new Promise(
    (resolve) => {

      rl.question(
        "",
        (answer) => {

          rl.close();

          resolve(answer);
        }
      );

    }
  );
}


/* =========================================================
   WHATSAPP CONNECTION
========================================================= */

async function connectToWhatsApp() {

  const {
    state,
    saveCreds
  } =
    await useMultiFileAuthState(
      "./sessions"
    );


  const {
    version,
    isLatest
  } =
    await fetchLatestBaileysVersion();


  console.log(
    `Using WhatsApp V${version.join(".")}, isLatest: ${isLatest}`
  );


  const Joy =
    makeWASocket({

      logger:
        pino({
          level: "silent"
        }),

      printQRInTerminal:
        !usePairingCode,

      auth:
        state,

      browser: [
        "Ubuntu",
        "Chrome",
        "20.0.04"
      ],

      version,

      syncFullHistory:
        true,

      generateHighQualityLinkPreview:
        true

    });


  Joy.sentMessages =
    new Set();


  const originalSendMessage =
    Joy.sendMessage.bind(Joy);


  Joy.sendMessage =
    async (...args) => {

      const result =
        await originalSendMessage(
          ...args
        );


      if (
        result?.key?.id
      ) {

        const chatId =
          args[0];

        Joy.sentMessages.add(
          `${chatId}:${result.key.id}`
        );

      }


      return result;
    };


  /* =======================================================
     PAIRING CODE
  ======================================================= */

  if (
    usePairingCode &&
    !Joy.authState.creds.registered
  ) {

    try {

      const phoneNumber =
        await question(
          "Enter Phone Number (62) :\n"
        );


      const code =
        await Joy.requestPairingCode(
          phoneNumber.trim()
        );


      console.log(
        `Pairing Code : ${code}`
      );


    } catch (error) {

      console.error(
        "Failed to get pairing code:",
        error
      );

    }
  }


  /* =======================================================
     CREDENTIALS
  ======================================================= */

  Joy.ev.on(
    "creds.update",
    saveCreds
  );


  /* =======================================================
     CONNECTION
  ======================================================= */

  Joy.ev.on(
    "connection.update",
    (update) => {

      const {
        connection
      } = update;


      if (
        connection === "close"
      ) {

        console.log(
          chalk.red(
            "\n❌ Connection Lost, Trying to Reconnect"
          )
        );


        connectToWhatsApp();

      }


      if (
        connection === "open"
      ) {

        console.log(
          chalk.cyan(
            "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          )
        );


        console.log(
          chalk.green.bold(
            "O N L I N E"
          )
        );


        console.log(
          chalk.gray(
            "Waiting for messages..."
          )
        );


        console.log(
          chalk.cyan(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
          )
        );

      }

    }
  );


  /* =======================================================
     MESSAGE HANDLER
  ======================================================= */

  Joy.ev.on(
    "messages.upsert",
    async (m) => {

      const msg =
        m.messages[0];


      if (
        !msg?.message
      ) {
        return;
      }


      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";


      const pushname =
        msg.pushName ||
        "Joy";


      const listColor = [

        "red",

        "green",

        "yellow",

        "magenta",

        "cyan",

        "white",

        "blue"

      ];


      const randomColor =
        listColor[
          Math.floor(
            Math.random() *
            listColor.length
          )
        ];


      console.log(

        chalk.yellow.bold(
          "Credit : Joy"
        ),

        chalk.green.bold(
          "[ WhatsApp ]"
        ),

        chalk[randomColor](
          pushname
        ),

        chalk[randomColor](
          " : "
        ),

        chalk.white(
          body
        )

      );


      try {

        await messageHandler(
          Joy,
          m
        );

      } catch (error) {

        console.error(
          "Handler Error:",
          error
        );

      }

    }
  );
}


/* =========================================================
   START JOYBOT
========================================================= */

showBanner().then(() => {

  connectToWhatsApp();

});