use std::env;
use std::error::Error;
use std::io::{self, Write};

use futures::StreamExt;
use rig::prelude::*;
use rig::providers::openai::OpenAIConfig;
use rig::streaming::{Item, StreamEvent};

const SYSTEM_PROMPT: &str = "You are abliteration.ai, concise and direct.";
const USER_PROMPT: &str =
    "Give me one sentence on why abliteration.ai is an uncensored OpenAI-compatible API.";

#[tokio::main]
async fn main() {
    if let Err(err) = run().await {
        eprintln!("Error: {err}");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), Box<dyn Error>> {
    let api_key = env::var("ABLITERATION_API_KEY")
        .ok()
        .filter(|key| !key.trim().is_empty())
        .ok_or("Set ABLITERATION_API_KEY in your environment before running.")?;
    let base_url = env::var("ABLITERATION_BASE_URL")
        .unwrap_or_else(|_| "https://api.abliteration.ai/v1".to_string());
    let model = env::var("ABLITERATION_MODEL").unwrap_or_else(|_| "abliterated-model".to_string());
    let stream = env::var("STREAM").as_deref() == Ok("1");

    let client = OpenAIConfig::new(api_key).with_base_url(base_url).client();
    let agent = AgentBuilder::new(client.chat(model))
        .preamble(SYSTEM_PROMPT)
        .temperature(0.6)
        .build();

    if stream {
        print_streamed_reply(&agent).await
    } else {
        print_full_reply(&agent).await
    }
}

async fn print_streamed_reply(agent: &Agent) -> Result<(), Box<dyn Error>> {
    println!("Streaming response:");
    let mut events = agent.prompt(USER_PROMPT).stream();
    while let Some(event) = events.next().await {
        match event? {
            MultiTurnStreamItem::StreamAssistantItem(Item::Event(StreamEvent::Text {
                text,
                ..
            })) => {
                print!("{text}");
                io::stdout().flush()?;
            }
            MultiTurnStreamItem::FinalResponse(_) => {
                println!("\n-- done --");
                return Ok(());
            }
            _ => {}
        }
    }
    Err("the stream ended before the reply finished".into())
}

async fn print_full_reply(agent: &Agent) -> Result<(), Box<dyn Error>> {
    let response = agent.prompt(USER_PROMPT).await?;
    println!("Non-streaming response:\n{}", response.output().trim());

    let usage = response.usage();
    if let (Some(input), Some(output)) = (usage.input_tokens, usage.output_tokens) {
        println!(
            "Usage — prompt: {input}, completion: {output}, total: {} tokens",
            input + output
        );
    }

    Ok(())
}
