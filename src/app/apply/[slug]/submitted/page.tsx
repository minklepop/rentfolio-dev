import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function SubmittedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await db.listing.findUnique({ where: { slug } });
  if (!listing) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Application submitted</h1>
        <p className="mt-2 text-sm text-slate-500">
          Thanks for applying to &ldquo;{listing.title}&rdquo;. The property owner will review
          your application and reach out using the contact info you provided.
        </p>
        <Link
          href={`/l/${slug}`}
          className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          Back to listing
        </Link>
      </div>
    </main>
  );
}
