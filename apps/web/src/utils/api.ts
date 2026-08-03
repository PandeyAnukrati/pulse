import { useAuthStore } from "../store/useAuthStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface FetchOptions extends RequestInit {
  json?: any;
}

export async function apiFetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { accessToken, setAccessToken, logout } = useAuthStore.getState();

  const headers = new Headers(options.headers);
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (options.json && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.json);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include", // Essential for HttpOnly cookies
  };

  const response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);

  if (response.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/register") && !path.startsWith("/auth/refresh")) {
    // Attempt silent token refresh
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refreshResponse.ok) {
        const { accessToken: newAccessToken } = await refreshResponse.json();
        setAccessToken(newAccessToken);

        // Retry the original request with the new access token
        headers.set("Authorization", `Bearer ${newAccessToken}`);
        const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          headers,
          credentials: "include",
        });

        if (!retryResponse.ok) {
          throw new Error("Retry failed after refresh");
        }

        return retryResponse.json() as Promise<T>;
      } else {
        throw new Error("Refresh failed");
      }
    } catch (e) {
      logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!response.ok) {
    let errorMessage = "An error occurred.";
    try {
      const errBody = await response.json();
      errorMessage = errBody.message || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
