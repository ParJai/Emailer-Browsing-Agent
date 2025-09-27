// src/manualEmail.ts
import "dotenv/config";
import { createTransport } from "nodemailer";
import { generateEmail as generateEmailTool } from "./tools/generateEmail";
import { sendEmail as sendEmailTool } from "./tools/sendEmail";

async function main() {
  // Step 1: generate the email draft
  const draft = await generateEmailTool.execute?.({
    input: {
      recipientName: "Parth",
      recipientEmail: "parthjain22@gmail.com",
      topic: "today's meeting",
      tone: "friendly",
    },
  });

  if (!draft || !draft.subject || !draft.body) {
    throw new Error("Failed to generate email draft");
  }

  console.log("Generated email draft:");
  console.log("Subject:", draft.subject);
  console.log("Body:", draft.body);

  // Step 2: send the email
  const result = await sendEmailTool.execute?.({
    input: {
      recipientEmail: "parthjain22@gmail.com",
      subject: draft.subject,
      body: draft.body,
    },
  });

  if (!result || !result.success) {
    throw new Error("Failed to send email");
  }

  console.log("Email sent successfully!");
}

main().catch((err) => {
  console.error("Error:", err);
});
