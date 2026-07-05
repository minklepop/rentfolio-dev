"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { parseDateInput, todayUTC } from "@/lib/format";

export async function createExpense(formData: FormData) {
  await requireLandlord();
  await db.expense.create({
    data: {
      propertyId: String(formData.get("propertyId")),
      date: parseDateInput(formData.get("date")) ?? todayUTC(),
      amountCents: parseMoney(formData.get("amount")),
      category: String(formData.get("category") ?? "OTHER"),
      vendor: String(formData.get("vendor") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
    },
  });
  revalidatePath("/", "layout");
  redirect(String(formData.get("returnTo") ?? "/accounting"));
}

export async function deleteExpense(formData: FormData) {
  await requireLandlord();
  await db.expense.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/", "layout");
  redirect(String(formData.get("returnTo") ?? "/accounting"));
}
