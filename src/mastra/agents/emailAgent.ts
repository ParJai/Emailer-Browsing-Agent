// src/agents/emailAgent.ts
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { generateEmail } from "../tools/generateEmail";
import { sendEmail } from "../tools/sendEmail";

// Combined tool: generate + send email
export async function generateAndSendEmail(input: string) {
  console.log("🔹 generateAndSendEmail called with input:", input);

  try {
    // 1️⃣ Generate the email content
    const emailContent = await generateEmail(input);
    console.log("🔹 Email content generated:", emailContent);

    // 2️⃣ Send the email
    await sendEmail({
      to: "recipient@example.com",      // replace with desired recipient
      subject: emailContent.subject || "Automated Email",
      text: emailContent.text,
      html: emailContent.html,          // optional HTML content
    });

    console.log("✅ Email sent successfully!");
    return "Email sent successfully!";
  } catch (err) {
    console.error("❌ Error generating or sending email:", err);
    return "Failed to send email.";
  }
}

// Agent definition
export const emailAgent = new Agent({
  name: "EmailAssistant",
  instructions: `
You can generate and send emails. 
Use the generateAndSendEmail tool to perform both steps in a single action.
`,
  model: openai("gpt-4o-mini"),
  tools: { generateAndSendEmail },   // only 1 tool now
  maxSteps: 15,                      // increased to avoid tool-calls cutoff
  maxTokens: 2000,                   // larger token limit for long emails
  stream: false,                      // disable streaming for stability
});
