-- ====================================================================
-- SKEMA DATABASE SUPABASE UNTUK E-ABSEN MATA PELAJARAN
-- Jalankan skrip SQL ini di "SQL Editor" pada Dashboard Supabase Anda.
-- ====================================================================

-- 1. TABEL PENGATURAN KOP & IDENTITAS
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

-- 2. TABEL MASTER KELAS
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    tingkat TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL MASTER DATA SISWA
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

-- 4. TABEL SESI ABSENSI HARIAN & CATATAN SAKIT/IZIN
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

-- ====================================================================
-- ATURAN KEAMANAN ROW LEVEL SECURITY (RLS) UNTUK MODE NO-LOGIN
-- Mengizinkan role 'anon' (kunci anonim publik) melakukan CRUD penuh.
-- ====================================================================

-- Aktifkan RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Buat Kebijakan Akses Penuh untuk Anon
DROP POLICY IF EXISTS "Akses Publik Settings" ON public.settings;
CREATE POLICY "Akses Publik Settings" ON public.settings
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Publik Classes" ON public.classes;
CREATE POLICY "Akses Publik Classes" ON public.classes
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Publik Students" ON public.students;
CREATE POLICY "Akses Publik Students" ON public.students
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Publik Attendance" ON public.attendance_sessions;
CREATE POLICY "Akses Publik Attendance" ON public.attendance_sessions
    FOR ALL TO anon USING (true) WITH CHECK (true);

-- ====================================================================
-- REALTIME SUBSCRIPTION (OPSIONAL - UNTUK UPDATE MULTI-DEVICE INSTAN)
-- ====================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.settings, public.classes, public.students, public.attendance_sessions;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
