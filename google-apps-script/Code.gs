/**
 * GOOGLE APPS SCRIPT - BACKEND E-ABSEN MATA PELAJARAN
 * Menghubungkan aplikasi web E-Absen ke Google Sheets secara realtime.
 */

// 1. Fungsi Utama untuk Inisialisasi Sheet Pertama Kali
function inisialisasiDatabase() {
  ensureSheets();
  Logger.log("Database E-Absen berhasil diinisialisasi!");
}

// 2. Handler GET Request (Membaca Data untuk Web App)
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets(ss);
  
  var action = (e && e.parameter) ? e.parameter.action : '';
  
  if (action === 'readAll') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: {
        settings: getSheetData(ss.getSheetByName('Settings')),
        classes: getSheetData(ss.getSheetByName('Classes')),
        students: getSheetData(ss.getSheetByName('Students')),
        attendance: getSheetData(ss.getSheetByName('Attendance'))
      }
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'E-Absen API Ready & Sheets Initialized'
  })).setMimeType(ContentService.MimeType.JSON);
}

// 3. Handler POST Request (Menyimpan Data dari Web App)
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets(ss);
    
    var payload = JSON.parse(e.postData.contents);
    
    // Simpan Pengaturan (Kop & Identitas)
    if (payload.settings) {
      saveSingleRow(ss.getSheetByName('Settings'), payload.settings);
    }
    
    // Simpan Data Kelas
    if (payload.classes && payload.classes.length > 0) {
      saveMultiRows(ss.getSheetByName('Classes'), payload.classes, ['id', 'nama', 'tingkat', 'createdAt']);
    }
    
    // Simpan Data Siswa
    if (payload.students && payload.students.length > 0) {
      saveMultiRows(ss.getSheetByName('Students'), payload.students, ['id', 'nama', 'jenisKelamin', 'nisn', 'nis', 'kelas', 'createdAt']);
    }
    
    // Simpan Sesi Absensi
    if (payload.attendance && payload.attendance.length > 0) {
      saveAttendanceRows(ss.getSheetByName('Attendance'), payload.attendance);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data berhasil disinkronkan ke Google Sheets'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 4. Helper: Otomatis Membuat 4 Tab Sheet & Baris Header
function ensureSheets(ss) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  var sheetConfigs = [
    { name: 'Settings', headers: ['kopImage', 'mataPelajaran', 'tahunAjaran', 'semester', 'namaGuru', 'nipGuru', 'namaKepsek', 'nipKepsek', 'kotaDokumen'] },
    { name: 'Classes', headers: ['id', 'nama', 'tingkat', 'createdAt'] },
    { name: 'Students', headers: ['id', 'nama', 'jenisKelamin', 'nisn', 'nis', 'kelas', 'createdAt'] },
    { name: 'Attendance', headers: ['id', 'tanggal', 'kelas', 'mataPelajaran', 'pertemuan', 'jamKe', 'topik', 'records'] }
  ];
  
  sheetConfigs.forEach(function(cfg) {
    var sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
      sheet.appendRow(cfg.headers);
      sheet.setFrozenRows(1);
    }
  });
  
  // Hapus Sheet1 default bawaan Google jika sudah ada sheet lain
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {}
  }
}

// 5. Helper: Membaca Data dari Suatu Sheet Menjadi Array of Object
function getSheetData(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }
  return result;
}

// 6. Helper: Menyimpan Data Objek Tunggal (Settings)
function saveSingleRow(sheet, dataObj) {
  if (!sheet) return;
  sheet.clearContents();
  var keys = Object.keys(dataObj);
  var values = keys.map(function(k) { return dataObj[k]; });
  sheet.appendRow(keys);
  sheet.appendRow(values);
  sheet.setFrozenRows(1);
}

// 7. Helper: Menyimpan Banyak Baris (Classes & Students)
function saveMultiRows(sheet, items, keys) {
  if (!sheet) return;
  sheet.clearContents();
  sheet.appendRow(keys);
  sheet.setFrozenRows(1);
  if (!items || items.length === 0) return;
  var rows = items.map(function(item) {
    return keys.map(function(k) { return item[k] || ''; });
  });
  sheet.getRange(2, 1, rows.length, keys.length).setValues(rows);
}

// 8. Helper: Menyimpan Sesi Absensi dengan Rincian Record Presensi
function saveAttendanceRows(sheet, sessions) {
  if (!sheet) return;
  sheet.clearContents();
  var keys = ['id', 'tanggal', 'kelas', 'mataPelajaran', 'pertemuan', 'jamKe', 'topik', 'records'];
  sheet.appendRow(keys);
  sheet.setFrozenRows(1);
  if (!sessions || sessions.length === 0) return;
  var rows = sessions.map(function(s) {
    return [
      s.id || '',
      s.tanggal || '',
      s.kelas || '',
      s.mataPelajaran || '',
      s.pertemuan || 1,
      s.jamKe || '',
      s.topik || '',
      JSON.stringify(s.records || [])
    ];
  });
  sheet.getRange(2, 1, rows.length, keys.length).setValues(rows);
}
