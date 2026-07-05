import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { fmtDate, toDateInput } from "@/lib/format";
import { unitName } from "@/lib/names";
import {
  updateListing,
  setListingStatus,
  deleteListing,
  addListingPhotos,
  deleteListingPhoto,
} from "@/app/actions/listings";
import DeleteButton from "@/components/DeleteButton";
import {
  PageHeader,
  Card,
  Field,
  EmptyState,
  StatusBadge,
  inputCls,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireLandlord();
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      unit: { include: { property: true } },
      photos: { orderBy: { createdAt: "asc" } },
      applications: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!listing) notFound();

  const publicPath = `/l/${listing.slug}`;
  const applyPath = `/apply/${listing.slug}`;

  return (
    <div>
      <PageHeader
        title={listing.title}
        subtitle={`${unitName(listing.unit)} · ${fmtMoney(listing.rentCents)}/mo`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={listing.status} />
            <form action={setListingStatus}>
              <input type="hidden" name="id" value={listing.id} />
              <input
                type="hidden"
                name="status"
                value={listing.status === "PUBLISHED" ? "CLOSED" : "PUBLISHED"}
              />
              <button type="submit" className={btnPrimary}>
                {listing.status === "PUBLISHED" ? "Close listing" : "Publish"}
              </button>
            </form>
          </div>
        }
      />

      {listing.status === "PUBLISHED" && (
        <div className="mb-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Listing is live. Share the public page{" "}
          <a href={publicPath} target="_blank" className="font-semibold underline">
            {publicPath}
          </a>{" "}
          or send applicants straight to{" "}
          <a href={applyPath} target="_blank" className="font-semibold underline">
            {applyPath}
          </a>
          . Copy either link into Zillow, Craigslist, Facebook Marketplace, etc.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card title="Listing details">
            <form action={updateListing} className="space-y-4">
              <input type="hidden" name="id" value={listing.id} />
              <Field label="Title">
                <input name="title" required defaultValue={listing.title} className={inputCls} />
              </Field>
              <Field label="Description">
                <textarea
                  name="description"
                  rows={6}
                  required
                  defaultValue={listing.description}
                  className={inputCls}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Monthly rent">
                  <input
                    name="rent"
                    required
                    defaultValue={(listing.rentCents / 100).toFixed(2)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Deposit">
                  <input
                    name="deposit"
                    defaultValue={listing.depositCents ? (listing.depositCents / 100).toFixed(2) : ""}
                    className={inputCls}
                  />
                </Field>
                <Field label="Available from">
                  <input
                    name="availableDate"
                    type="date"
                    defaultValue={toDateInput(listing.availableDate)}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Amenities (comma separated)">
                <input name="amenities" defaultValue={listing.amenities ?? ""} className={inputCls} />
              </Field>
              <button type="submit" className={btnPrimary}>
                Save changes
              </button>
            </form>
          </Card>

          <Card title="Photos">
            {listing.photos.length === 0 ? (
              <EmptyState message="No photos yet. Listings with photos get far more interest." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {listing.photos.map((p) => (
                  <div key={p.id} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/files/${p.filename}`}
                      alt=""
                      className="aspect-video w-full rounded-lg object-cover"
                    />
                    <form action={deleteListingPhoto} className="absolute right-1.5 top-1.5">
                      <input type="hidden" name="id" value={p.id} />
                      <DeleteButton
                        label="✕"
                        confirmText="Remove this photo?"
                        className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-red-600 shadow cursor-pointer"
                      />
                    </form>
                  </div>
                ))}
              </div>
            )}
            <form action={addListingPhotos} className="mt-4 flex items-end gap-3">
              <input type="hidden" name="listingId" value={listing.id} />
              <Field label="Add photos (JPG/PNG/WebP)" className="flex-1">
                <input name="photos" type="file" accept="image/*" multiple required className={inputCls} />
              </Field>
              <button type="submit" className={btnSecondary}>
                Upload
              </button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title={`Applications (${listing.applications.length})`}>
            {listing.applications.length === 0 ? (
              <EmptyState message="No applications yet." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {listing.applications.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <Link
                        href={`/applications/${a.id}`}
                        className="text-sm font-medium text-indigo-600 hover:underline"
                      >
                        {a.fullName}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {a.email} · applied {fmtDate(a.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <form action={deleteListing}>
            <input type="hidden" name="id" value={listing.id} />
            <DeleteButton
              label="Delete listing"
              confirmText="Delete this listing, its photos, and all of its applications?"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
