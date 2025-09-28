// src/reminder/scheduler.ts
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export type ScheduleResult = { success: true; id: string; when: string; rawTask: string };

function shellEscapeSingle(s: string) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

// Parse simple NL for: "remind me to X in N minutes/hours/days"
// or "schedule X for YYYY-MM-DDTHH:MM:SSZ" or "schedule X for 2025-09-30 14:00"
export function parseReminderText(raw: string): { task: string; when: Date } {
  raw = raw.trim();

  // 1) "remind me to <task> in N minutes|hours|days"
  const inMatch = raw.match(/remind me to\s+(.+?)\s+in\s+(\d+)\s*(minute|minutes|hour|hours|day|days)/i);
  if (inMatch) {
    const task = inMatch[1].trim();
    const n = parseInt(inMatch[2], 10);
    const unit = inMatch[3].toLowerCase();
    let ms = n * 60_000;
    if (unit.startsWith("hour")) ms = n * 60 * 60_000;
    if (unit.startsWith("day")) ms = n * 24 * 60 * 60_000;
    return { task, when: new Date(Date.now() + ms) };
  }

  // 2) "schedule <task> for <datetime>"
  const scheduleMatch = raw.match(/(?:schedule|set)\s+(.+?)\s+for\s+(.+)/i);
  if (scheduleMatch) {
    const task = scheduleMatch[1].trim();
    const dateStr = scheduleMatch[2].trim();
    const when = new Date(dateStr);
    if (!isNaN(when.getTime())) return { task, when };
  }

  // 3) ISO in the sentence "remind me to <task> at <ISO>"
  const isoMatch = raw.match(/(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z?)/);
  if (isoMatch) {
    const when = new Date(isoMatch[1]);
    const task = raw.replace(isoMatch[0], "").replace(/remind me to/i, "").trim();
    if (!isNaN(when.getTime())) return { task, when };
  }

  throw new Error(
    "Couldn't parse reminder. Use `remind me to [task] in [N] minutes` or `schedule [task] for [ISO datetime]`"
  );
}

// Helper to format date/time pieces
function dateParts(d: Date) {
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
  };
}

/**
 * Create a one-off scheduled notification using the OS scheduler.
 * Returns an object with id & when.
 */
export function scheduleNotificationOS(task: string, when: Date): ScheduleResult {
  const id = `reminder-${Date.now()}`;
  const title = "Reminder";
  const message = task;
  const platform = os.platform();

  // ensure a storage dir
  const storageDir = path.join(os.homedir(), ".local-reminders");
  fs.mkdirSync(storageDir, { recursive: true });

  if (platform === "linux") {
    // Use systemd --user service + timer (common on modern Linux desktops)
    const configDir = path.join(os.homedir(), ".config", "systemd", "user");
    fs.mkdirSync(configDir, { recursive: true });

    const serviceName = `reminder-${id}.service`;
    const timerName = `reminder-${id}.timer`;
    const servicePath = path.join(configDir, serviceName);
    const timerPath = path.join(configDir, timerName);

    // Write a shell script that calls notify-send (so quoting is safe)
    const scriptPath = path.join(storageDir, `${id}.sh`);
    const scriptContent = `#!/bin/bash
notify-send ${shellEscapeSingle(title)} ${shellEscapeSingle(message)}
`;
    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    const serviceUnit = `[Unit]
Description=Reminder ${id}

[Service]
Type=oneshot
ExecStart=${shellEscapeSingle(scriptPath)}
`;
    // OnCalendar format: YYYY-MM-DD HH:MM:SS
    const whenStr = when.toISOString().replace("T", " ").split(".")[0];

    const timerUnit = `[Unit]
Description=Timer for reminder ${id}

[Timer]
OnCalendar=${whenStr}
Persistent=true

[Install]
WantedBy=timers.target
`;

    fs.writeFileSync(servicePath, serviceUnit);
    fs.writeFileSync(timerPath, timerUnit);

    // reload user daemon and enable timer
    try {
      execSync("systemctl --user daemon-reload");
      execSync(`systemctl --user enable --now ${path.basename(timerPath)}`);
    } catch (err) {
      throw new Error(
        `Failed to create systemd timer. Ensure systemd --user is available. Error: ${(err as any).message}`
      );
    }

    return { success: true, id, when: when.toISOString(), rawTask: task };
  } else if (platform === "darwin") {
    // macOS: create a LaunchAgent plist in ~/Library/LaunchAgents that runs osascript
    const plistDir = path.join(os.homedir(), "Library", "LaunchAgents");
    fs.mkdirSync(plistDir, { recursive: true });

    const scriptPath = path.join(storageDir, `${id}.sh`);
    // Use osascript — doesn't need extra dependencies
    // Escape quotes in message/title
    const appleScript = `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`;
    const scriptContent = `#!/bin/bash
osascript -e ${JSON.stringify(appleScript)}
`;
    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    const plistName = `com.local.${id}.plist`;
    const plistPath = path.join(plistDir, plistName);
    const parts = dateParts(when);
    // LaunchAgents StartCalendarInterval expects dict of ints
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.local.${id}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${scriptPath}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Year</key><integer>${parts.year}</integer>
    <key>Month</key><integer>${parts.month}</integer>
    <key>Day</key><integer>${parts.day}</integer>
    <key>Hour</key><integer>${parts.hour}</integer>
    <key>Minute</key><integer>${parts.minute}</integer>
  </dict>
  <key>RunAtLoad</key><false/>
</dict>
</plist>`;

    fs.writeFileSync(plistPath, plist, { mode: 0o644 });

    try {
      execSync(`launchctl load -w ${shellEscapeSingle(plistPath)}`);
    } catch (err) {
      throw new Error(
        `Failed to load LaunchAgent. You may need permission. Error: ${(err as any).message}`
      );
    }

    return { success: true, id, when: when.toISOString(), rawTask: task };
  } else if (platform === "win32") {
    // Windows: create a PowerShell script and schedule it with schtasks.
    // Note: the task will show a MessageBox, user must be logged in.
    const scriptPath = path.join(storageDir, `${id}.ps1`);
    // Use a simple MessageBox (works when user session available)
    const ps = `
Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show(${JSON.stringify(message)}, ${JSON.stringify(title)})
`;
    fs.writeFileSync(scriptPath, ps, { mode: 0o644 });

    // Build schtasks time strings: /ST HH:MM /SD MM/DD/YYYY
    const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
    const parts = dateParts(when);
    const st = `${pad(parts.hour)}:${pad(parts.minute)}`;
    const sd = `${pad(parts.month)}/${pad(parts.day)}/${parts.year}`;

    // Build schtasks command
    const taskName = `Reminder_${id}`;
    // Use double quotes appropriately
    const cmd = `SCHTASKS /Create /SC ONCE /TN ${taskName} /TR "powershell -ExecutionPolicy Bypass -File ${scriptPath}" /ST ${st} /SD ${sd} /F`;
    try {
      execSync(cmd, { stdio: "ignore" });
    } catch (err) {
      throw new Error(`Failed to create schtask: ${(err as any).message}`);
    }

    return { success: true, id, when: when.toISOString(), rawTask: task };
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * scheduleReminder: high-level helper you call directly.
 * Accepts either `raw` natural text like "remind me to X in 5 minutes"
 * or already parsed fields.
 */
export async function scheduleReminder(args: {
  raw?: string;
  task?: string;
  datetime?: string | Date;
  minutes?: number;
}): Promise<ScheduleResult> {
  let task: string | undefined;
  let when: Date | undefined;

  if (args.task && args.datetime) {
    task = args.task;
    when = typeof args.datetime === "string" ? new Date(args.datetime) : args.datetime;
  } else if (args.task && args.minutes) {
    task = args.task;
    when = new Date(Date.now() + args.minutes * 60_000);
  } else if (args.raw) {
    const parsed = parseReminderText(args.raw);
    task = parsed.task;
    when = parsed.when;
  } else {
    throw new Error("Provide raw text, or task+datetime, or task+minutes");
  }

  if (!task || !when || isNaN(when.getTime())) throw new Error("Invalid task or time");

  // If scheduled time is in the past:
  if (when.getTime() <= Date.now()) throw new Error("Scheduled time is in the past");

  return scheduleNotificationOS(task, when);
}
