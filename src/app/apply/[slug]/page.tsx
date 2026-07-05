import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { submitApplication } from "@/app/actions/applications";
import { Field, inputCls, btnPrimary } from "@/components/ui";

export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const listing = await db.listing.findUnique({
    where: { slug },
    include: { unit: { include: { property: true } } },
  });
  if (!listing || listing.status !== "PUBLISHED") notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rental application</h1>
        <p className="mt-1 text-sm text-slate-500">
          {listing.title} · {fmtMoney(listing.rentCents)}/mo ·{" "}
          <Link href={`/l/${listing.slug}`} className="text-indigo-600 hover:underline">
            view listing
          </Link>
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Please fill in your name, email, and phone number.
        </p>
      )}

      <form
        action={submitApplication}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="slug" value={listing.slug} />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            About you
          </h2>
          <Field label="Full name *">
            <input name="fullName" required className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email *">
              <input name="email" type="email" required className={inputCls} />
            </Field>
            <Field label="Phone *">
              <input name="phone" type="tel" required className={inputCls} />
            </Field>
          </div>
          <Field label="Current address">
            <input name="currentAddress" className={inputCls} />
          </Field>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Employment & income
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employer">
              <input name="employer" className={inputCls} />
            </Field>
            <Field label="Job title">
              <input name="jobTitle" className={inputCls} />
            </Field>
          </div>
          <Field label="Gross monthly income">
            <input name="monthlyIncome" className={inputCls} placeholder="$4,500" />
          </Field>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Household
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desired move-in date">
              <input name="moveInDate" type="date" className={inputCls} />
            </Field>
            <Field label="Total occupants">
              <input name="occupants" type="number" min={1} defaultValue={1} className={inputCls} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pets (type, breed, weight)">
              <input name="pets" className={inputCls} placeholder="None" />
            </Field>
            <Field label="Vehicles">
              <input name="vehicles" className={inputCls} placeholder="None" />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Reference
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name">
              <input name="refName" className={inputCls} />
            </Field>
            <Field label="Phone">
              <input name="refPhone" className={inputCls} />
            </Field>
            <Field label="Relationship">
              <input name="refRelation" className={inputCls} placeholder="Previous landlord" />
            </Field>
          </div>
        </section>

        <Field label="Anything else you'd like to share?">
          <textarea name="extraInfo" rows={3} className={inputCls} />
        </Field>

        <button type="submit" className={`${btnPrimary} w-full`}>
          Submit application
        </button>
        <p className="text-center text-xs text-slate-400">
          Your application goes directly to the property owner.
        </p>
      </form>
    </main>
  );
}
