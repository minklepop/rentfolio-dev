"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, requireLandlord, requireTenant } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";

export async function createRequest(formData: FormData) {
  const session = await requireLandlord();
  const request = await db.maintenanceRequest.create({
    data: {
      unitId: String(formData.get("unitId")),
      createdById: session.userId,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      category: String(formData.get("category") ?? "OTHER"),
      priority: String(formData.get("priority") ?? "NORMAL"),
    },
  });
  revalidatePath("/", "layout");
  redirect(`/maintenance/${request.id}`);
}

export async function tenantCreateRequest(formData: FormData) {
  const session = await requireTenant();
  const unitId = String(formData.get("unitId"));
  // Tenants may only file requests against a unit they lease.
  const onLease = await db.leaseTenant.findFirst({
    where: { userId: session.userId, lease: { unitId } },
  });
  if (!onLease) redirect("/portal/maintenance");
  await db.maintenanceRequest.create({
    data: {
      unitId,
      createdById: session.userId,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      category: String(formData.get("category") ?? "OTHER"),
      priority: String(formData.get("priority") ?? "NORMAL"),
    },
  });
  revalidatePath("/", "layout");
  redirect("/portal/maintenance");
}

export async function updateRequest(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("id"));
  await db.maintenanceRequest.update({
    where: { id },
    data: {
      status: String(formData.get("status") ?? "OPEN"),
      category: String(formData.get("category") ?? "OTHER"),
      priority: String(formData.get("priority") ?? "NORMAL"),
      costCents: formData.get("cost") ? parseMoney(formData.get("cost")) : null,
    },
  });
  revalidatePath("/", "layout");
  redirect(`/maintenance/${id}`);
}

export async function deleteRequest(formData: FormData) {
  await requireLandlord();
  await db.maintenanceRequest.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/", "layout");
  redirect("/maintenance");
}

export async function addComment(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const requestId = String(formData.get("requestId"));
  const body = String(formData.get("body") ?? "").trim();

  if (session.role === "TENANT") {
    // Tenants may only comment on requests for units they lease.
    const request = await db.maintenanceRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
    const onLease = await db.leaseTenant.findFirst({
      where: { userId: session.userId, lease: { unitId: request.unitId } },
    });
    if (!onLease) redirect("/portal/maintenance");
  }

  if (body) {
    await db.maintenanceComment.create({
      data: { requestId, authorId: session.userId, body },
    });
  }
  revalidatePath("/", "layout");
  redirect(
    session.role === "LANDLORD"
      ? `/maintenance/${requestId}`
      : `/portal/maintenance/${requestId}`
  );
}
