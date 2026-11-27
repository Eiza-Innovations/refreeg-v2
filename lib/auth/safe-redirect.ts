/** The target if it is a same-site path, otherwise null (blocks `//host` and absolute URLs). */
export function safeRedirect(target?: string | null): string | null {
  if (!target || !target.startsWith("/") || target.startsWith("//"))
    return null;
  return target;
}
