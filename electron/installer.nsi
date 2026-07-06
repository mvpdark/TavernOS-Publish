; ============================================================

; TavernOS Windows Installer - "Obsidian Gilded" Dark Theme

; Black-gold aesthetic with GDI-painted buttons, dark title bar,

; glass transparency, and Apple-style Chinese typography.

; ============================================================

Unicode true

SetCompressor zlib



!cd "C:\TRAE\TavernOS\Tavern"



; --- Includes ---

!include "MUI2.nsh"

!include "LogicLib.nsh"

!include "FileFunc.nsh"

!include "nsDialogs.nsh"



; --- App Version ---

!ifndef APP_VERSION

  !define APP_VERSION "0.2.0"

!endif



; --- General Settings ---

Name "TavernOS"

OutFile "release\TavernOS-Setup-${APP_VERSION}-x64.exe"

InstallDir "$LOCALAPPDATA\TavernOS"

InstallDirRegKey HKCU "Software\TavernOS" "InstallDir"

RequestExecutionLevel user

ShowInstDetails show

ShowUnInstDetails show

BrandingText "TavernOS"



; --- Icons ---

!define MUI_ICON "electron\build\icon.ico"

!define MUI_UNICON "electron\build\icon.ico"

!define MUI_ABORTWARNING



; --- Header Image ---

!define MUI_HEADERIMAGE

!define MUI_HEADERIMAGE_BITMAP "electron\build\installer-header.bmp"



; --- Welcome/Finish Sidebar ---

!define MUI_WELCOMEFINISHPAGE_BITMAP "electron\build\installer-sidebar.bmp"

!define MUI_UNWELCOMEFINISHPAGE_BITMAP "electron\build\installer-sidebar.bmp"



; --- MUI Background & Text Colors ---

!define MUI_BGCOLOR 0x0A0A0A

!define MUI_TEXTCOLOR 0xE8E8E8



; --- Welcome Page ---

!define MUI_WELCOMEPAGE_TITLE "欢迎使用 TavernOS"

!define MUI_WELCOMEPAGE_TEXT "TavernOS 是一款 AI 驱动的创意写作平台，为小说家、剧本作家和内容创作者而生。$\n$\n✦ AI 智能写作助手 — 协助构思、创作与润色$\n✦ 角色管理系统 — 构建立体人物档案与关系网络$\n✦ 世界观构建器 — 设定、地图与时间线管理$\n✦ 多模态内容生成 — 文字、图像、语音与视频$\n✦ 智能记忆系统 — AI 记住你的每个设定$\n$\n点击「下一步」开始安装。"



; --- Directory Page ---

!define MUI_DIRECTORYPAGE_TEXT_TOP "选择 TavernOS 的安装位置$\n$\n建议使用默认路径以获得最佳体验"



; --- Finish Page ---

!define MUI_FINISHPAGE_TITLE "安装完成"

!define MUI_FINISHPAGE_TEXT "TavernOS 已成功安装到您的计算机。$\n$\n您现在可以：$\n✦ 创建您的第一个故事项目$\n✦ 导入已有的写作素材$\n✦ 探索 AI 驱动的创作工具$\n$\n点击「完成」启动 TavernOS，开启您的创作之旅。"

!define MUI_FINISHPAGE_RUN "$INSTDIR\TavernOS.exe"

!define MUI_FINISHPAGE_RUN_TEXT "立即启动 TavernOS"

!define MUI_FINISHPAGE_NOREBOOTSUPPORT



; --- Uninstall Pages ---

!define MUI_UNWELCOMEPAGE_TITLE "卸载 TavernOS"

!define MUI_UNWELCOMEPAGE_TEXT "您即将卸载 TavernOS。$\n$\n卸载将移除程序文件、快捷方式和注册表项。$\n您的个人数据和项目文件不会被删除。$\n$\n点击「下一步」继续卸载。"

!define MUI_UNFINISHPAGE_TITLE "卸载完成"

!define MUI_UNFINISHPAGE_TEXT "TavernOS 已成功从您的计算机卸载。$\n$\n感谢您使用 TavernOS，期待与您再次相遇。"



; ============================================================

; Color Constants (RRGGBB format for SetCtlColors)

; GDI_* versions are in 0xBBGGRR (COLORREF) for gdi32/user32 calls

; ============================================================

!define DT_BG      0x0C0A08   ; main background (very dark warm black)

!define DT_BG2     0x141210   ; inner bg (slightly lighter dark brown)

!define DT_BTN     0x2C2418   ; button bg (warm dark brown, visible)

!define DT_GOLD    0xD4A84B   ; gold accent (#D4A84B warm gold)

!define DT_DIM     0x706858   ; dim text (warm gray)

!define DT_WHITE   0xE8E0D8   ; warm white text

!define DT_GRAY    0x807060   ; gray text

!define DT_TEXT    0xD0C8BE   ; body text (warm off-white)



; GDI BGR versions for CreateSolidBrush/SetTextColor/SendMessage

!define GDI_BG     0x080A0C

!define GDI_BG2    0x101214

!define GDI_BTN    0x18242C

!define GDI_GOLD   0x4BA8D4

!define GDI_DIM    0x586870

!define GDI_WHITE  0xD8E0E8

!define GDI_GRAY   0x607080

!define GDI_TEXT   0xBEC8D0



; ============================================================

; Win32 Constants

; ============================================================

!ifndef PBM_SETBARCOLOR

  !define PBM_SETBARCOLOR   0x0409

!endif

!ifndef PBM_SETBKCOLOR

  !define PBM_SETBKCOLOR    0x2001

!endif

!ifndef LVM_SETBKCOLOR

  !define LVM_SETBKCOLOR    0x1001

!endif

!ifndef LVM_SETTEXTBKCOLOR

  !define LVM_SETTEXTBKCOLOR 0x1026

!endif

!ifndef LVM_SETTEXTCOLOR

  !define LVM_SETTEXTCOLOR  0x1023

!endif

!ifndef GWL_STYLE

  !define GWL_STYLE        -16

!endif

!ifndef GWL_EXSTYLE

  !define GWL_EXSTYLE      -20

!endif

!ifndef WS_CHILD

  !define WS_CHILD           0x40000000

!endif

!ifndef WS_VISIBLE

  !define WS_VISIBLE         0x10000000

!endif

!ifndef SS_LEFT

  !define SS_LEFT            0x00000000

!endif

!ifndef WS_CLIPCHILDREN

  !define WS_CLIPCHILDREN    0x02000000

!endif

!ifndef WS_EX_CLIENTEDGE

  !define WS_EX_CLIENTEDGE   0x00000200

!endif

!ifndef WS_EX_WINDOWEDGE

  !define WS_EX_WINDOWEDGE   0x00000100

!endif

!ifndef SWP_FRAMECHANGED

  !define SWP_FRAMECHANGED   0x0020

!endif

!ifndef SWP_NOMOVE

  !define SWP_NOMOVE         0x0002

!endif

!ifndef SWP_NOSIZE

  !define SWP_NOSIZE         0x0001

!endif

!ifndef SWP_NOZORDER

  !define SWP_NOZORDER       0x0004

!endif

!ifndef WS_EX_LAYERED

  !define WS_EX_LAYERED    0x80000

!endif

!ifndef LWA_ALPHA

  !define LWA_ALPHA        0x2

!endif

!ifndef WM_SETFONT

  !define WM_SETFONT       0x0030

!endif

!ifndef WM_GETFONT

  !define WM_GETFONT       0x0031

!endif

!ifndef BM_SETIMAGE

  !define BM_SETIMAGE      0x00F7

!endif

!ifndef BS_BITMAP

  !define BS_BITMAP        0x0080

!endif

!define DT_CENTER        0x01

!define DT_VCENTER       0x04

!define DT_SINGLELINE    0x20

!define TRANSPARENT      1

!ifndef IMAGE_BITMAP

  !define IMAGE_BITMAP     0

!endif

!ifndef LR_LOADFROMFILE

  !define LR_LOADFROMFILE  0x10

!endif

!ifndef LR_DEFAULTSIZE

  !define LR_DEFAULTSIZE   0x40

!endif

!ifndef SM_CXSCREEN

  !define SM_CXSCREEN      0

!endif

!ifndef SM_CYSCREEN

  !define SM_CYSCREEN      1

!endif

; DWM Window Attributes

!ifndef DWMWA_WINDOW_CORNER_PREFERENCE

  !define DWMWA_WINDOW_CORNER_PREFERENCE  33

!endif

!ifndef DWMWA_SYSTEMBACKDROP_TYPE

  !define DWMWA_SYSTEMBACKDROP_TYPE       38

!endif

!ifndef DWMWA_MICA_EFFECT

  !define DWMWA_MICA_EFFECT              1029

!endif

; DPI Awareness - prevents Windows bitmap scaling (blurriness) on high-DPI displays

!ifndef DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2

  !define DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2  -4

!endif

; Font quality constants for sharp text rendering

!ifndef CLEARTYPE_QUALITY

  !define CLEARTYPE_QUALITY  5

!endif

; RedrawWindow flags

!ifndef RDW_INVALIDATE

  !define RDW_INVALIDATE  0x0001

!endif

!ifndef RDW_UPDATENOW

  !define RDW_UPDATENOW   0x0100

!endif

!ifndef RDW_ERASE

  !define RDW_ERASE       0x0004

!endif

!ifndef SW_SHOW

  !define SW_SHOW         5

!endif

; DWM Window Corner Preference values

!define DWMWCP_DEFAULT     0

!define DWMWCP_DONOTROUND  1

!define DWMWCP_ROUND       2

!define DWMWCP_ROUNDSMALL  3

; DWM System Backdrop Type values

!define DWMSBT_AUTO        0

!define DWMSBT_NONE        1

!define DWMSBT_MAINWINDOW  2

!define DWMSBT_TRANSIENTWINDOW 3

!define DWMSBT_TABBEDWINDOW   4

; Target window size (2x default ~500x360)

!define INST_WIN_W         1000

!define INST_WIN_H         680



; ============================================================

; Variables

; ============================================================

Var FONT_TITLE

Var FONT_SUBTITLE

Var FONT_BODY

Var FONT_BOLD

Var FONT_SMALL

Var FONT_BTN

Var BTN_HWND

Var DARK_BOOL

Var THEME_TIMER_ACTIVE



; ============================================================

; PaintOneButton - paints $BTN_HWND as dark gold button

; ============================================================

Function PaintOneButton

  Push $0
  Push $1
  Push $2
  Push $3
  Push $4
  Push $5
  Push $6
  Push $7
  Push $8
  Push $9

  ; Get button size from window rect
  System::Alloc 16
  Pop $0
  System::Call 'user32::GetWindowRect(i $BTN_HWND, i $0)'
  System::Call '*$0(i.r1,i.r2,i.r3,i.r4)'
  IntOp $8 $3 - $1
  IntOp $9 $4 - $2

  ; Sanity check size
  ${If} $8 < 20
    StrCpy $8 100
  ${EndIf}
  ${If} $9 < 10
    StrCpy $9 28
  ${EndIf}

  ; Drawing rect = (0,0,w,h)
  System::Call '*$0(i 0, i 0, i $8, i $9)'

  ; Create font
  System::Call 'gdi32::CreateFontW(i -15, i 0, i 0, i 0, i 700, i 0, i 0, i 0, i 134, i 0, i 0, i 5, i 34, w "Microsoft YaHei UI") i .r5'

  ; Get button text
  System::Call 'user32::GetWindowTextLengthW(i $BTN_HWND) i .r6'
  IntOp $6 $6 + 1
  IntOp $7 $6 * 2
  System::Alloc $7
  Pop $4
  System::Call 'user32::GetWindowTextW(i $BTN_HWND, i $4, i $6)'

  ; Create mem DC and bitmap (screen DC)
  System::Call 'user32::GetDC(i 0) i .r1'
  System::Call 'gdi32::CreateCompatibleDC(i $1) i .r2'
  System::Call 'gdi32::CreateCompatibleBitmap(i $1, i $8, i $9) i .r3'
  System::Call 'user32::ReleaseDC(i 0, i $1)'
  System::Call 'gdi32::SelectObject(i $2, i $3) i .r7'

  ; Fill with dark button bg
  System::Call 'gdi32::CreateSolidBrush(i ${GDI_BTN}) i .r1'
  System::Call 'user32::FillRect(i $2, i $0, i $1)'
  System::Call 'gdi32::DeleteObject(i $1)'

  ; Draw gold border (4 edges)
  System::Call 'gdi32::CreateSolidBrush(i ${GDI_GOLD}) i .r1'
  ; top
  System::Call '*$0(i 0, i 0, i $8, i 1)'
  System::Call 'user32::FillRect(i $2, i $0, i $1)'
  ; bottom
  IntOp $6 $9 - 1
  System::Call '*$0(i 0, i $6, i $8, i $9)'
  System::Call 'user32::FillRect(i $2, i $0, i $1)'
  ; left
  System::Call '*$0(i 0, i 0, i 1, i $9)'
  System::Call 'user32::FillRect(i $2, i $0, i $1)'
  ; right
  IntOp $6 $8 - 1
  System::Call '*$0(i $6, i 0, i $8, i $9)'
  System::Call 'user32::FillRect(i $2, i $0, i $1)'
  System::Call 'gdi32::DeleteObject(i $1)'

  ; Text rect (inset by 2px)
  System::Call '*$0(i 2, i 1, i $8, i $9)'

  ; Draw gold text centered
  System::Call 'gdi32::SetTextColor(i $2, i ${GDI_GOLD})'
  System::Call 'gdi32::SetBkMode(i $2, i 1)'
  System::Call 'gdi32::SelectObject(i $2, i $5) i .r6'
  System::Call 'user32::DrawTextW(i $2, i $4, i -1, i $0, i 0x25)'
  System::Call 'gdi32::SelectObject(i $2, i $6)'
  System::Call 'gdi32::DeleteObject(i $5)'

  ; Set BS_BITMAP style
  System::Call 'user32::GetWindowLong(i $BTN_HWND, i ${GWL_STYLE}) i .r1'
  IntOp $1 $1 | 0x80
  System::Call 'user32::SetWindowLong(i $BTN_HWND, i ${GWL_STYLE}, i $1)'

  ; Set bitmap (use System::Call for SendMessage to properly capture return value)
  System::Call 'user32::SendMessage(i $BTN_HWND, i ${BM_SETIMAGE}, i ${IMAGE_BITMAP}, i $3) i .r1'
  ${If} $1 != 0
    System::Call 'gdi32::DeleteObject(i $1)'
  ${EndIf}

  ; Cleanup
  System::Call 'gdi32::SelectObject(i $2, i $7)'
  System::Call 'gdi32::DeleteDC(i $2)'
  System::Free $0
  System::Free $4

  Pop $9
  Pop $8
  Pop $7
  Pop $6
  Pop $5
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd



Function ThemeTimerProc

  Pop $R7  ; Pop timer ID from stack (nsDialogs::CreateTimer passes timer ID)

  nsDialogs::KillTimer $R7

  StrCpy $THEME_TIMER_ACTIVE 2

  Call ApplyDarkTheme

  StrCpy $THEME_TIMER_ACTIVE 0

FunctionEnd



; ============================================================

; ApplyDarkTheme

; ============================================================

Function ApplyDarkTheme

  Push $0

  Push $1

  Push $2

  Push $3

  Push $4

  Push $5

  Push $6

  Push $7

  Push $8

  Push $9


  ; --- Resize window to ~1000x680 and center on screen ---

  System::Call 'user32::GetSystemMetrics(i ${SM_CXSCREEN}) i .r4'

  System::Call 'user32::GetSystemMetrics(i ${SM_CYSCREEN}) i .r5'

  IntOp $4 $4 - ${INST_WIN_W}

  IntOp $4 $4 / 2

  IntOp $5 $5 - ${INST_WIN_H}

  IntOp $5 $5 / 2

  System::Call 'user32::MoveWindow(i $HWNDPARENT, i $4, i $5, i ${INST_WIN_W}, i ${INST_WIN_H}, i 1)'



  ; --- Dark title bar via DWM ---

  System::Alloc 4

  Pop $0

  System::Call '*$0(i 1)'

  System::Call 'dwmapi::DwmSetWindowAttribute(i $HWNDPARENT, i 20, i $0, i 4)'

  System::Call 'dwmapi::DwmSetWindowAttribute(i $HWNDPARENT, i 19, i $0, i 4)'



  ; --- DWM rounded corners (Win11): DWMWCP_ROUND = 2 ---

  System::Call '*$0(i ${DWMWCP_ROUND})'

  System::Call 'dwmapi::DwmSetWindowAttribute(i $HWNDPARENT, i ${DWMWA_WINDOW_CORNER_PREFERENCE}, i $0, i 4)'



  ; --- DWM System Backdrop Type: Tabbed (Win11 22H2+, Mica-like) ---

  System::Call '*$0(i ${DWMSBT_TABBEDWINDOW})'

  System::Call 'dwmapi::DwmSetWindowAttribute(i $HWNDPARENT, i ${DWMWA_SYSTEMBACKDROP_TYPE}, i $0, i 4)'

  System::Call 'user32::GetWindowLong(i $HWNDPARENT, i ${GWL_STYLE}) i .r1'

  IntOp $1 $1 | ${WS_CLIPCHILDREN}

  System::Call 'user32::SetWindowLong(i $HWNDPARENT, i ${GWL_STYLE}, i $1)'



  ; --- DWM Mica Effect (Win11) ---

  System::Call '*$0(i 1)'

  System::Call 'dwmapi::DwmSetWindowAttribute(i $HWNDPARENT, i ${DWMWA_MICA_EFFECT}, i $0, i 4)'



  System::Free $0



  ; --- Window transparency: set layered style, keep opaque (255) for crisp rendering ---

  ; Fade-in from 0->255 is handled in DarkThemeInit at startup

  System::Call 'user32::GetWindowLong(i $HWNDPARENT, i ${GWL_EXSTYLE}) i .r0'

  IntOp $0 $0 | ${WS_EX_LAYERED}

  System::Call 'user32::SetWindowLong(i $HWNDPARENT, i ${GWL_EXSTYLE}, i $0)'

  ; Only set alpha to opaque here (fade-in happens once in DarkThemeInit)

  StrCmp $THEME_TIMER_ACTIVE "" 0 +3

    System::Call 'user32::SetLayeredWindowAttributes(i $HWNDPARENT, i 0, i 255, i ${LWA_ALPHA})'

    Goto +2

    ; Fade is in progress, don't change alpha



  ; --- Outer window ---

  SetCtlColors $HWNDPARENT ${DT_GOLD} ${DT_BG}



  ; --- Resize inner dialog (#32770) - leave room for buttons ---

  FindWindow $R0 "#32770" "" $HWNDPARENT

  ; If no finish control (1201), might be old InstFiles dialog, try next

  GetDlgItem $R6 $R0 1201

  ${If} $R6 == 0

    FindWindow $R7 "#32770" "" $HWNDPARENT $R0

    ${If} $R7 != 0

      StrCpy $R0 $R7

    ${EndIf}

  ${EndIf}

  ${If} $R0 != 0

    System::Alloc 16

    Pop $R1

    System::Call 'user32::GetClientRect(i $HWNDPARENT, i $R1)'

    System::Call '*$R1(i .r2, i .r3, i .r4, i .r5)'

    ; $4 = client width, $5 = client height

    ; Reserve 35px at bottom for button area

    IntOp $R8 $5 - 35

    System::Call 'user32::MoveWindow(i $R0, i 0, i 0, i $4, i $R8, i 1)'

    System::Free $R1

  ${EndIf}



  ; --- Reposition outer controls for 1000x680 layout ---

  ; Button Y = client height - 30 (dynamic)

  IntOp $R9 $5 - 30

  ; Back button (3)

  GetDlgItem $R0 $HWNDPARENT 3

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 680, i $R9, i 100, i 28, i 1)'

  ${EndIf}

  ; Next button (1)

  GetDlgItem $R0 $HWNDPARENT 1

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 790, i $R9, i 100, i 28, i 1)'

  ${EndIf}

  ; Cancel button (2)

  GetDlgItem $R0 $HWNDPARENT 2

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 900, i $R9, i 90, i 28, i 1)'

  ${EndIf}

  ; Branding text (1256) - at bottom left

  IntOp $R9 $5 - 22

  GetDlgItem $R0 $HWNDPARENT 1256

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 10, i $R9, i 300, i 18, i 1)'

  ${EndIf}

  ; Header title (1037) - wider for 1000px window

  GetDlgItem $R0 $HWNDPARENT 1037

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 20, i 10, i 660, i 30, i 1)'

  ${EndIf}

  ; Header subtext (1038) - wider for 1000px window

  GetDlgItem $R0 $HWNDPARENT 1038

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 20, i 45, i 660, i 25, i 1)'

  ${EndIf}

  ; Header bitmap (1046) - top right, 2x size (visible on directory/instfiles pages)

  GetDlgItem $R0 $HWNDPARENT 1046

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 700, i 0, i 300, i 114, i 1)'

  ${EndIf}



  ; --- Branding text (1256) ---

  GetDlgItem $0 $HWNDPARENT 1256

  ${If} $0 != 0

    SetCtlColors $0 ${DT_DIM} ${DT_BG}

    SendMessage $0 ${WM_SETFONT} $FONT_SMALL 1

  ${EndIf}



  ; --- Header title (1037) ---

  GetDlgItem $0 $HWNDPARENT 1037

  ${If} $0 != 0

    SetCtlColors $0 ${DT_GOLD} ${DT_BG}

    SendMessage $0 ${WM_SETFONT} $FONT_SUBTITLE 1

  ${EndIf}



  ; --- Header subtext (1038) ---

  GetDlgItem $0 $HWNDPARENT 1038

  ${If} $0 != 0

    SetCtlColors $0 ${DT_TEXT} ${DT_BG}

    SendMessage $0 ${WM_SETFONT} $FONT_BODY 1

  ${EndIf}



  ; --- Paint bottom button area background dark ---

  GetDlgItem $R0 $HWNDPARENT 1036

  ${If} $R0 != 0

    SetCtlColors $R0 ${DT_BG} ${DT_BG}

    System::Call 'user32::SetWindowPos(i $R0, i 0, i 0, i 0, i $4, i 2, i 0x027)'

  ${EndIf}

  GetDlgItem $R0 $HWNDPARENT 1045

  ${If} $R0 != 0

    SetCtlColors $R0 ${DT_BG} ${DT_BG}

  ${EndIf}



  ; --- Outer buttons (Back=3, Next=1, Cancel=2) - dark themed buttons ---

  StrCpy $3 1

  ${While} $3 <= 3

    GetDlgItem $BTN_HWND $HWNDPARENT $3

    ${If} $BTN_HWND != 0

      System::Call 'uxtheme::SetWindowTheme(i $BTN_HWND, w "", w "")'

      System::Call 'user32::GetWindowLong(i $BTN_HWND, i ${GWL_STYLE}) i .r9'

      IntOp $9 $9 & 0xFFFFEFFE ; remove BS_DEFPUSHBUTTON if set, keep BS_PUSHBUTTON

      System::Call 'user32::SetWindowLong(i $BTN_HWND, i ${GWL_STYLE}, i $9)'

      SendMessage $BTN_HWND ${WM_SETFONT} $FONT_BTN 1

      SetCtlColors $BTN_HWND ${DT_GOLD} ${DT_BTN}

      System::Call 'user32::InvalidateRect(i $BTN_HWND, i 0, i 1)'

    ${EndIf}

    IntOp $3 $3 + 1

  ${EndWhile}

  ; --- Inner dialog ---

  FindWindow $0 "#32770" "" $HWNDPARENT

  ; If no finish control (1201), might be old InstFiles dialog, try next

  GetDlgItem $R6 $0 1201

  ${If} $R6 == 0

    FindWindow $R7 "#32770" "" $HWNDPARENT $0

    ${If} $R7 != 0

      StrCpy $0 $R7

    ${EndIf}

  ${EndIf}

  ${If} $0 != 0

    SetCtlColors $0 ${DT_TEXT} ${DT_BG}

    System::Call 'user32::InvalidateRect(i $0, i 0, i 1)'



    ; --- Reposition inner controls for 1000x680 layout ---

    ; $R8 = inner dialog height (set by outer repositioning code)

    ; Detect page type by checking for welcome/finish title (1201)

    GetDlgItem $R6 $0 1201

    ${If} $R6 != 0

      ; === Welcome/Finish page ===

      ; Hide outer header controls (welcome/finish have their own titles in sidebar)

      GetDlgItem $R7 $HWNDPARENT 1037

      ${If} $R7 != 0

        System::Call 'user32::ShowWindow(i $R7, i 0)'

      ${EndIf}

      GetDlgItem $R7 $HWNDPARENT 1038

      ${If} $R7 != 0

        System::Call 'user32::ShowWindow(i $R7, i 0)'

      ${EndIf}

      GetDlgItem $R7 $HWNDPARENT 1046

      ${If} $R7 != 0

        System::Call 'user32::ShowWindow(i $R7, i 0)'

      ${EndIf}

      ; Sidebar bitmap (1200) - left side, full inner dialog height

      GetDlgItem $R7 $0 1200

      ${If} $R7 != 0

        System::Call 'user32::MoveWindow(i $R7, i 0, i 0, i 328, i $R8, i 1)'

      ${EndIf}

      ; Welcome/Finish title (1201) - large, top of content area

      System::Call 'user32::MoveWindow(i $R6, i 360, i 40, i 600, i 50, i 1)'

      SetCtlColors $R6 ${DT_GOLD} ${DT_BG}

      SendMessage $R6 ${WM_SETFONT} $FONT_TITLE 1

      System::Call 'user32::InvalidateRect(i $R6, i 0, i 1)'

      ; Welcome/Finish text (1202) - fill remaining space (leave room for checkbox)

      GetDlgItem $R6 $0 1202

      ${If} $R6 != 0

        IntOp $R7 $R8 - 160

        System::Call 'user32::MoveWindow(i $R6, i 360, i 100, i 600, i $R7, i 1)'

        SetCtlColors $R6 ${DT_TEXT} ${DT_BG}

        SendMessage $R6 ${WM_SETFONT} $FONT_BODY 1

      ${EndIf}

      ; Checkboxes (finish page): 1002, 1003 - near bottom

      GetDlgItem $R6 $0 1002

      ${If} $R6 != 0

        IntOp $R7 $R8 - 90

        System::Call 'user32::MoveWindow(i $R6, i 360, i $R7, i 600, i 30, i 1)'

        SetCtlColors $R6 ${DT_TEXT} ${DT_BG}

        SendMessage $R6 ${WM_SETFONT} $FONT_BODY 1

      ${EndIf}

      GetDlgItem $R6 $0 1003

      ${If} $R6 != 0

        IntOp $R7 $R8 - 55

        System::Call 'user32::MoveWindow(i $R6, i 360, i $R7, i 600, i 30, i 1)'

        SetCtlColors $R6 ${DT_TEXT} ${DT_BG}

        SendMessage $R6 ${WM_SETFONT} $FONT_BODY 1

      ${EndIf}

      ; Finish page launch checkbox (1203)

      GetDlgItem $R6 $0 1203

      ${If} $R6 != 0

        IntOp $R7 $R8 - 50

        System::Call 'user32::MoveWindow(i $R6, i 360, i $R7, i 600, i 30, i 1)'

        SetCtlColors $R6 ${DT_TEXT} ${DT_BG}

        SendMessage $R6 ${WM_SETFONT} $FONT_BODY 1

      ${EndIf}

      ; Checkbox (1216) - dark checkbox text

      GetDlgItem $R7 $0 1216

      ${If} $R7 != 0

        SetCtlColors $R7 ${DT_TEXT} ${DT_BG}

        SendMessage $R7 ${WM_SETFONT} $FONT_BODY 1

      ${EndIf}

    ${Else}

      ; === Directory or InstFiles page ===

      ; Show outer header controls (title/subtitle/header bitmap)

      GetDlgItem $R7 $HWNDPARENT 1037

      ${If} $R7 != 0

        System::Call 'user32::ShowWindow(i $R7, i 1)'

      ${EndIf}

      GetDlgItem $R7 $HWNDPARENT 1038

      ${If} $R7 != 0

        System::Call 'user32::ShowWindow(i $R7, i 1)'

      ${EndIf}

      GetDlgItem $R7 $HWNDPARENT 1046

      ${If} $R7 != 0

        System::Call 'user32::ShowWindow(i $R7, i 1)'

      ${EndIf}

      ; Check for directory path box (1019)

      GetDlgItem $R6 $0 1019

      ${If} $R6 != 0

        ; === Directory page ===

        ; Hide group box (1020) - white border looks bad on dark theme

        GetDlgItem $R7 $0 1020

        ${If} $R7 != 0

          System::Call 'user32::ShowWindow(i $R7, i 0)'

        ${EndIf}

        ; Hide standalone label 1006 and 1009 (redundant, header already says what to do)

        GetDlgItem $R7 $0 1006

        ${If} $R7 != 0

          System::Call 'user32::ShowWindow(i $R7, i 0)'

        ${EndIf}

        GetDlgItem $R7 $0 1009

        ${If} $R7 != 0

          System::Call 'user32::ShowWindow(i $R7, i 0)'

        ${EndIf}

        ; Directory path label - add our own label

        System::Call 'user32::CreateWindowEx(i 0, w "STATIC", w "目标文件夹：", i ${WS_CHILD}|${WS_VISIBLE}|${SS_LEFT}, i 30, i 135, i 200, i 22, i $0, i 2001, i 0, i 0) i .r7'

        ${If} $7 != 0

          SetCtlColors $7 ${DT_TEXT} ${DT_BG}

          SendMessage $7 ${WM_SETFONT} $FONT_BODY 1

        ${EndIf}

        ; Path edit field (1019) - dark themed

        GetDlgItem $R7 $0 1019

        ${If} $R7 != 0

          System::Call 'user32::MoveWindow(i $R7, i 30, i 162, i 820, i 28, i 1)'

          SetCtlColors $R7 ${DT_WHITE} ${DT_BG2}

          SendMessage $R7 ${WM_SETFONT} $FONT_BODY 1

        ${EndIf}

        ; Browse button (1001) - dark styled

        GetDlgItem $R7 $0 1001

        ${If} $R7 != 0

          System::Call 'user32::MoveWindow(i $R7, i 860, i 162, i 110, i 28, i 1)'

          SetCtlColors $R7 ${DT_TEXT} ${DT_BTN}

          SendMessage $R7 ${WM_SETFONT} $FONT_BTN 1

        ${EndIf}

        ; Space info labels

        GetDlgItem $R7 $0 1023

        ${If} $R7 != 0

          System::Call 'user32::MoveWindow(i $R7, i 30, i 205, i 500, i 22, i 1)'

          SetCtlColors $R7 ${DT_DIM} ${DT_BG}

          SendMessage $R7 ${WM_SETFONT} $FONT_BODY 1

        ${EndIf}

        GetDlgItem $R7 $0 1024

        ${If} $R7 != 0

          System::Call 'user32::MoveWindow(i $R7, i 30, i 230, i 500, i 22, i 1)'

          SetCtlColors $R7 ${DT_DIM} ${DT_BG}

          SendMessage $R7 ${WM_SETFONT} $FONT_BODY 1

        ${EndIf}

      ${Else}

        ; === InstFiles page ===

        ; Progress bar - dark themed gold

        FindWindow $R7 "msctls_progress32" "" $0

        ${If} $R7 == 0

          FindWindow $R7 "msctls_progress32" "" $HWNDPARENT

        ${EndIf}

        ${If} $R7 != 0

          System::Call 'uxtheme::SetWindowTheme(i $R7, w "", w "")'

          System::Call 'user32::MoveWindow(i $R7, i 30, i 130, i 940, i 22, i 1)'

          SendMessage $R7 ${PBM_SETBARCOLOR} 0 ${GDI_GOLD}

          SendMessage $R7 ${PBM_SETBKCOLOR} 0 ${GDI_BG}

          SendMessage $R7 ${WM_SETFONT} $FONT_BODY 1

        ${EndIf}

        ; Install details list view

        FindWindow $R7 "SysListView32" "" $0

        ${If} $R7 == 0

          FindWindow $R7 "SysListView32" "" $HWNDPARENT

        ${EndIf}

        ${If} $R7 != 0

          System::Call 'uxtheme::SetWindowTheme(i $R7, w "", w "")'

          System::Alloc 16

          Pop $R1

          System::Call 'user32::GetClientRect(i $0, i $R1)'

          System::Call '*$R1(i .r2, i .r3, i .r4, i .r5)'

          IntOp $R8 $5 - 195

          System::Call 'user32::MoveWindow(i $R7, i 30, i 165, i 940, i $R8, i 1)'

          SendMessage $R7 ${LVM_SETBKCOLOR} 0 ${GDI_BG}

          SendMessage $R7 ${LVM_SETTEXTBKCOLOR} 0 0xFFFFFFFF

          SendMessage $R7 ${LVM_SETTEXTCOLOR} 0 ${GDI_TEXT}

          SendMessage $R7 ${WM_SETFONT} $FONT_BODY 1

          ; Remove extended border styles

          System::Call 'user32::GetWindowLong(i $R7, i ${GWL_EXSTYLE}) i .r9'

          IntOp $9 $9 & 0xFFFFFEFF ; remove WS_EX_CLIENTEDGE (0x200)

          IntOp $9 $9 & 0xFFFFFDFF ; remove WS_EX_WINDOWEDGE (0x100)

          System::Call 'user32::SetWindowLong(i $R7, i ${GWL_EXSTYLE}, i $9)'

          System::Call 'user32::SetWindowPos(i $R7, i 0, i 0, i 0, i 0, i 0, i ${SWP_FRAMECHANGED}|${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOZORDER})'

          System::Free $R1

        ${EndIf}

      ${EndIf}

    ${EndIf}



    ; Theme all inner controls

    StrCpy $1 0

    ${While} $1 <= 1300

      GetDlgItem $2 $0 $1

      ${If} $2 != 0

        System::Call 'uxtheme::SetWindowTheme(i $2, w "", w "")'

        SetCtlColors $2 ${DT_TEXT} ${DT_BG}

        SendMessage $2 ${WM_SETFONT} $FONT_BODY 1

      ${EndIf}

      IntOp $1 $1 + 1

    ${EndWhile}



    ; Welcome title (1201) -> gold

    GetDlgItem $1 $0 1201

    ${If} $1 != 0

      SetCtlColors $1 ${DT_GOLD} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_TITLE 1

    ${EndIf}

    ; Sidebar bitmap background (1200)

    GetDlgItem $1 $0 1200

    ${If} $1 != 0

      SetCtlColors $1 ${DT_BG} ${DT_BG}

    ${EndIf}

    ; Page subtitle (1006) -> gold (only on welcome/finish pages where it's visible)

    GetDlgItem $1 $0 1201

    ${If} $1 != 0

      GetDlgItem $1 $0 1006

      ${If} $1 != 0

        SetCtlColors $1 ${DT_GOLD} ${DT_BG}

        SendMessage $1 ${WM_SETFONT} $FONT_SUBTITLE 1

      ${EndIf}

    ${EndIf}

    ; Welcome text (1202)

    GetDlgItem $1 $0 1202

    ${If} $1 != 0

      SetCtlColors $1 ${DT_TEXT} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}



    ; Inner buttons (1/2/3)

    StrCpy $3 1

    ${While} $3 <= 3

      GetDlgItem $1 $0 $3

      ${If} $1 != 0

        System::Call 'uxtheme::SetWindowTheme(i $1, w "", w "")'

        SendMessage $1 ${WM_SETFONT} $FONT_BTN 1

        SetCtlColors $1 ${DT_GOLD} ${DT_BTN}

      ${EndIf}

      IntOp $3 $3 + 1

    ${EndWhile}



    ; Browse button (1001)

    GetDlgItem $1 $0 1001

    ${If} $1 != 0

      System::Call 'uxtheme::SetWindowTheme(i $1, w "", w "")'

      SendMessage $1 ${WM_SETFONT} $FONT_BTN 1

      SetCtlColors $1 ${DT_GOLD} ${DT_BTN}

    ${EndIf}



    ; Directory label (1009)

    GetDlgItem $1 $0 1009

    ${If} $1 != 0

      SetCtlColors $1 ${DT_TEXT} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}


    ; Group box (1020)

    GetDlgItem $1 $0 1020

    ${If} $1 != 0

      SetCtlColors $1 ${DT_TEXT} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}


    ; Progress bar

    FindWindow $1 "msctls_progress32" "" $0

    ${If} $1 == 0

      FindWindow $1 "msctls_progress32" "" $HWNDPARENT

    ${EndIf}

    ${If} $1 != 0

      System::Call 'uxtheme::SetWindowTheme(i $1, w "", w "")'

      SendMessage $1 ${PBM_SETBARCOLOR} 0 ${GDI_GOLD}

      SendMessage $1 ${PBM_SETBKCOLOR} 0 ${GDI_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}



    ; Details list (SysListView32) - dark background

    FindWindow $1 "SysListView32" "" $0

    ${If} $1 == 0

      FindWindow $1 "SysListView32" "" $HWNDPARENT

    ${EndIf}

    ${If} $1 != 0

      System::Call 'uxtheme::SetWindowTheme(i $1, w "", w "")'

      SendMessage $1 ${LVM_SETBKCOLOR} 0 ${GDI_BG}

      SendMessage $1 ${LVM_SETTEXTBKCOLOR} 0 0xFFFFFFFF

      SendMessage $1 ${LVM_SETTEXTCOLOR} 0 ${GDI_TEXT}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

      ; Remove extended border styles

      System::Call 'user32::GetWindowLong(i $1, i ${GWL_EXSTYLE}) i .r9'

      IntOp $9 $9 & 0xFFFFFEFF ; remove WS_EX_CLIENTEDGE (0x200)

      IntOp $9 $9 & 0xFFFFFDFF ; remove WS_EX_WINDOWEDGE (0x100)

      System::Call 'user32::SetWindowLong(i $1, i ${GWL_EXSTYLE}, i $9)'

      System::Call 'user32::SetWindowPos(i $1, i 0, i 0, i 0, i 0, i 0, i ${SWP_FRAMECHANGED}|${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOZORDER})'

    ${EndIf}



    ; Directory text box (1019)

    GetDlgItem $1 $0 1019

    ${If} $1 != 0

      SetCtlColors $1 ${DT_WHITE} ${DT_BG2}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}



    ; Checkboxes (1002, 1003)

    GetDlgItem $1 $0 1002

    ${If} $1 != 0

      SetCtlColors $1 ${DT_TEXT} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}

    GetDlgItem $1 $0 1003

    ${If} $1 != 0

      SetCtlColors $1 ${DT_TEXT} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}

    ; Finish page launch checkbox (1203)

    GetDlgItem $1 $0 1203

    ${If} $1 != 0

      SetCtlColors $1 ${DT_GOLD} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}



    ; Space labels (1023, 1024)

    GetDlgItem $1 $0 1023

    ${If} $1 != 0

      SetCtlColors $1 ${DT_DIM} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}

    GetDlgItem $1 $0 1024

    ${If} $1 != 0

      SetCtlColors $1 ${DT_DIM} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}

  ${EndIf}



  ; Set delayed re-apply timer (200ms) - helps with finish page

  ; where MUI recreates the inner dialog after Show callback

  ${If} $THEME_TIMER_ACTIVE == 0

    StrCpy $THEME_TIMER_ACTIVE 1

    nsDialogs::CreateTimer ThemeTimerProc 200

  ${EndIf}




  ; --- Force full repaint ---

  System::Call 'user32::RedrawWindow(i $HWNDPARENT, i 0, i 0, i ${RDW_INVALIDATE}|${RDW_UPDATENOW}|${RDW_ERASE})'



  Pop $9

  Pop $8

  Pop $7

  Pop $6

  Pop $5

  Pop $4

  Pop $3

  Pop $2

  Pop $1

  Pop $0

FunctionEnd



; ============================================================

; Uninstaller PaintOneButton

; ============================================================

Function un.PaintOneButton

  Push $0
  Push $1
  Push $2
  Push $3
  Push $4
  Push $5
  Push $6
  Push $7
  Push $8
  Push $9

  ; Get button size from window rect
  System::Alloc 16
  Pop $0
  System::Call 'user32::GetWindowRect(i $BTN_HWND, i $0)'
  System::Call '*$0(i.r1,i.r2,i.r3,i.r4)'
  IntOp $8 $3 - $1
  IntOp $9 $4 - $2

  ; Sanity check size
  ${If} $8 < 20
    StrCpy $8 100
  ${EndIf}
  ${If} $9 < 10
    StrCpy $9 28
  ${EndIf}

  ; Drawing rect = (0,0,w,h)
  System::Call '*$0(i 0, i 0, i $8, i $9)'

  ; Create font
  System::Call 'gdi32::CreateFontW(i -15, i 0, i 0, i 0, i 700, i 0, i 0, i 0, i 134, i 0, i 0, i 5, i 34, w "Microsoft YaHei UI") i .r5'

  ; Get button text
  System::Call 'user32::GetWindowTextLengthW(i $BTN_HWND) i .r6'
  IntOp $6 $6 + 1
  IntOp $7 $6 * 2
  System::Alloc $7
  Pop $4
  System::Call 'user32::GetWindowTextW(i $BTN_HWND, i $4, i $6)'

  ; Create mem DC and bitmap (screen DC)
  System::Call 'user32::GetDC(i 0) i .r1'
  System::Call 'gdi32::CreateCompatibleDC(i $1) i .r2'
  System::Call 'gdi32::CreateCompatibleBitmap(i $1, i $8, i $9) i .r3'
  System::Call 'user32::ReleaseDC(i 0, i $1)'
  System::Call 'gdi32::SelectObject(i $2, i $3) i .r7'

  ; Fill with dark button bg
  System::Call 'gdi32::CreateSolidBrush(i ${GDI_BTN}) i .r1'
  System::Call 'user32::FillRect(i $2, i $0, i $1)'
  System::Call 'gdi32::DeleteObject(i $1)'

  ; Draw gold border (4 edges)
  System::Call 'gdi32::CreateSolidBrush(i ${GDI_GOLD}) i .r1'
  ; top
  System::Call '*$0(i 0, i 0, i $8, i 1)'
  System::Call 'user32::FillRect(i $2, i $0, i $1)'
  ; bottom
  IntOp $6 $9 - 1
  System::Call '*$0(i 0, i $6, i $8, i $9)'
  System::Call 'user32::FillRect(i $2, i $0, i $1)'
  ; left
  System::Call '*$0(i 0, i 0, i 1, i $9)'
  System::Call 'user32::FillRect(i $2, i $0, i $1)'
  ; right
  IntOp $6 $8 - 1
  System::Call '*$0(i $6, i 0, i $8, i $9)'
  System::Call 'user32::FillRect(i $2, i $0, i $1)'
  System::Call 'gdi32::DeleteObject(i $1)'

  ; Text rect (inset by 2px)
  System::Call '*$0(i 2, i 1, i $8, i $9)'

  ; Draw gold text centered
  System::Call 'gdi32::SetTextColor(i $2, i ${GDI_GOLD})'
  System::Call 'gdi32::SetBkMode(i $2, i 1)'
  System::Call 'gdi32::SelectObject(i $2, i $5) i .r6'
  System::Call 'user32::DrawTextW(i $2, i $4, i -1, i $0, i 0x25)'
  System::Call 'gdi32::SelectObject(i $2, i $6)'
  System::Call 'gdi32::DeleteObject(i $5)'

  ; Set BS_BITMAP style
  System::Call 'user32::GetWindowLong(i $BTN_HWND, i ${GWL_STYLE}) i .r1'
  IntOp $1 $1 | 0x80
  System::Call 'user32::SetWindowLong(i $BTN_HWND, i ${GWL_STYLE}, i $1)'

  ; Set bitmap (use System::Call for SendMessage to properly capture return value)
  System::Call 'user32::SendMessage(i $BTN_HWND, i ${BM_SETIMAGE}, i ${IMAGE_BITMAP}, i $3) i .r1'
  ${If} $1 != 0
    System::Call 'gdi32::DeleteObject(i $1)'
  ${EndIf}

  ; Cleanup
  System::Call 'gdi32::SelectObject(i $2, i $7)'
  System::Call 'gdi32::DeleteDC(i $2)'
  System::Free $0
  System::Free $4

  Pop $9
  Pop $8
  Pop $7
  Pop $6
  Pop $5
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd



Function un.ApplyDarkTheme

  Push $0

  Push $1

  Push $2

  Push $3

  Push $4

  Push $5

  Push $6

  Push $7

  Push $8

  Push $9


  StrCpy $DARK_BOOL 1



  ; --- Resize window to ~1000x680 and center on screen ---

  System::Call 'user32::GetSystemMetrics(i ${SM_CXSCREEN}) i .r4'

  System::Call 'user32::GetSystemMetrics(i ${SM_CYSCREEN}) i .r5'

  IntOp $4 $4 - ${INST_WIN_W}

  IntOp $4 $4 / 2

  IntOp $5 $5 - ${INST_WIN_H}

  IntOp $5 $5 / 2

  System::Call 'user32::MoveWindow(i $HWNDPARENT, i $4, i $5, i ${INST_WIN_W}, i ${INST_WIN_H}, i 1)'



  ; --- Dark title bar via DWM ---

  System::Alloc 4

  Pop $0

  System::Call '*$0(i 1)'

  System::Call 'dwmapi::DwmSetWindowAttribute(i $HWNDPARENT, i 20, i $0, i 4)'

  System::Call 'dwmapi::DwmSetWindowAttribute(i $HWNDPARENT, i 19, i $0, i 4)'



  ; --- DWM rounded corners (Win11): DWMWCP_ROUND = 2 ---

  System::Call '*$0(i ${DWMWCP_ROUND})'

  System::Call 'dwmapi::DwmSetWindowAttribute(i $HWNDPARENT, i ${DWMWA_WINDOW_CORNER_PREFERENCE}, i $0, i 4)'



  ; --- DWM System Backdrop Type: Tabbed (Win11 22H2+, Mica-like) ---

  System::Call '*$0(i ${DWMSBT_TABBEDWINDOW})'

  System::Call 'dwmapi::DwmSetWindowAttribute(i $HWNDPARENT, i ${DWMWA_SYSTEMBACKDROP_TYPE}, i $0, i 4)'

  System::Call 'user32::GetWindowLong(i $HWNDPARENT, i ${GWL_STYLE}) i .r1'

  IntOp $1 $1 | ${WS_CLIPCHILDREN}

  System::Call 'user32::SetWindowLong(i $HWNDPARENT, i ${GWL_STYLE}, i $1)'



  ; --- DWM Mica Effect (Win11) ---

  System::Call '*$0(i 1)'

  System::Call 'dwmapi::DwmSetWindowAttribute(i $HWNDPARENT, i ${DWMWA_MICA_EFFECT}, i $0, i 4)'



  System::Free $0



  ; --- Window transparency: set layered style, keep opaque (255) for crisp rendering ---

  ; Fade-in from 0->255 is handled in DarkThemeInit at startup

  System::Call 'user32::GetWindowLong(i $HWNDPARENT, i ${GWL_EXSTYLE}) i .r0'

  IntOp $0 $0 | ${WS_EX_LAYERED}

  System::Call 'user32::SetWindowLong(i $HWNDPARENT, i ${GWL_EXSTYLE}, i $0)'

  ; Only set alpha to opaque here (fade-in happens once in DarkThemeInit)

  StrCmp $THEME_TIMER_ACTIVE "" 0 +3

    System::Call 'user32::SetLayeredWindowAttributes(i $HWNDPARENT, i 0, i 255, i ${LWA_ALPHA})'

    Goto +2

    ; Fade is in progress, don't change alpha



  SetCtlColors $HWNDPARENT ${DT_GOLD} ${DT_BG}



  ; --- Resize inner dialog (#32770) - leave room for buttons ---

  FindWindow $R0 "#32770" "" $HWNDPARENT

  ; If no finish control (1201), might be old InstFiles dialog, try next

  GetDlgItem $R6 $R0 1201

  ${If} $R6 == 0

    FindWindow $R7 "#32770" "" $HWNDPARENT $R0

    ${If} $R7 != 0

      StrCpy $R0 $R7

    ${EndIf}

  ${EndIf}

  ${If} $R0 != 0

    System::Alloc 16

    Pop $R1

    System::Call 'user32::GetClientRect(i $HWNDPARENT, i $R1)'

    System::Call '*$R1(i .r2, i .r3, i .r4, i .r5)'

    ; $4 = client width, $5 = client height

    ; Reserve 35px at bottom for button area

    IntOp $R8 $5 - 35

    System::Call 'user32::MoveWindow(i $R0, i 0, i 0, i $4, i $R8, i 1)'

    System::Free $R1

  ${EndIf}



  ; --- Reposition outer controls for 1000x680 layout ---

  ; Button Y = client height - 30 (dynamic)

  IntOp $R9 $5 - 30

  ; Back button (3)

  GetDlgItem $R0 $HWNDPARENT 3

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 680, i $R9, i 100, i 28, i 1)'

  ${EndIf}

  ; Next button (1)

  GetDlgItem $R0 $HWNDPARENT 1

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 790, i $R9, i 100, i 28, i 1)'

  ${EndIf}

  ; Cancel button (2)

  GetDlgItem $R0 $HWNDPARENT 2

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 900, i $R9, i 90, i 28, i 1)'

  ${EndIf}

  ; Branding text (1256) - at bottom left

  IntOp $R9 $5 - 22

  GetDlgItem $R0 $HWNDPARENT 1256

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 10, i $R9, i 300, i 18, i 1)'

  ${EndIf}

  ; Header title (1037) - wider for 1000px window

  GetDlgItem $R0 $HWNDPARENT 1037

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 20, i 10, i 660, i 30, i 1)'

  ${EndIf}

  ; Header subtext (1038) - wider for 1000px window

  GetDlgItem $R0 $HWNDPARENT 1038

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 20, i 45, i 660, i 25, i 1)'

  ${EndIf}

  ; Header bitmap (1046) - top right, 2x size

  GetDlgItem $R0 $HWNDPARENT 1046

  ${If} $R0 != 0

    System::Call 'user32::MoveWindow(i $R0, i 700, i 0, i 300, i 114, i 1)'

  ${EndIf}



  GetDlgItem $0 $HWNDPARENT 1256

  ${If} $0 != 0

    SetCtlColors $0 ${DT_DIM} ${DT_BG}

    SendMessage $0 ${WM_SETFONT} $FONT_SMALL 1

  ${EndIf}



  ; --- Outer buttons (Back=3, Next=1, Cancel=2) - dark themed buttons ---

  StrCpy $3 1

  ${While} $3 <= 3

    GetDlgItem $BTN_HWND $HWNDPARENT $3

    ${If} $BTN_HWND != 0

      System::Call 'uxtheme::SetWindowTheme(i $BTN_HWND, w "", w "")'

      System::Call 'user32::GetWindowLong(i $BTN_HWND, i ${GWL_STYLE}) i .r9'

      IntOp $9 $9 & 0xFFFFEFFE ; remove BS_DEFPUSHBUTTON if set, keep BS_PUSHBUTTON

      System::Call 'user32::SetWindowLong(i $BTN_HWND, i ${GWL_STYLE}, i $9)'

      SendMessage $BTN_HWND ${WM_SETFONT} $FONT_BTN 1

      SetCtlColors $BTN_HWND ${DT_GOLD} ${DT_BTN}

      System::Call 'user32::InvalidateRect(i $BTN_HWND, i 0, i 1)'

    ${EndIf}

    IntOp $3 $3 + 1

  ${EndWhile}

  FindWindow $0 "#32770" "" $HWNDPARENT

  ; If no finish control (1201), might be old InstFiles dialog, try next

  GetDlgItem $R6 $0 1201

  ${If} $R6 == 0

    FindWindow $R7 "#32770" "" $HWNDPARENT $0

    ${If} $R7 != 0

      StrCpy $0 $R7

    ${EndIf}

  ${EndIf}

  ${If} $0 != 0

    SetCtlColors $0 ${DT_TEXT} ${DT_BG}

    System::Call 'user32::InvalidateRect(i $0, i 0, i 1)'



    ; --- Reposition inner controls for 1000x680 layout ---

    ; $R8 = inner dialog height (set by outer repositioning code)

    ; Detect page type by checking for welcome/finish title (1201)

    GetDlgItem $R6 $0 1201

    ${If} $R6 != 0

      ; === Welcome/Finish page ===

      ; Hide outer header controls (welcome/finish have their own titles in sidebar)

      GetDlgItem $R7 $HWNDPARENT 1037

      ${If} $R7 != 0

        System::Call 'user32::ShowWindow(i $R7, i 0)'

      ${EndIf}

      GetDlgItem $R7 $HWNDPARENT 1038

      ${If} $R7 != 0

        System::Call 'user32::ShowWindow(i $R7, i 0)'

      ${EndIf}

      GetDlgItem $R7 $HWNDPARENT 1046

      ${If} $R7 != 0

        System::Call 'user32::ShowWindow(i $R7, i 0)'

      ${EndIf}

      ; Sidebar bitmap (1200) - left side, full inner dialog height

      GetDlgItem $R7 $0 1200

      ${If} $R7 != 0

        System::Call 'user32::MoveWindow(i $R7, i 0, i 0, i 328, i $R8, i 1)'

      ${EndIf}

      ; Welcome/Finish title (1201) - large, top of content area

      System::Call 'user32::MoveWindow(i $R6, i 360, i 40, i 600, i 50, i 1)'

      SetCtlColors $R6 ${DT_GOLD} ${DT_BG}

      SendMessage $R6 ${WM_SETFONT} $FONT_TITLE 1

      System::Call 'user32::InvalidateRect(i $R6, i 0, i 1)'

      ; Welcome/Finish text (1202) - fill remaining space (leave room for checkbox)

      GetDlgItem $R6 $0 1202

      ${If} $R6 != 0

        IntOp $R7 $R8 - 160

        System::Call 'user32::MoveWindow(i $R6, i 360, i 100, i 600, i $R7, i 1)'

        SetCtlColors $R6 ${DT_TEXT} ${DT_BG}

        SendMessage $R6 ${WM_SETFONT} $FONT_BODY 1

      ${EndIf}

      ; Checkboxes (finish page): 1002, 1003 - near bottom

      GetDlgItem $R6 $0 1002

      ${If} $R6 != 0

        IntOp $R7 $R8 - 90

        System::Call 'user32::MoveWindow(i $R6, i 360, i $R7, i 600, i 30, i 1)'

        SetCtlColors $R6 ${DT_TEXT} ${DT_BG}

        SendMessage $R6 ${WM_SETFONT} $FONT_BODY 1

      ${EndIf}

      GetDlgItem $R6 $0 1003

      ${If} $R6 != 0

        IntOp $R7 $R8 - 55

        System::Call 'user32::MoveWindow(i $R6, i 360, i $R7, i 600, i 30, i 1)'

        SetCtlColors $R6 ${DT_TEXT} ${DT_BG}

        SendMessage $R6 ${WM_SETFONT} $FONT_BODY 1

      ${EndIf}

      ; Finish page launch checkbox (1203)

      GetDlgItem $R6 $0 1203

      ${If} $R6 != 0

        IntOp $R7 $R8 - 50

        System::Call 'user32::MoveWindow(i $R6, i 360, i $R7, i 600, i 30, i 1)'

        SetCtlColors $R6 ${DT_TEXT} ${DT_BG}

        SendMessage $R6 ${WM_SETFONT} $FONT_BODY 1

      ${EndIf}

      ; Checkbox (1216) - dark checkbox text

      GetDlgItem $R7 $0 1216

      ${If} $R7 != 0

        SetCtlColors $R7 ${DT_TEXT} ${DT_BG}

        SendMessage $R7 ${WM_SETFONT} $FONT_BODY 1

      ${EndIf}

    ${Else}

      ; === Directory or InstFiles page ===

      ; Show outer header controls (title/subtitle/header bitmap)

      GetDlgItem $R7 $HWNDPARENT 1037

      ${If} $R7 != 0

        System::Call 'user32::ShowWindow(i $R7, i 1)'

      ${EndIf}

      GetDlgItem $R7 $HWNDPARENT 1038

      ${If} $R7 != 0

        System::Call 'user32::ShowWindow(i $R7, i 1)'

      ${EndIf}

      GetDlgItem $R7 $HWNDPARENT 1046

      ${If} $R7 != 0

        System::Call 'user32::ShowWindow(i $R7, i 1)'

      ${EndIf}

      ; Check for directory path box (1019)

      GetDlgItem $R6 $0 1019

      ${If} $R6 != 0

        ; === Directory page ===

        ; Hide group box (1020) - white border looks bad on dark theme

        GetDlgItem $R7 $0 1020

        ${If} $R7 != 0

          System::Call 'user32::ShowWindow(i $R7, i 0)'

        ${EndIf}

        ; Hide standalone label 1006 and 1009 (redundant, header already says what to do)

        GetDlgItem $R7 $0 1006

        ${If} $R7 != 0

          System::Call 'user32::ShowWindow(i $R7, i 0)'

        ${EndIf}

        GetDlgItem $R7 $0 1009

        ${If} $R7 != 0

          System::Call 'user32::ShowWindow(i $R7, i 0)'

        ${EndIf}

        ; Directory path label - add our own label

        System::Call 'user32::CreateWindowEx(i 0, w "STATIC", w "目标文件夹：", i ${WS_CHILD}|${WS_VISIBLE}|${SS_LEFT}, i 30, i 135, i 200, i 22, i $0, i 2001, i 0, i 0) i .r7'

        ${If} $7 != 0

          SetCtlColors $7 ${DT_TEXT} ${DT_BG}

          SendMessage $7 ${WM_SETFONT} $FONT_BODY 1

        ${EndIf}

        ; Path edit field (1019) - dark themed

        GetDlgItem $R7 $0 1019

        ${If} $R7 != 0

          System::Call 'user32::MoveWindow(i $R7, i 30, i 162, i 820, i 28, i 1)'

          SetCtlColors $R7 ${DT_WHITE} ${DT_BG2}

          SendMessage $R7 ${WM_SETFONT} $FONT_BODY 1

        ${EndIf}

        ; Browse button (1001) - dark styled

        GetDlgItem $R7 $0 1001

        ${If} $R7 != 0

          System::Call 'user32::MoveWindow(i $R7, i 860, i 162, i 110, i 28, i 1)'

          SetCtlColors $R7 ${DT_TEXT} ${DT_BTN}

          SendMessage $R7 ${WM_SETFONT} $FONT_BTN 1

        ${EndIf}

        ; Space info labels

        GetDlgItem $R7 $0 1023

        ${If} $R7 != 0

          System::Call 'user32::MoveWindow(i $R7, i 30, i 205, i 500, i 22, i 1)'

          SetCtlColors $R7 ${DT_DIM} ${DT_BG}

          SendMessage $R7 ${WM_SETFONT} $FONT_BODY 1

        ${EndIf}

        GetDlgItem $R7 $0 1024

        ${If} $R7 != 0

          System::Call 'user32::MoveWindow(i $R7, i 30, i 230, i 500, i 22, i 1)'

          SetCtlColors $R7 ${DT_DIM} ${DT_BG}

          SendMessage $R7 ${WM_SETFONT} $FONT_BODY 1

        ${EndIf}

      ${Else}

        ; === InstFiles page ===

        ; Progress bar - dark themed gold

        FindWindow $R7 "msctls_progress32" "" $0

        ${If} $R7 == 0

          FindWindow $R7 "msctls_progress32" "" $HWNDPARENT

        ${EndIf}

        ${If} $R7 != 0

          System::Call 'uxtheme::SetWindowTheme(i $R7, w "", w "")'

          System::Call 'user32::MoveWindow(i $R7, i 30, i 130, i 940, i 22, i 1)'

          SendMessage $R7 ${PBM_SETBARCOLOR} 0 ${GDI_GOLD}

          SendMessage $R7 ${PBM_SETBKCOLOR} 0 ${GDI_BG}

          SendMessage $R7 ${WM_SETFONT} $FONT_BODY 1

        ${EndIf}

        ; Install details list view

        FindWindow $R7 "SysListView32" "" $0

        ${If} $R7 == 0

          FindWindow $R7 "SysListView32" "" $HWNDPARENT

        ${EndIf}

        ${If} $R7 != 0

          System::Call 'uxtheme::SetWindowTheme(i $R7, w "", w "")'

          System::Alloc 16

          Pop $R1

          System::Call 'user32::GetClientRect(i $0, i $R1)'

          System::Call '*$R1(i .r2, i .r3, i .r4, i .r5)'

          IntOp $R8 $5 - 195

          System::Call 'user32::MoveWindow(i $R7, i 30, i 165, i 940, i $R8, i 1)'

          SendMessage $R7 ${LVM_SETBKCOLOR} 0 ${GDI_BG}

          SendMessage $R7 ${LVM_SETTEXTBKCOLOR} 0 0xFFFFFFFF

          SendMessage $R7 ${LVM_SETTEXTCOLOR} 0 ${GDI_TEXT}

          SendMessage $R7 ${WM_SETFONT} $FONT_BODY 1

          ; Remove extended border styles

          System::Call 'user32::GetWindowLong(i $R7, i ${GWL_EXSTYLE}) i .r9'

          IntOp $9 $9 & 0xFFFFFEFF ; remove WS_EX_CLIENTEDGE (0x200)

          IntOp $9 $9 & 0xFFFFFDFF ; remove WS_EX_WINDOWEDGE (0x100)

          System::Call 'user32::SetWindowLong(i $R7, i ${GWL_EXSTYLE}, i $9)'

          System::Call 'user32::SetWindowPos(i $R7, i 0, i 0, i 0, i 0, i 0, i ${SWP_FRAMECHANGED}|${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOZORDER})'

          System::Free $R1

        ${EndIf}

      ${EndIf}

    ${EndIf}



    ; Theme all inner controls (uninstaller)

    StrCpy $1 0

    ${While} $1 <= 1300

      GetDlgItem $2 $0 $1

      ${If} $2 != 0

        System::Call 'uxtheme::SetWindowTheme(i $2, w "", w "")'

        SetCtlColors $2 ${DT_TEXT} ${DT_BG}

        SendMessage $2 ${WM_SETFONT} $FONT_BODY 1

      ${EndIf}

      IntOp $1 $1 + 1

    ${EndWhile}

    FindWindow $1 "msctls_progress32" "" $0

    ${If} $1 != 0

      System::Call 'uxtheme::SetWindowTheme(i $1, w "", w "")'

      SendMessage $1 ${PBM_SETBARCOLOR} 0 ${GDI_GOLD}

      SendMessage $1 ${PBM_SETBKCOLOR} 0 ${GDI_BG}

    ${EndIf}

    ; Details list (SysListView32) - dark background

    FindWindow $1 "SysListView32" "" $0

    ${If} $1 == 0

      FindWindow $1 "SysListView32" "" $HWNDPARENT

    ${EndIf}

    ${If} $1 != 0

      System::Call 'uxtheme::SetWindowTheme(i $1, w "", w "")'

      SendMessage $1 ${LVM_SETBKCOLOR} 0 ${GDI_BG}

      SendMessage $1 ${LVM_SETTEXTBKCOLOR} 0 0xFFFFFFFF

      SendMessage $1 ${LVM_SETTEXTCOLOR} 0 ${GDI_TEXT}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

      ; Remove extended border styles

      System::Call 'user32::GetWindowLong(i $1, i ${GWL_EXSTYLE}) i .r9'

      IntOp $9 $9 & 0xFFFFFEFF ; remove WS_EX_CLIENTEDGE (0x200)

      IntOp $9 $9 & 0xFFFFFDFF ; remove WS_EX_WINDOWEDGE (0x100)

      System::Call 'user32::SetWindowLong(i $1, i ${GWL_EXSTYLE}, i $9)'

      System::Call 'user32::SetWindowPos(i $1, i 0, i 0, i 0, i 0, i 0, i ${SWP_FRAMECHANGED}|${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOZORDER})'

    ${EndIf}



    ; Directory label (1009)

    GetDlgItem $1 $0 1009

    ${If} $1 != 0

      SetCtlColors $1 ${DT_TEXT} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}


    ; Group box (1020)

    GetDlgItem $1 $0 1020

    ${If} $1 != 0

      SetCtlColors $1 ${DT_TEXT} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}

    ; Directory text box (1019)

    GetDlgItem $1 $0 1019

    ${If} $1 != 0

      SetCtlColors $1 ${DT_WHITE} ${DT_BG2}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}

    ; Browse button (1001)

    GetDlgItem $1 $0 1001

    ${If} $1 != 0

      System::Call 'uxtheme::SetWindowTheme(i $1, w "", w "")'

      SendMessage $1 ${WM_SETFONT} $FONT_BTN 1

      SetCtlColors $1 ${DT_GOLD} ${DT_BTN}

    ${EndIf}

    ; Space labels (1023, 1024)

    GetDlgItem $1 $0 1023

    ${If} $1 != 0

      SetCtlColors $1 ${DT_DIM} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}

    GetDlgItem $1 $0 1024

    ${If} $1 != 0

      SetCtlColors $1 ${DT_DIM} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}

    ; Checkbox (1216) - dark checkbox text

    GetDlgItem $1 $0 1216

    ${If} $1 != 0

      SetCtlColors $1 ${DT_TEXT} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}

    ; Checkboxes (1002, 1003)

    GetDlgItem $1 $0 1002

    ${If} $1 != 0

      SetCtlColors $1 ${DT_TEXT} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}

    GetDlgItem $1 $0 1003

    ${If} $1 != 0

      SetCtlColors $1 ${DT_TEXT} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}

    ; Finish page launch checkbox (1203)

    GetDlgItem $1 $0 1203

    ${If} $1 != 0

      SetCtlColors $1 ${DT_GOLD} ${DT_BG}

      SendMessage $1 ${WM_SETFONT} $FONT_BODY 1

    ${EndIf}

    ; Inner buttons (1/2/3)

    StrCpy $3 1

    ${While} $3 <= 3

      GetDlgItem $1 $0 $3

      ${If} $1 != 0

        System::Call 'uxtheme::SetWindowTheme(i $1, w "", w "")'

        SendMessage $1 ${WM_SETFONT} $FONT_BTN 1

        SetCtlColors $1 ${DT_GOLD} ${DT_BTN}

      ${EndIf}

      IntOp $3 $3 + 1

    ${EndWhile}


  ${EndIf}



  ; Set delayed re-apply timer (200ms)

  ${If} $THEME_TIMER_ACTIVE == 0

    StrCpy $THEME_TIMER_ACTIVE 1

    nsDialogs::CreateTimer un.ThemeTimerProc 200

  ${EndIf}




  ; --- Force full repaint ---

  System::Call 'user32::RedrawWindow(i $HWNDPARENT, i 0, i 0, i ${RDW_INVALIDATE}|${RDW_UPDATENOW}|${RDW_ERASE})'



  Pop $9

  Pop $8

  Pop $7

  Pop $6

  Pop $5

  Pop $4

  Pop $3

  Pop $2

  Pop $1

  Pop $0

FunctionEnd



; ============================================================

; GUI Init

; ============================================================

Function DarkThemeInit

  ; Mark fade as starting so ApplyDarkTheme doesn't override alpha

  StrCpy $THEME_TIMER_ACTIVE 3

  ; Start with alpha=0 (invisible) for fade-in

  System::Call 'user32::GetWindowLong(i $HWNDPARENT, i ${GWL_EXSTYLE}) i .r0'

  IntOp $0 $0 | ${WS_EX_LAYERED}

  System::Call 'user32::SetWindowLong(i $HWNDPARENT, i ${GWL_EXSTYLE}, i $0)'

  System::Call 'user32::SetLayeredWindowAttributes(i $HWNDPARENT, i 0, i 0, i ${LWA_ALPHA})'

  ; Apply dark theme

  Call ApplyDarkTheme

  ; Show window

  System::Call 'user32::ShowWindow(i $HWNDPARENT, i ${SW_SHOW})'

  System::Call 'user32::UpdateWindow(i $HWNDPARENT)'

  ; Fade-in animation: 0 -> 255 over ~360ms (smoother)

  Push $0

  StrCpy $0 0

  ${While} $0 < 255

    IntOp $0 $0 + 10

    ${If} $0 > 255

      StrCpy $0 255

    ${EndIf}

    System::Call 'user32::SetLayeredWindowAttributes(i $HWNDPARENT, i 0, i $0, i ${LWA_ALPHA})'

    System::Call 'user32::UpdateWindow(i $HWNDPARENT)'

    System::Call 'kernel32::Sleep(i 14)'

  ${EndWhile}

  Pop $0

  ; Final repaint and mark fade as complete

  System::Call 'user32::RedrawWindow(i $HWNDPARENT, i 0, i 0, i ${RDW_INVALIDATE}|${RDW_UPDATENOW})'

  StrCpy $THEME_TIMER_ACTIVE 0

FunctionEnd



Function un.DarkThemeInit

  ; Mark fade as starting

  StrCpy $THEME_TIMER_ACTIVE 3

  ; Start invisible

  System::Call 'user32::GetWindowLong(i $HWNDPARENT, i ${GWL_EXSTYLE}) i .r0'

  IntOp $0 $0 | ${WS_EX_LAYERED}

  System::Call 'user32::SetWindowLong(i $HWNDPARENT, i ${GWL_EXSTYLE}, i $0)'

  System::Call 'user32::SetLayeredWindowAttributes(i $HWNDPARENT, i 0, i 0, i ${LWA_ALPHA})'

  ; Apply dark theme

  Call un.ApplyDarkTheme

  ; Show and fade in

  System::Call 'user32::ShowWindow(i $HWNDPARENT, i ${SW_SHOW})'

  System::Call 'user32::UpdateWindow(i $HWNDPARENT)'

  Push $0

  StrCpy $0 0

  ${While} $0 < 255

    IntOp $0 $0 + 10

    ${If} $0 > 255

      StrCpy $0 255

    ${EndIf}

    System::Call 'user32::SetLayeredWindowAttributes(i $HWNDPARENT, i 0, i $0, i ${LWA_ALPHA})'

    System::Call 'user32::UpdateWindow(i $HWNDPARENT)'

    System::Call 'kernel32::Sleep(i 14)'

  ${EndWhile}

  Pop $0

  System::Call 'user32::RedrawWindow(i $HWNDPARENT, i 0, i 0, i ${RDW_INVALIDATE}|${RDW_UPDATENOW})'

  StrCpy $THEME_TIMER_ACTIVE 0

FunctionEnd



; ============================================================

; .onInit

; ============================================================

Function .onInit

  ; Enable Per-Monitor V2 DPI awareness to prevent blurry bitmap scaling

  System::Call 'user32::SetProcessDpiAwarenessContext(i ${DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2})'

  ; Fallback for older Windows

  System::Call 'user32::SetProcessDPIAware()'



  ; Create fonts with CLEARTYPE_QUALITY for sharp rendering

  System::Call 'gdi32::CreateFontW(i -38, i 0, i 0, i 0, i 700, i 0, i 0, i 0, i 134, i 0, i 0, i ${CLEARTYPE_QUALITY}, i 34, w "Microsoft YaHei UI") i .r0'

  StrCpy $FONT_TITLE $0

  System::Call 'gdi32::CreateFontW(i -22, i 0, i 0, i 0, i 700, i 0, i 0, i 0, i 134, i 0, i 0, i ${CLEARTYPE_QUALITY}, i 34, w "Microsoft YaHei UI") i .r0'

  StrCpy $FONT_SUBTITLE $0

  System::Call 'gdi32::CreateFontW(i -19, i 0, i 0, i 0, i 400, i 0, i 0, i 0, i 134, i 0, i 0, i ${CLEARTYPE_QUALITY}, i 34, w "Microsoft YaHei UI") i .r0'

  StrCpy $FONT_BODY $0

  System::Call 'gdi32::CreateFontW(i -19, i 0, i 0, i 0, i 700, i 0, i 0, i 0, i 134, i 0, i 0, i ${CLEARTYPE_QUALITY}, i 34, w "Microsoft YaHei UI") i .r0'

  StrCpy $FONT_BOLD $0

  System::Call 'gdi32::CreateFontW(i -16, i 0, i 0, i 0, i 400, i 0, i 0, i 0, i 134, i 0, i 0, i ${CLEARTYPE_QUALITY}, i 34, w "Microsoft YaHei UI") i .r0'

  StrCpy $FONT_SMALL $0

  System::Call 'gdi32::CreateFontW(i -18, i 0, i 0, i 0, i 700, i 0, i 0, i 0, i 134, i 0, i 0, i ${CLEARTYPE_QUALITY}, i 34, w "Microsoft YaHei UI") i .r0'

  StrCpy $FONT_BTN $0

FunctionEnd



Function un.onInit

  ; Enable DPI awareness for uninstaller too

  System::Call 'user32::SetProcessDpiAwarenessContext(i ${DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2})'

  System::Call 'user32::SetProcessDPIAware()'



  ; Create fonts with CLEARTYPE_QUALITY

  System::Call 'gdi32::CreateFontW(i -38, i 0, i 0, i 0, i 700, i 0, i 0, i 0, i 134, i 0, i 0, i ${CLEARTYPE_QUALITY}, i 34, w "Microsoft YaHei UI") i .r0'

  StrCpy $FONT_TITLE $0

  System::Call 'gdi32::CreateFontW(i -22, i 0, i 0, i 0, i 700, i 0, i 0, i 0, i 134, i 0, i 0, i ${CLEARTYPE_QUALITY}, i 34, w "Microsoft YaHei UI") i .r0'

  StrCpy $FONT_SUBTITLE $0

  System::Call 'gdi32::CreateFontW(i -19, i 0, i 0, i 0, i 400, i 0, i 0, i 0, i 134, i 0, i 0, i ${CLEARTYPE_QUALITY}, i 34, w "Microsoft YaHei UI") i .r0'

  StrCpy $FONT_BODY $0

  System::Call 'gdi32::CreateFontW(i -19, i 0, i 0, i 0, i 700, i 0, i 0, i 0, i 134, i 0, i 0, i ${CLEARTYPE_QUALITY}, i 34, w "Microsoft YaHei UI") i .r0'

  StrCpy $FONT_BOLD $0

  System::Call 'gdi32::CreateFontW(i -16, i 0, i 0, i 0, i 400, i 0, i 0, i 0, i 134, i 0, i 0, i ${CLEARTYPE_QUALITY}, i 34, w "Microsoft YaHei UI") i .r0'

  StrCpy $FONT_SMALL $0

  System::Call 'gdi32::CreateFontW(i -18, i 0, i 0, i 0, i 700, i 0, i 0, i 0, i 134, i 0, i 0, i ${CLEARTYPE_QUALITY}, i 34, w "Microsoft YaHei UI") i .r0'

  StrCpy $FONT_BTN $0

FunctionEnd



; ============================================================

; Pages

; ============================================================

!define MUI_PAGE_CUSTOMFUNCTION_SHOW ApplyDarkTheme

!insertmacro MUI_PAGE_WELCOME



!define MUI_PAGE_CUSTOMFUNCTION_SHOW ApplyDarkTheme

!insertmacro MUI_PAGE_DIRECTORY



!define MUI_PAGE_CUSTOMFUNCTION_SHOW ApplyDarkTheme

!insertmacro MUI_PAGE_INSTFILES



!define MUI_PAGE_CUSTOMFUNCTION_SHOW ApplyDarkTheme

!insertmacro MUI_PAGE_FINISH



!define MUI_PAGE_CUSTOMFUNCTION_SHOW un.ApplyDarkTheme

!insertmacro MUI_UNPAGE_WELCOME

!define MUI_PAGE_CUSTOMFUNCTION_SHOW un.ApplyDarkTheme

!insertmacro MUI_UNPAGE_CONFIRM

!define MUI_PAGE_CUSTOMFUNCTION_SHOW un.ApplyDarkTheme

!insertmacro MUI_UNPAGE_INSTFILES

!define MUI_PAGE_CUSTOMFUNCTION_SHOW un.ApplyDarkTheme

!insertmacro MUI_UNPAGE_FINISH



!define MUI_CUSTOMFUNCTION_GUIINIT DarkThemeInit

!define MUI_CUSTOMFUNCTION_UNGUIINIT un.DarkThemeInit



; ============================================================

; Language

; ============================================================

!insertmacro MUI_LANGUAGE "SimpChinese"



; ============================================================

; Version Info

; ============================================================

VIProductVersion "${APP_VERSION}.0"

VIAddVersionKey "ProductName" "TavernOS"

VIAddVersionKey "CompanyName" "TavernOS"

VIAddVersionKey "FileVersion" "${APP_VERSION}"

VIAddVersionKey "ProductVersion" "${APP_VERSION}"

VIAddVersionKey "FileDescription" "TavernOS - AI Creative Writing Platform"

VIAddVersionKey "LegalCopyright" "Copyright 2026 TavernOS"



; ============================================================

; Install Section

; ============================================================

Section "Install" SecInstall

  SectionIn RO



  SetDetailsPrint listonly



  DetailPrint " "

  DetailPrint "  +-------------------------------------+"

  DetailPrint "  |                                     |"

  DetailPrint "  |     TavernOS  v${APP_VERSION}              |"

  DetailPrint "  |     AI 驱动的创意写作平台           |"

  DetailPrint "  |                                     |"

  DetailPrint "  +-------------------------------------+"

  DetailPrint " "



  SetOutPath "$INSTDIR"



  DetailPrint "  >> 正在检查运行中的实例..."

  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM TavernOS.exe /T 2>nul'



  DetailPrint " "

  DetailPrint "  >> AI 智能写作助手 -- 协助构思、创作与润色"

  DetailPrint "     正在写入核心引擎文件..."

  File /r "release\win-unpacked\*.*"



  FindWindow $0 "#32770" "" $HWNDPARENT

  ${If} $0 != 0

    FindWindow $1 "msctls_progress32" "" $0

    ${If} $1 != 0

      System::Call 'uxtheme::SetWindowTheme(i $1, w "", w "")'

      SendMessage $1 ${PBM_SETBARCOLOR} 0 ${GDI_GOLD}

      SendMessage $1 ${PBM_SETBKCOLOR} 0 ${GDI_BG}

    ${EndIf}

  ${EndIf}



  DetailPrint " "

  DetailPrint "  >> 角色管理系统 -- 构建立体人物档案与关系网络"

  DetailPrint "     正在创建开始菜单快捷方式..."

  CreateDirectory "$SMPROGRAMS\TavernOS"

  CreateShortCut "$SMPROGRAMS\TavernOS\TavernOS.lnk" "$INSTDIR\TavernOS.exe" "" "$INSTDIR\TavernOS.exe" 0

  CreateShortCut "$SMPROGRAMS\TavernOS\卸载 TavernOS.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0



  DetailPrint " "

  DetailPrint "  >> 世界观构建器 -- 设定、地图与时间线管理"

  DetailPrint "     正在创建桌面快捷方式..."

  CreateShortCut "$DESKTOP\TavernOS.lnk" "$INSTDIR\TavernOS.exe" "" "$INSTDIR\TavernOS.exe" 0



  DetailPrint " "

  DetailPrint "  >> 多模态内容生成 -- 文字、图像、语音与视频"

  DetailPrint "     正在配置卸载程序..."

  WriteUninstaller "$INSTDIR\Uninstall.exe"



  DetailPrint " "

  DetailPrint "  >> 智能记忆系统 -- AI 记住你的每个设定"

  DetailPrint "     正在注册系统信息..."

  WriteRegStr HKCU "Software\TavernOS" "InstallDir" "$INSTDIR"

  WriteRegStr HKCU "Software\TavernOS" "Version" "${APP_VERSION}"



  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TavernOS" "DisplayName" "TavernOS"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TavernOS" "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TavernOS" "QuietUninstallString" "$\"$INSTDIR\Uninstall.exe$\" /S"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TavernOS" "DisplayIcon" "$INSTDIR\TavernOS.exe"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TavernOS" "DisplayVersion" "${APP_VERSION}"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TavernOS" "Publisher" "TavernOS"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TavernOS" "InstallLocation" "$INSTDIR"

  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TavernOS" "NoModify" 1

  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TavernOS" "NoRepair" 1



  DetailPrint " "

  DetailPrint "  >> 实时预览编辑 -- 所见即所得的创作体验"

  DetailPrint "     正在完成安装配置..."

  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2

  IntFmt $0 "0x%08X" $0

  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TavernOS" "EstimatedSize" "$0"



  DetailPrint " "

  DetailPrint "  +-------------------------------------+"

  DetailPrint "  |     安装完成！即将进入完成页面      |"

  DetailPrint "  +-------------------------------------+"

  DetailPrint " "



  SetDetailsPrint both

SectionEnd



; ============================================================

; Uninstall Section

; ============================================================

Section "Uninstall"

  SetDetailsPrint listonly



  DetailPrint " "

  DetailPrint "  +-------------------------------------+"

  DetailPrint "  |     TavernOS  卸载程序              |"

  DetailPrint "  +-------------------------------------+"

  DetailPrint " "



  DetailPrint "  >> 正在停止运行中的 TavernOS..."

  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM TavernOS.exe /T 2>nul'



  DetailPrint " "

  DetailPrint "  >> 正在移除程序文件..."

  Delete "$INSTDIR\Uninstall.exe"

  RMDir /r "$INSTDIR"



  DetailPrint " "

  DetailPrint "  >> 正在移除快捷方式..."

  Delete "$SMPROGRAMS\TavernOS\TavernOS.lnk"

  Delete "$SMPROGRAMS\TavernOS\卸载 TavernOS.lnk"

  RMDir "$SMPROGRAMS\TavernOS"

  Delete "$DESKTOP\TavernOS.lnk"



  DetailPrint " "

  DetailPrint "  >> 正在清理注册表..."

  DeleteRegKey HKCU "Software\TavernOS"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TavernOS"



  DetailPrint " "

  DetailPrint "  +-------------------------------------+"

  DetailPrint "  |     TavernOS 已成功卸载             |"

  DetailPrint "  |     感谢您使用 TavernOS             |"

  DetailPrint "  +-------------------------------------+"

  DetailPrint " "



  SetDetailsPrint both

SectionEnd

