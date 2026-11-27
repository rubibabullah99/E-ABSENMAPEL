@echo off
chcp 65001 >nul
echo =======================================================
echo   PUSH KE GITHUB - E-ABSEN MATA PELAJARAN
echo =======================================================
echo.
echo URL Remote saat ini:
git remote get-url origin
echo.
echo [1/2] Menjalankan push ke branch main di GitHub...
echo (Jika jendela browser login GitHub muncul, silakan klik 'Sign in' / 'Authorize')
echo.
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo =======================================================
    echo   [BERHASIL!] Seluruh kode sukses di-push ke GitHub!
    echo =======================================================
    echo.
    echo Langkah Mengaktifkan GitHub Pages (Gratis):
    echo 1. Buka repository Anda di browser: https://github.com/rubibabullah99/e-absen-mapel
    echo 2. Masuk ke menu 'Settings' -> 'Pages'
    echo 3. Pada 'Source', pilih 'GitHub Actions'
    echo 4. Website Anda siap diakses secara online!
    echo.
) else (
    echo.
    echo =======================================================
    echo   [PERIKSA AUTENTIKASI / URL REPOSITORY]
    echo =======================================================
    echo.
    echo Jika muncul 'Repository not found', kemungkinan:
    echo 1. Repository dibuat sebagai 'Private' dan perlu login browser sekali ini, atau
    echo 2. Nama repository di GitHub berbeda dengan 'e-absen-mapel'.
    echo.
    set /p NEW_URL="Ketik/Paste URL Repository GitHub Anda (tekan ENTER jika sudah sesuai): "
    if not "%NEW_URL%"=="" (
        git remote set-url origin %NEW_URL%
        echo Mencoba push ke %NEW_URL%...
        git push -u origin main
    )
)

echo.
pause
