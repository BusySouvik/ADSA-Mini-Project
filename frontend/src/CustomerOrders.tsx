import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { Package, RefreshCw, ArrowLeft, ChevronRight } from "lucide-react";

type Order = {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
};

type OrderDetail = {
  order: Order;
  items: {
    id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
  }[];
};

export default function CustomerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      setOrders(await api.getOrders());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }

  async function openOrder(id: string) {
    setError("");
    try {
      setSelected(await api.getOrder(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load order details.");
    }
  }

  useEffect(() => { void loadOrders(); }, []);

  function statusClass(status: string) {
    return `order-status order-status-${status}`;
  }

  return (
    <section className="customer-orders">
      <div className="orders-heading">
        <div>
          <span className="shop-eyebrow">YOUR SHOPPING ACTIVITY</span>
          <h2>{selected ? "Order details" : "Your orders"}</h2>
          <p>Keep track of your purchases and order status.</p>
        </div>
        <button className="shop-refresh" onClick={() => {
          setSelected(null);
          void loadOrders();
        }}>
          <RefreshCw size={15}/> Refresh
        </button>
      </div>

      {error && <div className="shop-error">{error}</div>}

      {selected ? (
        <div className="order-detail-card">
          <button className="order-back" onClick={() => setSelected(null)}>
            <ArrowLeft size={15}/> Back to orders
          </button>
          <div className="order-detail-top">
            <div>
              <span>ORDER REFERENCE</span>
              <strong>{selected.order.id}</strong>
            </div>
            <span className={statusClass(selected.order.status)}>
              {selected.order.status}
            </span>
          </div>
          <p className="order-date">
            Placed {new Date(selected.order.created_at).toLocaleString("en-IN")}
          </p>
          <h3>Items purchased</h3>
          {selected.items.map(item => (
            <div className="order-line" key={item.id}>
              <div>
                <strong>{item.product_name}</strong>
                <span>₹{Number(item.unit_price).toLocaleString("en-IN")} × {item.quantity}</span>
              </div>
              <strong>₹{(Number(item.unit_price) * item.quantity).toLocaleString("en-IN")}</strong>
            </div>
          ))}
          <div className="order-total">
            <span>Order total</span>
            <strong>₹{Number(selected.order.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>
      ) : loading ? (
        <div className="shop-state"><RefreshCw className="shop-spinner"/><p>Loading your orders...</p></div>
      ) : orders.length === 0 ? (
        <div className="shop-state">
          <Package size={38}/>
          <h3>No orders yet</h3>
          <p>Your purchases will appear here after checkout.</p>
        </div>
      ) : (
        <div className="customer-order-list">
          {orders.map(order => (
            <button className="customer-order-card" key={order.id} onClick={() => void openOrder(order.id)}>
              <div className="customer-order-icon"><Package size={21}/></div>
              <div className="customer-order-info">
                <strong>Order #{order.id.slice(0, 8).toUpperCase()}</strong>
                <span>{new Date(order.created_at).toLocaleDateString("en-IN")}</span>
              </div>
              <div className="customer-order-total">
                <strong>₹{Number(order.total_amount).toLocaleString("en-IN")}</strong>
                <span className={statusClass(order.status)}>{order.status}</span>
              </div>
              <ChevronRight size={18}/>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
