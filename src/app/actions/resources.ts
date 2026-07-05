"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";

export async function createResource(formData: FormData) {
  await requireLandlord();
  const url = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  if (!url || !label) redirect("/resources?error=1");
  await db.resource.create({
    data: {
      label,
      url,
      category: String(formData.get("category") ?? "OTHER"),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  revalidatePath("/", "layout");
  redirect("/resources");
}

export async function deleteResource(formData: FormData) {
  await requireLandlord();
  await db.resource.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/", "layout");
  redirect("/resources");
}
