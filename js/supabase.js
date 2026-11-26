/**
 * Module: Integrasi Supabase Cloud Database & Sinkronisasi
 * Menggunakan @supabase/supabase-js untuk sinkronisasi cloud real-time,
 * cadangan awan, dan mode offline-first (LocalStorage tetap aktif sebagai cache/fallback).
 */

const SUPABASE_STORAGE_KEY = 'e_absen_supabase_config';

const DEFAULT_SUPABASE_CONFIG = {
  url: '',
  key: '',
  autoSync: true,
  lastSync: null
};

window.SupabaseModule = {
  client: null,
  isSyncing: false,

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.loadConfig();
    this.setupAutoSyncHooks();
  },

  cacheDOM() {
    this.statusBadgeHeader = document.getElementById('header-cloud-badge');
    this.statusBadgeModal = document.getElementById('supabase-status-badge');
    this.inputUrl = document.getElementById('supabase-url-input');
    this.inputKey = document.getElementById('supabase-key-input');
    this.checkAutoSync = document.getElementById('supabase-autosync-toggle');
    this.lastSyncText = document.getElementById('supabase-last-sync-text');

    this.btnSaveConfig = document.getElementById('btn-save-supabase-config');
    this.btnTestConn = document.getElementById('btn-test-supabase-conn');
    this.btnDisconnect = document.getElementById('btn-disconnect-supabase');
    this.btnSyncUp = document.getElementById('btn-sync-up-supabase');
    this.btnSyncDown = document.getElementById('btn-sync-down-supabase');
    this.btnCopySql = document.getElementById('btn-copy-supabase-sql');
  },

  bindEvents() {
    if (this.btnSaveConfig) {
      this.btnSaveConfig.addEventListener('click', () => this.handleSaveConfig());
    }
    if (this.btnTestConn) {
      this.btnTestConn.addEventListener('click', () => this.testConnection(true));
    }
    if (this.btnDisconnect) {
      this.btnDisconnect.addEventListener('click', () => this.disconnect());
    }
    if (this.btnSyncUp) {
      this.btnSyncUp.addEventListener('click', () => this.syncUp());
    }
    if (this.btnSyncDown) {
      this.btnSyncDown.addEventListener('click', () => this.syncDown());
    }
    if (this.btnCopySql) {
      this.btnCopySql.addEventListener('click', () => this.copySqlSchema());
    }
  },

  getConfig() {
    try {
      const data = localStorage.getItem(SUPABASE_STORAGE_KEY);
      return data ? { ...DEFAULT_SUPABASE_CONFIG, ...JSON.parse(data) } : { ...DEFAULT_SUPABASE_CONFIG };
    } catch (e) {
      console.error('Error reading Supabase config:', e);
      return { ...DEFAULT_SUPABASE_CONFIG };
    }
  },

  loadConfig() {
    const config = this.getConfig();
    if (this.inputUrl) this.inputUrl.value = config.url || '';
    if (this.inputKey) this.inputKey.value = config.key || '';
    if (this.checkAutoSync) this.checkAutoSync.checked = config.autoSync !== false;
    this.updateLastSyncDisplay(config.lastSync);

    if (config.url && config.key) {
      this.initClient(config.url, config.key);
      this.testConnection(false);
    } else {
      this.updateStatusBadge('disconnected');
    }
  },

  initClient(url, key) {
    if (typeof supabase === 'undefined') {
      console.warn('Supabase JS SDK belum dimuat.');
      return;
    }
    try {
      this.client = supabase.createClient(url.trim(), key.trim(), {
        auth: { persistSession: false }
      });
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      this.client = null;
    }
  },

  async handleSaveConfig() {
    const url = (this.inputUrl.value || '').trim();
    const key = (this.inputKey.value || '').trim();
    const autoSync = this.checkAutoSync ? this.checkAutoSync.checked : true;

    if (!url || !key) {
      window.App.toast('URL dan Anon Key Supabase wajib diisi', 'error');
      return;
    }

    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      window.App.toast('Format Supabase URL tidak valid (harus https://xxxx.supabase.co)', 'warning');
      return;
    }

    this.initClient(url, key);
    const ok = await this.testConnection(false);
    if (!ok) {
      window.App.toast('Koneksi ke Supabase gagal. Periksa kembali URL, Anon Key, dan Skema SQL.', 'error');
      return;
    }

    const config = {
      url,
      key,
      autoSync,
      lastSync: this.getConfig().lastSync
    };
    localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(config));
    this.updateStatusBadge('connected');
    window.App.toast('Koneksi Supabase berhasil disimpan dan terhubung!', 'success');
  },

  async testConnection(showSuccessToast = true) {
    if (!this.client) {
      const config = this.getConfig();
      if (config.url && config.key) {
        this.initClient(config.url, config.key);
      }
    }

    if (!this.client) {
      this.updateStatusBadge('disconnected');
      if (showSuccessToast) window.App.toast('Klien Supabase belum dikonfigurasi.', 'warning');
      return false;
    }

    this.updateStatusBadge('connecting');
    try {
      const { data, error } = await this.client.from('classes').select('id').limit(1);
      if (error) {
        console.error('Supabase test error:', error);
        this.updateStatusBadge('error');
        if (showSuccessToast) {
          window.App.toast(`Gagal terhubung: ${error.message}. Pastikan skema SQL sudah dijalankan di Supabase.`, 'error');
        }
        return false;
      }

      this.updateStatusBadge('connected');
      if (showSuccessToast) {
        window.App.toast('Koneksi ke Supabase Cloud Berhasil & Aktif!', 'success');
      }
      return true;
    } catch (e) {
      console.error('Supabase connection exception:', e);
      this.updateStatusBadge('error');
      if (showSuccessToast) window.App.toast(`Gagal terhubung: ${e.message}`, 'error');
      return false;
    }
  },

  disconnect() {
    window.App.confirmModal({
      title: 'Putuskan Koneksi Supabase?',
      message: 'Aplikasi akan kembali ke mode penyimpanan lokal murni (LocalStorage). Data Anda di cloud tetap aman.',
      confirmText: 'Ya, Putuskan',
      confirmClass: 'bg-rose-600 hover:bg-rose-700',
      onConfirm: () => {
        localStorage.removeItem(SUPABASE_STORAGE_KEY);
        this.client = null;
        if (this.inputUrl) this.inputUrl.value = '';
        if (this.inputKey) this.inputKey.value = '';
        this.updateStatusBadge('disconnected');
        this.updateLastSyncDisplay(null);
        window.App.toast('Koneksi Supabase telah diputuskan. Mode lokal aktif.', 'info');
      }
    });
  },

  updateStatusBadge(status) {
    // status: 'connected', 'connecting', 'disconnected', 'error', 'syncing'
    const headerEl = this.statusBadgeHeader;
    const modalEl = this.statusBadgeModal;

    const badges = {
      connected: {
        header: `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span class="text-emerald-700 font-semibold">Cloud Aktif (Supabase)</span>`,
        headerClass: 'bg-emerald-50 border-emerald-200',
        modal: `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">● Terhubung ke Cloud</span>`
      },
      connecting: {
        header: `<span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span><span class="text-amber-700 font-semibold">Menghubungkan...</span>`,
        headerClass: 'bg-amber-50 border-amber-200',
        modal: `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Menghubungkan...</span>`
      },
      syncing: {
        header: `<span class="w-2 h-2 rounded-full bg-indigo-500 animate-spin"></span><span class="text-indigo-700 font-semibold">Menyinkronkan...</span>`,
        headerClass: 'bg-indigo-50 border-indigo-200',
        modal: `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">Menyinkronkan...</span>`
      },
      error: {
        header: `<span class="w-2 h-2 rounded-full bg-rose-500"></span><span class="text-rose-700 font-semibold">Koneksi Cloud Error</span>`,
        headerClass: 'bg-rose-50 border-rose-200',
        modal: `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">Gagal Terhubung</span>`
      },
      disconnected: {
        header: `<span class="w-2 h-2 rounded-full bg-slate-400"></span><span class="text-slate-600">Mode Lokal (LocalStorage)</span>`,
        headerClass: 'bg-slate-100 border-slate-200',
        modal: `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">Mode Lokal (Offline)</span>`
      }
    };

    const b = badges[status] || badges.disconnected;

    if (headerEl) {
      headerEl.innerHTML = b.header;
      headerEl.className = `hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${b.headerClass}`;
    }

    if (modalEl) {
      modalEl.innerHTML = b.modal;
    }
  },

  updateLastSyncDisplay(timestamp) {
    if (!this.lastSyncText) return;
    if (!timestamp) {
      this.lastSyncText.textContent = 'Belum pernah disinkronkan';
      return;
    }
    const d = new Date(timestamp);
    this.lastSyncText.textContent = `Terakhir sinkron: ${d.toLocaleDateString('id-ID')} ${d.toLocaleTimeString('id-ID')}`;
  },

  /* ================= SINKRONISASI UP (LOKAL -> CLOUD) ================= */
  async syncUp(isBackground = false) {
    if (!this.client) {
      if (!isBackground) window.App.toast('Supabase belum terhubung!', 'warning');
      return false;
    }

    if (this.isSyncing) return;
    this.isSyncing = true;
    this.updateStatusBadge('syncing');

    try {
      const settings = window.appStore.getSettings();
      const classes = window.appStore.getClasses();
      const students = window.appStore.getStudents();
      const sessions = window.appStore.getAttendanceSessions();

      // 1. Sync Settings
      const settingsPayload = {
        id: 'app_settings',
        kop_image: settings.kopImage || settings.logo,
        logo: settings.kopImage || settings.logo,
        instansi: settings.instansi || '',
        nama_sekolah: settings.namaSekolah || '',
        alamat: settings.alamat || '',
        kontak: settings.kontak || '',
        show_kop_border: settings.showKopBorder !== false,
        mata_pelajaran: settings.mataPelajaran || '',
        tahun_ajaran: settings.tahunAjaran || '',
        semester: settings.semester || '',
        nama_guru: settings.namaGuru || '',
        nip_guru: settings.nipGuru || '',
        nama_kepsek: settings.namaKepsek || '',
        nip_kepsek: settings.nipKepsek || '',
        kota_dokumen: settings.kotaDokumen || '',
        updated_at: new Date().toISOString()
      };
      await this.client.from('settings').upsert(settingsPayload);

      // 2. Sync Classes
      if (classes.length > 0) {
        const classesPayload = classes.map(c => ({
          id: c.id,
          nama: c.nama,
          tingkat: c.tingkat || '',
          created_at: c.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        await this.client.from('classes').upsert(classesPayload);
      }

      // 3. Sync Students
      if (students.length > 0) {
        const studentsPayload = students.map(s => ({
          id: s.id,
          nama: s.nama,
          jenis_kelamin: s.jenisKelamin,
          nisn: s.nisn || '',
          nis: s.nis || '',
          kelas: s.kelas,
          created_at: s.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        await this.client.from('students').upsert(studentsPayload);
      }

      // 4. Sync Attendance Sessions
      if (sessions.length > 0) {
        const sessionsPayload = sessions.map(att => ({
          id: att.id,
          tanggal: att.tanggal,
          kelas: att.kelas,
          mata_pelajaran: att.mataPelajaran || '',
          pertemuan: att.pertemuan,
          jam_ke: att.jamKe || '',
          topik: att.topik || '',
          records: att.records || [],
          created_at: att.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        await this.client.from('attendance_sessions').upsert(sessionsPayload);
      }

      const now = new Date().toISOString();
      const config = this.getConfig();
      config.lastSync = now;
      localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(config));

      this.updateStatusBadge('connected');
      this.updateLastSyncDisplay(now);

      if (!isBackground) {
        window.App.toast('Data lokal berhasil diunggah ke Supabase Cloud!', 'success');
      }
      return true;
    } catch (e) {
      console.error('Sync up error:', e);
      this.updateStatusBadge('error');
      if (!isBackground) window.App.toast(`Gagal upload ke cloud: ${e.message}`, 'error');
      return false;
    } finally {
      this.isSyncing = false;
    }
  },

  /* ================= SINKRONISASI DOWN (CLOUD -> LOKAL) ================= */
  async syncDown() {
    if (!this.client) {
      window.App.toast('Supabase belum terhubung!', 'warning');
      return false;
    }

    if (this.isSyncing) return;
    this.isSyncing = true;
    this.updateStatusBadge('syncing');

    try {
      // 1. Fetch Settings
      const { data: remoteSettings } = await this.client.from('settings').select('*').limit(1);
      if (remoteSettings && remoteSettings.length > 0) {
        const rs = remoteSettings[0];
        window.appStore.saveSettings({
          kopImage: rs.kop_image || rs.logo,
          logo: rs.kop_image || rs.logo,
          instansi: rs.instansi,
          namaSekolah: rs.nama_sekolah,
          alamat: rs.alamat,
          kontak: rs.kontak,
          showKopBorder: rs.show_kop_border,
          mataPelajaran: rs.mata_pelajaran,
          tahunAjaran: rs.tahun_ajaran,
          semester: rs.semester,
          namaGuru: rs.nama_guru,
          nipGuru: rs.nip_guru,
          namaKepsek: rs.nama_kepsek,
          nipKepsek: rs.nip_kepsek,
          kotaDokumen: rs.kota_dokumen
        });
      }

      // 2. Fetch Classes
      const { data: remoteClasses } = await this.client.from('classes').select('*');
      if (remoteClasses) {
        const mappedClasses = remoteClasses.map(c => ({
          id: c.id,
          nama: c.nama,
          tingkat: c.tingkat || '',
          createdAt: c.created_at
        }));
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(mappedClasses));
        window.appStore.emit('classes_updated', mappedClasses);
      }

      // 3. Fetch Students
      const { data: remoteStudents } = await this.client.from('students').select('*');
      if (remoteStudents) {
        const mappedStudents = remoteStudents.map(s => ({
          id: s.id,
          nama: s.nama,
          jenisKelamin: s.jenis_kelamin,
          nisn: s.nisn || '',
          nis: s.nis || '',
          kelas: s.kelas,
          createdAt: s.created_at
        }));
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(mappedStudents));
        window.appStore.emit('students_updated', mappedStudents);
      }

      // 4. Fetch Attendance Sessions
      const { data: remoteSessions } = await this.client.from('attendance_sessions').select('*');
      if (remoteSessions) {
        const mappedSessions = remoteSessions.map(att => ({
          id: att.id,
          tanggal: att.tanggal,
          kelas: att.kelas,
          mataPelajaran: att.mata_pelajaran,
          pertemuan: att.pertemuan,
          jamKe: att.jam_ke,
          topik: att.topik,
          records: att.records || [],
          createdAt: att.created_at
        }));
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(mappedSessions));
        window.appStore.emit('attendance_updated', mappedSessions);
      }

      const now = new Date().toISOString();
      const config = this.getConfig();
      config.lastSync = now;
      localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(config));

      this.updateStatusBadge('connected');
      this.updateLastSyncDisplay(now);
      window.App.toast('Data dari Supabase Cloud berhasil ditarik ke aplikasi!', 'success');
      return true;
    } catch (e) {
      console.error('Sync down error:', e);
      this.updateStatusBadge('error');
      window.App.toast(`Gagal menarik data cloud: ${e.message}`, 'error');
      return false;
    } finally {
      this.isSyncing = false;
    }
  },

  /* ================= AUTO-SYNC HOOKS ================= */
  setupAutoSyncHooks() {
    let debounceTimer = null;

    const triggerAutoSync = () => {
      const config = this.getConfig();
      if (!this.client || !config.autoSync) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.syncUp(true);
      }, 1500); // 1.5s debounce to avoid rapid API calls
    };

    window.appStore.subscribe('classes_updated', triggerAutoSync);
    window.appStore.subscribe('students_updated', triggerAutoSync);
    window.appStore.subscribe('attendance_updated', triggerAutoSync);
    window.appStore.subscribe('settings_updated', triggerAutoSync);
  },

  /* ================= COPY SQL SCHEMA HELPER ================= */
  copySqlSchema() {
    const sql = `-- SKEMA DATABASE SUPABASE E-ABSEN MAPEL
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

CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    tingkat TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    jenis_kelamin TEXT NOT NULL,
    nisn TEXT DEFAULT '',
    nis TEXT DEFAULT '',
    kelas TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses Publik Settings" ON public.settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Akses Publik Classes" ON public.classes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Akses Publik Students" ON public.students FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Akses Publik Attendance" ON public.attendance_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(sql).then(() => {
        window.App.toast('Skrip SQL Supabase berhasil disalin ke clipboard!', 'success');
      }).catch(() => {
        this.fallbackCopy(sql);
      });
    } else {
      this.fallbackCopy(sql);
    }
  },

  fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    window.App.toast('Skrip SQL Supabase berhasil disalin!', 'success');
  }
};
