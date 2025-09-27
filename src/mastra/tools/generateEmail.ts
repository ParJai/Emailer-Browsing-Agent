// src/tools/generateEmail.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

export const generateEmail = createTool({
  id: "generateEmail",
  description: "Generate an email subject & body given recipient, topic, tone.",
  schema: z.object({
    recipientName: z.string(),
    recipientEmail: z.string().email(),
    topic: z.string(),
    tone: z.string().optional(),
  }),
  execute: async ({ input }) => {
    const { recipientName, topic, tone } = input;

    const prompt = `
Write a professional email to ${recipientName} about "${topic}".
${tone ? `Tone: ${tone}` : ""}
Return JSON: { "subject": "...", "body": "..." }
    `;

    const model = openai("gpt-4o-mini"); // or "gpt-4-turbo" etc.
    const resp = await model.generate({ prompt });

    // parse JSON from LLM output
    let obj;
    try {
      obj = JSON.parse(resp.output_text);
    } catch {
      obj = { subject: "Draft email", body: resp.output_text };
    }

    return obj;
  },
});
