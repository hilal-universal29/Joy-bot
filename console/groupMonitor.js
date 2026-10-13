/* =========================================================
   JOY CONSOLE - GROUP MONITOR
   ---------------------------------------------------------
   Menyimpan buffer pesan terbaru per grup di memori.

   Hanya mengubah tampilan terminal. TIDAK menambah event
   listener baru pada socket WhatsApp — data dimasukkan oleh
   console/index.js dari event messages.upsert yang sudah ada.
   ========================================================= */

const MAX_PER_GROUP = 60;

const buffers = new Map();

let activeGroup = null;

function push(entry) {
    if (!entry || !entry.gid) return;

    const list = buffers.get(entry.gid) || [];
    list.push(entry);

    if (list.length > MAX_PER_GROUP) {
        list.splice(0, list.length - MAX_PER_GROUP);
    }

    buffers.set(entry.gid, list);
}

function getMessages(gid, limit = 20) {
    const list = buffers.get(gid) || [];
    return list.slice(-limit);
}

function getCount(gid) {
    return (buffers.get(gid) || []).length;
}

function getTrackedGroups() {
    return Array.from(buffers.keys());
}

function open(gid) {
    activeGroup = gid || null;
    return activeGroup;
}

function close() {
    activeGroup = null;
}

function getActive() {
    return activeGroup;
}

function isActive(gid) {
    return activeGroup !== null && activeGroup === gid;
}

function reset() {
    buffers.clear();
    activeGroup = null;
}

module.exports = {
    push,
    getMessages,
    getCount,
    getTrackedGroups,
    open,
    close,
    getActive,
    isActive,
    reset
};
