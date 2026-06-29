#define _WIN32_WINNT 0x0501
#include <windows.h>
#include <commctrl.h>
#include <thread>
#include <atomic>
#include <cmath>
#include <dwmapi.h>
#include <chrono>
#include <string>
#include "resource.h"

#pragma comment(lib, "comctl32.lib")
#pragma comment(lib, "dwmapi.lib")
#pragma comment(lib, "shell32.lib") // Diperlukan untuk Shell_NotifyIcon

HHOOK mouseHook;
std::atomic<float> scrollVelocity(0.0f); 
std::atomic<bool> isRunning(true);

std::atomic<float> g_lerpFactor(0.9f);      
std::atomic<float> g_scrollMultiplier(3.0f); 

#define IDC_SLIDER_LERP 1001
#define IDC_SLIDER_SPEED 1002
#define IDC_BTN_CLOSE 1003
#define IDC_TEXT_LERP 1004
#define IDC_TEXT_SPEED 1005
#define IDC_CHK_STARTUP 1006 

// Definisi untuk System Tray
#define WM_TRAYICON (WM_USER + 1)
#define ID_TRAY_APP_ICON 5000

HWND hSliderLerp, hSliderSpeed;
HWND hTextLerp, hTextSpeed;
HWND hChkStartup; 
NOTIFYICONDATAW nid = { 0 };

// Handle untuk Mutex (Pencegah Double Instance)
HANDLE hMutex = NULL;

const wchar_t REG_SUBKEY[] = L"Software\\SmoothScrollV6";
const wchar_t REG_STARTUP_SUBKEY[] = L"Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const wchar_t APP_STARTUP_NAME[] = L"SmoothScrollV6";

BOOL IsStartupEnabled() {
    HKEY hKey;
    BOOL enabled = FALSE;
    if (RegOpenKeyExW(HKEY_CURRENT_USER, REG_STARTUP_SUBKEY, 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
        if (RegQueryValueExW(hKey, APP_STARTUP_NAME, NULL, NULL, NULL, NULL) == ERROR_SUCCESS) {
            enabled = TRUE;
        }
        RegCloseKey(hKey);
    }
    return enabled;
}

void SetStartup(BOOL enable) {
    HKEY hKey;
    if (RegOpenKeyExW(HKEY_CURRENT_USER, REG_STARTUP_SUBKEY, 0, KEY_SET_VALUE, &hKey) == ERROR_SUCCESS) {
        if (enable) {
            wchar_t szPath[MAX_PATH];
            GetModuleFileNameW(NULL, szPath, MAX_PATH);
            RegSetValueExW(hKey, APP_STARTUP_NAME, 0, REG_SZ, (BYTE*)szPath, (lstrlenW(szPath) + 1) * sizeof(wchar_t));
        } else {
            RegDeleteValueW(hKey, APP_STARTUP_NAME);
        }
        RegCloseKey(hKey);
    }
}

void LoadSettingsFromRegistry() {
    HKEY hKey;
    if (RegOpenKeyExW(HKEY_CURRENT_USER, REG_SUBKEY, 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
        DWORD dwLerp = 95;
        DWORD dwSpeed = 3;
        DWORD dwSize = sizeof(DWORD);

        if (RegQueryValueExW(hKey, L"Lerp", NULL, NULL, (LPBYTE)&dwLerp, &dwSize) == ERROR_SUCCESS) {
            g_lerpFactor.store(static_cast<float>(dwLerp) / 100.0f);
        }
        if (RegQueryValueExW(hKey, L"Speed", NULL, NULL, (LPBYTE)&dwSpeed, &dwSize) == ERROR_SUCCESS) {
            g_scrollMultiplier.store(static_cast<float>(dwSpeed));
        }
        RegCloseKey(hKey);
    }
}

void SaveSettingsToRegistry() {
    HKEY hKey;
    if (RegCreateKeyExW(HKEY_CURRENT_USER, REG_SUBKEY, 0, NULL, REG_OPTION_NON_VOLATILE, KEY_WRITE, NULL, &hKey, NULL) == ERROR_SUCCESS) {
        DWORD dwLerp = static_cast<DWORD>(g_lerpFactor.load() * 100.0f);
        DWORD dwSpeed = static_cast<DWORD>(g_scrollMultiplier.load());

        RegSetValueExW(hKey, L"Lerp", 0, REG_DWORD, (const BYTE*)&dwLerp, sizeof(DWORD));
        RegSetValueExW(hKey, L"Speed", 0, REG_DWORD, (const BYTE*)&dwSpeed, sizeof(DWORD));
        RegCloseKey(hKey);
    }
}

void InertiaAnimationLoop() {
    float accumulatedScroll = 0.0f;
    auto lastTime = std::chrono::high_resolution_clock::now();

    while (isRunning) {
        DwmFlush(); 

        auto now = std::chrono::high_resolution_clock::now();
        std::chrono::duration<float> deltaTime = now - lastTime; 
        lastTime = now;

        if ((GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0) {
            scrollVelocity.store(0.0f);
            accumulatedScroll = 0.0f;
            continue;
        }

        float velocity = scrollVelocity.load();
        float currentLerp = g_lerpFactor.load();

        if (std::abs(velocity) < 0.1f) {
            scrollVelocity.store(0.0f);
            accumulatedScroll = 0.0f;
            continue;
        }

        float adjustedLerp = std::powf(currentLerp, deltaTime.count() * 60.0f);
        
        float step = velocity * (1.0f - adjustedLerp);
        scrollVelocity.store(velocity * adjustedLerp);

        accumulatedScroll += step;
        int sendDelta = static_cast<int>(accumulatedScroll);

        if (sendDelta != 0) {
            accumulatedScroll -= static_cast<float>(sendDelta);
            mouse_event(MOUSEEVENTF_WHEEL, 0, 0, sendDelta, 0x888);
        }
    }
}

LRESULT CALLBACK LowLevelMouseProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode >= 0) {
        if (wParam == WM_LBUTTONDOWN || wParam == WM_RBUTTONDOWN) {
            scrollVelocity.store(0.0f); 
        }
        if (wParam == WM_MOUSEWHEEL) {
            MSLLHOOKSTRUCT* pMouse = (MSLLHOOKSTRUCT*)lParam;
            if (pMouse->dwExtraInfo == 0x888) {
                return CallNextHookEx(mouseHook, nCode, wParam, lParam);
            }
            if ((GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0) {
                scrollVelocity.store(0.0f);
                return CallNextHookEx(mouseHook, nCode, wParam, lParam);
            }
            short wheelDelta = HIWORD(pMouse->mouseData);
            scrollVelocity.store(scrollVelocity.load() + (static_cast<float>(wheelDelta) * g_scrollMultiplier.load()));
            return 1;
        }
    }
    return CallNextHookEx(mouseHook, nCode, wParam, lParam);
}

void UpdateGuiLabels() {
    float currentLerp = g_lerpFactor.load();
    float currentSpeed = g_scrollMultiplier.load();

    std::wstring txtLerp = L"Kelicinan (LERP): " + std::to_wstring(currentLerp).substr(0, 4);
    std::wstring txtSpeed = L"Kecepatan Gulir: " + std::to_wstring(currentSpeed).substr(0, 3);
    
    SetWindowTextW(hTextLerp, txtLerp.c_str());
    SetWindowTextW(hTextSpeed, txtSpeed.c_str());
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        case WM_CREATE: {
            INITCOMMONCONTROLSEX icex;
            icex.dwSize = sizeof(INITCOMMONCONTROLSEX);
            icex.dwICC = ICC_BAR_CLASSES;
            InitCommonControlsEx(&icex);

            int initialLerpPos = static_cast<int>(g_lerpFactor.load() * 100.0f);
            int initialSpeedPos = static_cast<int>(g_scrollMultiplier.load());

            hTextLerp = CreateWindowA("STATIC", "", WS_CHILD | WS_VISIBLE, 20, 20, 250, 20, hwnd, (HMENU)IDC_TEXT_LERP, NULL, NULL);
            hSliderLerp = CreateWindowA(TRACKBAR_CLASSA, "", WS_CHILD | WS_VISIBLE | TBS_AUTOTICKS, 20, 45, 250, 30, hwnd, (HMENU)IDC_SLIDER_LERP, NULL, NULL);
            SendMessage(hSliderLerp, TBM_SETRANGE, TRUE, MAKELONG(85, 98));
            SendMessage(hSliderLerp, TBM_SETPOS, TRUE, initialLerpPos);

            hTextSpeed = CreateWindowA("STATIC", "", WS_CHILD | WS_VISIBLE, 20, 95, 250, 20, hwnd, (HMENU)IDC_TEXT_SPEED, NULL, NULL);
            hSliderSpeed = CreateWindowA(TRACKBAR_CLASSA, "", WS_CHILD | WS_VISIBLE | TBS_AUTOTICKS, 20, 120, 250, 30, hwnd, (HMENU)IDC_SLIDER_SPEED, NULL, NULL);
            SendMessage(hSliderSpeed, TBM_SETRANGE, TRUE, MAKELONG(1, 10));
            SendMessage(hSliderSpeed, TBM_SETPOS, TRUE, initialSpeedPos);

            hChkStartup = CreateWindowA("BUTTON", "Jalankan otomatis saat Windows startup", WS_CHILD | WS_VISIBLE | BS_AUTOCHECKBOX, 20, 170, 260, 20, hwnd, (HMENU)IDC_CHK_STARTUP, NULL, NULL);
            if (IsStartupEnabled()) {
                SendMessage(hChkStartup, BM_SETCHECK, BST_CHECKED, 0);
            }

            CreateWindowA("BUTTON", "Matikan && Keluar", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON, 20, 205, 250, 35, hwnd, (HMENU)IDC_BTN_CLOSE, NULL, NULL);

            UpdateGuiLabels();

            // Inisialisasi Struktur Tray Icon
            nid.cbSize = sizeof(NOTIFYICONDATAW);
            nid.hWnd = hwnd;
            nid.uID = ID_TRAY_APP_ICON;
            nid.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP;
            nid.uCallbackMessage = WM_TRAYICON;
            nid.hIcon = LoadIconW(GetModuleHandle(NULL), MAKEINTRESOURCEW(IDI_MYICON));
            lstrcpyW(nid.szTip, L"Smooth Scroll Control");
            
            Shell_NotifyIconW(NIM_ADD, &nid);
            break;
        }
        case WM_TRAYICON: {
            if (lParam == WM_LBUTTONDBLCLK) { 
                ShowWindow(hwnd, SW_SHOW);
                SetForegroundWindow(hwnd);
            }
            break;
        }
        case WM_HSCROLL: {
            if ((HWND)lParam == hSliderLerp) {
                int pos = SendMessage(hSliderLerp, TBM_GETPOS, 0, 0);
                g_lerpFactor.store(static_cast<float>(pos) / 100.0f);
                UpdateGuiLabels();
                SaveSettingsToRegistry();
            }
            if ((HWND)lParam == hSliderSpeed) {
                int pos = SendMessage(hSliderSpeed, TBM_GETPOS, 0, 0);
                g_scrollMultiplier.store(static_cast<float>(pos));
                UpdateGuiLabels();
                SaveSettingsToRegistry();
            }
            break;
        }
        case WM_COMMAND: {
            if (LOWORD(wParam) == IDC_BTN_CLOSE) {
                Shell_NotifyIconW(NIM_DELETE, &nid); 
                DestroyWindow(hwnd);
            }
            if (LOWORD(wParam) == IDC_CHK_STARTUP) {
                LRESULT checkState = SendMessage(hChkStartup, BM_GETCHECK, 0, 0);
                if (checkState == BST_CHECKED) {
                    SetStartup(TRUE);
                } else {
                    SetStartup(FALSE);
                }
            }
            break;
        }
        case WM_CLOSE: {
            ShowWindow(hwnd, SW_HIDE);
            break;
        }
        case WM_DESTROY: {
            isRunning = false;
            PostQuitMessage(0);
            break;
        }
        default:
            return DefWindowProcA(hwnd, msg, wParam, lParam);
    }
    return 0;
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    // 1. KUNCI UTAMA: Cek Single Instance menggunakan Mutex Named kustom
    hMutex = CreateMutexW(NULL, TRUE, L"Global\\SmoothScrollV6_UniqueMutexName");
    if (hMutex == NULL || GetLastError() == ERROR_ALREADY_EXISTS) {
        if (hMutex) CloseHandle(hMutex);
        return 0; // Instance sudah ada, langsung keluar/terminate silent
    }

    LoadSettingsFromRegistry();

    std::thread animThread(InertiaAnimationLoop);
    animThread.detach();

    mouseHook = SetWindowsHookEx(WH_MOUSE_LL, LowLevelMouseProc, NULL, 0);
    if (!mouseHook) {
        CloseHandle(hMutex);
        return 1;
    }

    const char CLASS_NAME[] = "SmoothScrollFixedANSIClass";
    WNDCLASSA wc = { 0 };
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hbrBackground = (HBRUSH)(COLOR_BTNFACE + 1);
    
    wc.hIcon = LoadIconW(hInstance, MAKEINTRESOURCEW(IDI_MYICON)); 
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);

    RegisterClassA(&wc);

    HWND hwnd = CreateWindowExA(0, CLASS_NAME, "Smooth Scroll Control", 
                                WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX, 
                                CW_USEDEFAULT, CW_USEDEFAULT, 310, 300, 
                                NULL, NULL, hInstance, NULL);

    if (hwnd == NULL) {
        UnhookWindowsHookEx(mouseHook);
        CloseHandle(hMutex);
        return 0;
    }

    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    UnhookWindowsHookEx(mouseHook);
    
    // 2. Lepaskan handle mutex saat aplikasi benar-benar ditutup lewat GUI
    CloseHandle(hMutex); 
    return 0;
}