/**
 * Module: Form Input Absensi Harian Mata Pelajaran
 * Handles daily attendance session creation, student status (H/S/I/A),
 * conditional Keterangan for Sakit (S) & Izin (I), and re-editing saved sessions.
 */

window.AttendanceModule = {
  currentSessionId: null, // Set when editing an existing session

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.setDefaultDate();
    this.refreshClassDropdown();
    this.syncSubjectFromSettings();
    this.renderAttendanceForm();
    this.renderSessionHistory();

    // Event subscriptions
    window.appStore.subscribe('classes_updated', () => {
      this.refreshClassDropdown();
      this.renderAttendanceForm();
      this.renderSessionHistory();
    });
    window.appStore.subscribe('students_updated', () => {
      this.renderAttendanceForm();
    });
    window.appStore.subscribe('settings_updated', (settings) => {
      if (!this.inputMapel.value) {
        this.inputMapel.value = settings.mataPelajaran || '';
      }
    });
    window.appStore.subscribe('attendance_updated', () => {
      this.renderSessionHistory();
    });
  },

  cacheDOM() {
    // Session Controls
    this.inputTanggal = document.getElementById('att-input-tanggal');
    this.selectKelas = document.getElementById('att-select-kelas');
    this.inputMapel = document.getElementById('att-input-mapel');
    this.inputPertemuan = document.getElementById('att-input-pertemuan');
    this.inputJamKe = document.getElementById('att-input-jamke');
    this.inputTopik = document.getElementById('att-input-topik');

    // Action buttons
    this.btnMarkAllPresent = document.getElementById('btn-att-mark-all-h');
    this.btnResetStatus = document.getElementById('btn-att-reset-status');
    this.btnSaveAttendance = document.getElementById('btn-save-attendance');
    this.editingBadge = document.getElementById('att-editing-badge');
    this.btnCancelEdit = document.getElementById('btn-att-cancel-edit');

    // Containers
    this.studentsContainer = document.getElementById('att-students-list-container');
    this.emptyState = document.getElementById('att-empty-state');
    this.historyTableBody = document.getElementById('att-history-table-body');
    this.historyEmptyState = document.getElementById('att-history-empty-state');
    this.historyCountBadge = document.getElementById('att-history-count-badge');
  },

  setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    this.inputTanggal.value = today;
  },

  syncSubjectFromSettings() {
    const settings = window.appStore.getSettings();
    if (settings.mataPelajaran) {
      this.inputMapel.value = settings.mataPelajaran;
    }
  },

  refreshClassDropdown() {
    const classes = window.appStore.getClasses();
    const currentVal = this.selectKelas.value;

    let options = '<option value="">-- Pilih Kelas --</option>';
    classes.forEach(c => {
      options += `<option value="${escapeHtml(c.nama)}">${escapeHtml(c.nama)}</option>`;
    });
    this.selectKelas.innerHTML = options;

    if (classes.some(c => c.nama === currentVal)) {
      this.selectKelas.value = currentVal;
    }
  },

  bindEvents() {
    // Session filter changes
    this.selectKelas.addEventListener('change', () => {
      this.checkAndLoadExistingSession();
      this.renderAttendanceForm();
    });

    this.inputTanggal.addEventListener('change', () => {
      this.checkAndLoadExistingSession();
    });

    this.inputPertemuan.addEventListener('input', () => {
      this.checkAndLoadExistingSession();
    });

    // Quick bulk actions
    this.btnMarkAllPresent.addEventListener('click', () => {
      this.setAllStatus('H');
    });

    this.btnResetStatus.addEventListener('click', () => {
      this.setAllStatus(null);
    });

    // Cancel edit mode
    this.btnCancelEdit.addEventListener('click', () => {
      this.exitEditMode();
    });

    // Save attendance submit
    this.btnSaveAttendance.addEventListener('click', () => {
      this.saveAttendance();
    });

    // Delegated clicks for attendance status pills
    this.studentsContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.status-pill');
      if (!pill) return;

      const studentId = pill.dataset.studentId;
      const status = pill.dataset.status; // H, S, I, A
      this.setStudentStatus(studentId, status);
    });

    // Delegated history edit & delete
    this.historyTableBody.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-session');
      const deleteBtn = e.target.closest('.btn-delete-session');

      if (editBtn) {
        const sessionId = editBtn.dataset.id;
        this.loadSessionForEditing(sessionId);
      } else if (deleteBtn) {
        const sessionId = deleteBtn.dataset.id;
        this.confirmDeleteSession(sessionId);
      }
    });
  },

  checkAndLoadExistingSession() {
    const tanggal = this.inputTanggal.value;
    const kelas = this.selectKelas.value;
    const pertemuan = this.inputPertemuan.value;

    if (!tanggal || !kelas || !pertemuan) return;

    const sessions = window.appStore.getAttendanceSessions({
      tanggal,
      kelas,
      pertemuan
    });

    if (sessions.length > 0) {
      // An existing session matches! Load it for editing
      const existing = sessions[0];
      this.enterEditMode(existing);
    } else if (this.currentSessionId) {
      this.exitEditMode();
    }
  },

  enterEditMode(session) {
    this.currentSessionId = session.id;
    this.inputTanggal.value = session.tanggal;
    this.selectKelas.value = session.kelas;
    this.inputMapel.value = session.mataPelajaran || '';
    this.inputPertemuan.value = session.pertemuan;
    this.inputJamKe.value = session.jamKe || '';
    this.inputTopik.value = session.topik || '';

    this.editingBadge.classList.remove('hidden');
    this.renderAttendanceForm(session.records);
    window.App.toast(`Memuat data absensi tersimpan (Pertemuan ${session.pertemuan} - ${session.kelas})`, 'info');
  },

  exitEditMode() {
    this.currentSessionId = null;
    this.editingBadge.classList.add('hidden');
    this.renderAttendanceForm();
  },

  loadSessionForEditing(sessionId) {
    const session = window.appStore.getAttendanceSessionById(sessionId);
    if (!session) return;

    // Switch to attendance tab if needed
    window.App.switchTab('absensi');
    this.enterEditMode(session);

    // Smooth scroll to attendance form
    document.getElementById('att-form-anchor').scrollIntoView({ behavior: 'smooth' });
  },

  renderAttendanceForm(existingRecords = null) {
    const selectedClass = this.selectKelas.value;

    if (!selectedClass) {
      this.studentsContainer.innerHTML = '';
      this.emptyState.innerHTML = `
        <svg class="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p class="text-sm font-semibold text-slate-600">Pilih Kelas Terlebih Dahulu</p>
        <p class="text-xs text-slate-400 mt-1">Pilih kelas pada filter di atas untuk menampilkan daftar presensi siswa.</p>
      `;
      this.emptyState.classList.remove('hidden');
      return;
    }

    const students = window.appStore.getStudents(selectedClass);
    // Sort alphabetically
    students.sort((a, b) => a.nama.localeCompare(b.nama));

    if (students.length === 0) {
      this.studentsContainer.innerHTML = '';
      this.emptyState.innerHTML = `
        <svg class="w-12 h-12 mx-auto text-amber-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-sm font-semibold text-slate-700">Kelas "${escapeHtml(selectedClass)}" Belum Memiliki Siswa</p>
        <p class="text-xs text-slate-400 mt-1">Silakan tambahkan siswa ke kelas ini pada menu Master Siswa atau import melalui Excel.</p>
      `;
      this.emptyState.classList.remove('hidden');
      return;
    }

    this.emptyState.classList.add('hidden');

    // Build lookup for existing records if present
    const recordMap = {};
    if (existingRecords) {
      existingRecords.forEach(r => {
        recordMap[r.studentId] = r;
      });
    }

    let html = '';
    students.forEach((student, index) => {
      const savedRecord = recordMap[student.id];
      const currentStatus = savedRecord ? savedRecord.status : ''; // 'H', 'S', 'I', 'A' or ''
      const savedKeterangan = savedRecord ? (savedRecord.keterangan || '') : '';
      const isSOrI = currentStatus === 'S' || currentStatus === 'I';

      html += `
        <div class="student-attendance-card p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm transition hover:border-slate-300" data-student-id="${student.id}" data-student-name="${escapeHtml(student.nama)}">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-mono font-medium flex items-center justify-center flex-shrink-0">
                ${index + 1}
              </span>
              <div>
                <h4 class="text-sm font-semibold text-slate-900 leading-tight">${escapeHtml(student.nama)}</h4>
                <div class="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                  <span>${student.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                  ${student.nisn ? `<span>• NISN: ${escapeHtml(student.nisn)}</span>` : ''}
                </div>
              </div>
            </div>

            <!-- H / S / I / A segmented controls -->
            <div class="flex items-center gap-1.5 self-start md:self-auto">
              <button type="button" class="status-pill px-3 py-1.5 rounded-lg text-xs font-bold border ${currentStatus === 'H' ? 'active-H' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'}" data-student-id="${student.id}" data-status="H">
                H (Hadir)
              </button>
              <button type="button" class="status-pill px-3 py-1.5 rounded-lg text-xs font-bold border ${currentStatus === 'S' ? 'active-S' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'}" data-student-id="${student.id}" data-status="S">
                S (Sakit)
              </button>
              <button type="button" class="status-pill px-3 py-1.5 rounded-lg text-xs font-bold border ${currentStatus === 'I' ? 'active-I' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-sky-50 hover:text-sky-700'}" data-student-id="${student.id}" data-status="I">
                I (Izin)
              </button>
              <button type="button" class="status-pill px-3 py-1.5 rounded-lg text-xs font-bold border ${currentStatus === 'A' ? 'active-A' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'}" data-student-id="${student.id}" data-status="A">
                A (Alpa)
              </button>
            </div>
          </div>

          <!-- Conditional Note Input for Sakit / Izin -->
          <div class="keterangan-wrapper mt-3 pt-2.5 border-t border-slate-100 ${isSOrI ? '' : 'hidden'}" id="ket-wrap-${student.id}">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex-shrink-0" id="ket-badge-${student.id}">
                ${currentStatus === 'S' ? 'Keterangan Sakit:' : 'Keterangan Izin:'}
              </span>
              <input type="text" class="input-keterangan flex-1 px-3 py-1.5 text-xs rounded-lg border border-amber-200 bg-amber-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" id="ket-input-${student.id}" placeholder="Tuliskan alasan / surat dokter / keperluan..." value="${escapeHtml(savedKeterangan)}" />
            </div>
          </div>
        </div>
      `;
    });

    this.studentsContainer.innerHTML = html;
  },

  setStudentStatus(studentId, status) {
    const card = this.studentsContainer.querySelector(`[data-student-id="${studentId}"]`);
    if (!card) return;

    // Reset pill styles for this student
    const pills = card.querySelectorAll('.status-pill');
    pills.forEach(p => {
      p.className = `status-pill px-3 py-1.5 rounded-lg text-xs font-bold border bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100`;
    });

    // Highlight active pill
    const activePill = card.querySelector(`.status-pill[data-status="${status}"]`);
    if (activePill) {
      activePill.className = `status-pill px-3 py-1.5 rounded-lg text-xs font-bold border active-${status}`;
    }

    // Toggle Keterangan input
    const ketWrap = document.getElementById(`ket-wrap-${studentId}`);
    const ketBadge = document.getElementById(`ket-badge-${studentId}`);
    const ketInput = document.getElementById(`ket-input-${studentId}`);

    if (status === 'S' || status === 'I') {
      ketWrap.classList.remove('hidden');
      ketBadge.textContent = status === 'S' ? 'Keterangan Sakit:' : 'Keterangan Izin:';
      if (!ketInput.value) {
        ketInput.focus();
      }
    } else {
      ketWrap.classList.add('hidden');
      ketInput.value = ''; // Clear note when set to Hadir or Alpa
    }
  },

  setAllStatus(status) {
    const cards = this.studentsContainer.querySelectorAll('.student-attendance-card');
    if (cards.length === 0) return;

    cards.forEach(card => {
      const studentId = card.dataset.studentId;
      if (status) {
        this.setStudentStatus(studentId, status);
      } else {
        // Reset all
        const pills = card.querySelectorAll('.status-pill');
        pills.forEach(p => {
          p.className = `status-pill px-3 py-1.5 rounded-lg text-xs font-bold border bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100`;
        });
        const ketWrap = document.getElementById(`ket-wrap-${studentId}`);
        const ketInput = document.getElementById(`ket-input-${studentId}`);
        if (ketWrap) ketWrap.classList.add('hidden');
        if (ketInput) ketInput.value = '';
      }
    });

    if (status === 'H') {
      window.App.toast('Semua siswa ditandai Hadir (H)', 'info');
    }
  },

  saveAttendance() {
    const tanggal = this.inputTanggal.value;
    const kelas = this.selectKelas.value;
    const mataPelajaran = this.inputMapel.value.trim();
    const pertemuan = Number(this.inputPertemuan.value) || 1;
    const jamKe = this.inputJamKe.value.trim();
    const topik = this.inputTopik.value.trim();

    if (!kelas) {
      window.App.toast('Pilih kelas terlebih dahulu', 'error');
      this.selectKelas.focus();
      return;
    }

    if (!tanggal) {
      window.App.toast('Tanggal sesi absensi wajib diisi', 'error');
      this.inputTanggal.focus();
      return;
    }

    const cards = this.studentsContainer.querySelectorAll('.student-attendance-card');
    if (cards.length === 0) {
      window.App.toast('Tidak ada siswa di kelas ini untuk diabsen', 'warning');
      return;
    }

    const records = [];
    let hasUnselected = false;

    cards.forEach(card => {
      const studentId = card.dataset.studentId;
      const studentName = card.dataset.studentName;

      // Check which status pill is active
      const activePill = card.querySelector('.status-pill[class*="active-"]');
      const status = activePill ? activePill.dataset.status : null;

      if (!status) {
        hasUnselected = true;
      }

      const ketInput = document.getElementById(`ket-input-${studentId}`);
      const keterangan = ketInput ? ketInput.value.trim() : '';

      records.push({
        studentId,
        nama: studentName,
        status: status || 'A', // Defaults unselected to Alpa if submitted
        keterangan: (status === 'S' || status === 'I') ? keterangan : ''
      });
    });

    if (hasUnselected) {
      window.App.confirmModal({
        title: 'Ada Siswa Belum Diisi Statusnya',
        message: 'Beberapa siswa belum dipilih status kehadirannya. Siswa tersebut akan otomatis dianggap Alpa (A). Lanjutkan menyimpan?',
        confirmText: 'Ya, Simpan',
        confirmClass: 'bg-indigo-600 hover:bg-indigo-700',
        onConfirm: () => {
          this.commitSave({
            id: this.currentSessionId,
            tanggal,
            kelas,
            mataPelajaran,
            pertemuan,
            jamKe,
            topik,
            records
          });
        }
      });
      return;
    }

    this.commitSave({
      id: this.currentSessionId,
      tanggal,
      kelas,
      mataPelajaran,
      pertemuan,
      jamKe,
      topik,
      records
    });
  },

  commitSave(sessionPayload) {
    window.appStore.saveAttendanceSession(sessionPayload);
    window.App.toast(`Absensi ${sessionPayload.kelas} (Pertemuan ${sessionPayload.pertemuan}) berhasil disimpan!`, 'success');

    this.exitEditMode();
    this.renderSessionHistory();

    // Auto increment pertemuan for next session
    this.inputPertemuan.value = sessionPayload.pertemuan + 1;
  },

  renderSessionHistory() {
    const sessions = window.appStore.getAttendanceSessions();

    if (this.historyCountBadge) {
      this.historyCountBadge.textContent = `${sessions.length} Sesi Tercatat`;
    }

    if (sessions.length === 0) {
      this.historyTableBody.innerHTML = '';
      this.historyEmptyState.classList.remove('hidden');
      return;
    }

    this.historyEmptyState.classList.add('hidden');

    // Sort by date desc, then meeting desc
    sessions.sort((a, b) => {
      if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return b.pertemuan - a.pertemuan;
    });

    let html = '';
    sessions.forEach((s) => {
      // Calculate summary
      let hCount = 0, sCount = 0, iCount = 0, aCount = 0;
      (s.records || []).forEach(r => {
        if (r.status === 'H') hCount++;
        else if (r.status === 'S') sCount++;
        else if (r.status === 'I') iCount++;
        else if (r.status === 'A') aCount++;
      });

      html += `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="px-4 py-3 font-mono text-xs text-slate-700">${escapeHtml(s.tanggal)}</td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              ${escapeHtml(s.kelas)}
            </span>
          </td>
          <td class="px-4 py-3 text-center text-xs font-semibold text-slate-700">Ke-${s.pertemuan}</td>
          <td class="px-4 py-3 text-xs text-slate-600">${escapeHtml(s.mataPelajaran || '-')}</td>
          <td class="px-4 py-3 text-xs text-slate-500 truncate max-w-xs">${escapeHtml(s.topik || '-')}</td>
          <td class="px-4 py-3 text-center">
            <div class="inline-flex items-center gap-1 text-xs font-mono font-medium">
              <span class="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">H:${hCount}</span>
              <span class="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">S:${sCount}</span>
              <span class="text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">I:${iCount}</span>
              <span class="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">A:${aCount}</span>
            </div>
          </td>
          <td class="px-4 py-3 text-right space-x-1">
            <button class="btn-edit-session inline-flex items-center px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-sm" data-id="${s.id}" title="Edit Sesi">
              <svg class="w-3.5 h-3.5 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
            <button class="btn-delete-session inline-flex items-center px-2.5 py-1 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition shadow-sm" data-id="${s.id}" title="Hapus Sesi">
              <svg class="w-3.5 h-3.5 mr-1 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Hapus
            </button>
          </td>
        </tr>
      `;
    });

    this.historyTableBody.innerHTML = html;
  },

  confirmDeleteSession(sessionId) {
    const session = window.appStore.getAttendanceSessionById(sessionId);
    if (!session) return;

    window.App.confirmModal({
      title: 'Hapus Sesi Absensi?',
      message: `Hapus sesi absensi kelas ${session.kelas} tanggal ${session.tanggal} (Pertemuan ${session.pertemuan})? Data kehadiran di sesi ini akan terhapus.`,
      confirmText: 'Ya, Hapus Sesi',
      confirmClass: 'bg-rose-600 hover:bg-rose-700',
      onConfirm: () => {
        window.appStore.deleteAttendanceSession(sessionId);
        window.App.toast('Sesi absensi berhasil dihapus', 'info');
      }
    });
  }
};
