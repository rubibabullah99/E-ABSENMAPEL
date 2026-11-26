/**
 * Main Application Controller
 * Handles tab navigation, modals, toasts, and dashboard overview.
 */

window.App = {
  currentTab: 'dashboard',

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.initModules();
    this.updateDashboardStats();

    // Re-update dashboard on data changes
    window.appStore.subscribe('all_updated', () => this.updateDashboardStats());
    window.appStore.subscribe('classes_updated', () => this.updateDashboardStats());
    window.appStore.subscribe('students_updated', () => this.updateDashboardStats());
    window.appStore.subscribe('attendance_updated', () => this.updateDashboardStats());
    window.appStore.subscribe('settings_updated', () => this.updateDashboardStats());
  },

  cacheDOM() {
    this.navLinks = document.querySelectorAll('.nav-link');
    this.tabPanels = document.querySelectorAll('.tab-panel');
    this.modalOverlay = document.getElementById('global-modal-overlay');
    this.modalTitle = document.getElementById('global-modal-title');
    this.modalBody = document.getElementById('global-modal-body');
    this.modalCloseBtn = document.getElementById('global-modal-close');
    this.toastContainer = document.getElementById('toast-container');

    // Dashboard quick widgets
    this.dashSchoolName = document.getElementById('dash-school-name');
    this.dashMapelName = document.getElementById('dash-mapel-name');
    this.dashCountClasses = document.getElementById('dash-count-classes');
    this.dashCountStudents = document.getElementById('dash-count-students');
    this.dashCountSessions = document.getElementById('dash-count-sessions');
  },

  bindEvents() {
    // Navigation Tabs
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    // Close Modal on overlay or close button
    this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.closeModal();
      }
    });

    // Delegated cancel buttons inside modals
    document.addEventListener('click', (e) => {
      if (e.target.closest('.btn-modal-cancel')) {
        this.closeModal();
      }
    });

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modalOverlay.classList.contains('hidden')) {
        this.closeModal();
      }
    });

    // Reset All Data button in settings
    const btnResetAll = document.getElementById('btn-reset-all-database');
    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        this.confirmModal({
          title: 'Hapus & Reset Seluruh Data?',
          message: '<span class="text-rose-600 font-semibold">Tindakan ini tidak dapat dibatalkan!</span> Seluruh data kelas, siswa, riwayat absensi, dan pengaturan kop akan dihapus kembali ke kondisi awal (KOSONG).',
          confirmText: 'Ya, Reset Seluruh Data',
          confirmClass: 'bg-rose-600 hover:bg-rose-700',
          onConfirm: () => {
            window.appStore.clearAllData();
            this.toast('Seluruh database aplikasi telah direset ke kondisi kosong.', 'info');
            this.switchTab('dashboard');
          }
        });
      });
    }
  },

  initModules() {
    if (window.SettingsModule) window.SettingsModule.init();
    if (window.ClassesModule) window.ClassesModule.init();
    if (window.StudentsModule) window.StudentsModule.init();
    if (window.AttendanceModule) window.AttendanceModule.init();
    if (window.RecapModule) window.RecapModule.init();
    if (window.PrintModule) window.PrintModule.init();
    if (window.SupabaseModule) window.SupabaseModule.init();
  },

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update active nav state
    this.navLinks.forEach(link => {
      const isTarget = link.dataset.tab === tabId;
      if (isTarget) {
        link.classList.add('bg-indigo-50', 'text-indigo-600', 'font-semibold');
        link.classList.remove('text-slate-600', 'hover:bg-slate-50');
      } else {
        link.classList.remove('bg-indigo-50', 'text-indigo-600', 'font-semibold');
        link.classList.add('text-slate-600', 'hover:bg-slate-50');
      }
    });

    // Toggle panels
    this.tabPanels.forEach(panel => {
      if (panel.id === `tab-${tabId}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateDashboardStats() {
    const settings = window.appStore.getSettings();
    const classes = window.appStore.getClasses();
    const students = window.appStore.getStudents();
    const sessions = window.appStore.getAttendanceSessions();

    if (this.dashSchoolName) {
      this.dashSchoolName.textContent = (settings.kopImage || settings.logo) ? 'Kop Surat Resmi Terpasang' : '-';
    }
    if (this.dashMapelName) {
      this.dashMapelName.textContent = settings.mataPelajaran ? `Mata Pelajaran: ${settings.mataPelajaran}` : 'Mata Pelajaran: -';
    }
    if (this.dashCountClasses) {
      this.dashCountClasses.textContent = classes.length;
    }
    if (this.dashCountStudents) {
      this.dashCountStudents.textContent = students.length;
    }
    if (this.dashCountSessions) {
      this.dashCountSessions.textContent = sessions.length;
    }
  },

  /* ================= MODAL HELPERS ================= */
  customModal({ title, bodyHtml, onOpen }) {
    this.modalTitle.textContent = title;
    this.modalBody.innerHTML = bodyHtml;
    this.modalOverlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    if (onOpen) onOpen(this.modalBody);
  },

  confirmModal({ title, message, confirmText = 'Lanjutkan', confirmClass = 'bg-indigo-600 hover:bg-indigo-700', onConfirm }) {
    const html = `
      <div class="space-y-4">
        <p class="text-sm text-slate-600 leading-relaxed">${message}</p>
        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" class="btn-modal-cancel px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Batal</button>
          <button type="button" id="btn-modal-action-confirm" class="px-4 py-2 text-xs font-medium text-white ${confirmClass} rounded-lg shadow-sm">${confirmText}</button>
        </div>
      </div>
    `;

    this.customModal({
      title,
      bodyHtml: html,
      onOpen: (modalEl) => {
        const btnConfirm = modalEl.querySelector('#btn-modal-action-confirm');
        btnConfirm.addEventListener('click', () => {
          this.closeModal();
          if (onConfirm) onConfirm();
        });
      }
    });
  },

  closeModal() {
    this.modalOverlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    this.modalBody.innerHTML = '';
  },

  /* ================= TOAST NOTIFICATION SYSTEM ================= */
  toast(message, type = 'info') {
    if (!this.toastContainer) return;

    const colors = {
      success: 'bg-emerald-600 text-white border-emerald-700',
      error: 'bg-rose-600 text-white border-rose-700',
      warning: 'bg-amber-600 text-white border-amber-700',
      info: 'bg-indigo-600 text-white border-indigo-700'
    };

    const icons = {
      success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />',
      error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />',
      warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />',
      info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
    };

    const toastEl = document.createElement('div');
    toastEl.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium transform transition-all duration-300 translate-y-2 opacity-0 ${colors[type] || colors.info}`;
    toastEl.innerHTML = `
      <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        ${icons[type] || icons.info}
      </svg>
      <span class="flex-1">${message}</span>
    `;

    this.toastContainer.appendChild(toastEl);

    // Animate in
    requestAnimationFrame(() => {
      toastEl.classList.remove('translate-y-2', 'opacity-0');
    });

    // Auto remove after 3.5s
    setTimeout(() => {
      toastEl.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => {
        toastEl.remove();
      }, 300);
    }, 3500);
  }
};

// Bootstrap when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
