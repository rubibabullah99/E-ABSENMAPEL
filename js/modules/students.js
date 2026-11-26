/**
 * Module: Master Data Siswa + Template & Import Excel (.xlsx)
 * Handles student management, Excel template download, and Excel batch import.
 * ZERO initial dummy students!
 */

window.StudentsModule = {
  init() {
    this.cacheDOM();
    this.bindEvents();
    this.sanitizeLoadedStudents();
    this.refreshClassDropdowns();
    this.renderStudentList();

    // Subscribe to state updates
    window.appStore.subscribe('classes_updated', () => {
      this.refreshClassDropdowns();
      this.renderStudentList();
    });
    window.appStore.subscribe('students_updated', () => {
      this.renderStudentList();
    });
  },

  sanitizeLoadedStudents() {
    let students = window.appStore.getStudents();
    let changed = false;
    students = students.map(s => {
      if (s.nis === 'L' || s.nis === 'P' || (s.nis && s.nis.toUpperCase() === s.jenisKelamin && s.nis.length === 1)) {
        changed = true;
        return { ...s, nis: '' };
      }
      return s;
    });
    if (changed) {
      localStorage.setItem('e_absen_students', JSON.stringify(students));
    }
  },

  cacheDOM() {
    this.form = document.getElementById('student-add-form');
    this.inputNama = document.getElementById('student-nama-input');
    this.inputJk = document.getElementById('student-jk-input');
    this.inputNisn = document.getElementById('student-nisn-input');
    this.inputNis = document.getElementById('student-nis-input');
    this.selectKelas = document.getElementById('student-kelas-select');

    this.tableBody = document.getElementById('student-table-body');
    this.emptyState = document.getElementById('student-empty-state');
    this.studentCountBadge = document.getElementById('student-count-badge');

    // Filter controls
    this.filterKelas = document.getElementById('student-filter-kelas');
    this.filterJk = document.getElementById('student-filter-jk');
    this.filterSearch = document.getElementById('student-filter-search');

    // Excel buttons
    this.btnDownloadTemplate = document.getElementById('btn-download-excel-template');
    this.excelFileInput = document.getElementById('excel-file-import-input');
    this.btnTriggerImport = document.getElementById('btn-trigger-excel-import');
    this.btnExportFiltered = document.getElementById('btn-export-filtered-excel');
  },

  bindEvents() {
    // Add student form submit
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddStudent();
    });

    // Filters
    this.filterKelas.addEventListener('change', () => this.renderStudentList());
    if (this.filterJk) {
      this.filterJk.addEventListener('change', () => this.renderStudentList());
    }
    this.filterSearch.addEventListener('input', () => this.renderStudentList());

    // Export Filtered Excel button
    if (this.btnExportFiltered) {
      this.btnExportFiltered.addEventListener('click', () => {
        this.exportFilteredExcel();
      });
    }

    // Download Excel Template button
    this.btnDownloadTemplate.addEventListener('click', () => {
      this.downloadExcelTemplate();
    });

    // Trigger file chooser for Excel import
    this.btnTriggerImport.addEventListener('click', () => {
      this.excelFileInput.value = '';
      this.excelFileInput.click();
    });

    // Handle selected Excel file
    this.excelFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      this.handleImportExcelFile(file);
    });

    // Delegated edit & delete clicks
    this.tableBody.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-student');
      const deleteBtn = e.target.closest('.btn-delete-student');

      if (editBtn) {
        const id = editBtn.dataset.id;
        this.openEditModal(id);
      } else if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        this.confirmDeleteStudent(id);
      }
    });
  },

  refreshClassDropdowns() {
    const classes = window.appStore.getClasses();
    const currentSelectVal = this.selectKelas.value;
    const currentFilterVal = this.filterKelas.value;

    // Populate Add Form class dropdown
    let optionsForm = '<option value="">-- Pilih Kelas --</option>';
    classes.forEach(c => {
      optionsForm += `<option value="${escapeHtml(c.nama)}">${escapeHtml(c.nama)}</option>`;
    });
    this.selectKelas.innerHTML = optionsForm;
    if (classes.some(c => c.nama === currentSelectVal)) {
      this.selectKelas.value = currentSelectVal;
    }

    // Populate Filter class dropdown
    let optionsFilter = '<option value="">Semua Kelas</option>';
    classes.forEach(c => {
      optionsFilter += `<option value="${escapeHtml(c.nama)}">${escapeHtml(c.nama)}</option>`;
    });
    this.filterKelas.innerHTML = optionsFilter;
    if (classes.some(c => c.nama === currentFilterVal)) {
      this.filterKelas.value = currentFilterVal;
    }
  },

  handleAddStudent() {
    const nama = this.inputNama.value.trim();
    const jenisKelamin = this.inputJk.value;
    const nisn = this.inputNisn.value.trim();
    const nis = this.inputNis.value.trim();
    const kelas = this.selectKelas.value;

    if (!nama) {
      window.App.toast('Nama lengkap siswa wajib diisi', 'error');
      this.inputNama.focus();
      return;
    }

    if (!jenisKelamin) {
      window.App.toast('Pilih jenis kelamin (L atau P)', 'error');
      this.inputJk.focus();
      return;
    }

    if (!kelas) {
      window.App.toast('Pilih kelas untuk siswa ini. Tambah kelas terlebih dahulu jika belum ada.', 'warning');
      this.selectKelas.focus();
      return;
    }

    window.appStore.addStudent({
      nama,
      jenisKelamin,
      nisn,
      nis,
      kelas
    });

    window.App.toast(`Siswa "${nama}" berhasil ditambahkan`, 'success');

    // Reset inputs except class for faster batch entry
    this.inputNama.value = '';
    this.inputNisn.value = '';
    this.inputNis.value = '';
    this.inputNama.focus();
  },

  getFilteredStudents() {
    let students = window.appStore.getStudents();

    // Apply Filter by class
    const selectedClass = this.filterKelas ? this.filterKelas.value : '';
    if (selectedClass) {
      students = students.filter(s => s.kelas.toLowerCase() === selectedClass.toLowerCase());
    }

    // Apply Filter by Gender (L / P)
    const selectedJk = this.filterJk ? this.filterJk.value : '';
    if (selectedJk) {
      students = students.filter(s => s.jenisKelamin === selectedJk);
    }

    // Apply Filter by search query
    const searchQuery = this.filterSearch ? this.filterSearch.value.trim().toLowerCase() : '';
    if (searchQuery) {
      students = students.filter(s =>
        s.nama.toLowerCase().includes(searchQuery) ||
        (s.nisn && s.nisn.toLowerCase().includes(searchQuery)) ||
        (s.nis && s.nis.toLowerCase().includes(searchQuery)) ||
        s.kelas.toLowerCase().includes(searchQuery)
      );
    }

    // Sort students alphabetically by name
    students.sort((a, b) => a.nama.localeCompare(b.nama));
    return students;
  },

  renderStudentList() {
    const totalStudents = window.appStore.getStudents().length;
    const students = this.getFilteredStudents();

    const selectedClass = this.filterKelas ? this.filterKelas.value : '';
    const selectedJk = this.filterJk ? this.filterJk.value : '';
    const searchQuery = this.filterSearch ? this.filterSearch.value.trim() : '';
    const isFiltered = Boolean(selectedClass || selectedJk || searchQuery);

    if (this.studentCountBadge) {
      if (isFiltered) {
        this.studentCountBadge.textContent = `${students.length} dari ${totalStudents} Siswa`;
      } else {
        this.studentCountBadge.textContent = `${totalStudents} Siswa Terdaftar`;
      }
    }

    if (totalStudents === 0) {
      this.tableBody.innerHTML = '';
      this.emptyState.classList.remove('hidden');
      return;
    }

    this.emptyState.classList.add('hidden');

    if (students.length === 0) {
      let filterDetails = [];
      if (selectedClass) filterDetails.push(`Kelas: ${selectedClass}`);
      if (selectedJk) filterDetails.push(`Gender: ${selectedJk === 'L' ? 'Laki-laki' : 'Perempuan'}`);
      if (searchQuery) filterDetails.push(`Cari: "${searchQuery}"`);

      this.tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-4 py-8 text-center text-slate-400 text-sm">
            Tidak ada siswa yang cocok dengan filter (${escapeHtml(filterDetails.join(', '))}).
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    students.forEach((item, index) => {
      const jkBadge = item.jenisKelamin === 'L'
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">L</span>`
        : `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">P</span>`;

      html += `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="px-4 py-3 text-center text-xs text-slate-400 font-mono">${index + 1}</td>
          <td class="px-4 py-3 font-medium text-slate-900">${escapeHtml(item.nama)}</td>
          <td class="px-4 py-3 text-center">${jkBadge}</td>
          <td class="px-4 py-3 font-mono text-xs text-slate-600">${escapeHtml(item.nisn || '-')}</td>
          <td class="px-4 py-3 font-mono text-xs text-slate-600">${escapeHtml(item.nis || '-')}</td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              ${escapeHtml(item.kelas)}
            </span>
          </td>
          <td class="px-4 py-3 text-right space-x-1">
            <button class="btn-edit-student inline-flex items-center px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-sm" data-id="${item.id}" title="Edit Siswa">
              <svg class="w-3.5 h-3.5 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
            <button class="btn-delete-student inline-flex items-center px-2.5 py-1 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition shadow-sm" data-id="${item.id}" title="Hapus Siswa">
              <svg class="w-3.5 h-3.5 mr-1 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Hapus
            </button>
          </td>
        </tr>
      `;
    });

    this.tableBody.innerHTML = html;
  },

  openEditModal(studentId) {
    const students = window.appStore.getStudents();
    const item = students.find(s => s.id === studentId);
    if (!item) return;

    const classes = window.appStore.getClasses();
    let classOptions = '';
    classes.forEach(c => {
      const selected = c.nama === item.kelas ? 'selected' : '';
      classOptions += `<option value="${escapeHtml(c.nama)}" ${selected}>${escapeHtml(c.nama)}</option>`;
    });

    const modalContent = `
      <form id="edit-student-form" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Nama Lengkap *</label>
          <input type="text" id="modal-edit-std-nama" value="${escapeHtml(item.nama)}" required class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Jenis Kelamin *</label>
            <select id="modal-edit-std-jk" required class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="L" ${item.jenisKelamin === 'L' ? 'selected' : ''}>Laki-laki (L)</option>
              <option value="P" ${item.jenisKelamin === 'P' ? 'selected' : ''}>Perempuan (P)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Kelas *</label>
            <select id="modal-edit-std-kelas" required class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              ${classOptions}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">NISN (Opsional)</label>
            <input type="text" id="modal-edit-std-nisn" value="${escapeHtml(item.nisn || '')}" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">NIS (Opsional)</label>
            <input type="text" id="modal-edit-std-nis" value="${escapeHtml(item.nis || '')}" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" class="btn-modal-cancel px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Batal</button>
          <button type="submit" class="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">Simpan Perubahan</button>
        </div>
      </form>
    `;

    window.App.customModal({
      title: 'Edit Data Siswa',
      bodyHtml: modalContent,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#edit-student-form');
        const inputNama = modalEl.querySelector('#modal-edit-std-nama');
        const inputJk = modalEl.querySelector('#modal-edit-std-jk');
        const inputKelas = modalEl.querySelector('#modal-edit-std-kelas');
        const inputNisn = modalEl.querySelector('#modal-edit-std-nisn');
        const inputNis = modalEl.querySelector('#modal-edit-std-nis');

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const newNama = inputNama.value.trim();
          if (!newNama) {
            window.App.toast('Nama siswa tidak boleh kosong', 'error');
            return;
          }

          window.appStore.updateStudent(studentId, {
            nama: newNama,
            jenisKelamin: inputJk.value,
            kelas: inputKelas.value,
            nisn: inputNisn.value.trim(),
            nis: inputNis.value.trim()
          });

          window.App.toast('Data siswa berhasil diperbarui', 'success');
          window.App.closeModal();
        });
      }
    });
  },

  confirmDeleteStudent(studentId) {
    const students = window.appStore.getStudents();
    const item = students.find(s => s.id === studentId);
    if (!item) return;

    window.App.confirmModal({
      title: 'Hapus Siswa?',
      message: `Apakah Anda yakin ingin menghapus data siswa "${item.nama}" (${item.kelas})?`,
      confirmText: 'Ya, Hapus Siswa',
      confirmClass: 'bg-rose-600 hover:bg-rose-700',
      onConfirm: () => {
        window.appStore.deleteStudent(studentId);
        window.App.toast(`Siswa "${item.nama}" telah dihapus`, 'info');
      }
    });
  },

  /* ================= EXCEL TEMPLATE DOWNLOAD (ZERO DUMMY DATA) ================= */
  downloadExcelTemplate() {
    if (typeof XLSX === 'undefined') {
      window.App.toast('Pustaka SheetJS belum termuat. Pastikan terhubung internet.', 'error');
      return;
    }

    // STRICT ATURAN MUTLAK: ZERO DUMMY DATA. Only the header row!
    const headers = [['No', 'Nama Lengkap', 'Jenis Kelamin', 'NISN', 'NIS', 'Kelas']];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 30 }, // Nama Lengkap
      { wch: 15 }, // Jenis Kelamin (L/P)
      { wch: 18 }, // NISN
      { wch: 15 }, // NIS
      { wch: 15 }  // Kelas
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    XLSX.writeFile(wb, 'Template_Master_Siswa.xlsx');

    window.App.toast('Template Excel berhasil diunduh', 'success');
  },

  /* ================= EXPORT DATA SISWA SESUAI FILTER KE EXCEL (.XLSX) ================= */
  exportFilteredExcel() {
    if (typeof XLSX === 'undefined') {
      window.App.toast('Pustaka SheetJS belum termuat.', 'error');
      return;
    }

    const students = this.getFilteredStudents();
    if (students.length === 0) {
      window.App.toast('Tidak ada data siswa yang cocok dengan filter untuk diunduh.', 'warning');
      return;
    }

    const headers = [['No', 'Nama Lengkap', 'Jenis Kelamin', 'NISN', 'NIS', 'Kelas']];
    const rows = students.map((s, idx) => [
      idx + 1,
      s.nama,
      s.jenisKelamin === 'L' ? 'L' : 'P',
      s.nisn || '-',
      s.nis || '-',
      s.kelas
    ]);

    const aoaData = [...headers, ...rows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoaData);

    // Set readable column widths
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 32 }, // Nama Lengkap
      { wch: 15 }, // Jenis Kelamin
      { wch: 18 }, // NISN
      { wch: 16 }, // NIS
      { wch: 16 }  // Kelas
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');

    // Generate informative file name based on active filter
    const selectedClass = this.filterKelas ? this.filterKelas.value : '';
    const selectedJk = this.filterJk ? this.filterJk.value : '';

    const nameParts = ['Data_Siswa'];
    if (selectedClass) {
      nameParts.push(selectedClass.replace(/[^a-zA-Z0-9]/g, '_'));
    } else {
      nameParts.push('Semua_Kelas');
    }

    if (selectedJk === 'L') {
      nameParts.push('Laki_Laki');
    } else if (selectedJk === 'P') {
      nameParts.push('Perempuan');
    }

    const fileName = `${nameParts.join('_')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    window.App.toast(`Berhasil mengunduh ${students.length} data siswa (.xlsx)`, 'success');
  },

  /* ================= EXCEL IMPORT ================= */
  handleImportExcelFile(file) {
    if (typeof XLSX === 'undefined') {
      window.App.toast('Pustaka SheetJS belum termuat.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length < 2) {
          window.App.toast('File Excel kosong atau hanya berisi baris header.', 'warning');
          return;
        }

        const headerRow = rawJson[0].map(h => String(h || '').trim().toLowerCase());

        // Find index of expected columns with strict collision prevention
        const idxNama = headerRow.findIndex(h => h.includes('nama'));
        const idxJk = headerRow.findIndex(h => 
          h.includes('kelamin') || h.includes('gender') || h === 'jk' || h === 'l/p' || h === 'lp' || h === 'sex'
        );
        const idxNisn = headerRow.findIndex(h => h.includes('nisn'));
        
        // IMPORTANT: Must explicitly exclude 'jenis' and 'nisn' so 'jenis kelamin' is never matched as NIS!
        const idxNis = headerRow.findIndex(h => 
          !h.includes('jenis') && 
          !h.includes('nisn') && 
          (
            h === 'nis' || 
            h === 'no induk' || 
            h === 'nomor induk' || 
            h.includes('nomor induk') || 
            h.includes('no induk') || 
            h.startsWith('nis ') || 
            h.endsWith(' nis') ||
            (h.includes('nis') && !h.includes('jenis'))
          )
        );
        const idxKelas = headerRow.findIndex(h => h.includes('kelas') || h.includes('rombel'));

        if (idxNama === -1 || idxKelas === -1) {
          window.App.toast('Format Excel tidak valid! Kolom "Nama Lengkap" dan "Kelas" wajib ada.', 'error');
          return;
        }

        const validStudents = [];
        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.length === 0) continue;

          const rawNama = row[idxNama] ? String(row[idxNama]).trim() : '';
          const rawKelas = row[idxKelas] ? String(row[idxKelas]).trim() : '';

          if (!rawNama || !rawKelas) continue; // skip blank rows

          let rawJk = 'L';
          if (idxJk !== -1 && row[idxJk]) {
            const jkVal = String(row[idxJk]).trim().toUpperCase();
            if (jkVal.startsWith('P') || jkVal.includes('PEREMPUAN') || jkVal.includes('WANITA')) {
              rawJk = 'P';
            }
          }

          const rawNisn = idxNisn !== -1 && row[idxNisn] ? String(row[idxNisn]).trim() : '';
          let rawNis = idxNis !== -1 && row[idxNis] ? String(row[idxNis]).trim() : '';
          
          // Safety check: if rawNis is accidentally just 'L' or 'P' (matching gender single-char), treat as empty
          if (rawNis === 'L' || rawNis === 'P' || (rawNis.length === 1 && rawNis.toUpperCase() === rawJk)) {
            rawNis = '';
          }

          validStudents.push({
            nama: rawNama,
            jenisKelamin: rawJk,
            nisn: rawNisn,
            nis: rawNis,
            kelas: rawKelas
          });
        }

        if (validStudents.length === 0) {
          window.App.toast('Tidak ada baris data siswa yang valid ditemukan dalam file.', 'warning');
          return;
        }

        // Import into store
        const result = window.appStore.importStudents(validStudents);

        let msg = `Berhasil mengimpor ${result.totalImported} data siswa!`;
        if (result.newClassesCount > 0) {
          msg += ` (${result.newClassesCount} kelas baru otomatis dibuat).`;
        }

        window.App.toast(msg, 'success');
      } catch (err) {
        console.error('Error importing Excel:', err);
        window.App.toast('Gagal memproses file Excel: ' + err.message, 'error');
      }
    };

    reader.readAsArrayBuffer(file);
  }
};
