import { useEffect, useMemo, useState } from "react";
import { Activity, GitBranch, Hash, Search, Layers, ListOrdered, RefreshCw } from "lucide-react";
import { supabase } from "./lib/supabase";
import "./ADSAVisualizer.css";

type Product = {
  id: string;
  product_code?: string;
  name: string;
  category: string;
  price: number;
  stock: number;
};

type RestockRequest = {
  id: string;
  requested_quantity: number;
  created_at: string;
  product?: { id: string; name: string; stock: number; product_code?: string } | null;
};

type Props = { products: Product[] };

type Structure = "avl" | "hash" | "trie" | "heap" | "fifo";

const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export default function ADSAVisualizer({ products }: Props) {
  const [active, setActive] = useState<Structure>("avl");
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState("100000");
  const [threshold, setThreshold] = useState("5");
  const [ids, setIds] = useState<string[]>([]);
  const [lookupProduct, setLookupProduct] = useState<Product | null>(null);
  const [requests, setRequests] = useState<RestockRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Choose an operation and run it on the live C++ engine.");
  const [hasRun, setHasRun] = useState(false);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  async function request(path: string, ownerOnly = false) {
    const headers: Record<string, string> = {};
    if (ownerOnly) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Please log in again.");
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, { headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail || payload.message || `Request failed (${response.status})`);
    }
    return payload;
  }

  async function runOperation() {
    setLoading(true);
    setMessage("");
    setIds([]);
    setLookupProduct(null);
    setRequests([]);
    setHasRun(false);

    try {
      if (active === "avl") {
        const low = Number(minPrice);
        const high = Number(maxPrice);
        if (!Number.isFinite(low) || !Number.isFinite(high) || low < 0 || high < low) {
          throw new Error("Enter a valid price range (minimum must not exceed maximum).");
        }
        const data = await request(`/api/adsa/price-range?min_price=${encodeURIComponent(low)}&max_price=${encodeURIComponent(high)}`);
        setIds(data.results || []);
        setMessage(`C++ AVL Tree returned ${(data.results || []).length} product(s) in this price range.`);
      } else if (active === "hash") {
        if (!query.trim()) throw new Error("Enter a product UUID or product code.");
        const data = await request(`/api/adsa/lookup/${encodeURIComponent(query.trim())}`);
        if (data.found && data.product) {
          setLookupProduct(data.product);
          setMessage("Product found by the C++ Hash Table.");
        } else {
          setMessage("The C++ Hash Table did not find a matching product.");
        }
      } else if (active === "trie") {
        if (!query.trim()) throw new Error("Enter a product-name prefix, such as lap.");
        const data = await request(`/api/adsa/autocomplete?q=${encodeURIComponent(query.trim())}`);
        setIds(data.results || []);
        setMessage(`C++ Trie returned ${(data.results || []).length} autocomplete match(es).`);
      } else if (active === "heap") {
        const value = Number(threshold);
        if (!Number.isInteger(value) || value < 0) throw new Error("Stock threshold must be a non-negative whole number.");
        const data = await request(`/api/adsa/low-stock?threshold=${value}`);
        setIds(data.results || []);
        setMessage(`C++ Min Heap identified ${(data.results || []).length} product(s) at or below ${value} units.`);
      } else {
        const data = await request("/api/owner/restock-requests", true);
        setRequests(data.requests || []);
        setMessage(`Loaded ${ (data.requests || []).length } pending request(s). The backend processes the next request through the C++ FIFO queue.`);
      }
      setHasRun(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ADSA operation failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (active === "fifo") void runOperation();
    // Run when the user switches to FIFO; other operations require explicit input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const tabs = [
    { id: "avl" as const, label: "AVL Tree", icon: GitBranch, detail: "Price range" },
    { id: "hash" as const, label: "Hash Table", icon: Hash, detail: "Product lookup" },
    { id: "trie" as const, label: "Trie", icon: Search, detail: "Autocomplete" },
    { id: "heap" as const, label: "Min Heap", icon: Layers, detail: "Low stock" },
    { id: "fifo" as const, label: "FIFO Queue", icon: ListOrdered, detail: "Restock order" },
  ];

  const resultProducts = ids.map((id) => productById.get(id)).filter((item): item is Product => Boolean(item));

  return (
    <section className="adsa-visualizer" id="adsa-visualizer">
      <div className="adsa-viz-heading">
        <div>
          <span className="owner-eyebrow">LIVE C++ ENGINE</span>
          <h2>ADSA Engine Visualizer</h2>
          <p>Run real inventory operations and inspect the records returned by each data structure.</p>
        </div>
        <span className="adsa-viz-status"><i /> ENGINE OPERATIONS</span>
      </div>

      <div className="adsa-viz-tabs" role="tablist" aria-label="Data structures">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              className={active === tab.id ? "active" : ""}
              onClick={() => { setActive(tab.id); setHasRun(false); setMessage("Ready to execute against the C++ engine."); }}
            >
              <Icon size={17} />
              <span>{tab.label}<small>{tab.detail}</small></span>
            </button>
          );
        })}
      </div>

      <div className="adsa-viz-workspace">
        <div className="adsa-viz-info">
          <div className="adsa-viz-number">0{tabs.findIndex((tab) => tab.id === active) + 1}</div>
          <div>
            <h3>{tabs.find((tab) => tab.id === active)?.label}</h3>
            <p>
              {active === "avl" && "Balanced binary search tree. The C++ engine indexes products by price and searches the requested interval."}
              {active === "hash" && "Hash table with separate chaining. The C++ engine hashes a UUID or product code to find its product record."}
              {active === "trie" && "Prefix tree. The C++ engine follows the typed prefix and collects product names below that prefix."}
              {active === "heap" && "Min Heap. The C++ engine repeatedly extracts the smallest stock value to prioritise low-stock products."}
              {active === "fifo" && "First-In, First-Out queue. The oldest pending restock request is the next request processed."}
            </p>
          </div>
        </div>

        {active === "avl" && (
          <div className="adsa-viz-controls">
            <label>Minimum price <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} /></label>
            <label>Maximum price <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} /></label>
          </div>
        )}
        {(active === "hash" || active === "trie") && (
          <div className="adsa-viz-controls">
            <label className="wide">{active === "hash" ? "Product UUID / Product Code" : "Product name prefix"}
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={active === "hash" ? "PRD-000001 or UUID" : "e.g. lap"} />
            </label>
          </div>
        )}
        {active === "heap" && (
          <div className="adsa-viz-controls">
            <label>Low-stock threshold <input type="number" min="0" step="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></label>
          </div>
        )}
        {active === "fifo" && (
          <div className="adsa-viz-fifo-note">Pending requests are read from the authenticated owner queue. Existing restock processing remains unchanged.</div>
        )}

        <div className="adsa-viz-actions">
          <button type="button" onClick={() => void runOperation()} disabled={loading}>
            {loading ? <><RefreshCw size={15} className="adsa-spin" /> Running C++...</> : <><Activity size={15} /> Run engine operation</>}
          </button>
          <span>{products.length} owner product(s) currently loaded</span>
        </div>

        <div className={`adsa-viz-message ${message && !message.toLowerCase().includes("failed") && !message.toLowerCase().includes("enter") ? "ok" : ""}`}>
          {message}
        </div>

        {hasRun && (active === "hash" ? (
          lookupProduct ? (
            <div className="adsa-viz-product-result">
              <strong>{lookupProduct.name}</strong>
              <span>{lookupProduct.product_code || "No product code"} Â· {lookupProduct.id}</span>
              <b>â‚¹{Number(lookupProduct.price).toLocaleString("en-IN")} Â· {lookupProduct.stock} in stock</b>
            </div>
          ) : <div className="adsa-viz-empty">No matching product returned.</div>
        ) : active === "fifo" ? (
          requests.length ? (
            <div className="adsa-viz-queue">
              {requests.map((item, index) => (
                <div className={`adsa-viz-queue-item ${index === 0 ? "next" : ""}`} key={item.id}>
                  <b>{index === 0 ? "FRONT / NEXT" : `POSITION ${index + 1}`}</b>
                  <strong>{item.product?.name || "Product unavailable"}</strong>
                  <span>{item.requested_quantity} units Â· {item.id.slice(0, 8)}</span>
                </div>
              ))}
              <div className="adsa-viz-queue-end">REAR</div>
            </div>
          ) : <div className="adsa-viz-empty">No pending restock requests.</div>
        ) : resultProducts.length ? (
          <div className="adsa-viz-results">
            {resultProducts.map((product, index) => (
              <div className="adsa-viz-result" key={product.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{product.name}</strong><small>{product.product_code || product.id}</small></div>
                <b>{active === "avl" ? `â‚¹${Number(product.price).toLocaleString("en-IN")}` : `${product.stock} units`}</b>
              </div>
            ))}
          </div>
        ) : <div className="adsa-viz-empty">The C++ engine returned no matching product IDs.</div>)}
      </div>

      <div className="adsa-viz-footnote">
        Results above come from the existing C++ engine endpoints. The cards show actual returned records; they do not fabricate internal tree-node positions or hash bucket layouts.
      </div>
    </section>
  );
}
