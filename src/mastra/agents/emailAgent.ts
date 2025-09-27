// src/mastra/agents/emailAgent.ts
import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { sendEmail } from "../tools/sendEmail";

// --- Single workflow tool: generate + send email ---
export const sendEmailWorkflow = {
  id: "sendEmailWorkflow",
  description: "Generates and sends an email in one workflow.",
  schema: z.object({
    recipientEmail: z.string(),
    topic: z.string(),
    tone: z.string().optional(),
  }),
  execute: async ({ input }: { input: { recipientEmail: string; topic: string; tone?: string } }) => {
    const { recipientEmail, topic, tone } = input;

    // --- Step 1: Generate email content ---
    let emailContent: { subject: string; body: string };
    try {
      const prompt = `
Write an email to ${recipientEmail} about "${topic}".
${tone ? `Tone: ${tone}` : ""}
Return a JSON object: { "subject": "...", "body": "..." }
      `;

      const resp = await openai("gpt-4o-mini").chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      });

      const text = resp.choices[0]?.message?.content?.trim();
      emailContent = text ? JSON.parse(text) : { subject: "Draft email", body: "Could not generate content." };
    } catch (err) {
      console.error("Error generating email:", err);
      return { success: false, message: "Failed to generate email." };
    }

    // --- Step 2: Send email ---
    try {
      await sendEmail({
        to: recipientEmail,
        subject: emailContent.subject,
        text: emailContent.body,
      });

      console.log("✅ Email sent successfully!");
      return { success: true, message: "Email sent successfully." };
    } catch (err) {
      console.error("Error sending email:", err);
      return { success: false, message: "Failed to send email." };
    }
  },
};

// --- Create the agent using the workflow tool ---
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
  maxSteps: 20,       // enough for single tool call
  maxTokens: 1500,
  stream: false,      // single tool call, no streaming needed
});
