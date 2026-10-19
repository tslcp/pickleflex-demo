/** Tournament information is public; signup and bracket tools retain their access rules. */
export function isPublicPath(pathname: string) {
  return ["/", "/signin", "/signup", "/forgot-password"].includes(pathname) ||
    /^\/tournaments\/[^/]+\/?$/.test(pathname);
}
