# Joybot

Joybot adalah bot WhatsApp berbasis Node.js yang dibuat untuk membantu beberapa kebutuhan sehari-hari lewat chat. Fiturnya mencakup AI, downloader, sticker, permainan sederhana, serta sistem akun dan saldo pengguna.

## Fitur utama

- **AI:** menjawab pertanyaan melalui model `openai/gpt-oss-20b` dari Groq.
- **Downloader:** mengunduh konten melalui command yang tersedia, termasuk TikTok dan Instagram jika modulnya aktif.
- **Sticker dan tools:** membuat sticker, mengubah sticker menjadi media, serta membuat sticker bergaya Brat.
- **Games:** permainan tebak angka, quote, dan Cak Lontong.
- **Akun dan saldo:** registrasi pengguna, melihat saldo, transfer saldo, serta penambahan dan pengurangan saldo oleh author.
- **Statistik:** pencatatan penggunaan token AI untuk membantu memantau pemakaian.

## Command

| Command | Kegunaan |
|---|---|
| `.menu` | Menampilkan menu bot |
| `.ai` | Bertanya kepada AI |
| `.ttdl` | Downloader TikTok |
| `.igdl` | Downloader Instagram, jika modul tersedia |
| `.tebakangka` | Memulai tebak angka |
| `.777 [nominal]` | Slot Machine 777, taruhan Rp1.000–Rp50.000 (tanpa argumen = panduan) |
| `.tebakgambar` / `.tg` | Permainan Tebak Gambar |
| `.clue` | Menggunakan petunjuk tebak gambar, maksimal 1x per game (beli di shop) |
| `.nyerah` | Menyerah dalam permainan yang sedang aktif (tebak gambar / kuis) |
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

### 11 Oktober 2026

- **Fix — AI bentrok dengan game:** Ketika pengguna membalas soal Kuis Trivia atau Tebak Gambar dengan jawaban yang salah, AI tidak lagi ikut merespons. Sebelumnya, jika jawaban salah, eksekusi lanjut ke AI handler sehingga bot membalas dua kali (feedback salah + respons AI). Sekarang selama ada sesi game aktif, balasan ke soal game selalu ditangani oleh handler game dan tidak diteruskan ke AI.

- **Merge command nyerah:** Command `.nyerahquiz` dihapus. Kini hanya ada satu command yaitu `.nyerah` yang berlaku untuk semua permainan. Bot otomatis mendeteksi game yang sedang aktif — jika Tebak Gambar sedang berjalan maka menyerah dari Tebak Gambar, jika Kuis sedang berjalan maka menyerah dari Kuis, dan jika tidak ada game aktif bot memberi tahu pengguna.

- **Hapus pesan soal kuis otomatis:** Pesan soal Kuis Trivia kini dihapus secara otomatis saat game selesai, baik karena jawaban benar, waktu habis (timeout 60 detik), maupun pemain menyerah. Perilaku ini kini seragam dengan Tebak Gambar.

- **Restriksi `.nyerah`:** Command `.nyerah` kini hanya bisa digunakan oleh pemain yang memulai game atau author. Pengguna lain di grup tidak bisa sembarangan menghentikan game milik orang lain.

- **`.clue` universal:** Command `.clue` kini bersifat universal seperti `.nyerah`. Bot mendeteksi game yang sedang aktif lalu mengarahkan ke handler clue game tersebut. Jika game aktif tidak mendukung clue, bot memberi tahu pengguna. Menambah game baru cukup dengan menambah satu blok `else if` di `messageHandler.js` tanpa mengubah logika yang sudah ada.

- **Limit `.clue` Tebak Gambar:** Command `.clue` pada Tebak Gambar kini dibatasi maksimal *1x per game*. Pemakaian kedua dalam sesi yang sama ditolak dengan pemberitahuan, dan item Clue tidak ikut terpotong. Petunjuk level kedua serta tampilan deskripsi jawaban yang lama dihapus karena tidak lagi tercapai.

- **Fitur baru — Slot Machine 777:** Command `.777` (tanpa argumen menampilkan panduan). Taruhan yang tersedia Rp1.000, Rp5.000, Rp10.000, Rp25.000, dan Rp50.000; nominal lain ditolak. Nominal boleh ditulis singkat, misalnya `.777 1k`, `.777 5k`, `.777 25k`. Simbol 🍒 🍋 🍊 🍉 🍇 🔔 ⭐ 💎 👑 7️⃣ 🍀 diacak di server dengan bobot — semakin tinggi hadiah sebuah simbol, semakin langka kemunculannya. Hadiah: 7️⃣7️⃣7️⃣ 20×, 💎💎💎 10×, 👑👑👑 7×, 🔔🔔🔔 5×, 🍒🍒🍒 3×, tiga simbol sama lainnya 2×, dan tepat dua simbol sama 1,5× (hadiah adalah total pembayaran termasuk modal). Pemain disebut, taruhan dipotong saat putaran mulai dan pembayaran ditambahkan hanya saat menang. Dua putaran bersamaan untuk pengguna yang sama diblokir, dan pesan hasil dihapus otomatis setelah 10 detik agar chat tidak menumpuk.