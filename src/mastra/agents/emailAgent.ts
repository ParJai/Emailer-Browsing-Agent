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
`,
  model: openai("gpt-4o-mini"),
  tools: { generateEmail, sendEmail },
});
