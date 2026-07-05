"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";

/** Public action: lightweight inquiry capture from a listing page, lower-friction than a full application. */
export async function submitLead(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const listing = await db.listing.findUnique({ where: { slug } });
  if (!listing || listing.status !== "PUBLISHED") redirect("/");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/l/${slug}?leadError=1`);

  await db.lead.create({
    data: {
      listingId: listing.id,
      name,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      source: String(formData.get("source") ?? "").trim() || null,
      message: String(formData.get("message") ?? "").trim() || null,
    },
  });
  redirect(`/l/${slug}?leadSent=1`);
}

export async function setLeadStatus(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("id"));
  await db.lead.update({
    where: { id },
    data: { status: String(formData.get("status") ?? "NEW") },
  });
  revalidatePath("/", "layout");
  redirect(`/leads/${id}`);
}

export async function saveLeadNotes(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("id"));
  await db.lead.update({
    where: { id },
    data: { internalNotes: String(formData.get("internalNotes") ?? "").trim() || null },
  });
  revalidatePath("/", "layout");
  redirect(`/leads/${id}`);
}

export async function deleteLead(formData: FormData) {
  await requireLandlord();
  await db.lead.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/", "layout");
  redirect("/leads");
}
