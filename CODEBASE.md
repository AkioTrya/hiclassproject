# Panduan Codebase K7A

Dokumen ini menjelaskan struktur dan alur kerja aplikasi jadwal kuliah K7A. Tujuannya membantu kontributor baru menemukan bagian kode yang tepat, menjalankan aplikasi, dan memahami batas antara frontend, API, serta Supabase.

## Ringkasan

K7A adalah aplikasi React dengan Vite untuk melihat dan mengelola jadwal kuliah TI 26 Kelas A. Aplikasi menyediakan landing page, tampilan jadwal, kalender akademik Universitas Lampung 2026/2027, dan panel edit jadwal untuk admin.

Stack utama:

- React 19 untuk UI.
- Vite untuk development server dan production build.
- CSS biasa untuk layout dan tema.
- Framer Motion untuk animasi UI.
- Canvas 2D untuk benang dan debu interaktif.
- Vercel Functions untuk API production.
- Supabase REST API dan PostgreSQL untuk penyimpanan jadwal dan data admin.

## Struktur direktori

```text
.
├── api/                         # Endpoint serverless Vercel
│   ├── admin/
│   │   ├── login.js             # Login admin
│   │   ├── logout.js            # Mengakhiri sesi
│   │   ├── session.js           # Memeriksa sesi admin
│   │   └── students.js          # Admin membuat dan melihat akun mahasiswa
│   ├── student/                 # Login mahasiswa serta data pribadi
│   └── schedules.js             # Baca dan mutasi jadwal
├── public/
│   ├── k7a-logo.png             # Logo transparan yang digunakan UI
│   ├── favicon.svg
│   └── icons.svg
├── server/
│   ├── api.js                   # Validasi, auth, sesi, dan helper Supabase
│   └── api.test.js              # Tes API dan keamanan admin
├── src/
│   ├── App.jsx                  # Shell aplikasi, navigasi, halaman, dan dialog
│   ├── App.css                  # Gaya komponen dan halaman
│   ├── AcademicCalendarPage.jsx # Halaman kalender akademik
│   ├── academicCalendar.js      # Data kalender akademik dan sumber
│   ├── academicCalendar.test.js # Tes data kalender
│   ├── GoldThreadCanvas.jsx     # Canvas benang dan debu interaktif
│   ├── LandingMotion.jsx        # Headline, kartu fitur, countdown
│   ├── index.css                # Reset dan token warna dasar
│   ├── main.jsx                 # Entry point React
│   ├── scheduleUtils.js         # Model contoh dan helper jadwal/tanggal
│   ├── scheduleUtils.test.js    # Tes helper jadwal dan WIB
│   ├── serverClock.js           # Perhitungan waktu dari timestamp server
│   ├── useServerClock.js        # Hook sinkronisasi jam
│   └── lib/supabase.js          # Client Supabase browser opsional
├── supabase/migrations/         # Skema, policy, fungsi, dan data awal SQL
├── vite.config.js               # Konfigurasi Vite, API lokal, dan header dev
├── vercel.json                  # Header keamanan untuk deployment Vercel
└── index.html                   # HTML shell dan metadata halaman
```

Folder `node_modules/` dan `dist/` adalah dependensi terpasang dan hasil build; keduanya bukan sumber utama untuk mengubah fitur aplikasi.

## Alur aplikasi

### Startup dan navigasi

`index.html` memuat `src/main.jsx`, yang memasang `<App />` ke elemen `#root`. `App.jsx` mengatur state halaman (`home`, `schedule`, atau `academic`) dan menampilkan halaman yang sesuai. Navigasi menggunakan state React, bukan library router.

Header bersama dan branding berada di `App.jsx`. Logo diambil dari `/k7a-logo.png`. Easter egg dipicu dengan mengeklik logo K7A tujuh kali dalam rentang 1,8 detik; modal memuat video YouTube yang ditentukan di komponen `AmongUsEasterEgg`.

Navigasi juga menyediakan halaman `Tugas` dan `Rak Ebook`. Keduanya memerlukan akun mahasiswa yang dibuat oleh admin. Mahasiswa masuk dengan username/password; sesi delapan jam disimpan pada cookie HTTP-only yang berbeda dari sesi admin.

### Landing page dan animasi

Landing page dan komponen jadwal preview berada di `App.jsx`. `LandingMotion.jsx` menangani reveal konten, efek headline, tilt kartu pada perangkat pointer yang mendukungnya, dan countdown. `GoldThreadCanvas.jsx` menggambar benang dan debu pada Canvas; interaksi cursor/touch dan animasinya mengikuti preferensi `prefers-reduced-motion`.

Gaya global berada di `index.css`; aturan komponen dan responsive layout berada di `App.css`. Palet antarmuka saat ini menggunakan latar ivory, surface putih, teal, coral, serta warna teks gelap dan redup.

### Jadwal kuliah

`src/scheduleUtils.js` mendefinisikan bentuk data jadwal contoh dan helper untuk:

- Mengonversi waktu ke kalender `Asia/Jakarta`.
- Menghitung tanggal dalam pekan dan kelas berikutnya.
- Memvalidasi objek jadwal di sisi frontend.
- Meng-escape teks untuk file kalender `.ics`.

`SchedulePage` di `App.jsx` menangani tampilan harian, mingguan, dan daftar, pencarian/filter, ekspor `.ics`, detail mata kuliah, serta form admin. Data jadwal dibaca dari `GET /api/schedules`. Data contoh digunakan sebagai tampilan sementara jika server gagal diakses; UI menampilkan status bahwa data tersebut bukan data server.

Perubahan admin dikirim ke API, bukan langsung ke Supabase dari browser:

1. Login admin membuat sesi server.
2. Operasi tambah/edit mengirim `POST` atau `PUT /api/schedules`.
3. Penghapusan mengirim `DELETE /api/schedules?id=...`.
4. Setelah respons berhasil, state jadwal lokal diperbarui.

### Waktu dan countdown

`useServerClock.js` meminta header HTTP `Date` dari origin aplikasi, lalu memperbarui jam setiap detik menggunakan jam monotonic browser. Sinkronisasi diulang berkala dan saat tab kembali aktif. `serverClock.js` berisi fungsi untuk mengestimasi dan memperbarui waktu yang tersinkron.

Jika sinkronisasi gagal, aplikasi menggunakan jam perangkat dan menampilkan status yang sesuai. Konversi tanggal untuk kalender dan jadwal tetap menggunakan zona waktu `Asia/Jakarta`.

### Kalender akademik

`AcademicCalendarPage.jsx` merender informasi sumber dan agenda berdasarkan periode. Data resminya ditranskripsikan di `academicCalendar.js`, bukan diambil live dari backend. Tes pada `academicCalendar.test.js` memeriksa periode, rujukan SK, dan kelengkapan event.

### Tugas pribadi dan rak ebook

`StudentWorkspacePage` di `App.jsx` memuat daftar tugas dan tautan ebook milik akun mahasiswa yang sedang masuk. Tugas mendukung tambah, tenggat opsional, tanda selesai, dan hapus. Rak ebook menyimpan judul, mata kuliah opsional, dan URL; file ebook tidak diunggah atau disimpan ke aplikasi.

Admin membuat akun pada panel `Akun mahasiswa` yang muncul di halaman Tugas/Rak Ebook saat sesi admin aktif. Password awal disimpan sebagai hash scrypt, hanya ditampilkan saat dimasukkan, dan tidak dapat dibaca kembali. Tidak ada pendaftaran mandiri atau pemulihan password; admin perlu membuat kredensial pengganti bila mahasiswa kehilangan akses.

## API dan akses data

### Endpoint

| Method | Path | Kegunaan | Akses |
|---|---|---|---|
| `GET` | `/api/schedules` | Membaca semua jadwal | Publik |
| `POST` | `/api/schedules` | Menambah jadwal | Admin + same-origin |
| `PUT` | `/api/schedules` | Mengubah jadwal | Admin + same-origin |
| `DELETE` | `/api/schedules?id=...` | Menghapus jadwal | Admin + same-origin |
| `POST` | `/api/admin/login` | Memulai sesi admin | Same-origin |
| `POST` | `/api/admin/logout` | Mengakhiri sesi admin | Same-origin |
| `GET` | `/api/admin/session` | Memeriksa sesi aktif | Publik |
| `GET`, `POST` | `/api/admin/students` | Melihat dan membuat akun mahasiswa | Admin; POST same-origin |
| `POST` | `/api/student/login` | Login username/password mahasiswa | Same-origin |
| `POST` | `/api/student/logout` | Mengakhiri sesi mahasiswa | Same-origin |
| `GET` | `/api/student/session` | Memeriksa sesi mahasiswa | Publik |
| `GET`, `POST`, `PATCH`, `DELETE` | `/api/student/tasks` | CRUD tugas personal dan status selesai | Sesi mahasiswa; mutasi same-origin |
| `GET`, `POST`, `DELETE` | `/api/student/books` | Baca, simpan, dan hapus tautan ebook personal | Sesi mahasiswa; mutasi same-origin |

`api/` berisi handler endpoint. `server/api.js` menyediakan validasi payload, pengecekan konflik jadwal, pemeriksaan origin, sesi bertanda tangan, helper request/RPC Supabase, serta fungsi rate-limit login.

Sesi admin menggunakan cookie HTTP-only, SameSite Strict, dan masa berlaku delapan jam. Login dikonfigurasi untuk satu akun admin melalui environment server; tidak ada registrasi publik.

### Development lokal

Plugin middleware di `vite.config.js` memetakan path API lokal ke handler yang sama di `api/`, sehingga frontend development menggunakan kontrak endpoint yang sama dengan deployment Vercel.

### Supabase

Migration `supabase/migrations/20261106160000_initial_schedule_backend.sql` membuat tabel jadwal, catatan percobaan login, audit admin, row-level security, fungsi database untuk rate-limit dan mutasi jadwal, serta data awal. Migration `supabase/migrations/20261106230000_student_workspace.sql` menambahkan tabel akun mahasiswa, tugas, dan tautan ebook; terapkan migration ini setelah migration awal sebelum memakai halaman baru.

API server mengakses Supabase REST/RPC memakai konfigurasi server-only. Nama environment yang diperlukan:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

`src/lib/supabase.js` adalah client browser opsional yang memakai `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY`. Operasi baca/tulis jadwal saat ini tetap melalui API server. Jangan menaruh service-role key, secret API key, password admin, atau session secret di variabel `VITE_*`; semua `VITE_*` dapat terekspos dalam bundle browser. Jangan commit file environment lokal.

## Menjalankan dan memeriksa aplikasi

Persyaratan Node.js tercantum di `README.md`. Perintah utama:

```sh
npm install
npm run dev
```

Jalankan pemeriksaan sebelum mengirim perubahan:

```sh
npm run lint
npm test
npm run build
```

`npm run build` membuat artefak production di `dist/`. `npm run preview` menjalankan preview build secara lokal.

Untuk mengaktifkan backend jadwal, siapkan environment server dan jalankan migration Supabase dari Supabase SQL Editor. Build frontend yang berhasil tidak otomatis membuktikan koneksi database berhasil; uji endpoint dan status konfigurasi secara terpisah.

## Keamanan dan batas kepercayaan

- Browser hanya memanggil endpoint aplikasi untuk operasi jadwal; credential service-role disimpan di server.
- Endpoint mutasi memeriksa sesi admin dan origin permintaan.
- Input jadwal divalidasi sebelum diproses dan konflik diperiksa kembali di database.
- Login memakai pembatasan percobaan dan audit mutasi.
- CSP dan header keamanan dikonfigurasi di `vite.config.js` untuk development/preview serta `vercel.json` untuk Vercel.
- Jangan menyalin nilai credential ke dokumentasi, issue, log, atau kode.

## Panduan perubahan

- Ubah bentuk data jadwal atau aturan kalender di `scheduleUtils.js`; perbarui tes terkait di `scheduleUtils.test.js`.
- Ubah isi kalender akademik di `academicCalendar.js`; pertahankan informasi sumber dan perbarui `academicCalendar.test.js`.
- Ubah alur API/auth di `api/` dan helper bersama di `server/api.js`; jalankan `server/api.test.js`.
- Ubah tampilan landing, jadwal, dan dialog di `App.jsx`/`App.css`; animasi khusus landing ada di `LandingMotion.jsx`.
- Ubah efek benang/debu di `GoldThreadCanvas.jsx`; uji desktop, mobile, dan reduced-motion.
- Perubahan skema database harus dibuat sebagai migration SQL baru atau perubahan migration yang belum diterapkan sesuai workflow tim; jangan mengandalkan perubahan manual yang tidak tercatat.
