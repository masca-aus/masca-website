export function isAdminNavigationTarget(href: string): boolean {
  return href === "/admin" || (href.startsWith("/admin/") && !href.includes("#"));
}

export function adminNavigationPath(href: string): string {
  return href.split("?", 1)[0];
}
