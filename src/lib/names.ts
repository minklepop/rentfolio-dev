/** Display name for a unit, e.g. "12 Oak St" or "12 Oak St – Unit B". */
export function unitName(unit: { label: string; property: { name: string } }): string {
  return unit.label === "Main"
    ? unit.property.name
    : `${unit.property.name} – ${unit.label}`;
}

/** Comma-separated tenant names on a lease. */
export function tenantNames(
  tenants: { user: { name: string } }[],
  fallback = "No tenants"
): string {
  return tenants.length === 0
    ? fallback
    : tenants.map((t) => t.user.name).join(", ");
}
