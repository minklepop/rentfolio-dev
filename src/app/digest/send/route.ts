import { buildWeeklyDigest, buildAiSummary, digestToText, digestToHtml } from "@/lib/digest";
import { sendEmail } from "@/lib/email";
import { db } from "@/lib/db";

/**
 * Cron-friendly endpoint: hit this from a scheduled task (cron, Windows Task
 * Scheduler, etc.) instead of needing a separate long-running Node script.
 * Protected by DIGEST_CRON_SECRET since it has no logged-in session.
 */
export async function GET(req: Request) {
  const secret = process.env.DIGEST_CRON_SECRET;
  const token = new URL(req.url).searchParams.get("token");
  if (!secret || token !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const to = process.env.DIGEST_TO;
  if (!to) {
    return new Response("Set DIGEST_TO to the landlord's email first.", { status: 500 });
  }

  const data = await buildWeeklyDigest();
  const landlord = await db.user.findFirst({ where: { role: "LANDLORD" }, select: { id: true, aiContextDigest: true } });
  const aiSummary = await buildAiSummary(data, landlord?.aiContextDigest, landlord?.id);
  try {
    await sendEmail(to, "Rentfolio: this week's follow-ups", digestToText(data, aiSummary), digestToHtml(data, aiSummary));
    return new Response("Digest sent.");
  } catch (e) {
    return new Response((e as Error).message, { status: 500 });
  }
}
