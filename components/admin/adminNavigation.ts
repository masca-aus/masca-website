export function isAdminNavigationTarget(href: string): boolean {
  return href === "/admin" || (href.startsWith("/admin/") && !href.includes("#"));
}
