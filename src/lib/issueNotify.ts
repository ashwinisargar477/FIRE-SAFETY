/** Response shape from `POST /api/issues/empty-cylinder`. */
export type EmptyCylinderApiResponse = {
  ok?: boolean;
  message?: string;
  simulated?: boolean;
  smtpConfigured?: boolean;
  recipients?: string[];
};

/**
 * Short message for toasts/banners so users know mail is gated on server SMTP env vars.
 */
export function userFacingIssueNotifyMessage(data: EmptyCylinderApiResponse): string {
  const noMailSent = data.simulated === true || data.smtpConfigured === false;
  if (noMailSent) {
    const list = data.recipients?.filter(Boolean).join(', ');
    const who = list ? ` Intended recipients: ${list}.` : '';
    return `Report accepted — no email was sent (SMTP not configured on the server).${who} Add SMTP_HOST, SMTP_USER, and SMTP_PASS to .env.local, then restart the dev server.`;
  }
  if (data.message?.trim()) return data.message.trim();
  const list = data.recipients?.filter(Boolean).join(', ');
  return list ? `Email sent to ${list}.` : 'Plant admin notified by email.';
}
