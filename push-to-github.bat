@echo off
chcp 65001 >nul
echo =======================================================
echo   SINKRONISASI REVISI KE GITHUB & VERCEL
echo   E-ABSEN MATA PELAJARAN
echo =======================================================
echo.
echo Memeriksa perubahan berkas...
git status -s
echo.
set /p PESAN_REVISI="Masukkan catatan revisi (tekan ENTER untuk default: 'update revisi'): "
if "%PESAN_REVISI%"=="" set PESAN_REVISI=update revisi aplikasi

echo.
echo [1/3] Menambahkan berkas yang diubah...
git add .

echo [2/3] Menyimpan catatan perubahan...
git commit -m "%PESAN_REVISI%"

echo.
echo [3/3] Mendorong (Push) pembaruan ke GitHub & Vercel...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo =======================================================
    echo   [BERHASIL!] Revisi telah terkirim ke GitHub!
    echo   GitHub Pages & Vercel otomatis meng-update website
    echo   dalam waktu sekitar 20-30 detik.
    echo =======================================================
    echo.
    echo Tautan Website:
    echo - GitHub Pages : https://rubibabullah99.github.io/E-ABSENMAPEL/
    echo - Vercel       : https://e-absenmapel.vercel.app
) else (
    echo.
    echo [ERROR] Gagal melakukan push. Pastikan koneksi internet aktif.
)

echo.
pause
