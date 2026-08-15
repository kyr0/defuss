use defuss_semantic_compress_eval::{run_eval, EvalOptions};
use std::path::PathBuf;

const USAGE: &str = "usage: defuss-semantic-compress-eval <fixtures-dir> [--report <path>]";

fn main() {
    let mut dir: Option<PathBuf> = None;
    let mut report_path: Option<PathBuf> = None;

    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--report" => {
                i += 1;
                match args.get(i) {
                    Some(p) => report_path = Some(PathBuf::from(p)),
                    None => {
                        eprintln!("--report requires a path\n{USAGE}");
                        std::process::exit(2);
                    }
                }
            }
            "-h" | "--help" => {
                println!("{USAGE}");
                return;
            }
            s if s.starts_with("--report=") => {
                report_path = Some(PathBuf::from(&s["--report=".len()..]));
            }
            s if s.starts_with('-') => {
                eprintln!("unknown flag: {s}\n{USAGE}");
                std::process::exit(2);
            }
            s => {
                if dir.is_some() {
                    eprintln!("unexpected argument: {s}\n{USAGE}");
                    std::process::exit(2);
                }
                dir = Some(PathBuf::from(s));
            }
        }
        i += 1;
    }

    let Some(dir) = dir else {
        eprintln!("{USAGE}");
        std::process::exit(2);
    };

    let report = run_eval(&dir, &EvalOptions { report_path });
    std::process::exit(if report.failures.is_empty() { 0 } else { 1 });
}
