"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { rm } from "fs/promises";
import path from "path";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { parseDateInput } from "@/lib/format";
import { saveUpload, UPLOAD_DIR } from "@/lib/files";

function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${base || "listing"}-${randomBytes(3).toString("hex")}`;
}

export async function createListing(formData: FormData) {
  await requireLandlord();
  const title = String(formData.get("title") ?? "").trim();
  const listing = await db.listing.create({
    data: {
      unitId: String(formData.get("unitId")),
      slug: makeSlug(title),
      title,
      description: String(formData.get("description") ?? "").trim(),
      rentCents: parseMoney(formData.get("rent")),
      depositCents: parseMoney(formData.get("deposit")),
      availableDate: parseDateInput(formData.get("availableDate")),
      amenities: String(formData.get("amenities") ?? "").trim() || null,
    },
  });
  revalidatePath("/", "layout");
  redirect(`/listings/${listing.id}`);
}

export async function updateListing(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("id"));
  await db.listing.update({
    where: { id },
    data: {
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      rentCents: parseMoney(formData.get("rent")),
      depositCents: parseMoney(formData.get("deposit")),
      availableDate: parseDateInput(formData.get("availableDate")),
      amenities: String(formData.get("amenities") ?? "").trim() || null,
    },
  });
  revalidatePath("/", "layout");
  redirect(`/listings/${id}`);
}

export async function setListingStatus(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("id"));
  await db.listing.update({
    where: { id },
    data: { status: String(formData.get("status") ?? "DRAFT") },
  });
  revalidatePath("/", "layout");
  redirect(`/listings/${id}`);
}

export async function deleteListing(formData: FormData) {
  await requireLandlord();
  await db.listing.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/", "layout");
  redirect("/listings");
}

export async function addListingPhotos(formData: FormData) {
  await requireLandlord();
  const listingId = String(formData.get("listingId"));
  for (const entry of formData.getAll("photos")) {
    if (entry instanceof File) {
      const filename = await saveUpload(entry, "listings");
      if (filename) {
        await db.listingPhoto.create({ data: { listingId, filename } });
      }
    }
  }
  revalidatePath("/", "layout");
  redirect(`/listings/${listingId}`);
}

export async function deleteListingPhoto(formData: FormData) {
  await requireLandlord();
  const photo = await db.listingPhoto.delete({
    where: { id: String(formData.get("id")) },
  });
  await rm(path.join(UPLOAD_DIR, photo.filename), { force: true });
  revalidatePath("/", "layout");
  redirect(`/listings/${photo.listingId}`);
}
