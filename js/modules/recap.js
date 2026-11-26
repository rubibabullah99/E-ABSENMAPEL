/**
 * Module: Rekap Bulanan/Semesteran & Diagram (Connected to Form Data)
 * Generates dynamic attendance matrix, S/I notes list, and reactive Chart.js diagrams.
 * ZERO initial dummy data!
 */

window.RecapModule = {
  donutChart: null,
  barChart: null,

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.setDefaultMonth();
    this.refreshClassDropdown();
    this.renderRecap();

    // Subscribe to state updates
    window.appStore.subscribe('classes_updated', () => {
      this.refreshClassDropdown();
      this.renderRecap();
    });
    window.appStore.subscribe('students_updated', () => {
      this.renderRecap();
    });
    window.appStore.subscribe('attendance_updated', () => {
      this.renderRecap();
    });
    window.appStore.subscribe('settings_updated', () => {
      this.renderRecap();
    });
  },

  cacheDOM() {
    this.selectKelas = document.getElementById('recap-select-kelas');
    this.selectMode = document.getElementById('recap-select-mode'); // 'bulanan' or 'semesteran'
    this.inputBulan = document.getElementById('recap-input-bulan'); // YYYY-MM
    this.selectSemester = document.getElementById('recap-select-semester'); // 'Ganjil' or 'Genap'
    this.monthFilterWrapper = document.getElementById('recap-month-wrapper');
    this.semesterFilterWrapper = document.getElementById('recap-semester-wrapper');

    // Summary Cards
    this.statTotalSiswa = document.getElementById('recap-stat-total-siswa');
    this.statTotalPertemuan = document.getElementById('recap-stat-total-pertemuan');
    this.statPersenHadir = document.getElementById('recap-stat-persen-hadir');
    this.statAkumulasi = document.getElementById('recap-stat-akumulasi');

    // Containers
    this.tableHeaderRow = document.getElementById('recap-table-header');
    this.tableBody = document.getElementById('recap-table-body');
    this.emptyState = document.getElementById('recap-empty-state');
    this.notesTableBody = document.getElementById('recap-notes-table-body');
    this.notesEmptyState = document.getElementById('recap-notes-empty-state');

    // Chart Canvases
    this.canvasDonut = document.getElementById('recap-chart-donut');
    this.canvasBar = document.getElementById('recap-chart-bar');
    this.chartsEmptyState = document.getElementById('recap-charts-empty-state');
    this.chartsContainer = document.getElementById('recap-charts-container');
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
      // Auto select first class for convenience if available
      this.selectKelas.value = classes[0].nama;
    }
  },

  bindEvents() {
    this.selectKelas.addEventListener('change', () => this.renderRecap());
    this.inputBulan.addEventListener('change', () => this.renderRecap());
    this.selectSemester.addEventListener('change', () => this.renderRecap());

    this.selectMode.addEventListener('change', () => {
      if (this.selectMode.value === 'bulanan') {
        this.monthFilterWrapper.classList.remove('hidden');
        this.semesterFilterWrapper.classList.add('hidden');
      } else {
        this.monthFilterWrapper.classList.add('hidden');
        this.semesterFilterWrapper.classList.remove('hidden');
      }
      this.renderRecap();
    });
  },

  getFilteredSessions() {
    const selectedClass = this.selectKelas.value;
    if (!selectedClass) return [];

    let sessions = window.appStore.getAttendanceSessions({ kelas: selectedClass });

    if (this.selectMode.value === 'bulanan') {
      const selectedMonth = this.inputBulan.value; // YYYY-MM
      if (selectedMonth) {
        sessions = sessions.filter(s => s.tanggal.startsWith(selectedMonth));
      }
    }

    // Sort chronologically by date and meeting
    sessions.sort((a, b) => {
      if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
      return a.pertemuan - b.pertemuan;
    });

    return sessions;
  },

  renderRecap() {
    const selectedClass = this.selectKelas.value;
    const students = selectedClass ? window.appStore.getStudents(selectedClass) : [];
    const sessions = this.getFilteredSessions();

    // Sort students alphabetically
    students.sort((a, b) => a.nama.localeCompare(b.nama));

    if (!selectedClass || students.length === 0 || sessions.length === 0) {
      this.renderEmptyState(selectedClass, students.length, sessions.length);
      return;
    }

    this.emptyState.classList.add('hidden');
    this.chartsEmptyState.classList.add('hidden');
    this.chartsContainer.classList.remove('hidden');

    // Build Recap Table
    this.buildRecapMatrix(students, sessions);

    // Build Notes Table (Sakit & Izin)
    this.buildNotesList(sessions);

    // Calculate Summary Stats & Charts
    this.calculateStatsAndCharts(students, sessions);
  },

  renderEmptyState(selectedClass, studentCount, sessionCount) {
    this.statTotalSiswa.textContent = '0';
    this.statTotalPertemuan.textContent = '0';
    this.statPersenHadir.textContent = '0%';
    this.statAkumulasi.textContent = 'H:0 | S:0 | I:0 | A:0';

    this.tableHeaderRow.innerHTML = '';
    this.tableBody.innerHTML = '';
    this.notesTableBody.innerHTML = '';
    this.notesEmptyState.classList.remove('hidden');

    this.chartsEmptyState.classList.remove('hidden');
    this.chartsContainer.classList.add('hidden');

    let desc = 'Pilih kelas dan pastikan data kehadiran telah diisi pada form absensi.';
    if (!selectedClass) {
      desc = 'Pilih kelas pada dropdown di atas untuk melihat rekap kehadiran.';
    } else if (studentCount === 0) {
      desc = `Kelas "${escapeHtml(selectedClass)}" belum memiliki siswa terdaftar.`;
    } else if (sessionCount === 0) {
      desc = `Belum ada sesi absensi yang dicatat untuk kelas "${escapeHtml(selectedClass)}".`;
    }

    this.emptyState.innerHTML = `
      <div class="py-12 text-center">
        <svg class="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-sm font-semibold text-slate-700">Data Rekap Kosong</p>
        <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">${desc}</p>
      </div>
    `;
    this.emptyState.classList.remove('hidden');
  },

  buildRecapMatrix(students, sessions) {
    // Generate Header Row
    let thHtml = `
      <th class="px-3 py-2 text-center text-xs font-semibold text-slate-700 uppercase bg-slate-100 border border-slate-200 w-10">No</th>
      <th class="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase bg-slate-100 border border-slate-200 min-w-[180px]">Nama Siswa</th>
      <th class="px-2 py-2 text-center text-xs font-semibold text-slate-700 uppercase bg-slate-100 border border-slate-200 w-10">L/P</th>
    `;

    sessions.forEach((s) => {
      const tglFormatted = s.tanggal.split('-').slice(1).join('/'); // MM/DD
      thHtml += `
        <th class="px-2 py-2 text-center text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 min-w-[42px]" title="${s.tanggal} (P-${s.pertemuan})">
          <div class="text-[10px] text-slate-400 font-mono">P${s.pertemuan}</div>
          <div class="font-mono text-[11px]">${tglFormatted}</div>
        </th>
      `;
    });

    thHtml += `
      <th class="px-2 py-2 text-center text-xs font-bold text-emerald-700 uppercase bg-emerald-50 border border-emerald-200 w-10">H</th>
      <th class="px-2 py-2 text-center text-xs font-bold text-amber-700 uppercase bg-amber-50 border border-amber-200 w-10">S</th>
      <th class="px-2 py-2 text-center text-xs font-bold text-sky-700 uppercase bg-sky-50 border border-sky-200 w-10">I</th>
      <th class="px-2 py-2 text-center text-xs font-bold text-rose-700 uppercase bg-rose-50 border border-rose-200 w-10">A</th>
      <th class="px-2 py-2 text-center text-xs font-bold text-indigo-700 uppercase bg-indigo-50 border border-indigo-200 w-14">%</th>
    `;

    this.tableHeaderRow.innerHTML = thHtml;

    // Generate Body Rows
    let trHtml = '';
    students.forEach((student, index) => {
      let totalH = 0, totalS = 0, totalI = 0, totalA = 0;

      let sessionCols = '';
      sessions.forEach(s => {
        const record = (s.records || []).find(r => r.studentId === student.id);
        const status = record ? record.status : '-';

        let badgeClass = 'text-slate-400';
        if (status === 'H') {
          badgeClass = 'font-bold text-emerald-600 bg-emerald-50/50';
          totalH++;
        } else if (status === 'S') {
          badgeClass = 'font-bold text-amber-600 bg-amber-50';
          totalS++;
        } else if (status === 'I') {
          badgeClass = 'font-bold text-sky-600 bg-sky-50';
          totalI++;
        } else if (status === 'A') {
          badgeClass = 'font-bold text-rose-600 bg-rose-50';
          totalA++;
        }

        sessionCols += `
          <td class="px-1 py-1 text-center text-xs border border-slate-200 ${badgeClass}">
            ${status}
          </td>
        `;
      });

      const totalRecorded = totalH + totalS + totalI + totalA;
      const persentase = totalRecorded > 0 ? Math.round((totalH / totalRecorded) * 100) : 0;

      trHtml += `
        <tr class="hover:bg-slate-50 transition border-b border-slate-200">
          <td class="px-3 py-2 text-center text-xs font-mono text-slate-400 border border-slate-200">${index + 1}</td>
          <td class="px-3 py-2 text-xs font-medium text-slate-900 border border-slate-200">${escapeHtml(student.nama)}</td>
          <td class="px-2 py-2 text-center text-xs font-semibold ${student.jenisKelamin === 'L' ? 'text-blue-600' : 'text-pink-600'} border border-slate-200">${student.jenisKelamin}</td>
          ${sessionCols}
          <td class="px-2 py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50/30 border border-slate-200">${totalH}</td>
          <td class="px-2 py-2 text-center text-xs font-bold text-amber-700 bg-amber-50/30 border border-slate-200">${totalS}</td>
          <td class="px-2 py-2 text-center text-xs font-bold text-sky-700 bg-sky-50/30 border border-slate-200">${totalI}</td>
          <td class="px-2 py-2 text-center text-xs font-bold text-rose-700 bg-rose-50/30 border border-slate-200">${totalA}</td>
          <td class="px-2 py-2 text-center text-xs font-bold text-indigo-700 bg-indigo-50/30 border border-slate-200">${persentase}%</td>
        </tr>
      `;
    });

    this.tableBody.innerHTML = trHtml;
  },

  buildNotesList(sessions) {
    const notes = [];
    sessions.forEach(s => {
      (s.records || []).forEach(r => {
        if ((r.status === 'S' || r.status === 'I') && r.keterangan) {
          notes.push({
            tanggal: s.tanggal,
            pertemuan: s.pertemuan,
            nama: r.nama,
            status: r.status,
            keterangan: r.keterangan
          });
        }
      });
    });

    if (notes.length === 0) {
      this.notesTableBody.innerHTML = '';
      this.notesEmptyState.classList.remove('hidden');
      return;
    }

    this.notesEmptyState.classList.add('hidden');

    let html = '';
    notes.forEach((item, idx) => {
      const statusBadge = item.status === 'S'
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">Sakit</span>`
        : `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-sky-100 text-sky-800">Izin</span>`;

      html += `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="px-4 py-2.5 text-center text-xs font-mono text-slate-400">${idx + 1}</td>
          <td class="px-4 py-2.5 text-xs font-mono text-slate-700">${item.tanggal} (P-${item.pertemuan})</td>
          <td class="px-4 py-2.5 text-xs font-semibold text-slate-900">${escapeHtml(item.nama)}</td>
          <td class="px-4 py-2.5 text-center">${statusBadge}</td>
          <td class="px-4 py-2.5 text-xs text-slate-700">${escapeHtml(item.keterangan)}</td>
        </tr>
      `;
    });

    this.notesTableBody.innerHTML = html;
  },

  calculateStatsAndCharts(students, sessions) {
    let grandH = 0, grandS = 0, grandI = 0, grandA = 0;
    const meetingTrends = [];

    sessions.forEach((s) => {
      let mH = 0, mS = 0, mI = 0, mA = 0;
      (s.records || []).forEach(r => {
        if (r.status === 'H') { grandH++; mH++; }
        else if (r.status === 'S') { grandS++; mS++; }
        else if (r.status === 'I') { grandI++; mI++; }
        else if (r.status === 'A') { grandA++; mA++; }
      });
      meetingTrends.push({
        label: `P-${s.pertemuan}`,
        H: mH,
        S: mS,
        I: mI,
        A: mA
      });
    });

    const totalAttendanceCount = grandH + grandS + grandI + grandA;
    const avgPercentage = totalAttendanceCount > 0 ? Math.round((grandH / totalAttendanceCount) * 100) : 0;

    this.statTotalSiswa.textContent = students.length;
    this.statTotalPertemuan.textContent = sessions.length;
    this.statPersenHadir.textContent = `${avgPercentage}%`;
    this.statAkumulasi.textContent = `H:${grandH} | S:${grandS} | I:${grandI} | A:${grandA}`;

    // Render Chart.js
    if (typeof Chart !== 'undefined') {
      this.renderCharts(grandH, grandS, grandI, grandA, meetingTrends);
    }
  },

  renderCharts(h, s, i, a, trends) {
    // 1. Donut Chart (Distribution)
    if (this.donutChart) {
      this.donutChart.destroy();
    }
    const ctxDonut = this.canvasDonut.getContext('2d');
    this.donutChart = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: ['Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Alpa (A)'],
        datasets: [{
          data: [h, s, i, a],
          backgroundColor: ['#10b981', '#f59e0b', '#0ea5e9', '#f43f5e'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } }
          }
        },
        cutout: '65%'
      }
    });

    // 2. Bar Chart (Trend per Meeting)
    if (this.barChart) {
      this.barChart.destroy();
    }
    const ctxBar = this.canvasBar.getContext('2d');
    this.barChart = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: trends.map(t => t.label),
        datasets: [
          {
            label: 'Hadir',
            data: trends.map(t => t.H),
            backgroundColor: '#10b981'
          },
          {
            label: 'Sakit',
            data: trends.map(t => t.S),
            backgroundColor: '#f59e0b'
          },
          {
            label: 'Izin',
            data: trends.map(t => t.I),
            backgroundColor: '#0ea5e9'
          },
          {
            label: 'Alpa',
            data: trends.map(t => t.A),
            backgroundColor: '#f43f5e'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } }
          }
        }
      }
    });
  }
};
