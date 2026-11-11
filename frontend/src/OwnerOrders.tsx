import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { ClipboardList, RefreshCw } from "lucide-react";

type OwnerOrder = {
  id: string;
  customer_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items?: {
    id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
  }[];
};

const statuses = ["confirmed", "processing", "shipped", "delivered"];

export default function OwnerOrders() {
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      setOrders(await api.getOwnerOrders());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setSavingId(id);
    setError("");
    try {
      await api.updateOrderStatus(id, status);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order.");
    } finally {
      setSavingId("");
    }
  }

  async function cancelOwnerOrder(id: string) {
    if (!window.confirm("Cancel this order and restore its product stock?")) {
      return;
    }

    setSavingId(id);
    setError("");

    try {
      await api.cancelOwnerOrder(id);

      setOrders(prev => prev.map(order =>
        order.id === id
          ? { ...order, status: "cancelled" }
          : order
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel order.");
    } finally {
      setSavingId("");
    }
  }

  useEffect(() => { void loadOrders(); }, []);

  return (
    <section className="owner-orders-section">
      <div className="inventory-heading">
        <div>
          <span className="owner-eyebrow">STORE OPERATIONS</span>
          <h2>Customer orders</h2>
          <p>Review purchases and update fulfilment status.</p>
        </div>
        <button className="owner-refresh" onClick={() => void loadOrders()}>
          <RefreshCw size={16}/> Refresh
        </button>
      </div>

      {error && <div className="owner-message">{error}</div>}

      {loading ? (
        <div className="inventory-empty">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="inventory-empty">
          <ClipboardList size={32}/>
          <strong>No orders received yet</strong>
          <span>Customer orders will appear here.</span>
        </div>
      ) : (
        <div className="owner-order-list">
          {orders.map(order => (
            <article className="owner-order-card" key={order.id}>
              <div className="owner-order-top">
                <div>
                  <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                  <span>{new Date(order.created_at).toLocaleString("en-IN")}</span>
                </div>
                <strong>₹{Number(order.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </div>

              <div className="owner-order-items">
                {(order.order_items || []).map(item => (
                  <div key={item.id}>
                    <span>{item.product_name} × {item.quantity}</span>
                    <strong>₹{(Number(item.unit_price) * item.quantity).toLocaleString("en-IN")}</strong>
                  </div>
                ))}
              </div>

              <div className="owner-order-footer">
                <span>Customer: {order.customer_id.slice(0, 8)}...</span>
                <select
                  value={order.status}
                  disabled={savingId === order.id || order.status === "cancelled"}
                  onChange={e => void updateStatus(order.id, e.target.value)}
                >
                  {["pending", ...statuses, "cancelled"].map(status => (
                    <option key={status} value={status} disabled={status === "cancelled"}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>

                {["pending", "confirmed", "processing"].includes(order.status) && (
                  <button
                    className="order-cancel-button"
                    disabled={savingId === order.id}
                    onClick={() => void cancelOwnerOrder(order.id)}
                  >
                    {savingId === order.id ? "Cancelling..." : "Cancel order"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
