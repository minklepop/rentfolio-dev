"use server";

import { redirect } from "next/navigation";
import { requireLandlord } from "@/lib/auth";
import { buildWeeklyDigest, buildAiSummary, digestToText, digestToHtml } from "@/lib/digest";
import { sendEmail } from "@/lib/email";
import { db } from "@/lib/db";

export async function sendDigestNow() {
  const session = await requireLandlord();
  const data = await buildWeeklyDigest();
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { aiContextDigest: true } });
  const aiSummary = await buildAiSummary(data, user?.aiContextDigest, session.userId);

  let errorMessage: string | null = null;
  try {
    await sendEmail(
      process.env.DIGEST_TO || session.email,
      "Rentfolio: this week's follow-ups",
      digestToText(data, aiSummary),
      digestToHtml(data, aiSummary)
    );
  } catch (e) {
    errorMessage = (e as Error).message;
  }

  // redirect() throws internally to perform the navigation, so it must run
  // outside the try/catch above or this function's own catch would intercept it.
  if (errorMessage) redirect(`/settings?digestError=${encodeURIComponent(errorMessage)}`);
  redirect("/settings?digestSent=1");
}
