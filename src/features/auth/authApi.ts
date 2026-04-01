import { API_BASE_URL } from "../../config";
import { getStorageItem, removeStorageItem, setStorageItem } from "../../utils/storage";

const AUTH_TOKEN_KEY = "auth_token";

export type AuthenticatedUser = {
  customer_number: string;
  employee_number: string;
  full_name: string;
  email: string;
  account_status: string;
  loyalty_points: number;
  role: string;
  department: string;
  entity: string;
};

type LoginResponse = {
  token: string;
  user: AuthenticatedUser;
};

type MeResponse = {
  user: AuthenticatedUser;
};

let unauthorizedHandler: (() => void) | null = null;

export class ApiAuthError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "ApiAuthError";
  }
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function getAuthToken(): string | null {
  return getStorageItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken(): void {
  removeStorageItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token: string): void {
  setStorageItem(AUTH_TOKEN_KEY, token);
}

function buildAuthHeaders(initHeaders?: HeadersInit): Headers {
  const headers = new Headers(initHeaders);
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function authorizedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    headers: buildAuthHeaders(init.headers),
  });

  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new ApiAuthError();
  }

  return response;
}

export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const payload = (await response.json()) as LoginResponse | { error?: string };
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload && payload.error === "invalid_credentials"
        ? "Invalid username or password."
        : "Unable to sign in right now.";
    throw new Error(message);
  }

  const successPayload = payload as LoginResponse;
  setAuthToken(successPayload.token);
  return successPayload;
}

export async function logoutApi(): Promise<void> {
  const response = await authorizedFetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to log out");
  }
}

export async function getCurrentUserApi(): Promise<AuthenticatedUser> {
  const response = await authorizedFetch(`${API_BASE_URL}/api/auth/me`);
  if (!response.ok) {
    throw new Error("Failed to load current user");
  }

  const payload = (await response.json()) as MeResponse;
  return payload.user;
}
