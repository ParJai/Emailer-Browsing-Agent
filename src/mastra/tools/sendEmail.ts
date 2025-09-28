// src/tools/sendEmail.ts
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
  schema: z.object({
    recipientEmail: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
  execute: async ({ input }) => {
    const { recipientEmail, senderName, subject, body } = input;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: recipientEmail,
      sender: senderName,
      subject,
      html: body,
    });

    return { success: true };
  },
});
