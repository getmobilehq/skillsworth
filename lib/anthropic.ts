import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// SERVER ONLY. The Anthropic key never reaches the client. (handoff §4, §8)
//
// Used by the admin generation flow to build a *reviewed question bank* — NOT
// per-play. Generate once per skill into `questions` (status 'draft'), have a
// human calibrate/approve, then serve a randomized approved subset. The `1000`
// max_tokens in the prototype was an artifact-only limit; set real budgets here.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Default model for assessment generation. Latest Claude per project guidance.
export const GENERATION_MODEL = "claude-sonnet-4-6";

/** Extract concatenated text from a Messages API response. */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
