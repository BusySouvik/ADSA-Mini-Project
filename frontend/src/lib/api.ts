import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface Product {
  id: string;
  product_code?: string;
  owner_id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  category: string;
  price: number;
  stock: number;
  image_url?: string | null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (authenticated) {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw new Error(error.message);

    const token = data.session?.access_token;
    if (!token) throw new Error("Please log in to continue.");

    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const body = await response.text();
  let result: any = null;

  if (body) {
    try {
      result = JSON.parse(body);
    } catch {
      result = body;
    }
  }

  if (!response.ok) {
    const message =
      result?.detail ||
      result?.message ||
      `API request failed (${response.status})`;
    throw new Error(
      typeof message === "string" ? message : JSON.stringify(message)
    );
  }

  return result as T;
}


export interface AdsaSnapshot {
  avl: AvlNode | null;
  rotations: { type: "LL" | "RR" | "LR" | "RL"; pivotPrice: number }[];
  hash: { index: number; entries: { key: string; productId: string; name: string }[] }[];
  trie: TrieNode;
  heap: { stock: number; productId: string }[];
  fifo: string[];
  productCount: number;
}
export interface AvlNode {
  price: number;
  height: number;
  balance: number;
  productIds: string[];
  left: AvlNode | null;
  right: AvlNode | null;
}
export interface TrieNode {
  terminal: boolean;
  productIds: string[];
  children: { char: string; node: TrieNode }[];
}

export interface RestockRequest {
  id: string;
  owner_id: string;
  product_id: string;
  requested_quantity: number;
  status: "pending" | "processed" | "cancelled";
  created_at: string;
  processed_at?: string | null;
  product?: {
    id: string;
    product_code?: string | null;
    name: string;
    stock: number;
  } | null;
}
export const api = {
  health: () => request<{ status: string }>("/health"),

  getProducts: (filters?: {
    search?: string;
    category?: string;
    min_price?: number;
    max_price?: number;
    sort?: string;
  }) => {
    const params = new URLSearchParams();

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    });

    const query = params.toString();
    return request<Product[]>(`/api/products${query ? `?${query}` : ""}`);
  },

  createProduct: (product: ProductInput) =>
    request<Product>(
      "/api/products",
      { method: "POST", body: JSON.stringify(product) },
      true
    ),

  updateProduct: (id: string, product: Partial<ProductInput>) =>
    request<Product>(
      `/api/products/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(product) },
      true
    ),

  deleteProduct: (id: string) =>
    request<unknown>(
      `/api/products/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      true
    ),

  // C++ ADSA engine operations
  getAdsaAutocomplete: (q: string) =>
    request<{ operation: string; results: string[] }>(
      `/api/adsa/autocomplete?q=${encodeURIComponent(q)}`
    ),

  getAdsaPriceRange: (min: number, max: number) =>
    request<{ operation: string; results: string[] }>(
      `/api/adsa/price-range?min_price=${min}&max_price=${max}`
    ),

  getAdsaLowStock: (threshold = 5) =>
    request<{ operation: string; results: string[] }>(
      `/api/adsa/low-stock?threshold=${threshold}`,
      {},
      true
    ),

  getAdsaProduct: (id: string) =>
    request<{ operation: string; found: boolean; product_id: string | null; product: Product | null }>(
      `/api/adsa/lookup/${encodeURIComponent(id)}`
    ),

  getAdsaRestockQueue: (threshold = 5) =>
    request<{ operation: string; results: string[] }>(
      `/api/adsa/restock-queue?threshold=${threshold}`,
      {},
      true
    ),

  getOwnerAdsaSnapshot: () =>
    request<{
      snapshot: AdsaSnapshot;
      products: Product[];
      pendingRestockCount: number;
      source: string;
    }>("/api/owner/adsa/snapshot", {}, true),
  getRestockRequests: () =>
    request<{ requests: RestockRequest[] }>(
      "/api/owner/restock-requests",
      {},
      true
    ),

  createRestockRequest: (data: {
    product_id: string;
    requested_quantity: number;
  }) =>
    request<{ request: RestockRequest }>(
      "/api/owner/restock-requests",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      true
    ),

  processNextRestockRequest: () =>
    request<{
      processed: RestockRequest | null;
      message: string;
    }>(
      "/api/owner/restock-requests/process-next",
      {
        method: "POST",
      },
      true
    ),
  getOrders: () =>
    request<any[]>("/api/orders", {}, true),

  getOrder: (id: string) =>
    request<any>(`/api/orders/${encodeURIComponent(id)}`, {}, true),

  getOwnerOrders: () =>
    request<any[]>("/api/owner/orders", {}, true),

  updateOrderStatus: (id: string, status: string) =>
    request<any>(
      `/api/owner/orders/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      true
    ),

  checkoutOrder: (items: { product_id: string; quantity: number }[]) =>
    request<{ message: string; order_id: string; status: string }>(
      "/api/orders/checkout",
      {
        method: "POST",
        body: JSON.stringify({ items }),
      },
      true
    ),

  getOwnerSummary: () =>
    request<Record<string, unknown>>("/api/owner/summary", {}, true),
};





