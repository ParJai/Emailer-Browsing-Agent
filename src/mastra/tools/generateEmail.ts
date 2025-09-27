import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";

export const generateEmail = createTool({
  id: "generateEmail",
  description: "Generate an email subject & body given recipient, topic, tone, etc.",
  input: z.object({
    recipientName: z.string(),
    recipientEmail: z.string().email(),
    topic: z.string(),
    tone: z.string().optional(),
    extraContext: z.string().optional(),
  }),
  executor: async (input) => {
    const { recipientName, topic, tone, extraContext } = input;
    const prompt = `
You are an email assistant. Write a professional email to ${recipientName} about "${topic}". 
${tone ? `Use a ${tone} tone.` : ""}
${extraContext ? `Context: ${extraContext}` : ""}

Return in JSON format:
{
  "subject": "...",
  "body": "..."
}
    `;
    const resp = await openai("gpt-4").call(prompt);
    // parse JSON, handle errors
    const obj = JSON.parse(resp.text);
    return obj;
  },
});
