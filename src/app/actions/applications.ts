"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { parseDateInput } from "@/lib/format";

/** Public action: submit a rental application from /apply/[slug]. */
export async function submitApplication(formData: FormData) {
  const slug = String(formData.get("slug"));
  const listing = await db.listing.findUnique({ where: { slug } });
  if (!listing || listing.status !== "PUBLISHED") redirect("/");

  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const opt = (key: string) => str(key) || null;

  if (!str("fullName") || !str("email") || !str("phone")) {
    redirect(`/apply/${slug}?error=required`);
  }

  await db.application.create({
    data: {
      listingId: listing.id,
      fullName: str("fullName"),
      email: str("email"),
      phone: str("phone"),
      currentAddress: opt("currentAddress"),
      employer: opt("employer"),
      jobTitle: opt("jobTitle"),
      monthlyIncomeCents: formData.get("monthlyIncome")
        ? parseMoney(formData.get("monthlyIncome"))
        : null,
      moveInDate: parseDateInput(formData.get("moveInDate")),
      occupants: Math.max(1, Number(formData.get("occupants")) || 1),
      pets: opt("pets"),
      vehicles: opt("vehicles"),
      refName: opt("refName"),
      refPhone: opt("refPhone"),
      refRelation: opt("refRelation"),
      extraInfo: opt("extraInfo"),
    },
  });
  redirect(`/apply/${slug}/submitted`);
}

export async function setApplicationStatus(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("id"));
  await db.application.update({
    where: { id },
    data: { status: String(formData.get("status") ?? "NEW") },
  });
  revalidatePath("/", "layout");
  redirect(`/applications/${id}`);
}

export async function saveApplicationNotes(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("id"));
  await db.application.update({
    where: { id },
    data: { internalNotes: String(formData.get("internalNotes") ?? "").trim() || null },
  });
  revalidatePath("/", "layout");
  redirect(`/applications/${id}`);
}

export async function deleteApplication(formData: FormData) {
  await requireLandlord();
  await db.application.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/", "layout");
  redirect("/applications");
}
