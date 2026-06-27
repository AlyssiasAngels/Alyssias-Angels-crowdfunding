import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function formatApiError(err) {
  const d = err?.response?.data?.detail;
  if (d == null) return err.message || "Something went wrong";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(", ");
  if (d?.msg) return d.msg;
  return String(d);
}

export function imageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/api/")) return `${BACKEND_URL}${path}`;
  return `${API}/files/${path}`;
}

export const CATEGORIES = ["Medical", "Memorial", "Education", "Creative"];

export const CATEGORY_IMAGES = {
  Medical: "https://images.unsplash.com/photo-1586324304780-c9a5031a3599?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwxfHxob3NwaXRhbCUyMGRvY3RvciUyMGhvbGRpbmclMjBoYW5kc3xlbnwwfHx8fDE3ODI1NTE4ODl8MA&ixlib=rb-4.1.0&q=85",
  Education: "https://images.pexels.com/photos/37758744/pexels-photo-37758744.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  Creative: "https://images.unsplash.com/photo-1541753866388-0b3c701627d3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwxfHxhcnRpc3QlMjBwYWludGluZyUyMHN0dWRpb3xlbnwwfHx8fDE3ODI1NTE4OTl8MA&ixlib=rb-4.1.0&q=85",
  Memorial: "https://images.unsplash.com/photo-1528351655744-27cc30462816?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTF8MHwxfHNlYXJjaHwxfHxjYW5kbGUlMjBsaWdodGluZyUyMG1lbW9yaWFsfGVufDB8fHx8MTc4MjU1MTg5OXww&ixlib=rb-4.1.0&q=85",
};

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1758275557330-cfd545444dc3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwY29tbXVuaXR5JTIwcGVvcGxlJTIwc21pbGluZ3xlbnwwfHx8fDE3ODI1NTE4ODR8MA&ixlib=rb-4.1.0&q=85";

export function fmtUSD(n) {
  const v = Number(n || 0);
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
