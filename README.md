# E-Absen Mata Pelajaran

Aplikasi web modern untuk manajemen presensi mata pelajaran berbasis CRUD penuh, penyimpanan offline-first (LocalStorage), terintegrasi dengan **Supabase Cloud Database** dan **GitHub Pages Deployment**.

---

## 🌟 Fitur & Arsitektur Utama

1. **Bersih & Mandiri**: Seluruh form, tabel daftar siswa, kelas, rekap, dan diagram siap digunakan langsung sesuai data riil pengguna. Jika belum ada data yang diinputkan, sistem secara elegan menampilkan tanda `-`.
2. **Tanpa Login / Registrasi (No Login)**: Aplikasi langsung siap pakai dan menyimpan seluruh perubahan secara otomatis ke **LocalStorage** browser serta sinkron dengan **Supabase Cloud Database**.
3. **Reaktivitas Penuh**: Setiap kali data disimpan, diedit, atau dihapus, perubahan langsung terbarui di seluruh bagian aplikasi (Form, Tabel, Rekap Bulanan/Semesteran, Diagram Visual, dan Lembar Cetak A4/F4).
4. **Full CRUD**: Mendukung Tambah (Create), Lihat (Read), Ubah (Update), dan Hapus (Delete) pada seluruh entitas:
   - Pengaturan Kop & Identitas Mapel
   - Master Data Kelas
   - Master Data Siswa
   - Sesi & Catatan Absensi Harian

---

## ☁️ Integrasi Supabase Cloud Database

Aplikasi mendukung integrasi cloud dengan **Supabase** (PostgreSQL gratis & realtime):
- **Mode Dual (Offline-First & Cloud Sync)**: LocalStorage tetap berfungsi sebagai cache berkecepatan tinggi dan penyimpanan cadangan offline. Saat terhubung ke Supabase, data otomatis tersinkronisasi.
- **Auto-Sync**: Setiap kali Anda menambah kelas, mengedit siswa, atau menyimpan absensi, data langsung di-upload ke Supabase secara otomatis di latar belakang (*debounced*).
- **Manual Sync**: Tersedia tombol **Upload ke Cloud (Sync Up)** dan **Tarik dari Cloud (Sync Down)**.
- **Tanpa Login (RLS Anonim)**: Dilengkapi skema Row Level Security (RLS) yang mengizinkan operasi penuh menggunakan anon key publik Supabase.
- **Skrip Skema SQL Siap Pakai**: Berkas `supabase/schema.sql` siap dijalankan di *SQL Editor* Supabase.

### Cara Menghubungkan ke Supabase:
1. Buat akun & project baru di [supabase.com](https://supabase.com) (Gratis).
2. Buka menu **SQL Editor**, salin dan jalankan seluruh isi berkas `supabase/schema.sql` (atau klik tombol **Salin Skrip SQL** di tab *Cloud & GitHub* aplikasi).
3. Buka **Project Settings** -> **API**, lalu salin:
   - **Project URL** (misal: `https://xxxx.supabase.co`)
   - **Project API Keys** -> `anon` / `public`
4. Di aplikasi E-Absen, buka tab **Cloud & GitHub**, masukkan URL dan Anon Key, lalu klik **Simpan & Hubungkan**.
5. Klik **Upload ke Cloud (Sync Up)** untuk mengunggah data lokal yang sudah Anda buat!

---

## 🚀 Integrasi GitHub & GitHub Pages Deployment

Aplikasi sudah dikonfigurasi penuh untuk di-hosting secara gratis di internet menggunakan **GitHub Pages**:
- **GitHub Actions Workflow**: Berkas `.github/workflows/deploy.yml` telah dipasang. Setiap kali Anda melakukan `git push` ke branch `main`, GitHub akan otomatis mendeploy aplikasi web ini.
- **Skrip Otomatisasi Windows**: Berkas `setup-github.bat` dapat diklik ganda untuk otomatis inisialisasi Git, commit, dan push ke repository Anda.

### Cara Push ke GitHub:
1. Buat repository baru di [github.com/new](https://github.com/new), misalnya beri nama `e-absen-mapel` (Public).
2. Di folder project, jalankan perintah git berikut (atau klik ganda `setup-github.bat`):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: E-Absen Mata Pelajaran"
   git branch -M main
   git remote add origin https://github.com/rubibabullah99/E-ABSENMAPEL.git
   git push -u origin main
   ```
3. Di repository GitHub Anda:
   - Buka tab **Settings** -> **Pages**.
   - Pada bagian **Build and deployment -> Source**, pilih **GitHub Actions**.
4. Website Anda akan aktif dan bisa diakses online dari laptop, tablet, atau HP di:
   `https://rubibabullah99.github.io/E-ABSENMAPEL/`

---

## 📋 Fitur Lengkap Aplikasi

### 1. Form Pengaturan Kop Surat Sekolah & Identitas Penandatangan
- **Upload Banner Kop Surat Resmi Sekolah**: Unggah gambar banner kop surat resmi sekolah/madrasah (sudah memuat logo, nama instansi/sekolah, alamat, kontak, dan garis batas resmi) berukuran maks. 3MB (format PNG, JPG, JPEG, WebP) yang disimpan secara lokal. Kolom isian teks instansi dihilangkan karena seluruh bagian kop pada cetakan dan rekap otomatis terisi persis sesuai gambar kop yang diunggah.
- **Identitas Mapel & Penandatangan**: Mata Pelajaran, Tahun Ajaran, Semester (Ganjil/Genap), Nama Guru Mapel, NIP/NUPTK Guru, Nama Kepala Sekolah, NIP Kepala Sekolah, dan Kota Titimangsa.
- **Live Preview Kop**: Pratinjau langsung banner kop surat dan data administratif sekolah secara real-time.
- **Tombol Reset**: Reset form pengaturan atau reset bersih database dengan konfirmasi aman.

### 2. Form Master Kelas (Editable)
- Form tambah kelas: Nama Kelas (wajib) dan Tingkat/Keterangan (opsional).
- Tabel daftar kelas dengan informasi jumlah siswa aktif per kelas.
- Tombol **Edit Kelas** (modal) dan **Hapus Kelas** (dengan konfirmasi).
- *Cascade update*: perubahan nama kelas otomatis memperbarui kelas siswa terkait.

### 3. Form Master Data Siswa + Template & Import Excel (.xlsx)
- Form tambah siswa: Nama Lengkap, Jenis Kelamin (L / P), NISN, NIS, dan Kelas (dropdown dinamis).
- **Download Template Excel (.xlsx)**: Dihasilkan via SheetJS (`xlsx`) dengan **HANYA baris header** (`No`, `Nama Lengkap`, `Jenis Kelamin`, `NISN`, `NIS`, `Kelas`) tanpa data dummy.
- **Import Excel (.xlsx)**: Membaca file Excel, memvalidasi kolom, **otomatis membuat kelas baru** jika belum ada di database, dan memasukkan data siswa ke daftar yang bisa diedit.
- Filter kombinasi Kelas & Jenis Kelamin (Laki-laki / Perempuan) serta *live search* pencarian teks.
- **Download Excel Sesuai Filter**: Ekspor data siswa yang sedang tampil di layar ke file `.xlsx` dengan penamaan file otomatis sesuai kriteria filter.

### 4. Form Input Absensi Harian Mata Pelajaran
- Filter Sesi: Tanggal, Kelas, Mata Pelajaran, Pertemuan Ke-, Jam Ke-, dan Materi/Topik Pembelajaran.
- Pilihan status kehadiran: **H** (Hadir), **S** (Sakit), **I** (Izin), **A** (Alpa).
- **Input Keterangan Khusus Sakit & Izin**: Muncul otomatis untuk siswa yang berstatus Sakit atau Izin agar alasan/surat izin tercatat.
- Aksi Cepat: **Hadirkan Semua (H)** dan **Reset Pilihan**.
- **Mode Edit Ulang Kapan Saja**: Memuat kembali absensi yang sudah pernah disimpan untuk disunting. Dilengkapi tabel riwayat sesi dengan tombol Edit dan Hapus.

### 5. Rekap Bulanan/Semesteran, Diagram & Cetak A4 / F4
- **Filter Rekap**: Pilihan Kelas, Mode Rekap (Bulanan / Semesteran), Bulan, dan Semester.
- **Statistik Ringkasan**: Total Siswa, Total Pertemuan, % Kehadiran Rata-rata, dan Akumulasi H/S/I/A.
- **Tabel Matriks Rekapitulasi**: Kolom per pertemuan (`P-1`, `P-2`, ...), total H, S, I, A, dan persentase kehadiran individual.
- **Daftar Keterangan Sakit & Izin Terinci**: Tabel khusus rangkuman seluruh alasan ketidakhadiran siswa.
- **Diagram Visual (Chart.js)**: Diagram Donut untuk distribusi akumulasi presensi dan Diagram Batang (*stacked bar*) untuk tren kehadiran per pertemuan.
- **Format Cetak Resmi A4 & F4 / Folio**:
  - Ukuran kertas: **A4 Landscape**, **A4 Portrait**, **F4 Landscape**, **F4 Portrait**.
  - Menampilkan Kop Surat Sekolah + Logo, judul resmi, tabel rekap bordered hitam-putih, catatan sakit & izin, serta blok tanda tangan Kepala Sekolah & Guru Mata Pelajaran lengkap dengan titimangsa.
  - Tombol **Cetak / Simpan PDF** yang langsung memicu dialog cetak browser dengan aturan `@page` presisi.

---

## 📁 Struktur Direktori

```
d:\PROYEK\E-ABSEN MAPEL\
├── index.html                  # Aplikasi Web Single-Page Application (SPA)
├── css/
│   └── app.css                 # Custom styling, status pills, print CSS (A4/F4)
├── js/
│   ├── store.js                # State Manager & LocalStorage Engine (Zero Dummy Data)
│   ├── supabase.js             # Modul Sinkronisasi Supabase Cloud & Auto-Sync
│   ├── app.js                  # Controller utama, router tab, modal & toast notification
│   └── modules/
│       ├── settings.js         # Modul Kop Sekolah, Upload Logo & Identitas
│       ├── classes.js          # Modul Master Kelas (CRUD)
│       ├── students.js         # Modul Master Siswa, Excel Template & Importer
│       ├── attendance.js       # Modul Form Absensi Harian & Catatan S/I
│       ├── recap.js            # Modul Rekapitulasi Matriks & Diagram Chart.js
│       └── print.js            # Modul Cetak Format A4/F4 & Simulator Lembar Kertas
├── supabase/
│   └── schema.sql              # Skema Database PostgreSQL & Kebijakan RLS Supabase
├── .github/
│   └── workflows/
│       └── deploy.yml          # Otomasi Deployment GitHub Actions ke GitHub Pages
├── setup-github.bat            # Skrip 1-Click Setup & Push Git untuk Windows
├── .gitignore                  # Berkas pengecualian Git
└── README.md                   # Dokumentasi Lengkap
```

---

## 💻 Cara Menjalankan

1. **Jalankan Lokal**: Cukup buka berkas `index.html` langsung di browser Anda.
2. **Jalankan Online (GitHub Pages)**: Dorong kode ke repository GitHub Anda, aktifkan GitHub Pages di tab *Settings* -> *Pages*, lalu buka URL publik yang disediakan GitHub.
