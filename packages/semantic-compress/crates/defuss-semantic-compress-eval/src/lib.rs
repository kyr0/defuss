//! defuss-semantic-compress-eval: LLM effect safety harness (§29).
//!
//! Verifies behavior preservation under compression:
//!
//! ```text
//! original input -> LLM -> expected behavior
//! compressed input -> LLM -> expected behavior
//! ```
//!
//! A fixture passes only if the assertion holds for BOTH the baseline
//! (original input) and the compressed run. With `strict_equivalence`, the
//! two outputs must additionally be diff-equivalent.

pub mod assertion;
pub mod fixture;
pub mod provider;
pub mod runner;

pub use assertion::Assertion;
pub use fixture::{load_fixtures, EvalFixture};
pub use provider::{provider_for, MockProvider, ModelParams, OpenAiProvider, Provider};
pub use runner::{run_eval, EvalFailure, EvalOptions, EvalReport};
