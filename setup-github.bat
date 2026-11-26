@echo off
chcp 65001 >nul
echo =======================================================
echo   PANDUAN CEPAT INTEGRASI GITHUB - E-ABSEN MAPEL
echo =======================================================
echo.

:: Periksa git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git belum terpasang di komputer ini!
    echo Silakan unduh dan pasang Git terlebih dahulu dari https://git-scm.com/
    pause
    exit /b
)

echo [1/4] Menginisialisasi git repository lokal...
git init
echo.

echo [2/4] Menambahkan seluruh berkas project...
git add .
echo.

echo [3/4] Melakukan commit perdana...
git commit -m "Initial commit: E-Absen Mata Pelajaran (White-Label, Zero Dummy Data & Supabase Ready)"
git branch -M main
echo.

echo =======================================================
echo   LANGKAH TERAKHIR: HUBUNGKAN KE REPOSITORY GITHUB
echo =======================================================
echo.
echo Buat repository baru di https://github.com/new (beri nama misalnya: e-absen-mapel)
echo Lalu salin URL repository Anda.
echo.
set /p REPO_URL="Masukkan URL Git Repository Anda (misal: https://github.com/username/e-absen-mapel.git): "

if "%REPO_URL%"=="" (
    echo.
    echo Tidak ada URL yang dimasukkan. Anda dapat menjalankannya nanti dengan:
    echo   git remote add origin URL_GITHUB_ANDA
    echo   git push -u origin main
) else (
    git remote remove origin >nul 2>&1
    git remote add origin %REPO_URL%
    echo.
    echo [4/4] Mendorong (Push) kode ke GitHub...
    git push -u origin main
    echo.
    echo =======================================================
    echo   SELESAI! Repository berhasil diunggah ke GitHub.
    echo   Aktifkan GitHub Pages di: Repository -> Settings -> Pages -> Source: GitHub Actions
    echo =======================================================
)

echo.
pause
