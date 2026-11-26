@echo off
chcp 65001 >nul
echo =======================================================
echo   PUSH KE GITHUB - E-ABSEN MATA PELAJARAN
echo =======================================================
echo.
echo Sedang melakukan push ke branch main di GitHub...
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo =======================================================
    echo   BERHASIL! Kode berhasil di-push ke GitHub.
    echo   Untuk mengaktifkan GitHub Pages:
    echo   1. Buka repository Anda di GitHub
    echo   2. Buka Settings -> Pages
    echo   3. Di bagian "Build and deployment", pilih:
    echo      Source: GitHub Actions
    echo =======================================================
) else (
    echo [INFO] Jika muncul 'Repository not found', pastikan Anda
    echo sudah membuat repository 'e-absen-mapel' di https://github.com/new
)
echo.
pause
