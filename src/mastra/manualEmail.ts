// src/manualEmail.ts
import "dotenv/config";
import { parseEmailInput } from "./tools/parseEmailInput";
import { generateEmail as generateEmailTool } from "./tools/generateEmail";
import { sendEmail as sendEmailTool } from "./tools/sendEmail";

async function main() {
  // Take raw instruction from command line
  const rawInstruction = process.argv.slice(2).join(" ");
  if (!rawInstruction) {
    console.error('Usage: npx tsx src/manualEmail.ts "send a friendly email to Alice about tomorrow\'s meeting"');
    process.exit(1);
  }

  // Step 1: parse the input into structured fields
  const parsed = await parseEmailInput.execute?.({
    input: { instruction: rawInstruction },
  });

  console.log("Parsed input:", parsed);

  // Step 2: generate the email draft
  const draft = await generateEmailTool.execute?.({ input: parsed });

  if (!draft || !draft.subject || !draft.body) {
    throw new Error("Failed to generate email draft");
  }

  console.log("Generated email draft:");
  console.log("Subject:", draft.subject);
  console.log("Body:", draft.body);

  // Step 3: send the email
  const result = await sendEmailTool.execute?.({
    input: {
      recipientEmail: parsed.recipientEmail,
      subject: draft.subject,
      body: draft.body,
    },
  });

  if (!result || !result.success) {
    throw new Error("Failed to send email");
  }

  console.log("✅ Email sent successfully!");
}

main().catch((err) => {
  console.error("Error:", err);
});
