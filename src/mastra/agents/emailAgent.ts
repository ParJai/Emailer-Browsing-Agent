// src/mastra/agents/emailAgent.ts
import { MastraAgent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { sendEmail } from "../tools/sendEmail";

// --- Mastra browsing agent ---
const agent = new MastraAgent({ headless: true });

// --- Helper: extract MCPs from pages ---
async function extractMCPs(urls: string[]) {
  const allMCPs: { title: string; price: string }[] = [];

  for (const url of urls) {
    try {
      await agent.navigate(url);
      await agent.waitForSelector("body");

      const MCPs = await agent.evaluate(() => {
        return Array.from(document.querySelectorAll(".item-card")).map((el) => ({
          title: el.querySelector(".title")?.innerText || "",
          price: el.querySelector(".price")?.innerText || "",
        }));
      });

      allMCPs.push(...MCPs);

      // Delay to avoid 429 throttling
      await agent.sleep(Math.random() * 3000 + 2000);
    } catch (err) {
      console.error(`Error extracting MCPs from ${url}:`, err);
    }
  }

  return allMCPs;
}

// --- Helper: generate email content ---
async function generateEmailContent(report: string) {
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

// --- Main workflow: extract MCPs and send email ---
export async function sendMCPReport(urls: string[]) {
  const MCPs = await extractMCPs(urls);

  if (MCPs.length === 0) {
    console.log("No MCPs found. Skipping email.");
    return;
  }

  const report = MCPs.map((item) => `${item.title}: ${item.price}`).join("\n");
  const emailBody = await generateEmailContent(report);

  await sendEmail({
    to: "recipient@example.com", // replace with actual recipient
    subject: "Daily MCP Report",
    text: emailBody,
  });

  console.log("✅ MCP report email sent successfully!");
}

// --- Export for Mastra Cloud ---
export const emailAgent = { sendMCPReport };
