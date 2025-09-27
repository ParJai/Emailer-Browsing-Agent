// src/tools/generateEmail.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

export const generateEmail = createTool({
  id: "generateEmail",
  description: "Generate an email subject & body given recipient, topic, tone.",
  schema: z.object({
    recipientEmail: z.string(),
    topic: z.string(),
    tone: z.string().optional(),
  }),
  execute: async ({ input }) => {
    const { recipientEmail, topic, tone } = input;

    const prompt = `
Write an email to ${recipientEmail} about "${topic}".
${tone ? `Tone: ${tone}` : ""}
Return a JSON object with "subject" and "body".
`;

    try {
      const model = openai("gpt-4o-mini"); // or gpt-4-turbo
      const resp = await model.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      });

      const text = resp.choices[0]?.message?.content?.trim();

      if (!text) {
        return { subject: "Draft email", body: "Could not generate email content." };
      }

      // Try parsing JSON
      let obj;
      try {
        obj = JSON.parse(text);
      } catch {
        // fallback if the model didn’t return JSON
        obj = { subject: "Draft email", body: text };
      }

      return obj;
    } catch (err) {
      console.error("Error generating email:", err);
      return { subject: "Draft email", body: "Failed to generate email content." };
    }
  },
});
