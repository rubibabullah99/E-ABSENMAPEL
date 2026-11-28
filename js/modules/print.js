/**
 * Module: Cetak A4 / F4 & Pratinjau Dokumen Cetak
 * Renders official Kop Sekolah, Identity block, Attendance Matrix, Notes, and Signatures block.
 */

window.PrintModule = {
  currentPaperSize: 'a4-portrait', // a4-portrait (default), f4-portrait, a4-landscape, f4-landscape

  init() {
    this.cacheDOM();
    if (this.selectPaperSize) {
      this.selectPaperSize.value = this.currentPaperSize;
    }
    this.bindEvents();
    this.refreshClassDropdown();
    this.setDefaultMonth();
    this.renderPrintPreview();

    // Subscribe to state updates
    window.appStore.subscribe('all_updated', () => {
      this.refreshClassDropdown();
      this.renderPrintPreview();
    });
    window.appStore.subscribe('settings_updated', () => {
      this.renderPrintPreview();
    });
    window.appStore.subscribe('attendance_updated', () => {
      this.renderPrintPreview();
    });
    window.appStore.subscribe('classes_updated', () => {
      this.refreshClassDropdown();
      this.renderPrintPreview();
    });
    window.appStore.subscribe('students_updated', () => {
      this.renderPrintPreview();
    });
  },

  cacheDOM() {
    this.selectKelas = document.getElementById('print-select-kelas');
    this.selectPaperSize = document.getElementById('print-select-paper');
    this.selectPeriod = document.getElementById('print-select-period'); // 'all', 'bulanan'
    this.inputBulan = document.getElementById('print-input-bulan');
    this.monthFilterWrapper = document.getElementById('print-month-filter-wrap');

    this.sheetContainer = document.getElementById('print-paper-sheet');
    this.btnPrintAction = document.getElementById('btn-trigger-print');
    this.emptyState = document.getElementById('print-empty-state');
  },

  setDefaultMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    this.inputBulan.value = `${year}-${month}`;
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
    } else if (classes.length > 0 && !currentVal) {
      this.selectKelas.value = classes[0].nama;
    }
  },

  bindEvents() {
    this.selectKelas.addEventListener('change', () => this.renderPrintPreview());
    this.inputBulan.addEventListener('change', () => this.renderPrintPreview());

    this.selectPeriod.addEventListener('change', () => {
      if (this.selectPeriod.value === 'bulanan') {
        this.monthFilterWrapper.classList.remove('hidden');
      } else {
        this.monthFilterWrapper.classList.add('hidden');
      }
      this.renderPrintPreview();
    });

    this.selectPaperSize.addEventListener('change', () => {
      this.currentPaperSize = this.selectPaperSize.value;
      this.updatePaperSizeClass();
    });

    this.btnPrintAction.addEventListener('click', () => {
      this.triggerPrint();
    });
  },

  updatePaperSizeClass() {
    // Remove old classes
    this.sheetContainer.classList.remove(
      'paper-a4-landscape', 'paper-a4-portrait',
      'paper-f4-landscape', 'paper-f4-portrait'
    );
    this.sheetContainer.classList.add(`paper-${this.currentPaperSize}`);
    document.body.setAttribute('data-paper', this.currentPaperSize);
  },

  triggerPrint() {
    // Inject dynamic @page style for selected paper size
    let pageCss = '';
    if (this.currentPaperSize === 'a4-landscape') {
      pageCss = '@page { size: A4 landscape; margin: 1cm; }';
    } else if (this.currentPaperSize === 'a4-portrait') {
      pageCss = '@page { size: A4 portrait; margin: 1.2cm; }';
    } else if (this.currentPaperSize === 'f4-landscape') {
      pageCss = '@page { size: 330mm 215mm; margin: 1cm; }';
    } else if (this.currentPaperSize === 'f4-portrait') {
      pageCss = '@page { size: 215mm 330mm; margin: 1.2cm; }';
    }

    let styleEl = document.getElementById('dynamic-print-page-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-print-page-style';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = pageCss;

    window.print();
  },

  renderPrintPreview() {
    this.updatePaperSizeClass();

    const selectedClass = this.selectKelas.value;
    const settings = window.appStore.getSettings();

    if (!selectedClass) {
      this.sheetContainer.classList.add('hidden');
      this.emptyState.classList.remove('hidden');
      return;
    }

    const students = window.appStore.getStudents(selectedClass);
    // Filter sessions
    let sessions = window.appStore.getAttendanceSessions({ kelas: selectedClass });
    if (this.selectPeriod.value === 'bulanan' && this.inputBulan.value) {
      sessions = sessions.filter(s => s.tanggal.startsWith(this.inputBulan.value));
    }

    // Sort
    students.sort((a, b) => a.nama.localeCompare(b.nama));
    sessions.sort((a, b) => {
      if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
      return a.pertemuan - b.pertemuan;
    });

    this.emptyState.classList.add('hidden');
    this.sheetContainer.classList.remove('hidden');

    // 1. Render Kop Sekolah
    const kopHtml = this.generateKopHtml(settings);

    // 2. Render Identity / Meta Box
    const metaHtml = this.generateMetaHtml(settings, selectedClass, sessions);

    // 3. Render Matrix Table
    const tableHtml = this.generateTableHtml(students, sessions);

    // 4. Render Notes (Sakit & Izin)
    const notesHtml = this.generateNotesHtml(sessions);

    // 5. Render Signature Block
    const signatureHtml = this.generateSignatureHtml(settings);

    this.sheetContainer.innerHTML = `
      ${kopHtml}
      ${metaHtml}
      <div class="my-3 overflow-x-auto">
        ${tableHtml}
      </div>
      ${notesHtml}
      <div class="mt-8 pt-4">
        ${signatureHtml}
      </div>
    `;
  },

  generateKopHtml(settings) {
    const kopImg = settings.kopImage || settings.logo;
    if (!kopImg) {
      return `
        <div class="text-center py-2 border-b border-dashed border-slate-300 mb-4 text-xs text-slate-400 font-mono">
          -
        </div>
      `;
    }

    return `
      <div class="print-kop-wrapper mb-3 text-center">
        <img src="${kopImg}" alt="Kop Surat Resmi Sekolah" class="w-full object-contain max-h-36 mx-auto block" />
      </div>
    `;
  },

  generateMetaHtml(settings, selectedClass, sessions) {
    let periodText = 'Semua Pertemuan';
    if (this.selectPeriod.value === 'bulanan' && this.inputBulan.value) {
      const parts = this.inputBulan.value.split('-');
      const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      periodText = `Bulan ${monthNames[parseInt(parts[1], 10)]} ${parts[0]}`;
    }

    return `
      <div class="text-center mb-3">
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900">REKAPITULASI PRESENSI SISWA</h3>
        <p class="text-xs text-slate-600 font-medium">Periode: ${periodText}</p>
      </div>

      <div class="grid grid-cols-2 text-xs text-slate-800 mb-3 gap-y-1 font-sans">
        <div>
          <div><span class="inline-block w-28 text-slate-600">Mata Pelajaran</span>: <strong>${escapeHtml(settings.mataPelajaran || '-')}</strong></div>
          <div><span class="inline-block w-28 text-slate-600">Kelas</span>: <strong>${escapeHtml(selectedClass)}</strong></div>
        </div>
        <div>
          <div><span class="inline-block w-28 text-slate-600">Tahun Ajaran</span>: <strong>${escapeHtml(settings.tahunAjaran || '-')}</strong></div>
          <div><span class="inline-block w-28 text-slate-600">Semester</span>: <strong>${escapeHtml(settings.semester || '-')}</strong></div>
        </div>
      </div>
    `;
  },

  generateTableHtml(students, sessions) {
    if (students.length === 0) {
      return `<div class="p-4 text-center text-xs text-slate-400 border border-slate-200">Belum ada siswa terdaftar di kelas ini.</div>`;
    }

    let thCols = `
      <th class="px-2 py-1 text-center font-bold text-xs border border-black bg-slate-100 w-8">No</th>
      <th class="px-2 py-1 text-left font-bold text-xs border border-black bg-slate-100 min-w-[160px]">Nama Lengkap Siswa</th>
      <th class="px-1 py-1 text-center font-bold text-xs border border-black bg-slate-100 w-8">L/P</th>
    `;

    sessions.forEach(s => {
      const tglFormatted = s.tanggal.split('-').slice(1).join('/');
      thCols += `
        <th class="px-1 py-1 text-center text-[10px] font-bold border border-black bg-slate-100 min-w-[28px]">
          <div>P${s.pertemuan}</div>
          <div class="text-[9px] font-normal">${tglFormatted}</div>
        </th>
      `;
    });

    thCols += `
      <th class="px-1 py-1 text-center font-bold text-xs border border-black bg-slate-100 w-7">H</th>
      <th class="px-1 py-1 text-center font-bold text-xs border border-black bg-slate-100 w-7">S</th>
      <th class="px-1 py-1 text-center font-bold text-xs border border-black bg-slate-100 w-7">I</th>
      <th class="px-1 py-1 text-center font-bold text-xs border border-black bg-slate-100 w-7">A</th>
      <th class="px-1 py-1 text-center font-bold text-xs border border-black bg-slate-100 w-11">%</th>
    `;

    let trRows = '';
    students.forEach((student, index) => {
      let hCount = 0, sCount = 0, iCount = 0, aCount = 0;
      let sessionCells = '';

      sessions.forEach(s => {
        const record = (s.records || []).find(r => r.studentId === student.id);
        const status = record ? record.status : '-';
        if (status === 'H') hCount++;
        else if (status === 'S') sCount++;
        else if (status === 'I') iCount++;
        else if (status === 'A') aCount++;

        sessionCells += `<td class="px-1 py-0.5 text-center text-xs font-semibold border border-black">${status}</td>`;
      });

      const total = hCount + sCount + iCount + aCount;
      const pct = total > 0 ? Math.round((hCount / total) * 100) : 0;

      trRows += `
        <tr>
          <td class="px-2 py-0.5 text-center text-xs font-mono border border-black">${index + 1}</td>
          <td class="px-2 py-0.5 text-xs font-medium border border-black">${escapeHtml(student.nama)}</td>
          <td class="px-1 py-0.5 text-center text-xs border border-black">${student.jenisKelamin}</td>
          ${sessionCells}
          <td class="px-1 py-0.5 text-center text-xs font-bold border border-black">${hCount}</td>
          <td class="px-1 py-0.5 text-center text-xs font-bold border border-black">${sCount}</td>
          <td class="px-1 py-0.5 text-center text-xs font-bold border border-black">${iCount}</td>
          <td class="px-1 py-0.5 text-center text-xs font-bold border border-black">${aCount}</td>
          <td class="px-1 py-0.5 text-center text-xs font-bold border border-black">${pct}%</td>
        </tr>
      `;
    });

    return `
      <table class="table-print w-full border-collapse border border-black">
        <thead>
          <tr>${thCols}</tr>
        </thead>
        <tbody>
          ${trRows}
        </tbody>
      </table>
    `;
  },

  generateNotesHtml(sessions) {
    const notes = [];
    sessions.forEach(s => {
      (s.records || []).forEach(r => {
        if ((r.status === 'S' || r.status === 'I') && r.keterangan) {
          notes.push({
            tanggal: s.tanggal,
            pertemuan: s.pertemuan,
            nama: r.nama,
            status: r.status === 'S' ? 'Sakit' : 'Izin',
            keterangan: r.keterangan
          });
        }
      });
    });

    if (notes.length === 0) return '';

    let rows = '';
    notes.forEach((item, idx) => {
      rows += `
        <tr>
          <td class="px-2 py-0.5 text-center text-xs border border-black w-8">${idx + 1}</td>
          <td class="px-2 py-0.5 text-xs border border-black w-28">${item.tanggal} (P-${item.pertemuan})</td>
          <td class="px-2 py-0.5 text-xs font-medium border border-black w-48">${escapeHtml(item.nama)}</td>
          <td class="px-2 py-0.5 text-center text-xs font-semibold border border-black w-16">${item.status}</td>
          <td class="px-2 py-0.5 text-xs border border-black">${escapeHtml(item.keterangan)}</td>
        </tr>
      `;
    });

    return `
      <div class="mt-4">
        <h4 class="text-xs font-bold uppercase tracking-wider mb-1 text-slate-900">Catatan Keterangan Sakit & Izin:</h4>
        <table class="table-print w-full border-collapse border border-black text-xs">
          <thead>
            <tr class="bg-slate-100">
              <th class="px-2 py-1 text-center font-bold border border-black">No</th>
              <th class="px-2 py-1 text-left font-bold border border-black">Tanggal</th>
              <th class="px-2 py-1 text-left font-bold border border-black">Nama Siswa</th>
              <th class="px-2 py-1 text-center font-bold border border-black">Status</th>
              <th class="px-2 py-1 text-left font-bold border border-black">Keterangan / Alasan</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  },

  generateSignatureHtml(settings) {
    const kota = settings.kotaDokumen || '..................';
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return `
      <div class="grid grid-cols-2 text-xs text-slate-900 leading-normal">
        <!-- Kepala Sekolah -->
        <div class="text-center">
          <p>Mengetahui,</p>
          <p class="font-semibold">Kepala Sekolah</p>
          <div class="h-20"></div>
          <p class="font-bold underline uppercase">${escapeHtml(settings.namaKepsek || '( .............................................. )')}</p>
          <p>NIP. ${escapeHtml(settings.nipKepsek || '..............................................')}</p>
        </div>

        <!-- Guru Mata Pelajaran -->
        <div class="text-center">
          <p>${escapeHtml(kota)}, ${today}</p>
          <p class="font-semibold">Guru Mata Pelajaran</p>
          <div class="h-20"></div>
          <p class="font-bold underline uppercase">${escapeHtml(settings.namaGuru || '( .............................................. )')}</p>
          <p>NIP. ${escapeHtml(settings.nipGuru || '..............................................')}</p>
        </div>
      </div>
    `;
  }
};
