// src/mastra/agents/emailAgent.ts
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { sendEmail } from "../tools/sendEmail";

// --- Helper tool: extract MCPs from a page ---
export async function extractMCPsTool({ urls }: { urls: string[] }) {
  // Note: Mastra Cloud Agent should be configured to allow "evaluate" / "navigate" calls
  // Here we define the logic assuming the agent will call these functions
  const allMCPs: { title: string; price: string }[] = [];

  for (const url of urls) {
    try {
      // agent should provide navigate/evaluate methods in your tools setup
      const pageContent = await globalThis.agent.evaluate(url, () => {
        return Array.from(document.querySelectorAll(".item-card")).map((el) => ({
          title: el.querySelector(".title")?.textContent || "",
          price: el.querySelector(".price")?.textContent || "",
        }));
      });
      allMCPs.push(...pageContent);
    } catch (err) {
      console.error(`Error extracting MCPs from ${url}:`, err);
    }
  }

  return allMCPs;
}

// --- Helper tool: generate email content ---
export async function generateEmailContentTool({ report }: { report: string }) {
  const prompt = `
Write a professional email including the following report:

${report}

Keep it concise and clear.
`;

  const response = await openai("gpt-4o-mini").chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
  });

  return response.choices[0].message.content || "";
}

// --- Main workflow tool: generate + send email ---
export async function sendMCPReport({ urls }: { urls: string[] }) {
  const MCPs = await extractMCPsTool({ urls });

  if (MCPs.length === 0) {
    console.log("No MCPs found. Skipping email.");
    return "No MCPs found.";
  }

  const report = MCPs.map((item) => `${item.title}: ${item.price}`).join("\n");
  const emailBody = await generateEmailContentTool({ report });

  await sendEmail({
    to: "recipient@example.com", // replace with actual recipient
    subject: "Daily MCP Report",
    text: emailBody,
  });

  console.log("✅ MCP report email sent successfully!");
  return "Email sent successfully!";
}

// --- Export for Mastra Cloud ---
export const emailAgent = { sendMCPReport };
