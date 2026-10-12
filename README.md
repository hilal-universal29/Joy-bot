# Joybot

Joybot adalah bot WhatsApp berbasis Node.js yang dibuat untuk membantu beberapa kebutuhan sehari-hari lewat chat. Fiturnya mencakup AI, sticker, permainan sederhana, serta sistem akun dan saldo pengguna.

## Fitur utama

- **AI:** menjawab pertanyaan melalui model `openai/gpt-oss-20b` dari Groq.
- **Sticker dan tools:** membuat sticker, mengubah sticker menjadi media, serta membuat sticker bergaya Brat.
- **Games:** permainan tebak angka, quote, dan Cak Lontong.
- **Akun dan saldo:** registrasi pengguna, melihat saldo, transfer saldo, serta penambahan dan pengurangan saldo oleh author.
- **Statistik:** pencatatan penggunaan token AI untuk membantu memantau pemakaian.

## Command

| Command | Kegunaan |
|---|---|
| `.menu` | Menampilkan menu utama (informasi pengguna + daftar kategori) |
| `.gamesmenu` | Menampilkan daftar command games |
| `.toolsmenu` | Menampilkan daftar command tools |
| `.downloadermenu` | Menampilkan daftar command downloader |
| `.funmenu` | Menampilkan daftar command fun |
| `.accountmenu` | Menampilkan daftar command akun |
| `.ai` | Bertanya kepada AI |
| `.tebakangka` | Memulai tebak angka |
| `.777 [nominal]` | Slot Machine 777, taruhan Rp1.000–Rp50.000 (tanpa argumen = panduan) |
| `.tebakgambar` / `.tg` | Permainan Tebak Gambar |
| `.tebaklogo` / `.tl` | Permainan Tebak Logo, hadiah Rp5.000 (jawab dengan balas gambar atau `.tl [jawaban]`) |
| `.clue` | Menggunakan petunjuk tebak gambar, maksimal 1x per game (beli di shop) |
| `.nyerah` | Menyerah dalam permainan yang sedang aktif (tebak gambar / tebak logo / kuis) |
| `.quiz` | Permainan kuis trivia (jawab langsung/reply, hadiah 5k) |
| `.quote` | Menampilkan quote |
| `.teka` | Permainan Cak Lontong |
| `.s` | Membuat sticker |
| `.tomed` / `.toimg` | Mengubah sticker menjadi media |
| `.brat` | Membuat sticker bergaya Brat |
| `.reg` | Mendaftarkan akun pengguna |
| `.daily` | Mengambil reward saldo harian |
| `.shop` | Melihat katalog shop |
| `.buy item jumlah` | Membeli item langsung (shortcut shop) |
| `.balance` | Melihat saldo akun sendiri |
| `.ldbalance` | Melihat leaderboard saldo tertinggi (per grup/global) |
| `.leadtg` | Melihat leaderboard juara Tebak Gambar (per grup/global) |
| `.leadquiz` / `.ldquiz` | Melihat leaderboard kuis per grup WhatsApp |
| `.tf @user jumlah` | Mengirim saldo ke pengguna lain |
| `.tmsl @user jumlah` | Menambah saldo, khusus author |
| `.krsl @user jumlah` | Mengurangi saldo, khusus author |
| `.admin` | Fitur administrasi yang tersedia pada modul bot |
| `.stats` | Melihat statistik token, jika diaktifkan |

Nominal transaksi bisa ditulis dengan angka biasa atau format singkat. Contohnya, `100k` berarti 100.000, `1.5m` berarti 1.500.000, dan `1b` berarti 1.000.000.000. Command `.tmsl` dan `.krsl` hanya dapat digunakan oleh author.

## Teknologi

Joybot menggunakan Node.js dan Baileys untuk koneksi WhatsApp. Beberapa library yang digunakan antara lain Axios, dotenv, Chalk, Pino, dan Sharp. Fitur AI menggunakan API Groq.

## Menjalankan bot

1. Pasang Node.js dan unduh atau clone repositori Joybot.
2. Jalankan `npm install` di folder proyek untuk memasang dependency.
3. Isi konfigurasi pada file `api.env` sesuai nama variabel yang dibaca oleh kode, termasuk API key yang diperlukan.
4. Jalankan file utama bot menggunakan Node.js. Jika file utamanya `index.js`, perintahnya `node index.js`. Jika `package.json` sudah memiliki script `start`, kamu juga bisa menjalankan `npm start`.
5. Ikuti proses pairing WhatsApp yang muncul di terminal.

---

## Update

### 12 Oktober 2026

- **Pemisahan menu per kategori:** Menu Joybot kini dipecah menjadi beberapa file di `database/Menu/` alih-alih satu file `Joymenu.js`. File baru: `mainmenu.js` (informasi pengguna: ucapan, nama, saldo, masa aktif, waktu WIB, tanggal, serta daftar kategori menu), `gamesmenu.js`, `toolsmenu.js`, `downloadermenu.js`, `funmenu.js`, dan `accountmenu.js`. Masing-masing hanya berisi teks daftar command, bukan implementasi command.

- **Command menu baru:** Selain `.menu` (menu utama), kini tersedia `.gamesmenu`, `.toolsmenu`, `.downloadermenu`, `.funmenu`, dan `.accountmenu` untuk membuka kategori terkait. `commands/system/menu.js` memetakan command ke template yang sesuai, dan `handlers/messageHandler.js` meneruskan nama command ke handler menu.

- **Penempatan command:** `.ai` diletakkan di `toolsmenu` dan `.ttdl` di `downloadermenu` (sebelumnya tergabung dalam grup "AI & DOWNLOADER" pada menu lama). Command tidak berpindah implementasi — menu hanya menampilkan daftar, dan semua command tetap bisa diketik langsung tanpa membuka menu.

- **Perilaku menu:** Menu kategori dapat dibuka tanpa harus terdaftar (agar `.accountmenu` yang memuat `.reg` tetap terlihat), sedangkan menu utama tetap meminta registrasi seperti sebelumnya. Placeholder `{{UCAPAN}}`, `{{NAMA}}`, `{{SALDO}}`, `{{MASA_AKTIF}}`, `{{WAKTU}}`, dan `{{TANGGAL}}` tetap terisi dengan mekanisme yang sama. File `Joymenu.js` lama tidak lagi digunakan.

- **Hapus command Downloader TikTok:** Command `.ttdl` beserta fungsi pendukungnya dihapus dari proyek. `commands/media/ttdl.js` dan `scrape/Tiktok.js` dihapus, case `ttdl` serta `require`-nya dibuang dari `handlers/messageHandler.js`, dan daftar `.ttdl` dihapus dari `database/Menu/downloadermenu.js` serta `Joymenu.js` (file menu lama). Menu `downloadermenu` tetap ada namun kini tanpa command downloader.

### 11 Oktober 2026

- **Fix — AI bentrok dengan game:** Ketika pengguna membalas soal Kuis Trivia atau Tebak Gambar dengan jawaban yang salah, AI tidak lagi ikut merespons. Sebelumnya, jika jawaban salah, eksekusi lanjut ke AI handler sehingga bot membalas dua kali (feedback salah + respons AI). Sekarang selama ada sesi game aktif, balasan ke soal game selalu ditangani oleh handler game dan tidak diteruskan ke AI.

- **Merge command nyerah:** Command `.nyerahquiz` dihapus. Kini hanya ada satu command yaitu `.nyerah` yang berlaku untuk semua permainan. Bot otomatis mendeteksi game yang sedang aktif — jika Tebak Gambar sedang berjalan maka menyerah dari Tebak Gambar, jika Kuis sedang berjalan maka menyerah dari Kuis, dan jika tidak ada game aktif bot memberi tahu pengguna.

- **Hapus pesan soal kuis otomatis:** Pesan soal Kuis Trivia kini dihapus secara otomatis saat game selesai, baik karena jawaban benar, waktu habis (timeout 60 detik), maupun pemain menyerah. Perilaku ini kini seragam dengan Tebak Gambar.

- **Restriksi `.nyerah`:** Command `.nyerah` kini hanya bisa digunakan oleh pemain yang memulai game atau author. Pengguna lain di grup tidak bisa sembarangan menghentikan game milik orang lain.

- **`.clue` universal:** Command `.clue` kini bersifat universal seperti `.nyerah`. Bot mendeteksi game yang sedang aktif lalu mengarahkan ke handler clue game tersebut. Jika game aktif tidak mendukung clue, bot memberi tahu pengguna. Menambah game baru cukup dengan menambah satu blok `else if` di `messageHandler.js` tanpa mengubah logika yang sudah ada.

- **Limit `.clue` Tebak Gambar:** Command `.clue` pada Tebak Gambar kini dibatasi maksimal *1x per game*. Pemakaian kedua dalam sesi yang sama ditolak dengan pemberitahuan, dan item Clue tidak ikut terpotong. Petunjuk level kedua serta tampilan deskripsi jawaban yang lama dihapus karena tidak lagi tercapai.

- **Fitur baru — Slot Machine 777:** Command `.777` (tanpa argumen menampilkan panduan). Taruhan yang tersedia Rp1.000, Rp5.000, Rp10.000, Rp25.000, dan Rp50.000; nominal lain ditolak. Nominal boleh ditulis singkat, misalnya `.777 1k`, `.777 5k`, `.777 25k`. Simbol 🍒 🍋 🍊 🍉 🍇 🔔 ⭐ 💎 👑 7️⃣ 🍀 diacak di server dengan bobot — semakin tinggi hadiah sebuah simbol, semakin langka kemunculannya. Hadiah: 7️⃣7️⃣7️⃣ 20×, 💎💎💎 10×, 👑👑👑 7×, 🔔🔔🔔 5×, 🍒🍒🍒 3×, tiga simbol sama lainnya 2×, dan tepat dua simbol sama 1,5× (hadiah adalah total pembayaran termasuk modal). Pemain disebut, taruhan dipotong saat putaran mulai dan pembayaran ditambahkan hanya saat menang. Dua putaran bersamaan untuk pengguna yang sama diblokir, dan pesan hasil dihapus otomatis setelah 10 detik agar chat tidak menumpuk.

- **Fitur baru — Tebak Logo:** Command `.tebaklogo` / `.tl` menampilkan satu gambar logo dari Ikhlas API (`https://ikhlasapi.web.id/api/games/tebaklogo`) dan pemain menebak nama merek/perusahaannya. Jawaban bisa dengan **membalas pesan gambar**, **langsung mengetik jawaban di chat** (tanpa reply), atau mengetik `.tebaklogo [jawaban]` / `.tl [jawaban]`. Jawaban langsung yang salah tidak dibalas agar percakapan biasa tidak terganggu. Pencocokan jawaban tidak sensitif huruf besar/kecil dan mengabaikan spasi/punctuation berlebih. Waktu 60 detik, hadiah **Rp5.000** dari sistem saldo yang sudah ada (bukan reward ganda — sesi dihapus begitu terjawab). Gambar soal otomatis dihapus saat benar, waktu habis, atau `.nyerah`. Sesi dipisahkan per chat, game ganda dalam satu chat diblokir, dan pesan percakapan biasa yang bukan balasan gambar soal tidak dianggap jawaban. Game ini tidak mendukung `.clue`. Jika soal/gambar gagal dimuat (mis. host gambar bermasalah), bot mencoba 3× soal baru lalu memberi pesan error — pengguna cukup mencoba `.tebaklogo` lagi.