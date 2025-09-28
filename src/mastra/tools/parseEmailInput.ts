// src/tools/parseEmailInput.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

export const parseEmailInput = createTool({
  id: "parseEmailInput",
  description: "Parses a natural-language request into email fields",
  schema: z.object({
    instruction: z.string(),
  }),
  execute: async ({ input }) => {
    if (!input) throw new Error("No input provided");

    const { instruction } = input;

    const model = openai("gpt-4o-mini");

    const resp = await model.doGenerate({
      inputFormat: "prompt",
      mode: { type: "regular" },
      prompt: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract structured email fields from this instruction: "${instruction}"

Return as valid JSON with keys:
- recipientName (string, guess if not given)
- recipientEmail (string, guess fake if not provided)
- senderName (string, guess if not given)
- topic (string)
- tone (string, e.g. friendly, formal, concise)`,
            },
          ],
        },
      ],
    });

    console.log(resp.text?.substring(8, resp.text?.length-3))
    let obj;
    try {
      obj = JSON.parse((resp.text?.substring(8, resp.text?.length-3) || "{}"));
    } catch {
      throw new Error("Failed to parse model output as JSON");
    }
    return obj;
  },
});
