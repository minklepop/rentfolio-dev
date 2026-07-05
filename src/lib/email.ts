import nodemailer from "nodemailer";

export type EmailAttachment = { filename: string; content: Buffer; contentType?: string };

/**
 * Sends via SMTP using env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 * Works with any provider's SMTP (Gmail app password, Resend, etc.) - no paid service required.
 */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
  attachments?: EmailAttachment[]
) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in your environment to enable email."
    );
  }
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transport.sendMail({ from: SMTP_FROM || SMTP_USER, to, subject, text, html, attachments });
}
