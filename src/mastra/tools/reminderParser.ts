// src/tools/reminderParser.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

export const reminderParser = createTool({
  id: "reminderParser",
  description: "Parses free-form reminder text into task + datetime",
  schema: z.object({
    input: z.string(),
  }),
  execute: async ({ input }) => {
    if (!input) throw new Error("No input provided");

    const now = new Date().toISOString();

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        task: z.string(),
        datetime: z.string().datetime(),
      }),
      prompt: `You are a reminder parser. Current UTC time is: ${now}. Extract a reminder from this request and return JSON { task, datetime (ISO8601) }:\n\n"${input}"`,
    });

    console.log(object);
    return object;
  },
});
