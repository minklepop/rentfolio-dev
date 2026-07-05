// Hand-written, not auto-introspected, so we control exactly what the model
// is told exists - in particular, password/MFA columns are simply never
// mentioned here (and are stripped from results again as a backstop, see sqlSafety.ts).
export const SCHEMA_DESCRIPTION = `
SQLite tables. Money columns are integer cents (divide by 100.0 for dollars).

Property(id, name, address1, address2, city, state, zip, type, notes, createdAt)
Unit(id, propertyId, label, beds, baths, sqft, marketRentCents)
Lease(id, unitId, startDate, endDate, rentCents, depositCents, rentDueDay, graceDays, lateFeeCents, status['ACTIVE'|'ENDED'], notes, createdAt)
LeaseTenant(leaseId, userId) -- join table; a lease can have multiple tenants
User(id, email, name, phone, role['LANDLORD'|'TENANT'], createdAt) -- never select passwordHash or totpSecret, they are irrelevant to any question
Charge(id, leaseId, type['RENT'|'DEPOSIT'|'LATE_FEE'|'UTILITY'|'OTHER'], description, amountCents, dueDate, createdAt)
Payment(id, leaseId, chargeId, amountCents, paidDate, method['CASH'|'CHECK'|'ZELLE'|'VENMO'|'BANK_TRANSFER'|'MONEY_ORDER'|'OTHER'], note, createdAt)
MaintenanceRequest(id, unitId, createdById, title, description, priority['LOW'|'NORMAL'|'HIGH'|'URGENT'], status['OPEN'|'IN_PROGRESS'|'COMPLETED'|'CANCELED'], costCents, createdAt)
Listing(id, unitId, slug, title, description, rentCents, depositCents, availableDate, amenities, status['DRAFT'|'PUBLISHED'|'CLOSED'], createdAt)
Application(id, listingId, fullName, email, phone, monthlyIncomeCents, moveInDate, occupants, status['NEW'|'REVIEWING'|'APPROVED'|'DENIED'], createdAt)
Lead(id, listingId, name, phone, email, source, status['NEW'|'CONTACTED'|'APPLIED'|'LOST'], createdAt)
Expense(id, propertyId, date, amountCents, category, vendor, description, createdAt)
Document(id, propertyId, leaseId, name, requiresSignature, signedAt, signedByName, createdAt)

A charge's amount owed = amountCents - SUM(Payment.amountCents WHERE Payment.chargeId = Charge.id).
"Overdue" means Charge.type='RENT', dueDate in the past, not fully paid, on a Lease with status='ACTIVE'.
Join User to Lease via LeaseTenant to find a lease's tenant(s).
`;
