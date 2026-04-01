import { API_BASE_URL } from "../config";

export function getDomainLabel(uri?: string, fallback = ""): string {
  try {
    return new URL(uri ?? "").hostname.replace(/^www\./, "") || fallback;
  } catch {
    return fallback;
  }
}

export function resolveApiUrl(value?: string | null): string {
  if (!value) {
    return "";
  }
  if (/^https?:\/\//.test(value)) {
    return value;
  }
  return `${API_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

export function resolveActionHref(href?: string): string | undefined {
  if (!href) {
    return undefined;
  }
  if (/^https?:\/\//.test(href) || href.startsWith("/viewer/")) {
    return href;
  }
  if (href.startsWith("/")) {
    return resolveApiUrl(href);
  }
  return href;
}