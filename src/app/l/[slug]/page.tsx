import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { submitLead } from "@/app/actions/leads";
import { btnPrimary, btnSecondary, Field, inputCls } from "@/components/ui";

export default async function PublicListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ leadSent?: string; leadError?: string }>;
}) {
  const { slug } = await params;
  const { leadSent, leadError } = await searchParams;
  const listing = await db.listing.findUnique({
    where: { slug },
    include: {
      unit: { include: { property: true } },
      photos: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!listing || listing.status !== "PUBLISHED") notFound();

  const amenities =
    listing.amenities
      ?.split(",")
      .map((a) => a.trim())
      .filter(Boolean) ?? [];
  const { property } = listing.unit;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{listing.title}</h1>
        <p className="mt-1 text-slate-500">
          {property.city}, {property.state} {property.zip}
        </p>
      </div>

      {listing.photos.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {listing.photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={`/files/${p.filename}`}
              alt=""
              className={`w-full rounded-xl object-cover ${i === 0 ? "col-span-2 row-span-2 aspect-video sm:aspect-4/3" : "aspect-video"}`}
            />
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-2xl font-bold text-slate-900">{fmtMoney(listing.rentCents)}/mo</p>
          {listing.depositCents > 0 && (
            <p className="text-sm text-slate-500">{fmtMoney(listing.depositCents)} security deposit</p>
          )}
        </div>
        <div className="text-sm text-slate-600">
          {listing.unit.beds} bed · {listing.unit.baths} bath
          {listing.unit.sqft ? ` · ${listing.unit.sqft} sq ft` : ""}
        </div>
        <div className="text-sm text-slate-600">
          Available {listing.availableDate ? fmtDate(listing.availableDate) : "now"}
        </div>
        <div className="ml-auto">
          <Link href={`/apply/${listing.slug}`} className={btnPrimary}>
            Apply now
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">About this rental</h2>
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{listing.description}</p>
        {amenities.length > 0 && (
          <>
            <h2 className="mb-2 mt-5 text-sm font-semibold text-slate-900">Amenities</h2>
            <ul className="flex flex-wrap gap-2">
              {amenities.map((a) => (
                <li
                  key={a}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {a}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Just have a quick question?</h2>
        <p className="mb-4 text-sm text-slate-500">
          Not ready for a full application? Leave your info and we'll reach out.
        </p>
        {leadSent && (
          <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Thanks, we got your message and will be in touch.
          </p>
        )}
        {leadError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Please enter your name.
          </p>
        )}
        <form action={submitLead} className="space-y-3">
          <input type="hidden" name="slug" value={listing.slug} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name *">
              <input name="name" required className={inputCls} />
            </Field>
            <Field label="Phone or email">
              <input name="phone" className={inputCls} placeholder="Phone" />
            </Field>
          </div>
          <Field label="Message (optional)">
            <textarea name="message" rows={2} className={inputCls} placeholder="When could you tour the unit?" />
          </Field>
          <input type="hidden" name="source" value="Public listing page" />
          <button type="submit" className={btnSecondary}>
            Send
          </button>
        </form>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">Powered by Rentfolio</p>
    </main>
  );
}
