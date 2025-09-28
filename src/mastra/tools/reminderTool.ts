// src/tools/reminderTool.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import notifier from "node-notifier";

type Reminder = {
  task: string;
  time: Date;
};

const reminders: Reminder[] = [];

function scheduleReminder(task: string, delayMs: number) {
  setTimeout(() => {
    notifier.notify({
      title: "⏰ Reminder",
      message: task,
      sound: true, // plays default system sound
      wait: false,
    });
  }, delayMs);
}

export const reminderTool = createTool({
  id: "reminderTool",
  description: "Schedule or set reminders with desktop notifications",
  schema: z.object({
    mode: z.enum(["reminder", "schedule"]),
    task: z.string(),
    minutes: z.number().optional(),
    datetime: z.string().optional(), // ISO datetime string
  }),
  execute: async ({ input }) => {
    if (!input) throw new Error("Input required for reminderTool");
    const { mode, task, minutes, datetime } = input;

    let reminderTime: Date;

    if (mode === "reminder") {
      if (!minutes) throw new Error("Minutes required for reminder mode");
      reminderTime = new Date(Date.now() + minutes * 60 * 1000);
      scheduleReminder(task, minutes * 60 * 1000);
    } else {
      if (!datetime) throw new Error("Datetime required for schedule mode");
      reminderTime = new Date(datetime);
      const delayMs = reminderTime.getTime() - Date.now();
      if (delayMs > 0) {
        scheduleReminder(task, delayMs);
      } else {
        throw new Error("Scheduled time is in the past");
      }
    }

    reminders.push({ task, time: reminderTime });

    return {
      success: true,
      task,
      time: reminderTime.toISOString(),
    };
  },
});
