const rawApiUrl = import.meta.env.VITE_API_URL;

const normalized =
  typeof rawApiUrl === "string" && rawApiUrl.trim() && rawApiUrl.trim() !== "undefined"
    ? rawApiUrl.trim()
    : "http://localhost:4000";

export const API_BASE_URL = normalized.replace(/\/+$/, "");

