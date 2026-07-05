"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { rm } from "fs/promises";
import path from "path";
import { requireLandlord, getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUpload, UPLOAD_DIR } from "@/lib/files";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function uploadDocument(formData: FormData) {
  await requireLandlord();
  const leaseId = String(formData.get("leaseId") ?? "") || null;
  const propertyId = String(formData.get("propertyId") ?? "") || null;
  const unitId = String(formData.get("unitId") ?? "") || null;
  const returnTo = String(formData.get("returnTo") ?? "/dashboard");
  const requiresSignature = formData.get("requiresSignature") === "on";

  const file = formData.get("file");
  if (file instanceof File) {
    const filename = await saveUpload(file, "documents");
    if (filename) {
      await db.document.create({
        data: {
          leaseId,
          propertyId,
          unitId,
          name: String(formData.get("name") ?? "").trim() || file.name,
          filename,
          requiresSignature,
        },
      });
    }
  }
  revalidatePath("/", "layout");
  redirect(returnTo);
}

export async function deleteDocument(formData: FormData) {
  await requireLandlord();
  const doc = await db.document.delete({
    where: { id: String(formData.get("id")) },
  });
  await rm(path.join(UPLOAD_DIR, doc.filename), { force: true });
  revalidatePath("/", "layout");
  redirect(String(formData.get("returnTo") ?? "/dashboard"));
}

/**
 * Self-built e-signature: a typed full name + explicit agreement checkbox,
 * recorded with a timestamp and IP address as the signature evidence
 * (sufficient under the federal E-SIGN Act for most residential leases).
 */
export async function signDocument(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = String(formData.get("id"));
  const returnTo = String(formData.get("returnTo") ?? "/portal");
  const typedName = String(formData.get("typedName") ?? "").trim();
  const agree = formData.get("agree") === "on";
  if (!typedName || !agree) redirect(`${returnTo}?signError=1`);

  const doc = await db.document.findUniqueOrThrow({ where: { id } });
  if (session.role === "TENANT") {
    if (!doc.leaseId) redirect(returnTo);
    const onLease = await db.leaseTenant.findFirst({
      where: { userId: session.userId, leaseId: doc.leaseId },
    });
    if (!onLease) redirect(returnTo);
  }

  await db.document.update({
    where: { id },
    data: {
      signedAt: new Date(),
      signedByName: typedName,
      signedById: session.userId,
      signedIp: await clientIp(),
    },
  });
  revalidatePath("/", "layout");
  redirect(returnTo);
}
