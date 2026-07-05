"use server";

import { redirect } from "next/navigation";
import { requireLandlord } from "@/lib/auth";
import { getReport, reportToText, reportToHtml, type ReportType } from "@/lib/reports";
import { reportToPdfBuffer } from "@/lib/pdf";
import { sendEmail } from "@/lib/email";

const VALID_TYPES: ReportType[] = [
  "tenant-roster",
  "late-payments",
  "received-payments",
  "leases-expiring",
  "open-maintenance",
  "rent-roll",
];

export async function emailReport(formData: FormData) {
  const session = await requireLandlord();
  const type = String(formData.get("type"));
  const month = String(formData.get("month") ?? "") || undefined;
  const returnTo = String(formData.get("returnTo") ?? "/reports");
  if (!VALID_TYPES.includes(type as ReportType)) redirect(returnTo);

  const report = await getReport(type as ReportType, month);
  const pdf = await reportToPdfBuffer(report);

  let errorMessage: string | null = null;
  try {
    await sendEmail(
      session.email,
      `Rentfolio: ${report.title}`,
      `${reportToText(report)}\n\n(PDF attached)`,
      reportToHtml(report),
      [{ filename: `${type}.pdf`, content: pdf, contentType: "application/pdf" }]
    );
  } catch (e) {
    errorMessage = (e as Error).message;
  }

  if (errorMessage) redirect(`${returnTo}?reportError=${encodeURIComponent(errorMessage)}`);
  redirect(`${returnTo}?reportEmailed=${encodeURIComponent(report.title)}`);
}
