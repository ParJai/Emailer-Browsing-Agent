// src/agents/emailAgent.ts
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { generateEmail } from "../tools/generateEmail";
import { sendEmail } from "../tools/sendEmail";

export const emailAgent = new Agent({
  name: "EmailAssistant",
  instructions: `
You can generate and send emails. 
When asked to send an email, first call generateEmail, then call sendEmail with the results.
Always ensure both steps complete successfully.
`,
  model: openai("gpt-4o-mini"),
  tools: { generateEmail, sendEmail },
  maxSteps: 50,      // increased from default to allow multiple tool calls
  maxTokens: 1500,  // optional: increase if emails are long
  stream: true,     // optional: allows streaming responses
});
