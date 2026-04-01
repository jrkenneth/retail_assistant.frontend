import { API_BASE_URL } from "../../config";
import { authorizedFetch } from "../auth/authApi";

export type AccessRequestItem = {
  id: string;
  reference_number: string;
  requested_by: string;
  requested_role: string;
  resource_requested: string;
  justification: string;
  status: string;
  created_at: string;
};

type AccessRequestListResponse = {
  items: AccessRequestItem[];
};

export async function listAccessRequestsApi(): Promise<AccessRequestItem[]> {
  const response = await authorizedFetch(`${API_BASE_URL}/access-requests`);
  if (!response.ok) {
    throw new Error("Failed to load access requests");
  }

  const payload = (await response.json()) as AccessRequestListResponse;
  return payload.items;
}

export async function createAccessRequestApi(
  resourceRequested: string,
  justification: string,
): Promise<AccessRequestItem> {
  const response = await authorizedFetch(`${API_BASE_URL}/access-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resource_requested: resourceRequested,
      justification,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create access request");
  }

  return (await response.json()) as AccessRequestItem;
}
