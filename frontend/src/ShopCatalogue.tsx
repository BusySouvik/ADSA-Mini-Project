import { useEffect, useMemo, useState } from "react";
import {
  Search, ShoppingBag, ShoppingCart, SlidersHorizontal,
  Plus, Minus, X, Package, LogOut, RefreshCw
} from "lucide-react";
import { api, type Product } from "./lib/api";
import CustomerOrders from "./CustomerOrders";
import "./ShopCatalogue.css";

type CartItem = {
  product: Product;
  quantity: number;
};

type Props = {
  userEmail: string;
  onLogout: () => void;
};

export default function ShopCatalogue({ userEmail, onLogout }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [search, setSearch] = useState("");
  const [customerHashQuery, setCustomerHashQuery] = useState("");
  const [customerHashProduct, setCustomerHashProduct] = useState<Product | null>(null);
  const [customerHashMessage, setCustomerHashMessage] = useState("");
  const [customerHashLoading, setCustomerHashLoading] = useState(false);
  const [category, setCategory] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("featured");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [adsaSuggestions, setAdsaSuggestions] = useState<Product[]>([]);
  const [adsaSearchLoading, setAdsaSearchLoading] = useState(false);
  const [adsaPriceIds, setAdsaPriceIds] = useState<string[] | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [confirmationId, setConfirmationId] = useState("");

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map(p => p.category))).sort()],
    [products]
  );

  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      const matchesSearch =
        `${product.name} ${product.category} ${product.description || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesCategory =
        category === "All" || product.category === category;

      const matchesMin =
        minPrice === "" || Number(product.price) >= Number(minPrice);

      const matchesMax =
        maxPrice === "" || Number(product.price) <= Number(maxPrice);

      const matchesAdsaPrice =
        adsaPriceIds === null || adsaPriceIds.includes(product.id);

      return matchesSearch && matchesCategory && matchesMin &&
        matchesMax && matchesAdsaPrice;
    });

    if (sort === "price-low") result.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price-high") result.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [products, search, category, minPrice, maxPrice, sort, adsaPriceIds]);
  // Trie: live product-name autocomplete from the C++ engine
  useEffect(() => {
    let active = true;
    const query = search.trim();

    if (!query) {
      setAdsaSuggestions([]);
      setAdsaSearchLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setAdsaSearchLoading(true);

      try {
        const response = await api.getAdsaAutocomplete(query);

        if (active) {
          const matches = response.results
            .map(id => products.find(product => product.id === id))
            .filter((product): product is Product => Boolean(product));

          setAdsaSuggestions(matches.slice(0, 6));
        }
      } catch {
        if (active) setAdsaSuggestions([]);
      } finally {
        if (active) setAdsaSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, products]);

  // AVL Tree: use C++ price-range results when a price filter is entered
  useEffect(() => {
    let active = true;

    if (minPrice === "" && maxPrice === "") {
      setAdsaPriceIds(null);
      return;
    }

    const min = minPrice === "" ? 0 : Number(minPrice);
    const max = maxPrice === "" ? 100000000 : Number(maxPrice);

    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
      setAdsaPriceIds([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await api.getAdsaPriceRange(min, max);
        if (active) setAdsaPriceIds(response.results);
      } catch {
        if (active) setAdsaPriceIds(null);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [minPrice, maxPrice]);


  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );

  async function findCustomerProduct() {
    const query = customerHashQuery.trim();

    if (!query) {
      setCustomerHashMessage("Enter a Product ID or UUID.");
      setCustomerHashProduct(null);
      return;
    }

    setCustomerHashLoading(true);
    setCustomerHashProduct(null);
    setCustomerHashMessage("");

    try {
      const response = await api.getAdsaProduct(query);

      if (!response.found || !response.product) {
        setCustomerHashMessage("No product found for this ID.");
        return;
      }

      setCustomerHashProduct(response.product);
      setCustomerHashMessage("Product found using the C++ Hash Table.");
    } catch (error) {
      setCustomerHashMessage(
        error instanceof Error ? error.message : "Product lookup failed."
      );
    } finally {
      setCustomerHashLoading(false);
    }
  }
  function addToCart(product: Product) {
    if (product.stock <= 0) return;

    setCart(current => {
      const existing = current[product.id];
      const quantity = existing ? existing.quantity : 0;

      if (quantity >= product.stock) return current;

      return {
        ...current,
        [product.id]: { product, quantity: quantity + 1 }
      };
    });
  }

  function changeQuantity(id: string, change: number) {
    setCart(current => {
      const item = current[id];
      if (!item) return current;

      const next = item.quantity + change;
      if (next <= 0) {
        const updated = { ...current };
        delete updated[id];
        return updated;
      }

      if (next > item.product.stock) return current;

      return {
        ...current,
        [id]: { ...item, quantity: next }
      };
    });
  }

  async function checkout() {
    if (cartItems.length === 0 || checkoutLoading) return;

    setCheckoutLoading(true);
    setCheckoutMessage("");

    try {
      const result = await api.checkoutOrder(
        cartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
        }))
      );

      setConfirmationId(result.order_id);
      setCart({});
      setCartOpen(false);

      // Refresh catalogue to show updated inventory.
      await loadProducts();
    } catch (err) {
      setCheckoutMessage(
        err instanceof Error ? err.message : "Checkout failed. Please try again."
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setCategory("All");
    setMinPrice("");
    setMaxPrice("");
    setSort("featured");
  }

  return (
    <main className="shop-catalogue">
      <header className="shop-nav">
        <a href="/" className="shop-logo">shop<span>.</span>corner</a>

        <div className="shop-nav-right">
          <span className="shop-user">{userEmail}</span>
          <button className="shop-orders-button" onClick={() => setShowOrders(v => !v)}>{showOrders ? "Hide orders" : "My orders"}</button>
          <button className="shop-cart-button" onClick={() => setCartOpen(true)}>
            <ShoppingCart size={19}/>
            <span>Cart</span>
            {cartCount > 0 && <b>{cartCount}</b>}
          </button>
          <button className="shop-logout" onClick={onLogout} title="Log out">
            <LogOut size={18}/>
          </button>
        </div>
      </header>

      {showOrders && <CustomerOrders />}

      <section className="shop-hero">
        <div>
          <span className="shop-eyebrow">THE SHOP-CORNER COLLECTION</span>
          <h1>Good finds.<br/><span>Better choices.</span></h1>
          <p>Explore the collection, discover what you need, and shop smarter.</p>
        </div>
        <div className="shop-hero-art">
          <ShoppingBag size={78} strokeWidth={1}/>
          <span>CURATED FOR YOU</span>
        </div>
      </section>

      <section className="shop-content">
        <div className="shop-section-heading">
          <div>
            <span className="shop-eyebrow">EXPLORE OUR STORE</span>
            <h2>Find your next favourite.</h2>
          </div>
          <button className="shop-refresh" onClick={() => void loadProducts()}>
            <RefreshCw size={16}/> Refresh
          </button>
        </div>

        <section className="customer-id-lookup">
          <div className="customer-id-heading">
            <span className="shop-eyebrow">ADSA ENGINE · HASH TABLE</span>
            <h3>Find a product by ID</h3>
            <p>Enter a Product Code or the full database UUID.</p>
          </div>

          <form
            className="customer-id-form"
            onSubmit={event => {
              event.preventDefault();
              void findCustomerProduct();
            }}
          >
            <input
              value={customerHashQuery}
              onChange={event => setCustomerHashQuery(event.target.value)}
              placeholder="Example: PRD-000001 or product UUID"
              aria-label="Product Code or UUID"
            />
            <button type="submit" disabled={customerHashLoading}>
              {customerHashLoading ? "Searching..." : "Find product"}
            </button>
          </form>

          {customerHashMessage && (
            <p className="customer-id-message">{customerHashMessage}</p>
          )}

          {customerHashProduct && (
            <div className="customer-id-result">
              {customerHashProduct.image_url ? (
                <img src={customerHashProduct.image_url} alt={customerHashProduct.name} />
              ) : (
                <div className="customer-id-result-placeholder">
                  <ShoppingBag size={30}/>
                </div>
              )}
              <div className="customer-id-result-info">
                <strong>{customerHashProduct.name}</strong>
                <span>{customerHashProduct.category}</span>
                <small>Product ID: {customerHashProduct.product_code || "Not assigned"}</small>
                <strong>₹{Number(customerHashProduct.price).toLocaleString("en-IN")}</strong>
                <span>{customerHashProduct.stock > 0 ? `${customerHashProduct.stock} units available` : "Out of stock"}</span>
              </div>
              <button
                type="button"
                className="customer-id-add"
                disabled={customerHashProduct.stock <= 0}
                onClick={() => addToCart(customerHashProduct)}
              >
                <Plus size={15}/> Add to cart
              </button>
            </div>
          )}
        </section>
        <div className="shop-toolbar">
          <div className="shop-search">
            <Search size={18}/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products, categories..."
            />
          </div>

          {search.trim() && (
            <div className="adsa-suggestions">
              {adsaSearchLoading && (
                <span className="adsa-suggestion-status">Searching with Trie...</span>
              )}

              {!adsaSearchLoading && adsaSuggestions.map(product => (
                <button
                  type="button"
                  key={product.id}
                  className="adsa-suggestion-item"
                  onClick={() => {
                    setSearch(product.name);
                    setAdsaSuggestions([]);
                  }}
                >
                  <span>{product.name}</span>
                  <strong>₹{Number(product.price).toLocaleString("en-IN")}</strong>
                </button>
              ))}
            </div>
          )}

          <select value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(item => <option key={item}>{item}</option>)}
          </select>

          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>

        <div className="shop-price-filters">
          <SlidersHorizontal size={17}/>
          <span>Price range</span>
          <input
            type="number"
            min="0"
            placeholder="Min ₹"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
          />
          <input
            type="number"
            min="0"
            placeholder="Max ₹"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
          />
          <button onClick={clearFilters}>Clear filters</button>
          <span className="shop-result-count">{filteredProducts.length} products</span>
        </div>

        {error && (
          <div className="shop-error">
            <span>{error}</span>
            <button onClick={() => void loadProducts()}>Try again</button>
          </div>
        )}

        {loading ? (
          <div className="shop-state">
            <RefreshCw className="shop-spinner" size={28}/>
            <p>Finding good things for you...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="shop-state">
            <Package size={38}/>
            <h3>No products found</h3>
            <p>Try changing your search or filters.</p>
            <button className="shop-primary" onClick={clearFilters}>Clear filters</button>
          </div>
        ) : (
          <div className="shop-product-grid">
            {filteredProducts.map(product => {
              const quantity = cart[product.id]?.quantity || 0;

              return (
                <article className="shop-product-card" key={product.id}>
                  <div className="shop-product-image">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name}/>
                    ) : (
                      <div className="shop-image-placeholder">
                        <ShoppingBag size={42} strokeWidth={1}/>
                        <span>SHOP CORNER</span>
                      </div>
                    )}
                    <span className="shop-category-tag">{product.category}</span>
                    {product.stock <= 5 && product.stock > 0 && (
                      <span className="shop-stock-tag">Only {product.stock} left</span>
                    )}
                  </div>

                  <div className="shop-product-info">
                    <h3>{product.name}</h3>
                    {product.product_code && <small className="shop-product-code">ID: {product.product_code}</small>}
                    <p>{product.description || "A great find from Shop-Corner."}</p>

                    <div className="shop-product-bottom">
                      <strong>₹{Number(product.price).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</strong>

                      {product.stock <= 0 ? (
                        <span className="shop-out-of-stock">Out of stock</span>
                      ) : quantity > 0 ? (
                        <div className="shop-quantity">
                          <button onClick={() => changeQuantity(product.id, -1)}><Minus size={14}/></button>
                          <b>{quantity}</b>
                          <button
                            onClick={() => addToCart(product)}
                            disabled={quantity >= product.stock}
                          ><Plus size={14}/></button>
                        </div>
                      ) : (
                        <button className="shop-add-button" onClick={() => addToCart(product)}>
                          <Plus size={15}/> Add
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {confirmationId && (
        <div className="shop-cart-backdrop">
          <section className="shop-confirmation">
            <div className="shop-confirmation-icon">✓</div>
            <span className="shop-eyebrow">ORDER CONFIRMED</span>
            <h2>Your order is placed.</h2>
            <p>Your order has been saved successfully and inventory has been updated.</p>
            <div className="shop-order-reference">
              <span>ORDER REFERENCE</span>
              <strong>{confirmationId}</strong>
            </div>
            <button
              className="shop-primary"
              onClick={() => setConfirmationId("")}
            >
              Continue shopping
            </button>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="shop-cart-backdrop" onMouseDown={e => {
          if (e.target === e.currentTarget) setCartOpen(false);
        }}>
          <aside className="shop-cart-panel">
            <div className="shop-cart-heading">
              <div>
                <span className="shop-eyebrow">YOUR SELECTION</span>
                <h2>Your cart ({cartCount})</h2>
              </div>
              <button onClick={() => setCartOpen(false)}><X/></button>
            </div>

            {cartItems.length === 0 ? (
              <div className="shop-cart-empty">
                <ShoppingCart size={38}/>
                <h3>Your cart is waiting.</h3>
                <p>Add something you love from the collection.</p>
              </div>
            ) : (
              <>
                <div className="shop-cart-items">
                  {cartItems.map(item => (
                    <div className="shop-cart-item" key={item.product.id}>
                      <div>
                        <strong>{item.product.name}</strong>
                        <span>₹{Number(item.product.price).toLocaleString("en-IN")} each</span>
                        <div className="shop-quantity">
                          <button onClick={() => changeQuantity(item.product.id, -1)}><Minus size={13}/></button>
                          <b>{item.quantity}</b>
                          <button onClick={() => addToCart(item.product)}><Plus size={13}/></button>
                        </div>
                      </div>
                      <strong>₹{(Number(item.product.price) * item.quantity).toLocaleString("en-IN")}</strong>
                    </div>
                  ))}
                </div>
                <div className="shop-cart-total">
                  <span>Subtotal</span>
                  <strong>₹{cartTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                </div>
                {checkoutMessage && (
                  <div className="shop-error">{checkoutMessage}</div>
                )}
                <p className="shop-cart-note">
                  Your order will be placed after stock availability is confirmed.
                </p>
                <button
                  className="shop-primary shop-checkout-button"
                  onClick={() => void checkout()}
                  disabled={checkoutLoading || cartItems.length === 0}
                >
                  {checkoutLoading ? "Placing your order..." : "Confirm order"}
                </button>
              </>
            )}
            <button className="shop-primary shop-cart-close" onClick={() => setCartOpen(false)}>
              Continue shopping
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}





