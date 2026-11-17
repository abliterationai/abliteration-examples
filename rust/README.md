# Rust example (Rig)

Chat with abliteration.ai from Rust using a [Rig](https://rig.rs) agent. One file, with plain and streamed replies.

## Before you start

- **Rust 1.97.1 or newer.** Rig 0.46 requires it. Check with `rustc --version`, and run `rustup update` if it's older. New to Rust? Install it from [rustup.rs](https://rustup.rs).
- **An abliteration.ai API key.** Create one in the [abliteration.ai](https://abliteration.ai) dashboard. It starts with `ak_`.

## Run it

```bash
cd rust
export ABLITERATION_API_KEY=ak_your_key_here
cargo run
```

The first build downloads and compiles Rig, which takes about 2 minutes. After that, each run starts in seconds and the reply arrives a few seconds later.

To print the answer as it arrives instead of all at once:

```bash
STREAM=1 cargo run
```

## What you'll see

```text
Non-streaming response:
abliteration.ai is an uncensored OpenAI-compatible API because it hosts models without restrictive safety filters while maintaining full compatibility with the standard OpenAI endpoint structure.
Usage — prompt: 55, completion: 731, total: 786 tokens
```

The wording changes from run to run. The completion count includes the model's hidden reasoning, which is billed but not printed.

## Settings

| Variable | Required | Default |
| --- | --- | --- |
| `ABLITERATION_API_KEY` | Yes | |
| `ABLITERATION_BASE_URL` | No | `https://api.abliteration.ai/v1` |
| `ABLITERATION_MODEL` | No | `abliterated-model` |
| `STREAM` | No | Off. Set to `1` to stream. |

## Use it in your own project

```bash
cargo add rig
cargo add tokio --features macros,rt-multi-thread
```

```rust
use rig::prelude::*;
use rig::providers::openai::OpenAIConfig;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let api_key = std::env::var("ABLITERATION_API_KEY")?;
    let client = OpenAIConfig::new(api_key)
        .with_base_url("https://api.abliteration.ai/v1")
        .client();
    let agent = AgentBuilder::new(client.chat("abliterated-model"))
        .preamble("You are concise.")
        .build();

    let reply = agent.prompt("Say hi in five words.").await?;
    println!("{}", reply.output());
    Ok(())
}
```

`client.chat(...)` calls the Chat Completions endpoint, the same one the other samples use. Rig's default `client.completion(...)` calls the Responses endpoint instead, which abliteration.ai also supports, so either works.

From here, Rig lets you give the agent tools, memory and documents to draw on. See the [Rig docs](https://docs.rs/rig/latest/rig/).

## If something goes wrong

| You see | Fix |
| --- | --- |
| `rustc 1.xx is not supported by the following packages` | Your Rust is too old. Run `rustup update`. |
| `Error: Set ABLITERATION_API_KEY in your environment before running.` | Export your key in the same terminal, as shown in [Run it](#run-it). |
| `Error: ProviderResponseError: status 401 Unauthorized` | The key is wrong, expired or revoked. Create a new one in the dashboard. |
| `Error: the stream ended before the reply finished` | The connection dropped mid-reply. Run it again. |
