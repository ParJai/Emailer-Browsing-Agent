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
    const { senderName, recipientName, topic, tone } = input;

    const userPrompt = `
Write a professional email to ${recipientName} from ${senderName} about "${topic}".
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
    let text = resp?.text ?? "";

    if (!text) {
      throw new Error("LLM returned empty response");
    }

    try {
      let obj = JSON.parse(text);
    } catch {
      let obj = { subject: "Draft email", body: text };
    }

    console.log(resp.text)
    // text = JSON.parse(resp.text?.substring(8, resp.text?.length-3));
    try {
      text = JSON.parse(resp.text)
    } catch {
      text = JSON.parse(resp.text?.substring(8, resp.text?.length-3));
    }

    if (!text) {
      return { sender: "Sender", subject: "Draft email", body: "Could not generate email content." };
    }

    // Try parsing JSON
    let obj;
    try {
      obj = JSON.parse(text);
    } catch {
      // fallback if the model didn’t return JSON
      obj = { sender: text.senderName, subject: text.subject, body: text.body };
    }

    return obj;
  }, catch(err) {
    console.error("Error generating email:", err);
    return { sender: text.senderName, subject: "Draft email", body: "Failed to generate email content." };
  }
},
);
