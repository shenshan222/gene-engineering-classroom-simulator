// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
fn webview2_is_available() -> bool {
    if tauri::webview_version().is_ok() {
        return true;
    }

    use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK};

    let title = "缺少 WebView2 运行环境\0"
        .encode_utf16()
        .collect::<Vec<_>>();
    let message = "未检测到 Microsoft Edge WebView2 Runtime。\n\n请连接网络后重新运行本安装程序，或先安装 WebView2 Runtime，然后再次启动应用。\0"
    .encode_utf16()
    .collect::<Vec<_>>();

    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            message.as_ptr(),
            title.as_ptr(),
            MB_OK | MB_ICONERROR,
        );
    }

    false
}

fn main() {
    #[cfg(target_os = "windows")]
    if !webview2_is_available() {
        return;
    }

    gene_engineering_classroom_simulator_lib::run();
}
