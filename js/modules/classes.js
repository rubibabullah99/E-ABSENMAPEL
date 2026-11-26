/**
 * Module: Master Kelas (Editable)
 * Handles adding, editing, and deleting classes.
 * ZERO initial dummy classes!
 */

window.ClassesModule = {
  init() {
    this.cacheDOM();
    this.bindEvents();
    this.renderClassList();

    // Re-render when classes or students updated
    window.appStore.subscribe('classes_updated', () => {
      this.renderClassList();
    });
    window.appStore.subscribe('students_updated', () => {
      this.renderClassList();
    });
  },

  cacheDOM() {
    this.form = document.getElementById('class-add-form');
    this.inputNama = document.getElementById('class-nama-input');
    this.inputTingkat = document.getElementById('class-tingkat-input');
    this.tableBody = document.getElementById('class-table-body');
    this.emptyState = document.getElementById('class-empty-state');
    this.classCountBadge = document.getElementById('class-count-badge');
  },

  bindEvents() {
    // Add form submit
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddClass();
    });

    // Delegated edit & delete clicks
    this.tableBody.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-class');
      const deleteBtn = e.target.closest('.btn-delete-class');

      if (editBtn) {
        const id = editBtn.dataset.id;
        this.openEditModal(id);
      } else if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        this.confirmDeleteClass(id);
      }
    });
  },

  handleAddClass() {
    const nama = this.inputNama.value.trim();
    const tingkat = this.inputTingkat.value.trim();

    if (!nama) {
      window.App.toast('Nama kelas wajib diisi', 'error');
      this.inputNama.focus();
      return;
    }

    const classes = window.appStore.getClasses();
    const isDuplicate = classes.some(c => c.nama.toLowerCase() === nama.toLowerCase());
    if (isDuplicate) {
      window.App.toast(`Kelas dengan nama "${nama}" sudah ada`, 'warning');
      return;
    }

    window.appStore.addClass({ nama, tingkat });
    window.App.toast(`Kelas "${nama}" berhasil ditambahkan`, 'success');

    this.inputNama.value = '';
    this.inputTingkat.value = '';
    this.inputNama.focus();
  },

  renderClassList() {
    const classes = window.appStore.getClasses();
    const students = window.appStore.getStudents();

    if (this.classCountBadge) {
      this.classCountBadge.textContent = `${classes.length} Kelas`;
    }

    if (classes.length === 0) {
      this.tableBody.innerHTML = '';
      this.emptyState.classList.remove('hidden');
      return;
    }

    this.emptyState.classList.add('hidden');

    let html = '';
    classes.forEach((item, index) => {
      const studentCount = students.filter(s => s.kelas.toLowerCase() === item.nama.toLowerCase()).length;

      html += `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="px-4 py-3 text-center text-xs text-slate-400 font-mono">${index + 1}</td>
          <td class="px-4 py-3 font-semibold text-slate-800">${escapeHtml(item.nama)}</td>
          <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(item.tingkat || '-')}</td>
          <td class="px-4 py-3 text-center">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${studentCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-500'}">
              ${studentCount} Siswa
            </span>
          </td>
          <td class="px-4 py-3 text-right space-x-1">
            <button class="btn-edit-class inline-flex items-center px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-sm" data-id="${item.id}" title="Edit Kelas">
              <svg class="w-3.5 h-3.5 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
            <button class="btn-delete-class inline-flex items-center px-2.5 py-1 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition shadow-sm" data-id="${item.id}" title="Hapus Kelas">
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

  openEditModal(classId) {
    const classes = window.appStore.getClasses();
    const item = classes.find(c => c.id === classId);
    if (!item) return;

    const modalContent = `
      <form id="edit-class-form" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Nama Kelas *</label>
          <input type="text" id="modal-edit-class-nama" value="${escapeHtml(item.nama)}" required class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Tingkat / Keterangan (Opsional)</label>
          <input type="text" id="modal-edit-class-tingkat" value="${escapeHtml(item.tingkat || '')}" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" class="btn-modal-cancel px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Batal</button>
          <button type="submit" class="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">Simpan Perubahan</button>
        </div>
      </form>
    `;

    window.App.customModal({
      title: 'Edit Data Kelas',
      bodyHtml: modalContent,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#edit-class-form');
        const inputNama = modalEl.querySelector('#modal-edit-class-nama');
        const inputTingkat = modalEl.querySelector('#modal-edit-class-tingkat');
        inputNama.focus();

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const newNama = inputNama.value.trim();
          const newTingkat = inputTingkat.value.trim();

          if (!newNama) {
            window.App.toast('Nama kelas tidak boleh kosong', 'error');
            return;
          }

          window.appStore.updateClass(classId, { nama: newNama, tingkat: newTingkat });
          window.App.toast('Data kelas berhasil diperbarui', 'success');
          window.App.closeModal();
        });
      }
    });
  },

  confirmDeleteClass(classId) {
    const classes = window.appStore.getClasses();
    const item = classes.find(c => c.id === classId);
    if (!item) return;

    const students = window.appStore.getStudents(item.nama);
    let message = `Apakah Anda yakin ingin menghapus kelas "${item.nama}"?`;
    if (students.length > 0) {
      message += `<br><span class="text-rose-600 text-xs font-semibold block mt-2">Peringatan: Terdapat ${students.length} siswa yang terdaftar di kelas ini.</span>`;
    }

    window.App.confirmModal({
      title: 'Hapus Kelas?',
      message: message,
      confirmText: 'Ya, Hapus Kelas',
      confirmClass: 'bg-rose-600 hover:bg-rose-700',
      onConfirm: () => {
        window.appStore.deleteClass(classId);
        window.App.toast(`Kelas "${item.nama}" telah dihapus`, 'info');
      }
    });
  }
};
