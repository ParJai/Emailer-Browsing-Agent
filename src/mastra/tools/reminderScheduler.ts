// src/tools/reminderSchedulerCrossPlatform.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import os from "os";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

export const reminderScheduler = createTool({
  id: "reminderScheduler",
  description:
    "Schedules a system-level reminder/notification across Windows/macOS/Linux",
  schema: z.object({
    task: z.string(),
    datetime: z.string().datetime(),
  }),
  execute: async ({ input }) => {
    if (!input) throw new Error("No input provided");

    const { task, datetime } = input;
    const when = new Date(datetime);
    if (when.getTime() <= Date.now())
      throw new Error("Datetime is in the past");

    const platform = os.platform();
    const tmpDir = os.tmpdir();
    const id = `reminder_${Date.now()}`;

    if (platform === "win32") {
      const scriptPath = path.join(tmpDir, `${id}.ps1`);
      const psScript = `
Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show(${JSON.stringify(task)}, "Reminder")
`;
      await fs.promises.writeFile(scriptPath, psScript, { encoding: "utf-8" });

      const pad = (n: number) => (n < 10 ? "0" + n : n.toString());
      const st = `${pad(when.getHours())}:${pad(when.getMinutes())}`;
      const sd = `${pad(when.getMonth() + 1)}/${pad(when.getDate())}/${when.getFullYear()}`;
      const taskName = `Reminder_${Date.now()}`;
      const cmd = `SCHTASKS /Create /SC ONCE /TN ${taskName} /TR "powershell -ExecutionPolicy Bypass -File ${scriptPath}" /ST ${st} /SD ${sd} /F`;
      execSync(cmd, { stdio: "ignore" });
      return { scheduled: true, task, datetime, taskName };
    } else if (platform === "darwin") {
      // macOS: LaunchAgent
      const plistDir = path.join(os.homedir(), "Library/LaunchAgents");
      fs.mkdirSync(plistDir, { recursive: true });
      const scriptPath = path.join(tmpDir, `${id}.sh`);
      const appleScript = `display notification ${JSON.stringify(task)} with title "Reminder"`;
      const scriptContent = `#!/bin/bash\nosascript -e ${JSON.stringify(appleScript)}`;
      await fs.promises.writeFile(scriptPath, scriptContent, { mode: 0o755 });

      const plistName = `com.local.${id}.plist`;
      const plistPath = path.join(plistDir, plistName);
      const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.local.${id}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${scriptPath}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Year</key><integer>${when.getFullYear()}</integer>
    <key>Month</key><integer>${when.getMonth() + 1}</integer>
    <key>Day</key><integer>${when.getDate()}</integer>
    <key>Hour</key><integer>${when.getHours()}</integer>
    <key>Minute</key><integer>${when.getMinutes()}</integer>
  </dict>
  <key>RunAtLoad</key><false/>
</dict>
</plist>`;
      await fs.promises.writeFile(plistPath, plist, { mode: 0o644 });
      execSync(`launchctl load -w ${plistPath}`);
      return { scheduled: true, task, datetime, plistPath };
    } else if (platform === "linux") {
      // Linux: `at` + `notify-send`
      const scriptPath = path.join(tmpDir, `${id}.sh`);
      const scriptContent = `#!/bin/bash\nnotify-send "Reminder" ${JSON.stringify(task)}`;
      await fs.promises.writeFile(scriptPath, scriptContent, { mode: 0o755 });
      const atTime = when.toTimeString().slice(0, 5); // HH:MM
      const atDate = `${when.getDate()} ${when.toLocaleString("en-us", { month: "short" })} ${when.getFullYear()}`;
      execSync(`echo "${scriptPath}" | at ${atTime} ${atDate}`);
      return { scheduled: true, task, datetime, scriptPath };
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  },
});
