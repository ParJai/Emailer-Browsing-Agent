// src/agents/emailAgent.ts
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { generateEmail } from "../tools/generateEmail";
import { sendEmail } from "../tools/sendEmail";

// New combined tool
export async function generateAndSendEmail(input: string) {
  try {
    // 1️⃣ Generate the email content
    const emailContent = await generateEmail(input);

    // 2️⃣ Send the email
    await sendEmail({
      to: "recipient@example.com",   // replace with desired recipient
      subject: emailContent.subject || "Automated Email",
      text: emailContent.text,
      html: emailContent.html,       // optional HTML content
    });

    return "Email sent successfully!";
  } catch (err) {
    console.error("Error generating or sending email:", err);
    return "Failed to send email.";
  }
}

// Agent definition
export const emailAgent = new Agent({
  name: "EmailAssistant",
  instructions: `
You can generate and send emails. 
When asked, use the generateAndSendEmail tool to perform both steps in one action.
`,
  model: openai("gpt-4o-mini"),
  tools: { generateAndSendEmail },   // only 1 tool now
  maxSteps: 3,                       // enough for planning + single tool call
  maxTokens: 1500,
  stream: true,
});
