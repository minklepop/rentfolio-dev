/* eslint-disable @typescript-eslint/no-require-imports */
// Creates the landlord login plus a full demo portfolio: 3 properties, 2 tenants,
// months of real charge/payment history (including both auto-allocation scenarios -
// one lump payment covering multiple unpaid months, and one lump payment that
// overpays and leaves an unapplied credit), maintenance, expenses, documents in
// both signature states, and a published listing taking both leads and applications.
// Run with: npm run db:seed
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

function monthsAgo(n) {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() - n, 1));
}

function daysFromNow(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function plusDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function fmtMoney(cents) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Creates one RENT charge per month, oldest first. Returns the created Charge rows in that order. */
async function createMonthlyRentCharges(leaseId, rentCents, fromMonthsAgo, toMonthsAgo) {
  const charges = [];
  for (let m = fromMonthsAgo; m >= toMonthsAgo; m--) {
    charges.push(
      await db.charge.create({
        data: { leaseId, type: "RENT", description: "Monthly rent", amountCents: rentCents, dueDate: monthsAgo(m) },
      })
    );
  }
  return charges;
}

/** Single payment fully covering one charge - the ordinary, no-allocation-needed case. */
async function payChargeInFull(leaseId, charge, paidDate, method, note) {
  await db.payment.create({
    data: { leaseId, chargeId: charge.id, amountCents: charge.amountCents, paidDate, method, note },
  });
}

/**
 * Mirrors exactly what the "Pay lease balance" auto-allocation action produces:
 * splits one lump sum across the given (fully unpaid) charges oldest-first, and
 * if money is left over after they're all covered, records it as an unapplied
 * credit (chargeId null) instead of dropping it. Seeded here as data rather than
 * invoked live, since the real action is a Next.js server action that needs an
 * authenticated request - this reproduces its exact output.
 */
async function seedLumpAllocation(leaseId, charges, totalCents, paidDate, method, baseNote) {
  const totalLabel = fmtMoney(totalCents);
  let remaining = totalCents;
  for (const charge of charges) {
    if (remaining <= 0) break;
    const applied = Math.min(charge.amountCents, remaining);
    await db.payment.create({
      data: {
        leaseId,
        chargeId: charge.id,
        amountCents: applied,
        paidDate,
        method,
        note: [baseNote, `(part of ${totalLabel} payment, auto-allocated)`].filter(Boolean).join(" "),
      },
    });
    remaining -= applied;
  }
  if (remaining > 0) {
    await db.payment.create({
      data: {
        leaseId,
        chargeId: null,
        amountCents: remaining,
        paidDate,
        method,
        note: [baseNote, `(unapplied credit from ${totalLabel} payment, exceeds balance owed)`]
          .filter(Boolean)
          .join(" "),
      },
    });
  }
}

async function main() {
  const landlordEmail = process.env.SEED_LANDLORD_EMAIL || "landlord@example.com";
  const landlordPassword = process.env.SEED_LANDLORD_PASSWORD || "rentfolio123";

  const existing = await db.user.findUnique({ where: { email: landlordEmail } });
  if (existing) {
    console.log(`Landlord account ${landlordEmail} already exists - nothing to do.`);
    return;
  }

  const landlord = await db.user.create({
    data: {
      email: landlordEmail,
      name: "Property Owner",
      role: "LANDLORD",
      passwordHash: await bcrypt.hash(landlordPassword, 10),
    },
  });

  const [alice, bob] = await Promise.all([
    db.user.create({
      data: {
        email: "demo.tenant1@example.com",
        name: "Alice Tenant",
        phone: "555-0100",
        role: "TENANT",
        passwordHash: await bcrypt.hash("tenant1234", 10),
      },
    }),
    db.user.create({
      data: {
        email: "demo.tenant2@example.com",
        name: "Bob Tenant",
        phone: "555-0101",
        role: "TENANT",
        passwordHash: await bcrypt.hash("tenant1234", 10),
      },
    }),
  ]);

  // ---------------------------------------------------------------------
  // Property 1: 123 Demo Street (single-family) - tenant Alice
  // Demonstrates: on-time payment, the "lump payment covers 2 unpaid months"
  // auto-allocation scenario, one still-overdue month, a lease ending soon
  // (digest demo), and documents in both signature states.
  // ---------------------------------------------------------------------
  const p1 = await db.property.create({
    data: {
      name: "123 Demo Street",
      address1: "123 Demo Street",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      type: "SINGLE_FAMILY",
      units: { create: { label: "Main", beds: 3, baths: 2, sqft: 1400, marketRentCents: 145000 } },
    },
    include: { units: true },
  });
  const p1Unit = p1.units[0];
  const lease1Start = monthsAgo(4);
  const lease1 = await db.lease.create({
    data: {
      unitId: p1Unit.id,
      startDate: lease1Start,
      endDate: daysFromNow(20), // ending soon, for the weekly-digest demo
      rentCents: 145000,
      depositCents: 145000,
      rentDueDay: 1,
      graceDays: 5,
      lateFeeCents: 5000,
      tenants: { create: { userId: alice.id } },
      // Seeded through last month; opening the app generates this month's rent
      // charge live, and auto-applies a late fee to the still-overdue month below.
      chargesThrough: monthsAgo(1),
    },
  });

  const depositCharge1 = await db.charge.create({
    data: { leaseId: lease1.id, type: "DEPOSIT", description: "Security deposit", amountCents: 145000, dueDate: lease1Start },
  });
  await payChargeInFull(lease1.id, depositCharge1, lease1Start, "BANK_TRANSFER", "Move-in deposit");

  const [m4, m3, m2, m1] = await createMonthlyRentCharges(lease1.id, 145000, 4, 1);
  await payChargeInFull(lease1.id, m4, plusDays(m4.dueDate, 2), "ZELLE", "Paid on time");
  // The auto-allocation demo: one $2,900 Zelle transfer covering both of these
  // unpaid months at once, split automatically into two linked payments.
  await seedLumpAllocation(lease1.id, [m3, m2], 290000, plusDays(m2.dueDate, 10), "ZELLE", "Zelle transfer");
  // m1 left fully unpaid and overdue on purpose - shows up on the dashboard,
  // the rent roster, and the weekly digest, and will get an auto late fee.

  await db.document.create({
    data: {
      leaseId: lease1.id,
      name: "Lease Agreement.pdf",
      filename: "placeholder-lease-agreement.pdf",
      requiresSignature: true,
    },
  });
  await db.document.create({
    data: {
      leaseId: lease1.id,
      name: "Move-in Inspection Checklist.pdf",
      filename: "placeholder-inspection-checklist.pdf",
      requiresSignature: true,
      signedAt: plusDays(lease1Start, 1),
      signedByName: alice.name,
      signedById: alice.id,
      signedIp: "192.168.1.42",
    },
  });

  await db.expense.create({
    data: { propertyId: p1.id, date: lease1Start, amountCents: 12000, category: "CLEANING_MAINTENANCE", vendor: "Sparkle Cleaning Co", description: "Move-in cleaning" },
  });

  // ---------------------------------------------------------------------
  // Property 2: 45 Maple Duplex (multi-family) - Unit A occupied (Bob),
  // Unit B vacant and listed. Demonstrates: 5 months of clean payment history
  // across varied methods, the "lump payment overpays and leaves a credit"
  // auto-allocation scenario, an open + a completed maintenance request with
  // a comment thread, expenses tied to the maintenance work, a property-level
  // document, and both a Lead and a full Application on the same listing.
  // ---------------------------------------------------------------------
  const p2 = await db.property.create({
    data: {
      name: "45 Maple Duplex",
      address1: "45 Maple Avenue",
      city: "Springfield",
      state: "IL",
      zip: "62702",
      type: "MULTI_FAMILY",
      units: {
        create: [
          { label: "Unit A", beds: 2, baths: 1, sqft: 900, marketRentCents: 110000 },
          { label: "Unit B", beds: 2, baths: 1, sqft: 900, marketRentCents: 115000 },
        ],
      },
    },
    include: { units: true },
  });
  const unitA = p2.units.find((u) => u.label === "Unit A");
  const unitB = p2.units.find((u) => u.label === "Unit B");

  const lease2Start = monthsAgo(7);
  const lease2 = await db.lease.create({
    data: {
      unitId: unitA.id,
      startDate: lease2Start,
      rentCents: 110000,
      depositCents: 110000,
      rentDueDay: 1,
      graceDays: 5,
      lateFeeCents: 5000,
      tenants: { create: { userId: bob.id } },
      chargesThrough: monthsAgo(1),
    },
  });

  const depositCharge2 = await db.charge.create({
    data: { leaseId: lease2.id, type: "DEPOSIT", description: "Security deposit", amountCents: 110000, dueDate: lease2Start },
  });
  await payChargeInFull(lease2.id, depositCharge2, lease2Start, "CHECK", "Move-in deposit, check #1042");

  const rentCharges2 = await createMonthlyRentCharges(lease2.id, 110000, 7, 1); // 7 months ago through last month
  const methods = ["CASH", "CHECK", "ZELLE", "VENMO", "BANK_TRANSFER"];
  for (let i = 0; i < 5; i++) {
    await payChargeInFull(lease2.id, rentCharges2[i], plusDays(rentCharges2[i].dueDate, 3 + i), methods[i], "Paid on time");
  }
  // The overpayment demo: a $1,200 cash payment against a $1,100 charge -
  // auto-allocation covers the charge and records the extra $100 as a credit.
  await seedLumpAllocation(lease2.id, [rentCharges2[5]], 120000, plusDays(rentCharges2[5].dueDate, 4), "CASH", "Cash payment");
  // rentCharges2[6] (last month) left unpaid and overdue, same as lease 1.

  await db.document.create({
    data: { leaseId: lease2.id, name: "Signed Lease.pdf", filename: "placeholder-signed-lease.pdf" },
  });
  await db.document.create({
    data: { propertyId: p2.id, name: "Property Insurance Policy.pdf", filename: "placeholder-insurance-policy.pdf" },
  });

  const openRequest = await db.maintenanceRequest.create({
    data: {
      unitId: unitA.id,
      createdById: bob.id,
      title: "Leaking pipe under kitchen sink",
      description: "Started as a slow drip a few days ago, now there's a small puddle every morning.",
      priority: "HIGH",
      status: "OPEN",
    },
  });
  await db.maintenanceComment.create({
    data: { requestId: openRequest.id, authorId: bob.id, body: "It's gotten worse - water pooling on the floor now." },
  });
  await db.maintenanceComment.create({
    data: { requestId: openRequest.id, authorId: landlord.id, body: "Got it, plumber scheduled for Thursday morning." },
  });

  const completedRequest = await db.maintenanceRequest.create({
    data: {
      unitId: unitA.id,
      createdById: landlord.id,
      title: "Replace HVAC filter",
      description: "Routine seasonal filter replacement.",
      priority: "NORMAL",
      status: "COMPLETED",
      costCents: 4500,
    },
  });
  await db.expense.create({
    data: {
      propertyId: p2.id,
      date: plusDays(completedRequest.createdAt, 1),
      amountCents: 4500,
      category: "REPAIRS",
      vendor: "ABC HVAC Services",
      description: "HVAC filter replacement (Unit A)",
    },
  });
  await db.expense.create({
    data: { propertyId: p2.id, date: monthsAgo(3), amountCents: 18000, category: "INSURANCE", vendor: "State Farm", description: "Quarterly property insurance" },
  });
  await db.expense.create({
    data: { propertyId: p2.id, date: monthsAgo(2), amountCents: 9500, category: "UTILITIES", vendor: "City Water Dept", description: "Shared water bill" },
  });

  const listing = await db.listing.create({
    data: {
      unitId: unitB.id,
      slug: `unit-b-demo-${Date.now().toString(36)}`,
      title: "2BR Duplex Unit - Available Now",
      description: "Bright 2 bedroom / 1 bath unit in a quiet duplex. In-unit laundry hookup, off-street parking, near downtown.",
      rentCents: 115000,
      depositCents: 115000,
      amenities: "In-unit laundry hookup, Off-street parking, Dishwasher",
      status: "PUBLISHED",
    },
  });
  await db.lead.create({
    data: {
      listingId: listing.id,
      name: "Jordan Prospect",
      phone: "555-0150",
      email: "jordan.prospect@example.com",
      source: "Facebook Marketplace",
      message: "Interested in viewing this weekend if possible.",
      status: "NEW",
    },
  });
  await db.application.create({
    data: {
      listingId: listing.id,
      fullName: "Taylor Applicant",
      email: "taylor.applicant@example.com",
      phone: "555-0177",
      currentAddress: "200 Birch Lane, Springfield, IL",
      employer: "Springfield General Hospital",
      jobTitle: "Registered Nurse",
      monthlyIncomeCents: 420000,
      moveInDate: daysFromNow(15),
      occupants: 2,
      pets: "One small dog (Lab mix, ~30 lbs)",
      vehicles: "2020 Honda Civic",
      refName: "Morgan Lee",
      refPhone: "555-0199",
      refRelation: "Previous landlord",
      status: "NEW",
    },
  });

  // ---------------------------------------------------------------------
  // Property 3: 9 Birch Court - vacant, no lease or listing yet on purpose
  // (keeps a genuinely-empty property in the demo), with one prep expense.
  // ---------------------------------------------------------------------
  const p3 = await db.property.create({
    data: {
      name: "9 Birch Court",
      address1: "9 Birch Court",
      city: "Springfield",
      state: "IL",
      zip: "62703",
      type: "SINGLE_FAMILY",
      units: { create: { label: "Main", beds: 4, baths: 2.5, sqft: 1800, marketRentCents: 165000 } },
    },
  });
  await db.expense.create({
    data: { propertyId: p3.id, date: daysFromNow(-10), amountCents: 15000, category: "ADVERTISING", vendor: "Springfield Photography Co", description: "Listing photos, ahead of publishing" },
  });

  await db.resource.createMany({
    data: [
      {
        label: "Indiana court case lookup (mycase.in.gov)",
        url: "https://mycase.in.gov/",
        category: "EVICTION_COURT",
        notes: "Free public lookup. Most other states run a similar public case-search portal - add yours here as you find them.",
      },
      {
        label: "TransUnion SmartMove (tenant screening)",
        url: "https://www.mysmartmove.com/",
        category: "SCREENING",
        notes: "Run credit/background/eviction checks directly; paste results into the application's internal notes.",
      },
    ],
  });

  console.log("Seeded!");
  console.log(`  Landlord login: ${landlordEmail} / ${landlordPassword}`);
  console.log("  Demo tenant logins: demo.tenant1@example.com / tenant1234, demo.tenant2@example.com / tenant1234");
  console.log("");
  console.log("Where to look:");
  console.log("  - Lease for 123 Demo Street (Alice): one month paid normally, two unpaid");
  console.log("    months covered by a single $2,900 lump payment (auto-allocation demo),");
  console.log("    one month left overdue, plus a signed and an unsigned document.");
  console.log("  - Lease for Maple Duplex Unit A (Bob): 5 months of varied-method payment");
  console.log("    history, a $1,200 payment against a $1,100 charge leaving a $100 unapplied");
  console.log("    credit (overpayment demo), an open + completed maintenance request.");
  console.log("  - Maple Duplex Unit B: published listing with both a Lead and a full Application.");
  console.log("Change all passwords after first sign-in (Settings page).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
