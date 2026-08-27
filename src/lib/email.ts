import nodemailer from "nodemailer";

export interface CvEmailInput {
  to: string;
  subject: string;
  text: string;
  attachment: { filename: string; content: Buffer };
}

export interface SendResult {
  provider: "gmail" | "ethereal";
  messageId: string;
  /** Ethereal-only preview link (dev). Always null with Gmail / in production. */
  previewUrl: string | null;
}

/**
 * Sends the CV email with the PDF attached.
 *
 * - Production path: Gmail SMTP via an App Password (GMAIL_USER +
 *   GMAIL_APP_PASSWORD). Free, no domain required.
 * - Dev path: if those aren't set we fall back to an Ethereal test inbox so the
 *   whole flow is verifiable locally with zero real credentials — the returned
 *   previewUrl shows the composed message and attachment.
 *
 * In production we NEVER fall back silently: a missing credential is a hard
 * error so a CV is never quietly dropped instead of delivered.
 */
export async function sendCvEmail(input: CvEmailInput): Promise<SendResult> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  const attachments = [
    {
      filename: input.attachment.filename,
      content: input.attachment.content,
      contentType: "application/pdf",
    },
  ];

  if (gmailUser && gmailPass) {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });
    const info = await transport.sendMail({
      from: `TurboTrabajo CV <${gmailUser}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      attachments,
    });
    return { provider: "gmail", messageId: info.messageId, previewUrl: null };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Email no configurado: define GMAIL_USER y GMAIL_APP_PASSWORD en el entorno."
    );
  }

  // Dev fallback — no real credentials needed.
  const testAccount = await nodemailer.createTestAccount();
  const transport = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  const info = await transport.sendMail({
    from: `TurboTrabajo CV <${testAccount.user}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    attachments,
  });
  return {
    provider: "ethereal",
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}
