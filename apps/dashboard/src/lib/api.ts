import type {
  ApiErrorBody,
  Content,
  CreateContentInput,
  CreateDeviceInput,
  Device,
  DeviceWithToken,
  Paginated,
  UpdateDeviceInput,
} from "@signage/shared";

export const API_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:4000";
export const WS_URL = `${API_URL.replace(/^http/, "ws")}/ws`;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Ubah body error dari server jadi pesan yang enak dibaca manusia */
function describeError(body: ApiErrorBody | null, fallback: string) {
  const err = body?.error;
  if (!err) return { code: "UNKNOWN", message: fallback };

  if (err.code === "VALIDATION_ERROR") {
    const details = err.details as
      | { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
      | undefined;
    const messages = [
      ...(details?.formErrors ?? []),
      ...Object.entries(details?.fieldErrors ?? {}).map(
        ([field, msgs]) => `${field}: ${msgs.join(", ")}`,
      ),
    ];
    if (messages.length)
      return { code: err.code, message: messages.join("; ") };
  }
  return { code: err.code, message: err.message };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  // Body teks = JSON. Untuk FormData (upload), browser mengatur content-type sendiri.
  if (typeof init.body === "string")
    headers.set("content-type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Cannot reach the server. Is the API running?",
    );
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const { code, message } = describeError(body, res.statusText);
    throw new ApiError(res.status, code, message);
  }
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  body: JSON.stringify(data),
});

export const api = {
  devices: {
    list: () => request<Paginated<Device>>("/devices?pageSize=100"),
    get: (id: string) => request<DeviceWithToken>(`/devices/${id}`),
    create: (input: CreateDeviceInput) =>
      request<DeviceWithToken>("/devices", json("POST", input)),
    update: (id: string, input: UpdateDeviceInput) =>
      request<DeviceWithToken>(`/devices/${id}`, json("PATCH", input)),
    regenerateToken: (id: string) =>
      request<DeviceWithToken>(`/devices/${id}/regenerate-token`, {
        method: "POST",
      }),
    remove: (id: string) =>
      request<void>(`/devices/${id}`, { method: "DELETE" }),
  },
  contents: {
    list: () => request<Paginated<Content>>("/contents?pageSize=100"),
    create: (input: CreateContentInput) =>
      request<Content>("/contents", json("POST", input)),
    upload: (file: File, judul: string) => {
      const form = new FormData();
      if (judul.trim()) form.append("judul", judul.trim());
      form.append("file", file);
      return request<Content>("/contents/upload", {
        method: "POST",
        body: form,
      });
    },
    remove: (id: string) =>
      request<void>(`/contents/${id}`, { method: "DELETE" }),
  },
};
