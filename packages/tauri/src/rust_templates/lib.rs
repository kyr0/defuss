use std::net::TcpStream;
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_shell::{process::{CommandChild, CommandEvent}, ShellExt};

const DEFAULT_HOST: &str = "{{host}}";
const DEFAULT_PORT: &str = "{{port}}";
const DEFAULT_TITLE: &str = "{{title}}";
const DEFAULT_WIDTH: f64 = {{width}}.0;
const DEFAULT_HEIGHT: f64 = {{height}}.0;
const DEFAULT_RESIZABLE: bool = {{resizable}};
const DEFAULT_FULLSCREEN: bool = {{fullscreen}};

struct DefussSidecarState(Mutex<Option<CommandChild>>);

fn wait_for_tcp(host: &str, port: &str, timeout: Duration) -> Result<(), String> {
    let started = Instant::now();
    let addr = format!("{}:{}", host, port);
    let poll_interval = Duration::from_millis({{tcpPollIntervalMs}});

    while started.elapsed() < timeout {
        if TcpStream::connect(&addr).is_ok() {
            return Ok(());
        }
        thread::sleep(poll_interval);
    }

    Err(format!("timed out waiting for defuss-ssg at http://{}", addr))
}

fn is_dev_mode() -> bool {
    // DEFUSS_TAURI_APP_DIR is set during tauri dev; in production it's absent.
    std::env::var("DEFUSS_TAURI_APP_DIR").is_ok()
}

fn start_defuss_server(app: &mut tauri::App) -> Result<String, Box<dyn std::error::Error>> {
    let handle = app.handle().clone();
    let host = std::env::var("DEFUSS_TAURI_HOST").unwrap_or_else(|_| DEFAULT_HOST.to_string());
    let port = std::env::var("DEFUSS_TAURI_PORT").unwrap_or_else(|_| DEFAULT_PORT.to_string());

    let resource_dir = app.path().resource_dir()?;
    let app_dir = resource_dir.join("resources").join("app");

    let cli = app_dir
        .join("node_modules")
        .join("defuss-ssg")
        .join("dist")
        .join("cli.mjs");

    if !cli.exists() {
        return Err(format!("defuss-ssg CLI not found: {}", cli.display()).into());
    }

    println!("[defuss-tauri] starting defuss-ssg serve in {}", app_dir.display());

    let (mut rx, child) = handle
        .shell()
        .sidecar("{{sidecarName}}")?
        .args([cli.to_string_lossy().to_string(), "serve".to_string(), ".".to_string()])
        .current_dir(&app_dir)
        .env("HOST", &host)
        .env("PORT", &port)
        .env("NODE_ENV", "production")
        .spawn()?;

    *app.state::<DefussSidecarState>().0.lock().unwrap() = Some(child);

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => print!("{}", String::from_utf8_lossy(&bytes)),
                CommandEvent::Stderr(bytes) => eprint!("{}", String::from_utf8_lossy(&bytes)),
                CommandEvent::Error(message) => eprintln!("[defuss-tauri] sidecar error: {}", message),
                CommandEvent::Terminated(payload) => eprintln!("[defuss-tauri] sidecar terminated: {:?}", payload),
                _ => {}
            }
        }
    });

    wait_for_tcp(&host, &port, Duration::from_secs({{tcpTimeoutSecs}}))?;
    Ok(format!("http://{}:{}", host, port))
}

fn kill_sidecar_process_group(child: &CommandChild) {
    // Kill the entire process group to ensure defuss-ssg server (child of Node) is also terminated.
    // Send SIGTERM first for graceful shutdown, then SIGKILL after a brief delay if still alive.
    #[cfg(unix)]
    {
        let pid = child.pid();
        // Send SIGTERM to the process group (negative PGID)
        unsafe {
            libc::kill(-(pid as libc::pid_t), libc::SIGTERM);
        }
        // Brief pause for graceful shutdown
        thread::sleep(Duration::from_millis({{gracefulShutdownMs}}));
        // Force kill if still alive
        unsafe {
            libc::kill(-(pid as libc::pid_t), libc::SIGKILL);
        }
    }
    #[cfg(windows)]
    {
        let _ = child.kill();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(DefussSidecarState(Mutex::new(None)))
        .setup(|app| {
            // Handle errors explicitly to avoid panic_cannot_unwind in setup closure.
            let url = if is_dev_mode() {
                let host = std::env::var("DEFUSS_TAURI_HOST").unwrap_or_else(|_| DEFAULT_HOST.to_string());
                let mut port = std::env::var("DEFUSS_TAURI_PORT").unwrap_or_else(|_| DEFAULT_PORT.to_string());
                // Check if defuss-ssg wrote a resolved port file (auto-incremented when port was busy)
                // Search upward from current_dir since the binary may run from target/debug/
                if let Ok(mut dir) = std::env::current_dir() {
                    for _ in 0..10 {
                        let port_file = dir.join(".defuss-port");
                        if let Ok(content) = std::fs::read_to_string(&port_file) {
                            let resolved = content.trim().to_string();
                            if !resolved.is_empty() {
                                println!("[defuss-tauri] discovered resolved port {} from {}", resolved, port_file.display());
                                port = resolved;
                                break;
                            }
                        }
                        dir = dir.parent().unwrap_or(&dir).to_path_buf();
                    }
                }
                format!("http://{}:{}", host, port)
            } else {
                match start_defuss_server(app) {
                    Ok(server_url) => server_url,
                    Err(e) => {
                        eprintln!("[defuss-tauri] failed to start defuss-ssg server: {}", e);
                        return Err(format!("Failed to start defuss-ssg server: {}", e).into());
                    }
                }
            };

            let parsed_url = match url.parse() {
                Ok(u) => u,
                Err(e) => {
                    return Err(format!("Invalid URL {}: {}", url, e).into());
                }
            };

            match WebviewWindowBuilder::new(app.handle(), "main", WebviewUrl::External(parsed_url))
                .title(DEFAULT_TITLE)
                .inner_size(DEFAULT_WIDTH, DEFAULT_HEIGHT)
                .resizable(DEFAULT_RESIZABLE)
                .fullscreen(DEFAULT_FULLSCREEN)
                .center()
                .build()
            {
                Ok(_) => Ok(()),
                Err(e) => Err(format!("Failed to create webview window: {}", e).into()),
            }
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                let state = window.state::<DefussSidecarState>();
                if let Some(child) = state.0.lock().unwrap().take() {
                    kill_sidecar_process_group(&child);
                };
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running defuss-tauri application");
}
