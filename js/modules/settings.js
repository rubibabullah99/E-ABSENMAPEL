/**
 * Module: Pengaturan Kop Surat Sekolah & Identitas Penandatangan
 * Handles full official Kop Surat banner upload/removal, and Identity/Signatory information.
 */

window.SettingsModule = {
  currentKopBase64: null,

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.loadSettings();

    // Re-render when settings updated externally
    window.appStore.subscribe('settings_updated', (settings) => {
      this.populateForm(settings);
      this.renderLiveKopPreview(settings);
    });
  },

  cacheDOM() {
    this.form = document.getElementById('settings-form');
    this.kopInput = document.getElementById('settings-kop-input');
    this.kopPreview = document.getElementById('settings-kop-preview');
    this.kopEmptyState = document.getElementById('settings-kop-empty');
    this.btnRemoveKop = document.getElementById('btn-remove-kop');
    this.kopPreviewContainer = document.getElementById('kop-live-preview');
    this.btnResetSettings = document.getElementById('btn-reset-settings');

    // Input fields for identity & signatures
    this.inputMapel = document.getElementById('set-mapel');
    this.inputTahunAjaran = document.getElementById('set-tahun-ajaran');
    this.inputSemester = document.getElementById('set-semester');
    this.inputNamaGuru = document.getElementById('set-nama-guru');
    this.inputNipGuru = document.getElementById('set-nip-guru');
    this.inputNamaKepsek = document.getElementById('set-nama-kepsek');
    this.inputNipKepsek = document.getElementById('set-nip-kepsek');
    this.inputKotaDokumen = document.getElementById('set-kota-dokumen');
  },

  bindEvents() {
    // Form submit
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    // Reset button
    this.btnResetSettings.addEventListener('click', () => {
      window.App.confirmModal({
        title: 'Kosongkan Pengaturan?',
        message: 'Gambar kop sekolah dan seluruh data penandatangan akan dikosongkan. Data siswa, kelas, dan absensi tetap tersimpan aman.',
        confirmText: 'Ya, Kosongkan',
        confirmClass: 'bg-rose-600 hover:bg-rose-700',
        onConfirm: () => {
          window.appStore.resetSettings();
          this.currentKopBase64 = null;
          this.displayKop(null);
          this.renderLiveKopPreview({});
          window.App.toast('Pengaturan berhasil dikosongkan', 'info');
        }
      });
    });

    // Kop Surat upload
    this.kopInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        window.App.toast('Harap unggah file gambar (PNG, JPG, JPEG, WebP)', 'error');
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        window.App.toast('Ukuran gambar kop maksimal 3MB', 'warning');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        this.currentKopBase64 = base64;
        this.displayKop(base64);
        this.updateLivePreviewFromInputs();
        window.App.toast('Gambar kop surat berhasil dimuat. Klik "Simpan Perubahan" untuk menyimpan.', 'info');
      };
      reader.readAsDataURL(file);
    });

    // Kop Surat remove
    this.btnRemoveKop.addEventListener('click', () => {
      this.currentKopBase64 = null;
      this.kopInput.value = '';
      this.displayKop(null);
      this.updateLivePreviewFromInputs();
    });

    // Live preview update on inputs
    const watchedInputs = [
      this.inputMapel, this.inputTahunAjaran, this.inputSemester,
      this.inputNamaGuru, this.inputNipGuru, this.inputNamaKepsek,
      this.inputNipKepsek, this.inputKotaDokumen
    ];

    watchedInputs.forEach(input => {
      if (input) {
        input.addEventListener('input', () => this.updateLivePreviewFromInputs());
        input.addEventListener('change', () => this.updateLivePreviewFromInputs());
      }
    });
  },

  loadSettings() {
    const settings = window.appStore.getSettings();
    this.currentKopBase64 = settings.kopImage || settings.logo || null;
    this.populateForm(settings);
    this.renderLiveKopPreview(settings);
  },

  populateForm(settings) {
    if (this.inputMapel) this.inputMapel.value = settings.mataPelajaran || '';
    if (this.inputTahunAjaran) this.inputTahunAjaran.value = settings.tahunAjaran || '';
    if (this.inputSemester) this.inputSemester.value = settings.semester || '';
    if (this.inputNamaGuru) this.inputNamaGuru.value = settings.namaGuru || '';
    if (this.inputNipGuru) this.inputNipGuru.value = settings.nipGuru || '';
    if (this.inputNamaKepsek) this.inputNamaKepsek.value = settings.namaKepsek || '';
    if (this.inputNipKepsek) this.inputNipKepsek.value = settings.nipKepsek || '';
    if (this.inputKotaDokumen) this.inputKotaDokumen.value = settings.kotaDokumen || '';

    this.currentKopBase64 = settings.kopImage || settings.logo || null;
    this.displayKop(this.currentKopBase64);
  },

  displayKop(base64) {
    if (base64) {
      this.kopPreview.src = base64;
      this.kopPreview.classList.remove('hidden');
      this.kopEmptyState.classList.add('hidden');
      this.btnRemoveKop.classList.remove('hidden');
    } else {
      this.kopPreview.src = '';
      this.kopPreview.classList.add('hidden');
      this.kopEmptyState.classList.remove('hidden');
      this.btnRemoveKop.classList.add('hidden');
    }
  },

  getCurrentFormData() {
    return {
      kopImage: this.currentKopBase64,
      logo: this.currentKopBase64, // backward compatible
      mataPelajaran: this.inputMapel ? this.inputMapel.value.trim() : '',
      tahunAjaran: this.inputTahunAjaran ? this.inputTahunAjaran.value.trim() : '',
      semester: this.inputSemester ? this.inputSemester.value : '',
      namaGuru: this.inputNamaGuru ? this.inputNamaGuru.value.trim() : '',
      nipGuru: this.inputNipGuru ? this.inputNipGuru.value.trim() : '',
      namaKepsek: this.inputNamaKepsek ? this.inputNamaKepsek.value.trim() : '',
      nipKepsek: this.inputNipKepsek ? this.inputNipKepsek.value.trim() : '',
      kotaDokumen: this.inputKotaDokumen ? this.inputKotaDokumen.value.trim() : ''
    };
  },

  updateLivePreviewFromInputs() {
    const data = this.getCurrentFormData();
    this.renderLiveKopPreview(data);
  },

  renderLiveKopPreview(settings) {
    if (!this.kopPreviewContainer) return;

    const kop = settings.kopImage || settings.logo;
    const hasAnyIdentity = settings.mataPelajaran || settings.tahunAjaran || settings.semester || settings.namaGuru || settings.namaKepsek;

    if (!kop && !hasAnyIdentity) {
      this.kopPreviewContainer.innerHTML = `
        <div class="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <svg class="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p class="text-sm font-medium text-slate-500">Pratinjau Kop Sekolah</p>
          <p class="text-xs text-slate-400 mt-1">Unggah gambar kop surat untuk melihat pratinjau dokumen cetak.</p>
        </div>
      `;
      return;
    }

    const kopHtml = kop
      ? `<div class="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-200"><img src="${kop}" alt="Kop Surat" class="w-full h-auto max-h-36 object-contain mx-auto" /></div>`
      : `<div class="mb-3 py-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">- Kop Sekolah Belum Diunggah -</div>`;

    this.kopPreviewContainer.innerHTML = `
      <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm transition-all">
        ${kopHtml}
        <div class="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div class="flex justify-between">
            <span class="text-slate-400">Mata Pelajaran:</span>
            <span class="font-semibold text-slate-800">${escapeHtml(settings.mataPelajaran || '-')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Tahun Ajaran / Semester:</span>
            <span class="font-medium text-slate-700">${escapeHtml(settings.tahunAjaran || '-')} (Semester ${escapeHtml(settings.semester || '-')})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Guru Pengampu:</span>
            <span class="font-medium text-slate-700">${escapeHtml(settings.namaGuru || '-')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Kepala Sekolah:</span>
            <span class="font-medium text-slate-700">${escapeHtml(settings.namaKepsek || '-')}</span>
          </div>
        </div>
      </div>
    `;
  },

  saveSettings() {
    const data = this.getCurrentFormData();
    window.appStore.saveSettings(data);
    window.App.toast('Pengaturan kop & identitas berhasil disimpan', 'success');
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
