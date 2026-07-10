"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";

export async function saveAiContexts(formData: FormData) {
  const session = await requireLandlord();
  await db.user.update({
    where: { id: session.userId },
    data: {
      aiContextMaintenance:   (String(formData.get("aiContextMaintenance")  ?? "")).trim() || null,
      aiContextScreening:     (String(formData.get("aiContextScreening")    ?? "")).trim() || null,
      aiContextDigest:        (String(formData.get("aiContextDigest")       ?? "")).trim() || null,
      aiContextRentSuggestion:(String(formData.get("aiContextRentSuggestion")?? "")).trim() || null,
      aiContextRenewal:       (String(formData.get("aiContextRenewal")      ?? "")).trim() || null,
    },
  });
  revalidatePath("/settings");
  redirect("/settings?aiSaved=1");
}
