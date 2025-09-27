import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = createTool({
  id: "sendEmail",
  description: "Send an email via SMTP",
  input: z.object({
    recipientEmail: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
  executor: async ({ recipientEmail, subject, body }) => {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: recipientEmail,
      subject,
      html: body,
    });
    return { success: true };
  },
});
