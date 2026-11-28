/**
 * Module: Integrasi Google Apps Script (Google Sheets Cloud Sync)
 * Menghubungkan E-Absen Mata Pelajaran secara realtime dengan Google Sheets.
 * Otomatis sinkron di semua perangkat (HP, Laptop, Tablet).
 */

const APPSCRIPT_STORAGE_KEY = 'e_absen_appscript_config';

const DEFAULT_APPSCRIPT_CONFIG = {
  url: 'https://script.google.com/macros/s/AKfycbz-c_BF0B4ooJs9gp251uKFo7-DgzEznI2sLbZ96oPM0UxC3nDkQ7pdDVYCOcumtVeQWA/exec',
  autoSync: true,
  lastSync: null
};

window.AppScriptModule = {
  isSyncing: false,

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.loadConfig();
    this.setupAutoSyncHooks();

    // Inisialisasi pengecekan data awal (otomatis tarik dari cloud jika lokal kosong)
    setTimeout(() => {
      this.initialCheckAndSync();
    }, 800);
  },

  cacheDOM() {
    this.statusBadgeHeader = document.getElementById('header-cloud-badge');
    this.statusBadgeCard = document.getElementById('appscript-status-badge');
    this.inputUrl = document.getElementById('appscript-url-input');
    this.checkAutoSync = document.getElementById('appscript-autosync-toggle');
    this.lastSyncText = document.getElementById('appscript-last-sync-text');

    this.btnSaveConfig = document.getElementById('btn-save-appscript-config');
    this.btnTestConn = document.getElementById('btn-test-appscript-conn');
    this.btnSyncUp = document.getElementById('btn-sync-up-appscript');
    this.btnSyncDown = document.getElementById('btn-sync-down-appscript');
  },

  bindEvents() {
    if (this.btnSaveConfig) {
      this.btnSaveConfig.addEventListener('click', () => this.handleSaveConfig());
    }
    if (this.btnTestConn) {
      this.btnTestConn.addEventListener('click', () => this.testConnection(true));
    }
    if (this.btnSyncUp) {
      this.btnSyncUp.addEventListener('click', () => this.syncUp(false));
    }
    if (this.btnSyncDown) {
      this.btnSyncDown.addEventListener('click', () => this.syncDown(false));
    }
  },

  getConfig() {
    try {
      const data = localStorage.getItem(APPSCRIPT_STORAGE_KEY);
      return data ? { ...DEFAULT_APPSCRIPT_CONFIG, ...JSON.parse(data) } : { ...DEFAULT_APPSCRIPT_CONFIG };
    } catch (e) {
      console.error('Error reading AppScript config:', e);
      return { ...DEFAULT_APPSCRIPT_CONFIG };
    }
  },

  saveConfig(config) {
    localStorage.setItem(APPSCRIPT_STORAGE_KEY, JSON.stringify(config));
  },

  loadConfig() {
    const config = this.getConfig();
    if (this.inputUrl) this.inputUrl.value = config.url || '';
    if (this.checkAutoSync) this.checkAutoSync.checked = config.autoSync !== false;
    this.updateLastSyncDisplay(config.lastSync);

    if (config.url) {
      this.updateStatusBadge('connected');
    } else {
      this.updateStatusBadge('disconnected');
    }
  },

  updateStatusBadge(status) {
    const badges = {
      connected: {
        text: 'Google Sheets Aktif',
        header: '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Google Sheets Aktif',
        headerClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        card: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><span class="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>Terhubung (Auto-Sync)</span>'
      },
      syncing: {
        text: 'Menyinkronkan...',
        header: '<span class="w-2 h-2 rounded-full bg-amber-500 animate-spin"></span> Menyinkronkan...',
        headerClass: 'bg-amber-50 text-amber-700 border-amber-200',
        card: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800"><span class="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>Menyinkronkan...</span>'
      },
      disconnected: {
        text: 'Mode Lokal (Offline)',
        header: '<span class="w-2 h-2 rounded-full bg-slate-400"></span> Mode Lokal',
        headerClass: 'bg-slate-100 text-slate-600 border-slate-200',
        card: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">Belum Terhubung</span>'
      }
    };

    const b = badges[status] || badges.disconnected;

    if (this.statusBadgeHeader) {
      this.statusBadgeHeader.innerHTML = b.header;
      this.statusBadgeHeader.className = `hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${b.headerClass}`;
    }

    if (this.statusBadgeCard) {
      this.statusBadgeCard.innerHTML = b.card;
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

  async testConnection(showToast = true) {
    const config = this.getConfig();
    if (!config.url) {
      if (showToast) window.App.toast('URL Google Apps Script belum diisi!', 'warning');
      return false;
    }

    try {
      this.updateStatusBadge('syncing');
      const res = await fetch(config.url);
      const data = await res.json();
      if (data && data.status === 'ok') {
        this.updateStatusBadge('connected');
        if (showToast) window.App.toast('Koneksi ke Google Sheets berhasil!', 'success');
        return true;
      } else {
        throw new Error('Respons tidak valid');
      }
    } catch (e) {
      console.error('Koneksi Apps Script gagal:', e);
      this.updateStatusBadge('disconnected');
      if (showToast) window.App.toast('Gagal terhubung ke Google Sheets: ' + e.message, 'error');
      return false;
    }
  },

  handleSaveConfig() {
    const url = this.inputUrl ? this.inputUrl.value.trim() : '';
    const autoSync = this.checkAutoSync ? this.checkAutoSync.checked : true;

    if (!url) {
      window.App.toast('Harap masukkan URL Web App Google Apps Script', 'warning');
      return;
    }

    const config = this.getConfig();
    config.url = url;
    config.autoSync = autoSync;
    this.saveConfig(config);

    window.App.toast('Pengaturan Google Sheets disimpan', 'success');
    this.testConnection(true);
  },

  /* ================= 1-KLIK SINKRON CLOUD (GAS) ================= */
  async quickSync() {
    const config = this.getConfig();
    if (!config.url) {
      window.App.toast('URL Google Apps Script belum diisi! Silakan lengkapi di Pengaturan & Kop.', 'warning');
      window.App.switchTab('pengaturan');
      return;
    }

    const btn = document.getElementById('btn-quick-sync-cloud');
    const icon = document.getElementById('sync-icon-spin');
    const label = document.getElementById('sync-label-text');

    if (btn) btn.disabled = true;
    if (icon) icon.classList.add('animate-spin');
    if (label) label.textContent = 'Menyinkronkan...';

    window.App.toast('Sedang menyinkronkan data dengan Cloud (Google Sheets)...', 'info');

    try {
      const success = await this.syncUp(false);
      if (success) {
        window.App.toast('✓ Sukses! Seluruh data telah disinkronkan ke Cloud (GAS)', 'success');
      }
    } catch (e) {
      console.error('Quick sync error:', e);
      window.App.toast('Gagal menyinkronkan: ' + e.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
      if (icon) icon.classList.remove('animate-spin');
      if (label) label.textContent = 'Sinkron Cloud';
    }
  },

  /* ================= AUTO INITIAL PULL ================= */
  async initialCheckAndSync() {
    const config = this.getConfig();
    if (!config.url) return;

    const classes = window.appStore.getClasses();
    const students = window.appStore.getStudents();

    // Jika perangkat ini masih kosong (misal baru buka di HP), otomatis tarik data dari cloud
    if (classes.length === 0 && students.length === 0) {
      console.log('Perangkat baru terdeteksi: Menarik data dari Google Sheets...');
      await this.syncDown(true);
    }
  },

  /* ================= SINKRONISASI UP (LOKAL -> GOOGLE SHEETS) ================= */
  async syncUp(isBackground = false) {
    const config = this.getConfig();
    if (!config.url) {
      if (!isBackground) window.App.toast('URL Google Sheets belum diatur!', 'warning');
      return false;
    }

    if (this.isSyncing) return;
    this.isSyncing = true;
    this.updateStatusBadge('syncing');

    try {
      const payload = {
        settings: window.appStore.getSettings(),
        classes: window.appStore.getClasses(),
        students: window.appStore.getStudents(),
        attendance: window.appStore.getAttendanceSessions()
      };

      // Kirim via POST dengan Content-Type text/plain agar tidak trigger CORS OPTIONS preflight di Apps Script
      const res = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result && result.status === 'success') {
        const now = new Date().toISOString();
        config.lastSync = now;
        this.saveConfig(config);
        this.updateLastSyncDisplay(now);
        this.updateStatusBadge('connected');
        if (!isBackground) {
          window.App.toast('Data berhasil disimpan ke Google Sheets!', 'success');
        }
        return true;
      } else {
        throw new Error(result.message || 'Gagal menyimpan ke Google Sheets');
      }
    } catch (e) {
      console.error('Error syncUp Google Sheets:', e);
      this.updateStatusBadge('connected');
      if (!isBackground) {
        window.App.toast('Gagal sinkron ke Google Sheets: ' + e.message, 'error');
      }
      return false;
    } finally {
      this.isSyncing = false;
    }
  },

  /* ================= SINKRONISASI DOWN (GOOGLE SHEETS -> LOKAL) ================= */
  async syncDown(isBackground = false) {
    const config = this.getConfig();
    if (!config.url) {
      if (!isBackground) window.App.toast('URL Google Sheets belum diatur!', 'warning');
      return false;
    }

    if (this.isSyncing) return;
    this.isSyncing = true;
    this.updateStatusBadge('syncing');

    try {
      const res = await fetch(`${config.url}?action=readAll&_t=${Date.now()}`);
      const result = await res.json();

      if (result && result.status === 'success' && result.data) {
        const d = result.data;

        // 1. Settings (Kop & Identitas)
        if (d.settings) {
          const rawSettings = Array.isArray(d.settings) ? d.settings[0] : d.settings;
          if (rawSettings && typeof rawSettings === 'object') {
            window.appStore.saveSettings(rawSettings);
          }
        }

        // 2. Classes
        if (d.classes && Array.isArray(d.classes) && d.classes.length > 0) {
          localStorage.setItem('e_absen_classes', JSON.stringify(d.classes));
          window.appStore.emit('classes_updated', d.classes);
        }

        // 3. Students
        if (d.students && Array.isArray(d.students) && d.students.length > 0) {
          localStorage.setItem('e_absen_students', JSON.stringify(d.students));
          window.appStore.emit('students_updated', d.students);
        }

        // 4. Attendance
        if (d.attendance && Array.isArray(d.attendance) && d.attendance.length > 0) {
          const parsedAttendance = d.attendance.map(att => {
            let recs = [];
            try {
              recs = typeof att.records === 'string' ? JSON.parse(att.records || '[]') : (att.records || []);
            } catch (err) {
              recs = [];
            }
            return {
              ...att,
              pertemuan: parseInt(att.pertemuan, 10) || 1,
              records: recs
            };
          });
          localStorage.setItem('e_absen_attendance', JSON.stringify(parsedAttendance));
          window.appStore.emit('attendance_updated', parsedAttendance);
        }

        const now = new Date().toISOString();
        config.lastSync = now;
        this.saveConfig(config);
        this.updateLastSyncDisplay(now);
        this.updateStatusBadge('connected');

        window.appStore.emit('all_updated');

        if (!isBackground) {
          window.App.toast('Data terbaru dari Google Sheets berhasil ditarik!', 'success');
        }
        return true;
      } else {
        throw new Error(result.message || 'Gagal membaca data dari Google Sheets');
      }
    } catch (e) {
      console.error('Error syncDown Google Sheets:', e);
      this.updateStatusBadge('connected');
      if (!isBackground) {
        window.App.toast('Gagal menarik dari Google Sheets: ' + e.message, 'error');
      }
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
      if (!config.url || !config.autoSync) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.syncUp(true);
      }, 1500); // Debounce 1.5 detik
    };

    window.appStore.subscribe('classes_updated', triggerAutoSync);
    window.appStore.subscribe('students_updated', triggerAutoSync);
    window.appStore.subscribe('attendance_updated', triggerAutoSync);
    window.appStore.subscribe('settings_updated', triggerAutoSync);
  }
};
