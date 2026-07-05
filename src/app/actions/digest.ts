"use server";

import { redirect } from "next/navigation";
import { requireLandlord } from "@/lib/auth";
import { buildWeeklyDigest, digestToText, digestToHtml } from "@/lib/digest";
import { sendEmail } from "@/lib/email";

export async function sendDigestNow() {
  const session = await requireLandlord();
  const data = await buildWeeklyDigest();

  let errorMessage: string | null = null;
  try {
    await sendEmail(
      process.env.DIGEST_TO || session.email,
      "Rentfolio: this week's follow-ups",
      digestToText(data),
      digestToHtml(data)
    );
  } catch (e) {
    errorMessage = (e as Error).message;
  }

  // redirect() throws internally to perform the navigation, so it must run
  // outside the try/catch above or this function's own catch would intercept it.
  if (errorMessage) redirect(`/settings?digestError=${encodeURIComponent(errorMessage)}`);
  redirect("/settings?digestSent=1");
}
