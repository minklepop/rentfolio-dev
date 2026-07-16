"use server";

import { revalidatePath } from "next/cache";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";

export async function reviewAiDecision(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("decisionId") ?? "");
  const verdict = String(formData.get("verdict") ?? "");
  const feedbackNote = String(formData.get("feedbackNote") ?? "").trim() || null;
  const overrideValue = String(formData.get("overrideValue") ?? "").trim() || null;
  if (!id || !["accepted", "rejected"].includes(verdict)) return;

  const decision = await db.aiDecision.findUnique({ where: { id } });
  if (!decision) return;

  await db.aiDecision.update({
    where: { id },
    data: {
      accepted: verdict === "accepted",
      feedbackNote,
      overrideValue,
      reviewedAt: new Date(),
    },
  });
  revalidatePath("/ai-history");
  revalidatePath("/analytics");
}
