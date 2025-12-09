/**
 * Formatting utilities
 */

export function formatPrice(price: number, currency = "$"): string {
  return `${currency}${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function truncate(text: string, length: number): string {
  return text.length > length ? text.substring(0, length) + "..." : text
}

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function formatPropertyStatus(status: string): string {
  return status
    .split("_")
    .map((word) => capitalizeFirstLetter(word))
    .join(" ")
}
