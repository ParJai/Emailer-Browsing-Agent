// src/index.ts
import "dotenv/config";
import { emailAgent } from "./agents/emailAgent";

async function main() {
  const result = await emailAgent.run(`
    Send an email to Alice (alice@example.com) about our new product launch, tone: friendly.
  `);

  console.log("Agent result:", result);
}

main();
