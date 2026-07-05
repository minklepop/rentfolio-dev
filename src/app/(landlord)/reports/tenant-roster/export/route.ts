import { getSession } from "@/lib/auth";
import { getTenantRoster, reportToCsv } from "@/lib/reports";
import { reportToPdfBuffer } from "@/lib/pdf";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "LANDLORD") return new Response("Unauthorized", { status: 401 });
  const report = await getTenantRoster();

  if (new URL(req.url).searchParams.get("format") === "pdf") {
    return new Response(new Uint8Array(await reportToPdfBuffer(report)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tenant-roster.pdf"`,
      },
    });
  }
  return new Response(reportToCsv(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tenant-roster.csv"`,
    },
  });
}
