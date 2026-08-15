//! Model providers (§29.4). Models are addressed as "<scheme>:<name>", e.g.
//! "mock:echo" or "openai:gpt-4.1-mini". The scheme selects the provider.

use serde_json::{json, Value};

/// Deterministic decoding parameters, as far as the provider allows (§29.4).
#[derive(Debug, Clone, Copy)]
pub struct ModelParams {
    pub temperature: f32,
    pub top_p: f32,
    pub seed: Option<u64>,
}

impl Default for ModelParams {
    fn default() -> Self {
        ModelParams {
            temperature: 0.0,
            top_p: 1.0,
            seed: None,
        }
    }
}

pub trait Provider {
    fn complete(&self, model: &str, prompt: &str, params: &ModelParams) -> Result<String, String>;
}

/// Offline provider: returns the fixture's `mock_response` when set,
/// otherwise echoes the prompt unchanged.
pub struct MockProvider {
    pub mock_response: Option<String>,
}

impl Provider for MockProvider {
    fn complete(&self, _model: &str, prompt: &str, _params: &ModelParams) -> Result<String, String> {
        Ok(self
            .mock_response
            .clone()
            .unwrap_or_else(|| prompt.to_string()))
    }
}

/// OpenAI-compatible chat completions provider (blocking).
///
/// Reads the bearer token from `DEFUSS_SC_EVAL_API_KEY` and the base URL
/// from `DEFUSS_SC_EVAL_BASE_URL` (default: `https://api.openai.com/v1`).
pub struct OpenAiProvider {
    pub base_url: String,
    pub api_key: String,
}

impl OpenAiProvider {
    pub fn from_env() -> Result<Self, String> {
        let api_key = std::env::var("DEFUSS_SC_EVAL_API_KEY")
            .map_err(|_| "DEFUSS_SC_EVAL_API_KEY is not set".to_string())?;
        let base_url = std::env::var("DEFUSS_SC_EVAL_BASE_URL")
            .unwrap_or_else(|_| "https://api.openai.com/v1".to_string());
        Ok(OpenAiProvider { base_url, api_key })
    }
}

impl Provider for OpenAiProvider {
    fn complete(&self, model: &str, prompt: &str, params: &ModelParams) -> Result<String, String> {
        let url = format!("{}/chat/completions", self.base_url.trim_end_matches('/'));
        let mut body = json!({
            "model": model,
            "messages": [{ "role": "user", "content": prompt }],
            "temperature": params.temperature,
            "top_p": params.top_p,
        });
        if let Some(seed) = params.seed {
            body["seed"] = json!(seed);
        }
        let response = ureq::post(&url)
            .set("Authorization", &format!("Bearer {}", self.api_key))
            .send_json(body)
            .map_err(|e| format!("POST {url} failed: {e}"))?;
        let json: Value = response
            .into_json()
            .map_err(|e| format!("invalid JSON response from {url}: {e}"))?;
        json["choices"][0]["message"]["content"]
            .as_str()
            .map(str::to_string)
            .ok_or_else(|| format!("no choices[0].message.content in response from {url}"))
    }
}

/// Routes a model name to a provider. Returns the provider and the model
/// name to send to it (scheme prefix stripped).
///
/// "mock:*" stays offline; anything else goes to the OpenAI-compatible
/// provider.
pub fn provider_for(
    model: &str,
    mock_response: Option<String>,
) -> Result<(Box<dyn Provider>, String), String> {
    if model.starts_with("mock:") {
        return Ok((
            Box::new(MockProvider { mock_response }),
            model.to_string(),
        ));
    }
    let name = model
        .split_once(':')
        .map(|(_, rest)| rest)
        .unwrap_or(model)
        .to_string();
    Ok((Box::new(OpenAiProvider::from_env()?), name))
}
