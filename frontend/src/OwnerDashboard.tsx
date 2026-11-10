import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Package, Boxes, AlertTriangle, IndianRupee,
  Plus, Search, Pencil, Trash2, X, RefreshCw, LogOut
} from "lucide-react";
import { supabase } from "./lib/supabase";
import OwnerOrders from "./OwnerOrders";
import { api, type RestockRequest } from "./lib/api";
import "./OwnerDashboard.css";

type Product = {
  id: string;
  product_code?: string;
  owner_id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image_url: string | null;
};

const emptyForm = {
  name: "",
  category: "Electronics",
  description: "",
  price: "",
  stock: "",
};

export default function OwnerDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [ownerProductCodeQuery, setOwnerProductCodeQuery] = useState("");
  const [ownerIdentifierResult, setOwnerIdentifierResult] = useState<Product | null>(null);
  const [ownerIdentifierMessage, setOwnerIdentifierMessage] = useState("");
  const [ownerIdentifierLoading, setOwnerIdentifierLoading] = useState(false);
  const [hashLookupId, setHashLookupId] = useState("");
  const [hashLookupResult, setHashLookupResult] = useState<Product | null>(null);
  const [hashLookupMessage, setHashLookupMessage] = useState("");
  const [hashLookupLoading, setHashLookupLoading] = useState(false);
  const [fifoRestockQueue, setFifoRestockQueue] = useState<RestockRequest[]>([]);
  const [fifoLoading, setFifoLoading] = useState(false);
  const [fifoMessage, setFifoMessage] = useState("");
  const [restockProductId, setRestockProductId] = useState("");
  const [restockQuantity, setRestockQuantity] = useState("10");
  const [adsaLowStockProducts, setAdsaLowStockProducts] = useState<Product[]>([]);
  const [adsaLowStockLoading, setAdsaLowStockLoading] = useState(false);
  const [adsaLowStockEngineError, setAdsaLowStockEngineError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Your session has expired. Please log in again.");
      setLoading(false);
      return;
    }

    setEmail(userData.user.email ?? "");

    try {
      const data = await api.getProducts();
      const ownerProducts = data.filter(
        (product) => product.owner_id === userData.user.id
      );
      setProducts(ownerProducts as Product[]);

      // C++ Min Heap: identify this owner's products needing restock
      setAdsaLowStockLoading(true);
      setAdsaLowStockEngineError("");

      try {
        const heapResult = await api.getAdsaLowStock(5);
        const ownerIds = new Set(ownerProducts.map(product => product.id));

        const alertProducts = ownerProducts.filter(
          product =>
            ownerIds.has(product.id) &&
            heapResult.results.includes(product.id) &&
            Number(product.stock) <= 5
        );

        setAdsaLowStockProducts(alertProducts as Product[]);
      } catch (heapError) {
        console.error("Min Heap request failed:", heapError);
        setAdsaLowStockEngineError("C++ Min Heap unavailable. Showing local inventory alerts.");
        setAdsaLowStockProducts(
          ownerProducts.filter(product => Number(product.stock) <= 5) as Product[]
        );
      } finally {
        setAdsaLowStockLoading(false);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load inventory.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProducts();
    void loadRestockRequests();
  }, [loadProducts]);

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalStock = products.reduce((sum, p) => sum + Number(p.stock), 0);
  const inventoryValue = products.reduce((sum, p) => sum + Number(p.price) * Number(p.stock), 0);
  const lowStock = products.filter((p) => Number(p.stock) <= 5).length;

  async function loadRestockRequests() {
    setFifoLoading(true);

    try {
      const response = await api.getRestockRequests();
      setFifoRestockQueue(response.requests || []);
    } catch (error) {
      setFifoMessage(
        error instanceof Error
          ? error.message
          : "Could not load persistent restock requests."
      );
    } finally {
      setFifoLoading(false);
    }
  }

  async function createRestockRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const productId = restockProductId || products[0]?.id || "";
    const quantity = Number(restockQuantity);

    if (!productId) {
      setFifoMessage("Select a product first.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 1000000) {
      setFifoMessage("Enter a valid quantity between 1 and 1000000.");
      return;
    }

    setFifoLoading(true);
    setFifoMessage("");

    try {
      await api.createRestockRequest({
        product_id: productId,
        requested_quantity: quantity,
      });

      setFifoMessage("Restock request created successfully.");
      setRestockQuantity("10");

      const response = await api.getRestockRequests();
      setFifoRestockQueue(response.requests || []);
    } catch (error) {
      setFifoMessage(
        error instanceof Error
          ? error.message
          : "Could not create restock request."
      );
    } finally {
      setFifoLoading(false);
    }
  }

  async function processNextRestock() {
    if (fifoRestockQueue.length === 0 || fifoLoading) return;

    setFifoLoading(true);
    setFifoMessage("");

    try {
      const response = await api.processNextRestockRequest();

      setFifoMessage(response.message);

      const refreshed = await api.getRestockRequests();
      setFifoRestockQueue(refreshed.requests || []);
    } catch (error) {
      setFifoMessage(
        error instanceof Error
          ? error.message
          : "Could not process the next restock request."
      );
    } finally {
      setFifoLoading(false);
    }
  }


  async function lookupProductWithHashTable() {
    const id = hashLookupId.trim();

    if (!id) {
      setHashLookupMessage("Enter a product ID first.");
      setHashLookupResult(null);
      return;
    }

    setHashLookupLoading(true);
    setHashLookupMessage("");
    setHashLookupResult(null);

    try {
      const response = await api.getAdsaProduct(id);

      if (!response.found || !response.product_id) {
        setHashLookupMessage("Product not found in the Hash Table.");
        return;
      }

      const product = products.find(
        item => item.id === response.product_id
      );

      if (!product) {
        setHashLookupMessage(
          "Product exists, but it is not part of your inventory."
        );
        return;
      }

      setHashLookupResult(product);
      setHashLookupMessage("Product found using C++ Hash Table.");
    } catch (error) {
      setHashLookupMessage(
        error instanceof Error ? error.message : "Hash lookup failed."
      );
    } finally {
      setHashLookupLoading(false);
    }
  }
  async function findOwnerProductIdentifier() {
    const query = ownerProductCodeQuery.trim();

    if (!query) {
      setOwnerIdentifierMessage("Enter a product name, Product Code or UUID.");
      setOwnerIdentifierResult(null);
      return;
    }

    setOwnerIdentifierLoading(true);
    setOwnerIdentifierResult(null);
    setOwnerIdentifierMessage("");

    try {
      const localMatch = products.find(product =>
        product.name.toLowerCase() === query.toLowerCase() ||
        product.product_code?.toLowerCase() === query.toLowerCase() ||
        product.id.toLowerCase() === query.toLowerCase()
      );

      const lookupKey = localMatch?.product_code || localMatch?.id || query;
      const response = await api.getAdsaProduct(lookupKey);

      if (!response.found || !response.product) {
        setOwnerIdentifierMessage("No matching product found in your inventory.");
        return;
      }

      const ownProduct = products.find(
        product => product.id === response.product?.id
      );

      if (!ownProduct) {
        setOwnerIdentifierMessage("This product is not part of your inventory.");
        return;
      }

      setOwnerIdentifierResult({
        ...ownProduct,
        product_code: response.product.product_code
      });
      setOwnerIdentifierMessage("Product retrieved through the C++ Hash Table.");
    } catch (error) {
      setOwnerIdentifierMessage(
        error instanceof Error ? error.message : "Product lookup failed."
      );
    } finally {
      setOwnerIdentifierLoading(false);
    }
  }
  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description ?? "",
      price: String(product.price),
      stock: String(product.stock),
    });
    setShowForm(true);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMessage("Please log in again.");
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
    };

    try {
      if (editingId) {
        await api.updateProduct(editingId, payload);
      } else {
        await api.createProduct(payload);
      }

      setShowForm(false);
      setForm(emptyForm);
      setMessage(editingId ? "Product updated successfully." : "Product added successfully.");
      await loadProducts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await api.deleteProduct(id);
      setMessage("Product deleted successfully.");
      await loadProducts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete product.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/admin";
  }

  return (
    <main className="owner-dashboard">
      <aside className="owner-sidebar">
        <a href="/" className="owner-brand">shop<span>.</span>corner</a>
        <div className="sidebar-label">WORKSPACE</div>
        <a href="/admin" className="sidebar-link active"><Boxes size={18}/> Overview</a>
        <a href="#inventory" className="sidebar-link"><Package size={18}/> Products & Inventory</a>
        <a href="/admin/adsa" className="sidebar-link"><Boxes size={18}/> ADSA Visualizer</a>
        <div className="sidebar-bottom">
          <div className="owner-avatar">O</div>
          <div className="owner-user-info">
            <strong>Store Owner</strong>
            <span>{email}</span>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Log out"><LogOut size={18}/></button>
        </div>
      </aside>

      <section className="owner-main">
        <header className="owner-topbar">
          <div>
            <span className="owner-eyebrow">STORE MANAGEMENT</span>
            <h1>Dashboard overview</h1>
            <p>Manage your products and keep your inventory healthy.</p>
          </div>
          <button className="owner-refresh" onClick={() => void loadProducts()}><RefreshCw size={16}/> Refresh</button>
        </header>

        {message && <div className="owner-message">{message}</div>}

        <div className="owner-stat-grid">
          <article className="owner-stat-card">
            <div className="stat-icon orange"><Package/></div>
            <span>Total products</span>
            <strong>{products.length.toLocaleString("en-IN")}</strong>
            <small>Products in catalogue</small>
          </article>
          <article className="owner-stat-card">
            <div className="stat-icon dark"><Boxes/></div>
            <span>Available stock</span>
            <strong>{totalStock.toLocaleString("en-IN")}</strong>
            <small>Total inventory units</small>
          </article>
          <article className="owner-stat-card">
            <div className="stat-icon warning"><AlertTriangle/></div>
            <span>Low stock items</span>
            <strong>{lowStock.toLocaleString("en-IN")}</strong>
            <small>Products with 5 or fewer units</small>
          </article>
          <article className="owner-stat-card">
            <div className="stat-icon green"><IndianRupee/></div>
            <span>Inventory value</span>
            <strong>₹{inventoryValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong>
            <small>Based on price × stock</small>
          </article>
        </div>

        <section className="owner-adsa-alerts">
          <div className="owner-adsa-heading">
            <div>
              <span className="owner-eyebrow">ADSA ENGINE · MIN HEAP</span>
              <h2>Smart restock alerts</h2>
              <p>Products with the lowest stock are prioritised automatically.</p>
            </div>
            <span className="owner-adsa-count">
              {adsaLowStockProducts.length} alerts
            </span>
          </div>

          {adsaLowStockLoading ? (
            <p className="owner-adsa-empty">Analysing inventory with Min Heap...</p>
          ) : adsaLowStockProducts.length === 0 ? (
            <p className="owner-adsa-empty">
              <Package size={18}/>
              All clear! No products currently need restocking.
            </p>
          ) : (
            <div className="owner-adsa-list">
              {adsaLowStockProducts
                .slice()
                .sort((a, b) => Number(a.stock) - Number(b.stock))
                .map(product => (
                  <div className="owner-adsa-item" key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.category}</span>
                    </div>
                    <span className="owner-adsa-stock">
                      {product.stock} left
                    </span>
                  </div>
                ))}
            </div>
          )}

          {adsaLowStockEngineError && (
            <small className="owner-adsa-warning">{adsaLowStockEngineError}</small>
          )}
        </section>
        <section className="owner-fifo-section">
          <div className="owner-fifo-heading">
            <div>
              <span className="owner-eyebrow">ADSA ENGINE · FIFO QUEUE</span>
              <h2>Restocking workflow</h2>
              <p>Persistent requests processed in first-in, first-out order.</p>
            </div>

            <button
              type="button"
              className="owner-fifo-generate"
              onClick={() => void loadRestockRequests()}
              disabled={fifoLoading}
            >
              <RefreshCw size={15}/>
              {fifoLoading ? "Loading..." : "Refresh queue"}
            </button>
          </div>

          <form
            className="owner-fifo-create-form"
            onSubmit={createRestockRequest}
          >
            <div className="owner-fifo-field">
              <label htmlFor="restock-product">Select product</label>
              <select
                id="restock-product"
                value={restockProductId || products[0]?.id || ""}
                onChange={(event) => setRestockProductId(event.target.value)}
                required
              >
                {products.length === 0 && (
                  <option value="">No products available</option>
                )}

                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {product.stock} in stock
                  </option>
                ))}
              </select>
            </div>

            <div className="owner-fifo-field">
              <label htmlFor="restock-quantity">Restock quantity</label>
              <input
                id="restock-quantity"
                type="number"
                min="1"
                max="1000000"
                step="1"
                value={restockQuantity}
                onChange={(event) => setRestockQuantity(event.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="owner-fifo-create-button"
              disabled={fifoLoading || products.length === 0}
            >
              <Package size={16}/>
              Create request
            </button>
          </form>

          {fifoMessage && (
            <p className="owner-fifo-message">{fifoMessage}</p>
          )}

          <div className="owner-fifo-queue-summary">
            <strong>{fifoRestockQueue.length} pending requests</strong>
            <span>Oldest request is processed first.</span>
          </div>

          {fifoRestockQueue.length === 0 ? (
            <div className="owner-fifo-empty">
              <Package size={22}/>
              <span>No pending restock requests. Create a request above.</span>
            </div>
          ) : (
            <>
              <div className="owner-fifo-list">
                {fifoRestockQueue.map((request, index) => (
                  <div className="owner-fifo-item" key={request.id}>
                    <span className="owner-fifo-position">{index + 1}</span>

                    <div className="owner-fifo-product">
                      <strong>
                        {request.product?.name || "Product unavailable"}
                      </strong>

                      <span>
                        Requested: {request.requested_quantity} units ·
                        Current stock: {request.product?.stock ?? "—"}
                      </span>

                      <small>
                        Added: {new Date(request.created_at).toLocaleString()}
                      </small>
                    </div>

                    {index === 0 && (
                      <span className="owner-fifo-next">NEXT</span>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="owner-fifo-process"
                onClick={() => void processNextRestock()}
                disabled={fifoLoading}
              >
                {fifoLoading ? "Processing..." : "Process next request"}
              </button>
            </>
          )}

          <small className="owner-fifo-note">
            Requests are stored in Supabase. The C++ FIFO engine determines
            processing order. Processing marks a request as processed; it
            does not automatically change product stock.
          </small>
        </section>


        <section className="owner-hash-section">
          <div className="owner-hash-heading">
            <div>
              <span className="owner-eyebrow">ADSA ENGINE · HASH TABLE</span>
              <h2>Instant product lookup</h2>
              <p>Search inventory directly using a product ID.</p>
            </div>
          </div>

          <form
            className="owner-hash-form"
            onSubmit={event => {
              event.preventDefault();
              void lookupProductWithHashTable();
            }}
          >
            <input
              value={hashLookupId}
              onChange={event => setHashLookupId(event.target.value)}
              placeholder="Enter product UUID..."
              aria-label="Product ID"
            />
            <button type="submit" disabled={hashLookupLoading}>
              {hashLookupLoading ? "Searching..." : "Find product"}
            </button>
          </form>

          {hashLookupMessage && (
            <p className="owner-hash-message">{hashLookupMessage}</p>
          )}

          {hashLookupResult && (
            <div className="owner-hash-result">
              <div>
                <strong>{hashLookupResult.name}</strong>
                <span>{hashLookupResult.category}</span>
                <small>{hashLookupResult.id}</small>
              </div>
              <div className="owner-hash-result-numbers">
                <strong>₹{Number(hashLookupResult.price).toLocaleString("en-IN")}</strong>
                <span>{hashLookupResult.stock} units in stock</span>
              </div>
            </div>
          )}
        </section>
        <section className="owner-product-id-panel">
          <div>
            <span className="owner-eyebrow">ADSA ENGINE · HASH TABLE</span>
            <h2>Product ID Generator & UUID Finder</h2>
            <p>Find a product by name, Product Code or UUID and retrieve its identifiers.</p>
          </div>

          <form
            className="owner-product-id-form"
            onSubmit={event => {
              event.preventDefault();
              void findOwnerProductIdentifier();
            }}
          >
            <input
              value={ownerProductCodeQuery}
              onChange={event => setOwnerProductCodeQuery(event.target.value)}
              placeholder="Product name, PRD-000001 or UUID"
              aria-label="Product name, Product Code or UUID"
            />
            <button type="submit" disabled={ownerIdentifierLoading}>
              {ownerIdentifierLoading ? "Searching..." : "Find identifiers"}
            </button>
          </form>

          {ownerIdentifierMessage && (
            <p className="owner-product-id-message">{ownerIdentifierMessage}</p>
          )}

          {ownerIdentifierResult && (
            <div className="owner-product-id-result">
              <strong>{ownerIdentifierResult.name}</strong>
              <div className="owner-product-id-value">
                <span>PRODUCT CODE</span>
                <code>{ownerIdentifierResult.product_code || "Not assigned"}</code>
                {ownerIdentifierResult.product_code && (
                  <button type="button" onClick={() => void navigator.clipboard.writeText(ownerIdentifierResult.product_code!)}>
                    Copy code
                  </button>
                )}
              </div>
              <div className="owner-product-id-value">
                <span>DATABASE UUID</span>
                <code>{ownerIdentifierResult.id}</code>
                <button type="button" onClick={() => void navigator.clipboard.writeText(ownerIdentifierResult.id)}>
                  Copy UUID
                </button>
              </div>
            </div>
          )}
        </section>
        <section className="owner-inventory" id="inventory">
          <div className="inventory-heading">
            <div>
              <span className="owner-eyebrow">PRODUCT MANAGEMENT</span>
              <h2>Inventory</h2>
              <p>Manage every product in your store.</p>
            </div>
            <button className="owner-add-button" onClick={openAddForm}><Plus size={17}/> Add product</button>
          </div>

          <div className="inventory-toolbar">
            <div className="inventory-search">
              <Search size={17}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or categories..."/>
            </div>
            <span className="inventory-count">{filteredProducts.length} products</span>
          </div>

          {loading ? (
            <div className="inventory-empty">Loading inventory...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="inventory-empty">
              <Package size={34}/>
              <strong>{search ? "No matching products" : "Your inventory is empty"}</strong>
              <span>{search ? "Try another search." : "Add your first product to get started."}</span>
              {!search && <button className="owner-add-button" onClick={openAddForm}><Plus size={16}/> Add first product</button>}
            </div>
          ) : (
            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>PRODUCT</th>
                    <th>CATEGORY</th>
                    <th>PRICE</th>
                    <th>STOCK</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        <small>{product.description || "No description"}</small>
                        <small className="owner-product-code">ID: {product.product_code || "Assigning..."}</small>
                      </td>
                      <td>{product.category}</td>
                      <td>₹{Number(product.price).toLocaleString("en-IN")}</td>
                      <td>{product.stock}</td>
                      <td>
                        <span className={`stock-status ${Number(product.stock) <= 5 ? "stock-low" : "stock-good"}`}>
                          {Number(product.stock) <= 5 ? "Low stock" : "In stock"}
                        </span>
                      </td>
                      <td>
                        <div className="product-actions">
                          <button title="Edit" onClick={() => openEditForm(product)}><Pencil size={16}/></button>
                          <button title="Delete" onClick={() => void deleteProduct(product.id)}><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <OwnerOrders />
      </section>

      {showForm && (
        <div className="owner-modal-backdrop" onMouseDown={e => {
          if (e.target === e.currentTarget) setShowForm(false);
        }}>
          <form className="owner-modal" onSubmit={saveProduct}>
            <div className="modal-heading">
              <div>
                <span className="owner-eyebrow">PRODUCT CATALOGUE</span>
                <h2>{editingId ? "Edit product" : "Add new product"}</h2>
              </div>
              <button type="button" onClick={() => setShowForm(false)}><X/></button>
            </div>

            <label>Product name</label>
            <input required maxLength={120} value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="e.g. Wireless Headphones"/>

            <label>Category</label>
            <select value={form.category} onChange={e => setForm({...form, category:e.target.value})}>
              <option>Electronics</option>
              <option>Accessories</option>
              <option>Clothing</option>
              <option>Home & Living</option>
              <option>Books</option>
              <option>Other</option>
            </select>

            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Describe your product..."/>

            <div className="modal-two-columns">
              <div>
                <label>Price (₹)</label>
                <input type="number" min="0.01" step="0.01" required value={form.price} onChange={e => setForm({...form, price:e.target.value})} placeholder="2499"/>
              </div>
              <div>
                <label>Stock quantity</label>
                <input type="number" min="0" step="1" required value={form.stock} onChange={e => setForm({...form, stock:e.target.value})} placeholder="20"/>
              </div>
            </div>

            <button className="owner-add-button modal-submit" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Add product"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}








