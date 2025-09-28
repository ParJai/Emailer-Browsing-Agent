// src/agents/schedulerAgent.ts
import { Agent } from "@mastra/core/agent";
import { reminderTool } from "../tools/reminderTool";
import { openai } from "@ai-sdk/openai";

export const schedulerAgent = new Agent({
  id: "SchedulerAgent",
  name: "Scheduler Agent",
  model: openai("gpt-4o-mini"),
  tools: { reminderTool },
});
