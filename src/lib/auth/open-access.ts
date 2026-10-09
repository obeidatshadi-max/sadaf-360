/**
 * Temporary open access: when OPEN_ACCESS=true, visitors without a session see the app as a read-only guest.
 *
 * Safety property: the guest belongs to no company (GUEST_COMPANY_ID matches no rows), so open access can never
 * show a real tenant's data, even after data is imported. It exists to let people look around while the product is
 * being shown. Turn it off (unset the variable) before onboarding a customer.
 */
export const GUEST_COMPANY_ID = "00000000-0000-0000-0000-000000000000";

export const isOpenAccess = (): boolean => process.env.OPEN_ACCESS === "true";
