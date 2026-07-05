import { getSession } from "@/lib/auth";
import { getLeasesExpiring, reportToCsv } from "@/lib/reports";
import { reportToPdfBuffer } from "@/lib/pdf";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "LANDLORD") return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const report = await getLeasesExpiring(url.searchParams.get("month") || undefined);

  if (url.searchParams.get("format") === "pdf") {
    return new Response(new Uint8Array(await reportToPdfBuffer(report)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="leases-expiring.pdf"`,
      },
    });
  }
  return new Response(reportToCsv(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leases-expiring.csv"`,
    },
  });
}
