import axios from "axios";

// Use relative URLs in production (both frontend and backend on same origin)
// In development, use the environment variable if provided
const API_BASE_URL = process.env.NODE_ENV === "production" ? "" : (process.env.REACT_APP_API_URL || "http://localhost:5000");
const ACCESS_TOKEN_KEY = "accessToken";
const LEGACY_TOKEN_KEY = "token";
const USER_STORAGE_KEY = "user";

const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) || null;

const persistAccessToken = (token) => {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  localStorage.removeItem(LEGACY_TOKEN_KEY);
};

const getStoredUser = () => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse stored user:", error);
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const persistUser = (user) => {
  const existingUser = getStoredUser();
  if (existingUser && existingUser.plan && existingUser.plan !== "Free" && existingUser.plan !== "Trial") {
    user.plan = existingUser.plan;
  }
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

const emitEvent = (eventName, detail) => {
  if (typeof window === "undefined") return;
  if (detail !== undefined) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    return;
  }
  window.dispatchEvent(new Event(eventName));
};

const storeSession = (accessToken, user) => {
  persistAccessToken(accessToken);
  if (user) {
    persistUser(user);
    emitEvent("auth:user-updated", user);
  }
};

const clearSession = () => {
  persistAccessToken(null);
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  emitEvent("auth:logout");
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  refreshQueue = [];
};

apiClient.interceptors.request.use(
  (config) => {
    // Skip modifying headers for FormData (multipart) requests
    if (config.data instanceof FormData) {
      // axios will automatically handle Content-Type: multipart/form-data with boundary
      delete config.headers["Content-Type"];
    }
    
    const token = getStoredAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (status === 401) {
      if (originalRequest.url?.includes("/api/auth/refresh") || originalRequest.skipAuthRefresh) {
        clearSession();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token) => {
              if (!token) {
                reject(error);
                return;
              }
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken, user } = refreshResponse.data || {};

        if (!accessToken) {
          throw new Error("No access token returned from refresh endpoint");
        }

        storeSession(accessToken, user);
        processQueue(null, accessToken);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { apiClient as default, API_BASE_URL, storeSession, clearSession, getStoredUser, getStoredAccessToken as getAccessToken };
