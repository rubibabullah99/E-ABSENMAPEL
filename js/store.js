/**
 * E-Absen Mata Pelajaran
 * State Manager & LocalStorage Persistence (ZERO DUMMY DATA)
 * Strictly zero dummy/sample data initialized.
 */

const STORAGE_KEYS = {
  SETTINGS: 'e_absen_settings',
  CLASSES: 'e_absen_classes',
  STUDENTS: 'e_absen_students',
  ATTENDANCE: 'e_absen_attendance'
};

// Default empty structures (Zero Dummy Data)
const DEFAULT_SETTINGS = {
  kopImage: null,        // Base64 image string banner Kop Surat utuh
  logo: null,            // Alias/fallback untuk kompatibilitas
  mataPelajaran: '',     // Nama mata pelajaran
  tahunAjaran: '',       // Contoh: 2024/2025
  semester: '',          // Ganjil / Genap
  namaGuru: '',          // Nama guru pengampu
  nipGuru: '',           // NIP guru
  namaKepsek: '',        // Nama kepala sekolah
  nipKepsek: '',         // NIP kepala sekolah
  kotaDokumen: ''        // Kota/Kabupaten untuk titimangsa dokumen
};

class Store {
  constructor() {
    this.subscribers = {};
    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLASSES)) {
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    }
  }

  // Pub/Sub pattern for reactive updates
  subscribe(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
    return () => {
      this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
    };
  }

  emit(event, data) {
    if (this.subscribers[event]) {
      this.subscribers[event].forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in subscriber for ${event}:`, e);
        }
      });
    }
    if (event !== 'all_updated' && this.subscribers['all_updated']) {
      this.subscribers['all_updated'].forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error('Error in all_updated subscriber:', e);
        }
      });
    }
  }

  /* ================= SETTINGS (Kop & Identitas) ================= */
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.error('Failed to get settings:', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    if (newSettings.kopImage !== undefined) {
      updated.logo = newSettings.kopImage;
    } else if (newSettings.logo !== undefined && !newSettings.kopImage) {
      updated.kopImage = newSettings.logo;
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    this.emit('settings_updated', updated);
    return updated;
  }

  resetSettings() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    this.emit('settings_updated', DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  /* ================= MASTER KELAS ================= */
  getClasses() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get classes:', e);
      return [];
    }
  }

  addClass(classData) {
    const classes = this.getClasses();
    const newClass = {
      id: 'cls_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      nama: classData.nama.trim(),
      tingkat: (classData.tingkat || '').trim(),
      createdAt: new Date().toISOString()
    };
    classes.push(newClass);
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    this.emit('classes_updated', classes);
    return newClass;
  }

  updateClass(id, classData) {
    let classes = this.getClasses();
    const oldClass = classes.find(c => c.id === id);
    const oldName = oldClass ? oldClass.nama : null;

    classes = classes.map(c => {
      if (c.id === id) {
        return {
          ...c,
          nama: classData.nama.trim(),
          tingkat: (classData.tingkat || '').trim(),
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });

    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));

    // Also cascade update student class name if class name changed
    if (oldName && oldName !== classData.nama.trim()) {
      let students = this.getStudents();
      let changed = false;
      students = students.map(s => {
        if (s.kelas === oldName) {
          changed = true;
          return { ...s, kelas: classData.nama.trim() };
        }
        return s;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
        this.emit('students_updated', students);
      }
    }

    this.emit('classes_updated', classes);
    return true;
  }

  deleteClass(id) {
    let classes = this.getClasses();
    const target = classes.find(c => c.id === id);
    classes = classes.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    this.emit('classes_updated', classes);
    return target;
  }

  /* ================= MASTER SISWA ================= */
  getStudents(kelasName = null) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      let students = data ? JSON.parse(data) : [];

      // Auto-sanitize misaligned NIS if accidentally filled with gender 'L' or 'P'
      let sanitized = false;
      students = students.map(s => {
        if (s.nis === 'L' || s.nis === 'P' || (s.nis && s.nis.toUpperCase() === s.jenisKelamin && s.nis.length === 1)) {
          sanitized = true;
          return { ...s, nis: '' };
        }
        return s;
      });
      if (sanitized) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      }

      if (kelasName) {
        return students.filter(s => s.kelas.toLowerCase() === kelasName.toLowerCase());
      }
      return students;
    } catch (e) {
      console.error('Failed to get students:', e);
      return [];
    }
  }

  addStudent(studentData) {
    const students = this.getStudents();
    const newStudent = {
      id: 'std_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      nama: studentData.nama.trim(),
      jenisKelamin: studentData.jenisKelamin, // 'L' or 'P'
      nisn: (studentData.nisn || '').trim(),
      nis: (studentData.nis || '').trim(),
      kelas: studentData.kelas.trim(),
      createdAt: new Date().toISOString()
    };
    students.push(newStudent);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.emit('students_updated', students);
    return newStudent;
  }

  updateStudent(id, studentData) {
    let students = this.getStudents();
    students = students.map(s => {
      if (s.id === id) {
        return {
          ...s,
          nama: studentData.nama.trim(),
          jenisKelamin: studentData.jenisKelamin,
          nisn: (studentData.nisn || '').trim(),
          nis: (studentData.nis || '').trim(),
          kelas: studentData.kelas.trim(),
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.emit('students_updated', students);
    return true;
  }

  deleteStudent(id) {
    let students = this.getStudents();
    students = students.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.emit('students_updated', students);
    return true;
  }

  importStudents(studentsList) {
    // studentsList: Array of { nama, jenisKelamin, nisn, nis, kelas }
    let currentStudents = this.getStudents();
    const currentClasses = this.getClasses();
    const existingClassNames = new Set(currentClasses.map(c => c.nama.toLowerCase()));

    const newlyCreatedClasses = [];
    let updatedCount = 0;
    let addedCount = 0;

    studentsList.forEach(item => {
      const kelasTrimmed = (item.kelas || '').trim();
      if (!kelasTrimmed) return;

      // Auto create class if not exists
      if (!existingClassNames.has(kelasTrimmed.toLowerCase())) {
        existingClassNames.add(kelasTrimmed.toLowerCase());
        const newClass = {
          id: 'cls_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          nama: kelasTrimmed,
          tingkat: '',
          createdAt: new Date().toISOString()
        };
        currentClasses.push(newClass);
        newlyCreatedClasses.push(newClass);
      }

      // Sanitize raw nis: if literally 'L' or 'P' (single char matching gender), treat as empty
      let safeNis = (item.nis || '').toString().trim();
      if (safeNis === 'L' || safeNis === 'P' || safeNis.toUpperCase() === item.jenisKelamin) {
        safeNis = '';
      }

      // Check if student with same name and class already exists (case-insensitive)
      const existingIdx = currentStudents.findIndex(
        s => s.nama.trim().toLowerCase() === item.nama.trim().toLowerCase() &&
             s.kelas.trim().toLowerCase() === kelasTrimmed.toLowerCase()
      );

      if (existingIdx >= 0) {
        currentStudents[existingIdx] = {
          ...currentStudents[existingIdx],
          jenisKelamin: item.jenisKelamin === 'P' ? 'P' : 'L',
          nisn: (item.nisn || '').toString().trim(),
          nis: safeNis,
          updatedAt: new Date().toISOString()
        };
        updatedCount++;
      } else {
        currentStudents.push({
          id: 'std_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          nama: item.nama.trim(),
          jenisKelamin: item.jenisKelamin === 'P' ? 'P' : 'L',
          nisn: (item.nisn || '').toString().trim(),
          nis: safeNis,
          kelas: kelasTrimmed,
          createdAt: new Date().toISOString()
        });
        addedCount++;
      }
    });

    if (newlyCreatedClasses.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(currentClasses));
      this.emit('classes_updated', currentClasses);
    }

    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(currentStudents));
    this.emit('students_updated', currentStudents);

    return {
      totalImported: addedCount + updatedCount,
      updatedCount,
      addedCount,
      newClassesCount: newlyCreatedClasses.length
    };
  }

  /* ================= ABSENSI HARIAN ================= */
  getAttendanceSessions(filter = {}) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      let sessions = data ? JSON.parse(data) : [];

      if (filter.kelas) {
        sessions = sessions.filter(s => s.kelas.toLowerCase() === filter.kelas.toLowerCase());
      }
      if (filter.tanggal) {
        sessions = sessions.filter(s => s.tanggal === filter.tanggal);
      }
      if (filter.pertemuan) {
        sessions = sessions.filter(s => String(s.pertemuan) === String(filter.pertemuan));
      }
      if (filter.bulan) {
        // format: YYYY-MM
        sessions = sessions.filter(s => s.tanggal.startsWith(filter.bulan));
      }
      return sessions;
    } catch (e) {
      console.error('Failed to get attendance:', e);
      return [];
    }
  }

  getAttendanceSessionById(id) {
    const sessions = this.getAttendanceSessions();
    return sessions.find(s => s.id === id) || null;
  }

  saveAttendanceSession(sessionData) {
    /**
     * sessionData format:
     * {
     *   id: optional string (if updating existing session),
     *   tanggal: 'YYYY-MM-DD',
     *   kelas: 'X-A',
     *   mataPelajaran: 'Matematika',
     *   pertemuan: 1,
     *   jamKe: '1-2',
     *   topik: 'Aljabar',
     *   records: [
     *     { studentId, nama, status: 'H'|'S'|'I'|'A', keterangan: '' }
     *   ]
     * }
     */
    let sessions = this.getAttendanceSessions();

    let targetIndex = -1;
    if (sessionData.id) {
      targetIndex = sessions.findIndex(s => s.id === sessionData.id);
    } else {
      // Find if a session with same tanggal + kelas + pertemuan + mataPelajaran already exists
      targetIndex = sessions.findIndex(s => 
        s.tanggal === sessionData.tanggal && 
        s.kelas.toLowerCase() === sessionData.kelas.toLowerCase() &&
        String(s.pertemuan) === String(sessionData.pertemuan)
      );
    }

    const payload = {
      id: sessionData.id || ('att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
      tanggal: sessionData.tanggal,
      kelas: sessionData.kelas,
      mataPelajaran: sessionData.mataPelajaran || '',
      pertemuan: Number(sessionData.pertemuan) || 1,
      jamKe: sessionData.jamKe || '',
      topik: sessionData.topik || '',
      records: sessionData.records || [],
      updatedAt: new Date().toISOString()
    };

    if (targetIndex >= 0) {
      sessions[targetIndex] = { ...sessions[targetIndex], ...payload };
    } else {
      payload.createdAt = new Date().toISOString();
      sessions.push(payload);
    }

    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(sessions));
    this.emit('attendance_updated', sessions);
    return payload;
  }

  deleteAttendanceSession(id) {
    let sessions = this.getAttendanceSessions();
    sessions = sessions.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(sessions));
    this.emit('attendance_updated', sessions);
    return true;
  }

  /* Clear all user data back to blank state */
  clearAllData() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    this.emit('all_updated', {});
    return true;
  }
}

// Global Store Instance
window.appStore = new Store();

// Global HTML Escaper
window.escapeHtml = function(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
