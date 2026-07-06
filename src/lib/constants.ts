export const PROPERTY_TYPES = [
  ["SINGLE_FAMILY", "Single family"],
  ["MULTI_FAMILY", "Multi-family"],
  ["APARTMENT", "Apartment"],
  ["CONDO", "Condo"],
  ["TOWNHOUSE", "Townhouse"],
  ["OTHER", "Other"],
] as const;

export const CHARGE_TYPES = [
  ["RENT", "Rent"],
  ["DEPOSIT", "Security deposit"],
  ["LATE_FEE", "Late fee"],
  ["UTILITY", "Utility"],
  ["OTHER", "Other"],
] as const;

export const PAYMENT_METHODS = [
  ["CASH", "Cash"],
  ["CHECK", "Check"],
  ["ZELLE", "Zelle"],
  ["VENMO", "Venmo"],
  ["BANK_TRANSFER", "Bank transfer / ACH"],
  ["MONEY_ORDER", "Money order"],
  ["OTHER", "Other"],
] as const;

export const PRIORITIES = [
  ["LOW", "Low"],
  ["NORMAL", "Normal"],
  ["HIGH", "High"],
  ["URGENT", "Urgent"],
] as const;

export const MAINTENANCE_CATEGORIES = [
  ["PLUMBING", "Plumbing"],
  ["ELECTRICAL", "Electrical"],
  ["HVAC", "HVAC / Heating / Cooling"],
  ["APPLIANCE", "Appliance"],
  ["STRUCTURAL", "Structural / Roof"],
  ["PEST_CONTROL", "Pest control"],
  ["GENERAL", "General / Cleaning"],
  ["OTHER", "Other"],
] as const;

export const MAINTENANCE_STATUSES = [
  ["OPEN", "Open"],
  ["IN_PROGRESS", "In progress"],
  ["COMPLETED", "Completed"],
  ["CANCELED", "Canceled"],
] as const;

export const APPLICATION_STATUSES = [
  ["NEW", "New"],
  ["REVIEWING", "Reviewing"],
  ["APPROVED", "Approved"],
  ["DENIED", "Denied"],
] as const;

export const LEAD_STATUSES = [
  ["NEW", "New"],
  ["CONTACTED", "Contacted"],
  ["APPLIED", "Applied"],
  ["LOST", "Lost"],
] as const;

export const RESOURCE_CATEGORIES = [
  ["EVICTION_COURT", "Eviction / court lookup"],
  ["SCREENING", "Tenant screening"],
  ["LISTING_SITE", "Listing site"],
  ["OTHER", "Other"],
] as const;

// IRS Schedule E expense categories
export const EXPENSE_CATEGORIES = [
  ["ADVERTISING", "Advertising"],
  ["AUTO_TRAVEL", "Auto and travel"],
  ["CLEANING_MAINTENANCE", "Cleaning and maintenance"],
  ["COMMISSIONS", "Commissions"],
  ["INSURANCE", "Insurance"],
  ["LEGAL_PROFESSIONAL", "Legal and professional fees"],
  ["MANAGEMENT_FEES", "Management fees"],
  ["MORTGAGE_INTEREST", "Mortgage interest"],
  ["OTHER_INTEREST", "Other interest"],
  ["REPAIRS", "Repairs"],
  ["SUPPLIES", "Supplies"],
  ["TAXES", "Taxes"],
  ["UTILITIES", "Utilities"],
  ["DEPRECIATION", "Depreciation"],
  ["OTHER", "Other"],
] as const;

export function labelFor(
  list: ReadonlyArray<readonly [string, string]>,
  value: string
): string {
  return list.find(([v]) => v === value)?.[1] ?? value;
}
