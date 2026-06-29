@echo off
setlocal enabledelayedexpansion

:: Memastikan script berjalan dengan hak akses Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Harap jalankan script ini sebagai Administrator!
    echo Klik kanan file ini lalu pilih 'Run as Administrator'.
    pause
    exit /b
)

:: KUNCI UTAMA: Memaksa script kembali ke folder tempat compile.bat berada
cd /d "%~dp0"

echo ===================================================
echo   Kompilasi ^& Sign via Auto-Detect w64devkit     
echo ===================================================

echo [0/3] Mencari lokasi w64devkit di semua direktori...
echo       (Mohon tunggu, proses ini memerlukan waktu beberapa saat)

:: Menggunakan PowerShell untuk mencari folder w64devkit\bin di semua drive yang siap
set "W64PATH="
for /f "delims=" %%I in ('powershell -NoProfile -Command "Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Free -ne $null } | ForEach-Object { Get-ChildItem -Path ($_.Root) -Filter 'w64devkit' -Directory -Recurse -ErrorAction SilentlyContinue | ForEach-Object { if (Test-Path (Join-Path $_.FullName 'bin')) { Join-Path $_.FullName 'bin'; break } } }"') do (
    set "W64PATH=%%I"
    goto :Found
)

:Found
if "%W64PATH%"=="" (
    echo [ERROR] w64devkit tidak ditemukan di sistem Anda!
    echo Harap pastikan folder 'w64devkit' sudah diekstrak di komputer Anda.
    pause
    exit /b
)

echo ^> w64devkit ditemukan di: %W64PATH%
set "PATH=%W64PATH%;%PATH%"

echo.
echo [1/3] Mengompilasi Resource dan Manifest...
:: Memastikan file resource.rc benar-benar ada di folder sebelum dieksekusi
if not exist "resource.rc" (
    echo [ERROR] File 'resource.rc' tidak ditemukan di folder: %CD%
    echo Harap pastikan file 'resource.rc' sudah dibuat di folder yang sama dengan script ini.
    pause
    exit /b
)

windres resource.rc -O coff -o resource.res
if %errorLevel% neq 0 (
    echo [ERROR] Gagal mengompilasi resource.rc
    pause
    exit /b
)

echo [2/3] Mengompilasi Source Code C++ (Optimasi -O3 dan Stripping)...
if not exist "smooth scroll.cpp" (
    echo [ERROR] File 'smooth scroll.cpp' tidak ditemukan di folder: %CD%
    pause
    exit /b
)

g++ -O3 -s "smooth scroll.cpp" resource.res -o "SmoothScroll.exe" -mwindows -lcomctl32 -ldwmapi -static
if %errorLevel% neq 0 (
    echo [ERROR] Gagal mengompilasi smooth scroll.cpp
    pause
    exit /b
)
echo ^> Berhasil membuat SmoothScroll.exe

echo.
echo [3/3] Melakukan Digital Signing via PowerShell...
powershell -NoProfile -ExecutionPolicy Bypass -Command "^
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject 'CN=Local Developer' -KeyUsage DigitalSignature -FriendlyName 'SmoothScrollCert' -CertStoreLocation 'Cert:\CurrentUser\My' -NotAfter (Get-Date).AddYears(5); ^
    $certRoot = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($cert.Export([System.Security.Cryptography.X509ContentType]::Cert)); ^
    $storeRoot = [System.Security.Cryptography.X509Certificates.X509Store]::new('Root', 'CurrentUser'); ^
    $storeRoot.Open('ReadWrite'); ^
    $storeRoot.Add($certRoot); ^
    $storeRoot.Close(); ^
    $storePub = [System.Security.Cryptography.X509Certificates.X509Store]::new('TrustedPublisher', 'CurrentUser'); ^
    $storePub.Open('ReadWrite'); ^
    $storePub.Add($certRoot); ^
    $storePub.Close(); ^
    Set-AuthenticodeSignature -FilePath '.\SmoothScroll.exe' -Certificate $cert | Out-Null; ^
    echo '   > Sertifikat lokal berhasil didaftarkan dan ditanam ke EXE!';"

echo.
echo ===================================================
echo   PROSES SELESAI! SmoothScroll.exe siap dijalankan.
echo ===================================================
pause