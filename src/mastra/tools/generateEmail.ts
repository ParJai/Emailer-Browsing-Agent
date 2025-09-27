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

    const userPrompt = `
Write a professional email to ${recipientName} about "${topic}".
${tone ? `Tone: ${tone}` : ""}
Return JSON: { "subject": "...", "body": "..." }
`;

    const model = openai("gpt-4o-mini");
    const resp = await model.doGenerate({
      inputFormat: "messages",
      mode: { type: "regular" },
      prompt: [
        {
          role: "user",
          content: [{ type: "text", text: userPrompt }],
        },
      ],
    });

    // console.log(resp)
    const text = resp?.text ?? "";

    if (!text) {
      throw new Error("LLM returned empty response");
    }

    let obj;
    try {
      obj = JSON.parse(text);
    } catch {
      obj = { subject: "Draft email", body: text };
    }

    return obj;
  },
});
