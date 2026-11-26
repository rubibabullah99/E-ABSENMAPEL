---
name: e-absen-mapel
description: >-
  Panduan, standar arsitektur, dan prosedur lengkap untuk membangun, mengembangkan,
  dan mengoperasikan aplikasi web "E-Absen Mata Pelajaran" berbasis White-Label,
  Full Editable (CRUD), Strict Zero Dummy Data, LocalStorage autosave, Supabase
  Cloud Database, dan otomatisasi deployment GitHub Pages.
---

# E-Absen Mata Pelajaran (Skill Guide & Architecture)

Dokumen ini mendefinisikan standar teknis, struktur data, alur kerja formulir, integrasi cloud, dan pedoman cetak resmi untuk aplikasi web **E-Absen Mata Pelajaran**.

---

## 1. Aturan Mutlak & Prinsip Inti

Setiap pengembangan atau modifikasi fitur pada aplikasi ini WAJIB mematuhi 4 aturan mutlak berikut:

1. **Clean State & Data Riil**:
   - Dilarang menanamkan data contoh (*sample names* seperti "Budi", "Siti", "X-A"), angka awal palsu, atau data fiktif ke dalam penyimpanan.
   - Jika belum ada data yang diisi oleh pengguna, antarmuka sistem secara elegan dan profesional menampilkan simbol `-` tanpa badge atau label dummy berlebih.
   - Atribut placeholder pada elemen input HANYA berupa petunjuk format singkat tanpa mengisi nilai (`value`) data.
   - Fitur "Download Template Excel" hanya menghasilkan baris *header* tanpa menyertakan baris contoh data.

2. **Tanpa Autentikasi / No-Login**:
   - Pengguna langsung masuk ke antarmuka utama tanpa form login atau registrasi akun.
   - Data tersimpan secara instan di sisi klien menggunakan **LocalStorage** browser (*offline-first*).

3. **Reaktivitas Penuh (Event-Driven State)**:
   - Setiap operasi penambahan, perubahan, atau penghapusan data langsung memancarkan *event* melalui Event Bus terpusat (`window.appStore.emit(...)`).
   - Seluruh modul tampilan (Form, Tabel, Rekapitulasi Matriks, Diagram Chart.js, Pratinjau Kop, dan Lembar Cetak) wajib langsung terbarui secara reaktif tanpa perlu *reload* halaman.

4. **Dual-Storage & Cloud Synchronization (Supabase Ready)**:
   - LocalStorage berfungsi sebagai penyimpanan primer lokal berkecepatan tinggi dan *offline fallback*.
   - Saat terhubung ke Supabase, sistem menjalankan *debounced auto-sync* untuk mencadangkan data ke database cloud PostgreSQL secara asinkron.

---

## 2. Struktur Data & Skema Database

### A. LocalStorage Keys (`js/store.js`)

| Key | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `e_absen_settings` | `Object` | Gambar banner kop surat sekolah (base64), identitas mapel & data penandatangan. |
| `e_absen_classes` | `Array<Object>` | Daftar kelas (`id`, `nama`, `tingkat`, `createdAt`). Default: `[]`. |
| `e_absen_students` | `Array<Object>` | Daftar siswa (`id`, `nama`, `jenisKelamin`, `nisn`, `nis`, `kelas`). Default: `[]`. |
| `e_absen_attendance` | `Array<Object>` | Sesi presensi (`id`, `tanggal`, `kelas`, `pertemuan`, `records`). Default: `[]`. |
| `e_absen_supabase_config` | `Object` | Kredensial cloud (`url`, `key`, `autoSync`, `lastSync`). |

### B. Skema Database Supabase PostgreSQL (`supabase/schema.sql`)

```sql
-- 1. Settings
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'app_settings',
    kop_image TEXT,
    logo TEXT,
    instansi TEXT DEFAULT '',
    nama_sekolah TEXT DEFAULT '',
    alamat TEXT DEFAULT '',
    kontak TEXT DEFAULT '',
    show_kop_border BOOLEAN DEFAULT TRUE,
    mata_pelajaran TEXT DEFAULT '',
    tahun_ajaran TEXT DEFAULT '',
    semester TEXT DEFAULT '',
    nama_guru TEXT DEFAULT '',
    nip_guru TEXT DEFAULT '',
    nama_kepsek TEXT DEFAULT '',
    nip_kepsek TEXT DEFAULT '',
    kota_dokumen TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Classes
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    tingkat TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Students
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    jenis_kelamin TEXT NOT NULL, -- 'L' atau 'P'
    nisn TEXT DEFAULT '',
    nis TEXT DEFAULT '',
    kelas TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Attendance Sessions
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id TEXT PRIMARY KEY,
    tanggal DATE NOT NULL,
    kelas TEXT NOT NULL,
    mata_pelajaran TEXT DEFAULT '',
    pertemuan INTEGER NOT NULL DEFAULT 1,
    jam_ke TEXT DEFAULT '',
    topik TEXT DEFAULT '',
    records JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) untuk akses publik tanpa login
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses Publik Settings" ON public.settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Akses Publik Classes" ON public.classes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Akses Publik Students" ON public.students FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Akses Publik Attendance" ON public.attendance_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
```

---

## 3. Spesifikasi Fungsional Per Modul

### Modul 1: Pengaturan Kop Surat Sekolah & Penandatangan (`js/modules/settings.js`)
- **Upload Banner Kop Sekolah**: Membaca file gambar banner kop surat utuh (yang sudah memuat logo dinas/yayasan, nama sekolah, alamat, kontak, dan garis batas resmi) via `FileReader.readAsDataURL()`, menyimpannya dalam format Base64 (maks. 3MB), serta menyediakan pratinjau responsif dan tombol hapus kop. Seluruh cetakan dokumen otomatis menggunakan gambar kop ini tanpa perlu mengisi kolom teks instansi terpisah.
- **Identitas Mata Pelajaran & Penandatangan**: Input untuk Mata Pelajaran, Tahun Ajaran, Semester, Kota Dokumen (Titimangsa), Nama Guru Pengampu & NIP/NUPTK, serta Nama Kepala Sekolah & NIP.
- **Pratinjau Kop Real-Time**: Merender tampilan banner kop surat sekolah dan rincian administratif secara live.

### Modul 2: Master Kelas (`js/modules/classes.js`)
- **CRUD Kelas**: Tambah nama kelas baru, edit melalui modal, dan hapus dengan modal konfirmasi.
- **Cascade Update**: Jika nama kelas diubah, siswa yang terdaftar di kelas lama otomatis dipindahkan ke nama kelas baru di `localStorage` dan disinkronkan ke state.
- **Pencegahan Duplikasi**: Validasi nama kelas bersifat *case-insensitive*.

### Modul 3: Master Data Siswa & Excel (`js/modules/students.js`)
- **Template Excel Generator**: Menggunakan SheetJS (`XLSX`) untuk membuat file `.xlsx` dengan satu-satunya baris adalah baris header: `['No', 'Nama Lengkap', 'Jenis Kelamin', 'NISN', 'NIS', 'Kelas']`.
- **Excel Parser & Importer**:
  - Membaca file Excel (`.xlsx` / `.xls`) secara lokal via `XLSX.read(arrayBuffer)`.
  - Pencocokan nama kolom bersifat toleran (*fuzzy header matching* untuk `nama`, `jk`/`jenis kelamin`, `nisn`, `nis`, `kelas`), dengan pencegahan tabrakan substring (kata `nis` dalam `jenis kelamin` wajib dikecualikan agar NIS tidak tertukar dengan gender).
  - **Auto-Update & Auto-Sanitize**: Siswa yang diimpor dengan nama dan kelas yang sama akan diperbarui datanya secara cerdas tanpa duplikasi, dan NIS yang salah terisi single-char 'L'/'P' otomatis dibersihkan.
  - **Auto-Create Kelas**: Apabila siswa di file Excel memiliki nama kelas yang belum terdaftar di Master Kelas, sistem otomatis membuat data kelas baru tersebut.
- **Multi-Filter & Export Excel Sesuai Filter**: Filter kombinasi berdasarkan Kelas, Jenis Kelamin (Semua / Laki-laki / Perempuan), dan pencarian teks nama/NISN/NIS. Dilengkapi tombol download file Excel (.xlsx) yang mengekspor data siswa secara dinamis sesuai filter yang sedang aktif.

### Modul 4: Form Input Absensi Harian (`js/modules/attendance.js`)
- **Pilihan Status**:
  - `H` = Hadir (Hijau)
  - `S` = Sakit (Kuning/Amber)
  - `I` = Izin (Biru)
  - `A` = Alpa (Merah)
- **Input Keterangan Bersyarat**: Jika status siswa diset ke **S** atau **I**, baris keterangan untuk siswa tersebut otomatis terbuka agar alasan izin/sakit dapat diinput dan tersimpan.
- **Fitur Hadirkan Semua**: Satu klik untuk menandai semua siswa dalam kelas sebagai Hadir (`H`).
- **Mode Edit Ulang**: Jika kombinasi tanggal + kelas + nomor pertemuan sudah ada di database, sistem otomatis memuat kembali status tersimpan untuk diedit ulang (*re-editing*).

### Modul 5: Rekapitulasi & Diagram (`js/modules/recap.js`)
- **Mode Periode**: Rekap Bulanan (filter per `YYYY-MM`) atau Rekap Semesteran (seluruh pertemuan).
- **Matriks Presensi**: Kolom individual per pertemuan (`P-1`, `P-2`, ...), jumlah akumulasi H, S, I, A, serta persentase kehadiran individual.
- **Daftar Keterangan Sakit & Izin**: Tabel terpisah yang mengekstrak seluruh catatan ketidakhadiran siswa berstatus S atau I.
- **Visualisasi Chart.js**:
  - Donut Chart: Komposisi total H, S, I, A.
  - Stacked Bar Chart: Tren jumlah kehadiran per pertemuan.
  - Tampilan *empty-state* informatif jika data absensi belum tersedia.

### Modul 6: Simulator Cetak Resmi A4 / F4 (`js/modules/print.js`)
- **Pilihan Ukuran Kertas**:
  - A4 Portrait (`210mm x 297mm`) - **Default Vertikal (Standar Resmi Presisi Kop)**
  - F4 / Folio Portrait (`215mm x 330mm`) - **Vertikal**
  - A4 Landscape (`297mm x 210mm`) & F4 Landscape (`330mm x 215mm`)
- **Aturan CSS Cetak (`@media print`)**:
  - Format default berorientasi **Vertikal / Portrait** agar banner kop surat resmi sekolah membentang presisi edge-to-edge sejajar dengan lebar tabel presensi.
  - Menyembunyikan seluruh kontrol navigasi, tombol, dan sidebar (`.no-print`).
  - Menata tabel dengan border hitam tegas (`.table-print`).
  - Menyertakan Kop Surat resmi utuh, judul, data identitas, tabel rekap, catatan sakit & izin, serta blok tanda tangan Kepala Sekolah & Guru Mata Pelajaran lengkap dengan titimangsa.
  - Menginjeksi CSS dinamis `@page { size: ...; }` saat tombol "Cetak / Simpan PDF" ditekan.

### Modul 7: Integrasi Supabase Cloud (`js/supabase.js`)
- Menggunakan pustaka `@supabase/supabase-js`.
- **Auto-Sync Hook**: Memantau event `classes_updated`, `students_updated`, `attendance_updated`, dan `settings_updated`. Memberikan jeda *debounce* 1.5 detik sebelum mengunggah mutasi data ke cloud.
- **Sync Operations**:
  - `syncUp()`: Mengunggah seluruh data lokal ke tabel Supabase via `upsert`.
  - `syncDown()`: Menarik seluruh data terbaru dari Supabase dan menimpa LocalStorage lokal.

---

## 4. Alur Kerja Deployment ke GitHub Pages

Aplikasi web ini berupa *Client-Side Single-Page Application (SPA)* tanpa backend server kompilasi sehingga dapat di-hosting 100% gratis di GitHub Pages melalui GitHub Actions.

### File Workflow (`.github/workflows/deploy.yml`):
```yaml
name: Deploy E-Absen to GitHub Pages

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Prosedur Push:
1. Buat repository baru di GitHub (misal: `e-absen-mapel`).
2. Jalankan perintah:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: E-Absen Mapel"
   git branch -M main
   git remote add origin https://github.com/USERNAME/e-absen-mapel.git
   git push -u origin main
   ```
3. Di tab **Settings** -> **Pages** pada repository GitHub, atur **Source** ke **GitHub Actions**. Website akan aktif di `https://USERNAME.github.io/e-absen-mapel/`.

---

## 5. Ringkasan Struktur Berkas

```
d:\PROYEK\E-ABSEN MAPEL\
├── SKILL.md                    # Dokumentasi standar skill & arsitektur ini
├── index.html                  # File antarmuka utama (SPA)
├── css/
│   └── app.css                 # Styling khusus, pills status & aturan cetak A4/F4
├── js/
│   ├── store.js                # State Manager & LocalStorage Engine
│   ├── supabase.js             # Modul Sinkronisasi Cloud Supabase
│   ├── app.js                  # Controller router tab, modal & toast
│   └── modules/
│       ├── settings.js         # Pengaturan Kop Surat Banner & Identitas
│       ├── classes.js          # Master Kelas (CRUD)
│       ├── students.js         # Master Siswa & Excel Importer/Exporter
│       ├── attendance.js       # Input Absensi Harian & Catatan S/I
│       ├── recap.js            # Rekapitulasi Matriks & Diagram
│       └── print.js            # Pratinjau & Cetak Resmi A4/F4
├── supabase/
│   └── schema.sql              # Skrip skema database PostgreSQL Supabase
├── .github/
│   └── workflows/
│       └── deploy.yml          # Otomasi deployment GitHub Actions
├── setup-github.bat            # Skrip otomatis git Windows
├── .gitignore                  # Pengecualian berkas git
└── README.md                   # Panduan pengguna
```
