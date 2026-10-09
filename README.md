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
| `.quote` | Menampilkan quote |
| `.teka` | Permainan Cak Lontong |
| `.s` | Membuat sticker |
| `.tomed` / `.toimg` | Mengubah sticker menjadi media |
| `.brat` | Membuat sticker bergaya Brat |
| `.reg` | Mendaftarkan akun pengguna |
| `.saldo` | Melihat saldo akun sendiri |
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

## Catatan

Jangan unggah `api.env`, kredensial API, atau folder sesi WhatsApp seperti `JoySesi` ke repositori publik. Folder database pengguna juga dapat berisi data akun dan saldo, jadi pastikan file tersebut tidak ikut dibagikan tanpa sengaja.
