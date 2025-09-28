// src/manualReminder.ts
import "dotenv/config";
import { reminderParser } from "./tools/reminderParser";
import { reminderScheduler } from "./tools/reminderScheduler";

async function main() {
  const raw = process.argv.slice(2).join(" ");
  if (!raw) {
    console.error('Usage: npx tsx src/manualReminder.ts "remind me to stretch in 2 minutes"');
    process.exit(1);
  }

  const parsed = await reminderParser.execute({ input: raw });
  console.log("Parsed reminder:", parsed);

  await reminderScheduler.execute({ input: parsed });
  console.log("✅ Reminder scheduled!");
}

main();
