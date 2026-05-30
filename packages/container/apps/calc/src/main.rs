use std::env;
use std::process;

fn usage(program: &str) -> String {
    format!(
        "Usage:\n  {program} <lhs> <op> <rhs>\n\nExamples:\n  {program} 1 + 2\n  {program} 7 / 2\n  {program} 9 '%' 4\n  {program} 3 '*' 5\n\nSupported operators: +  -  *  /  %\nNote: quote '*' in most shells."
    )
}

fn parse_number(raw: &str, name: &str) -> Result<f64, String> {
    raw.parse::<f64>()
        .map_err(|_| format!("invalid {name}: {raw}"))
}

fn format_number(n: f64) -> String {
    if n == 0.0 {
        return "0".to_string();
    }

    if n.is_finite() && n.fract() == 0.0 {
        format!("{n:.0}")
    } else {
        n.to_string()
    }
}

fn eval(lhs: f64, op: &str, rhs: f64) -> Result<f64, String> {
    match op {
        "+" => Ok(lhs + rhs),
        "-" => Ok(lhs - rhs),
        "*" | "x" | "X" => Ok(lhs * rhs),
        "/" => {
            if rhs == 0.0 {
                Err("division by zero".to_string())
            } else {
                Ok(lhs / rhs)
            }
        }
        "%" => {
            if rhs == 0.0 {
                Err("modulo by zero".to_string())
            } else {
                Ok(lhs % rhs)
            }
        }
        _ => Err(format!("unsupported operator: {op}")),
    }
}

fn main() {
    let program = env::args().next().unwrap_or_else(|| "rustcalc".to_string());
    let args: Vec<String> = env::args().skip(1).collect();

    if args.is_empty() || args[0] == "-h" || args[0] == "--help" {
        println!("{}", usage(&program));
        return;
    }

    if args.len() != 3 {
        eprintln!("{}", usage(&program));
        process::exit(2);
    }

    let lhs = match parse_number(&args[0], "lhs") {
        Ok(v) => v,
        Err(err) => {
            eprintln!("error: {err}");
            process::exit(1);
        }
    };

    let rhs = match parse_number(&args[2], "rhs") {
        Ok(v) => v,
        Err(err) => {
            eprintln!("error: {err}");
            process::exit(1);
        }
    };

    match eval(lhs, &args[1], rhs) {
        Ok(result) => println!("{}", format_number(result)),
        Err(err) => {
            eprintln!("error: {err}");
            process::exit(1);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{eval, format_number};

    #[test]
    fn adds() {
        assert_eq!(eval(1.0, "+", 2.0).unwrap(), 3.0);
    }

    #[test]
    fn divides() {
        assert_eq!(format_number(eval(7.0, "/", 2.0).unwrap()), "3.5");
    }

    #[test]
    fn strips_trailing_dot_zero() {
        assert_eq!(format_number(10.0), "10");
    }

    #[test]
    fn rejects_div_by_zero() {
        assert!(eval(1.0, "/", 0.0).is_err());
    }
}
