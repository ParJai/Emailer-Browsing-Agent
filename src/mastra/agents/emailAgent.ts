// src/agents/emailAgent.ts
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { generateEmail } from "../tools/generateEmail";
import { sendEmail } from "../tools/sendEmail";

export const emailAgent = new Agent({
  name: "EmailAssistant",
  instructions: `
You are an email assistant. When the user asks to send an email:
1. Use the 'generateEmail' tool to create a subject and body.
2. Then use the 'sendEmail' tool. Pass it the recipient's email from the user AND the subject/body from generateEmail.
Never call sendEmail with empty arguments.
Always call generateEmail first.
`,
  model: openai("gpt-4o-mini"),
  tools: { generateEmail, sendEmail },
  maxSteps: 50,      // increased from default to allow multiple tool calls
  maxTokens: 1500,  // optional: increase if emails are long
  stream: true,     // optional: allows streaming responses
});
