/**
 * Utility function to conditionally join classnames
 * Similar to clsx but lightweight
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter((cls): cls is string => typeof cls === "string" && cls.length > 0).join(" ")
}
