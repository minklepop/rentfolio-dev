"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

export async function createProperty(formData: FormData) {
  await requireLandlord();
  const property = await db.property.create({
    data: {
      name: str(formData, "name"),
      address1: str(formData, "address1"),
      address2: optStr(formData, "address2"),
      city: str(formData, "city"),
      state: str(formData, "state"),
      zip: str(formData, "zip"),
      type: str(formData, "type") || "SINGLE_FAMILY",
      notes: optStr(formData, "notes"),
      // Every property starts with one unit; single-family homes just use "Main".
      units: { create: { label: str(formData, "unitLabel") || "Main" } },
    },
  });
  revalidatePath("/", "layout");
  redirect(`/properties/${property.id}`);
}

export async function updateProperty(formData: FormData) {
  await requireLandlord();
  const id = str(formData, "id");
  await db.property.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      address1: str(formData, "address1"),
      address2: optStr(formData, "address2"),
      city: str(formData, "city"),
      state: str(formData, "state"),
      zip: str(formData, "zip"),
      type: str(formData, "type") || "SINGLE_FAMILY",
      notes: optStr(formData, "notes"),
    },
  });
  revalidatePath("/", "layout");
  redirect(`/properties/${id}`);
}

export async function deleteProperty(formData: FormData) {
  await requireLandlord();
  await db.property.delete({ where: { id: str(formData, "id") } });
  revalidatePath("/", "layout");
  redirect("/properties");
}

export async function createUnit(formData: FormData) {
  await requireLandlord();
  const propertyId = str(formData, "propertyId");
  await db.unit.create({
    data: {
      propertyId,
      label: str(formData, "label") || "Unit",
      beds: Number(formData.get("beds") ?? 0) || 0,
      baths: Number(formData.get("baths") ?? 1) || 1,
      sqft: Number(formData.get("sqft")) || null,
      marketRentCents: parseMoney(formData.get("marketRent")),
    },
  });
  revalidatePath("/", "layout");
  redirect(`/properties/${propertyId}`);
}

export async function updateUnit(formData: FormData) {
  await requireLandlord();
  const id = str(formData, "id");
  const unit = await db.unit.update({
    where: { id },
    data: {
      label: str(formData, "label") || "Unit",
      beds: Number(formData.get("beds") ?? 0) || 0,
      baths: Number(formData.get("baths") ?? 1) || 1,
      sqft: Number(formData.get("sqft")) || null,
      marketRentCents: parseMoney(formData.get("marketRent")),
    },
  });
  revalidatePath("/", "layout");
  redirect(`/properties/${unit.propertyId}`);
}

export async function deleteUnit(formData: FormData) {
  await requireLandlord();
  const unit = await db.unit.delete({ where: { id: str(formData, "id") } });
  revalidatePath("/", "layout");
  redirect(`/properties/${unit.propertyId}`);
}
