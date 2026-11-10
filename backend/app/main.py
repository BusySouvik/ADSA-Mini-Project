from pathlib import Path
import subprocess
import os
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing Supabase configuration in backend/.env")

app = FastAPI(
    title="Shop-Corner 2.0 API",
    description="E-commerce and intelligent inventory management",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1)
    description: str = ""
    price: float = Field(gt=0)
    stock: int = Field(ge=0)
    image_url: Optional[str] = None



class RestockRequestCreate(BaseModel):
    product_id: UUID
    requested_quantity: int = Field(gt=0, le=1000000)
class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    stock: Optional[int] = Field(default=None, ge=0)
    image_url: Optional[str] = None


async def db_request(method, path, token=None, params=None, body=None, prefer=None):
    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
    }

    if prefer:
        headers["Prefer"] = prefer
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        headers["Authorization"] = f"Bearer {SUPABASE_KEY}"

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.request(
            method,
            f"{SUPABASE_URL}/rest/v1/{path}",
            headers=headers,
            params=params,
            json=body,
        )

    if response.status_code >= 400:
        print(
            f"SUPABASE ERROR | {method} {path} | "
            f"Status: {response.status_code} | "
            f"Response: {response.text}",
            flush=True
        )
        try:
            detail = response.json().get("message", response.text)
        except Exception:
            detail = response.text
        raise HTTPException(response.status_code, detail)

    if not response.content:
        return None

    return response.json()


async def authenticated_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Please log in first")

    token = authorization.split(" ", 1)[1]

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {token}",
            },
        )

    if response.status_code != 200:
        raise HTTPException(401, "Invalid or expired session")

    return {"user": response.json(), "token": token}


async def require_owner(auth=Depends(authenticated_user)):
    user_id = auth["user"]["id"]

    profiles = await db_request(
        "GET",
        "profiles",
        auth["token"],
        params={
            "id": f"eq.{user_id}",
            "select": "id,role",
        },
    )

    if not profiles or profiles[0]["role"] != "owner":
        raise HTTPException(403, "Approved owner access required")

    return auth


@app.get("/")
async def root():
    return {
        "project": "Shop-Corner 2.0",
        "status": "running",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "Shop-Corner API"}


@app.get("/api/me")
async def get_me(auth=Depends(authenticated_user)):
    user = auth["user"]
    profiles = await db_request(
        "GET",
        "profiles",
        auth["token"],
        params={
            "id": f"eq.{user['id']}",
            "select": "full_name,role,requested_role",
        },
    )

    return {
        "id": user["id"],
        "email": user.get("email"),
        "profile": profiles[0] if profiles else None,
    }


@app.get("/api/products")
async def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = Query(default=None, ge=0),
    max_price: Optional[float] = Query(default=None, ge=0),
    sort: str = "newest",
):
    params = {
        "select": "*",
        "order": "created_at.desc",
    }

    if search:
        params["name"] = f"ilike.*{search}*"
    if category:
        params["category"] = f"eq.{category}"
    if (
        min_price is not None
        and max_price is not None
        and min_price > max_price
    ):
        raise HTTPException(
            status_code=422,
            detail="min_price cannot be greater than max_price",
        )

    if min_price is not None and max_price is not None:
        params["and"] = (
            f"(price.gte.{min_price},price.lte.{max_price})"
        )
    elif min_price is not None:
        params["price"] = f"gte.{min_price}"
    elif max_price is not None:
        params["price"] = f"lte.{max_price}"

    if sort == "price_low":
        params["order"] = "price.asc"
    elif sort == "price_high":
        params["order"] = "price.desc"
    elif sort == "name":
        params["order"] = "name.asc"

    return await db_request("GET", "products", params=params)


@app.post("/api/products", status_code=201)
async def create_product(
    product: ProductCreate,
    auth=Depends(require_owner),
):
    return await db_request(
        "POST",
        "products",
        auth["token"],
        body={
            **product.model_dump(),
            "owner_id": auth["user"]["id"],
        },
    )


@app.patch("/api/products/{product_id}")
async def update_product(
    product_id: UUID,
    product: ProductUpdate,
    auth=Depends(require_owner),
):
    return await db_request(
        "PATCH",
        "products",
        auth["token"],
        params={
            "id": f"eq.{product_id}",
            "owner_id": f"eq.{auth['user']['id']}",
        },
        body=product.model_dump(exclude_unset=True),
    )


@app.delete("/api/products/{product_id}")
async def delete_product(
    product_id: UUID,
    auth=Depends(require_owner),
):
    await db_request(
        "DELETE",
        "products",
        auth["token"],
        params={
            "id": f"eq.{product_id}",
            "owner_id": f"eq.{auth['user']['id']}",
        },
    )
    return {"message": "Product deleted successfully"}


@app.get("/api/owner/summary")
async def owner_summary(auth=Depends(require_owner)):
    products = await db_request(
        "GET",
        "products",
        auth["token"],
        params={
            "owner_id": f"eq.{auth['user']['id']}",
            "select": "id,price,stock",
        },
    )

    return {
        "total_products": len(products),
        "available_stock": sum(int(p["stock"]) for p in products),
        "low_stock_items": sum(1 for p in products if int(p["stock"]) <= 5),
        "inventory_value": round(
            sum(float(p["price"]) * int(p["stock"]) for p in products), 2
        ),
    }


# ---------------- CUSTOMER ORDERS AND CHECKOUT ----------------

class CheckoutItem(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0, le=1000)


class CheckoutRequest(BaseModel):
    items: list[CheckoutItem] = Field(min_length=1, max_length=50)


async def require_customer(auth=Depends(authenticated_user)):
    user_id = auth["user"]["id"]

    profiles = await db_request(
        "GET",
        "profiles",
        auth["token"],
        params={
            "id": f"eq.{user_id}",
            "select": "id,role",
        },
    )

    if not profiles or profiles[0]["role"] != "customer":
        raise HTTPException(403, "Customer account required")

    return auth


@app.post("/api/orders/checkout", status_code=201)
async def checkout_order(
    checkout: CheckoutRequest,
    auth=Depends(require_customer),
):
    items = [
        {
            "product_id": str(item.product_id),
            "quantity": item.quantity,
        }
        for item in checkout.items
    ]

    # Supabase RPC calls the PostgreSQL transaction.
    result = await db_request(
        "POST",
        "rpc/checkout_order",
        auth["token"],
        body={"p_items": items},
    )

    if not result:
        raise HTTPException(500, "Checkout did not return an order ID")

    return {
        "message": "Order placed successfully",
        "order_id": str(result),
        "status": "pending",
    }


@app.get("/api/orders")
async def list_customer_orders(auth=Depends(require_customer)):
    customer_id = auth["user"]["id"]

    orders = await db_request(
        "GET",
        "orders",
        auth["token"],
        params={
            "customer_id": f"eq.{customer_id}",
            "select": "id,customer_id,total_amount,status,created_at",
            "order": "created_at.desc",
        },
    )

    return orders or []


@app.get("/api/orders/{order_id}")
async def get_customer_order(
    order_id: UUID,
    auth=Depends(require_customer),
):
    customer_id = auth["user"]["id"]

    orders = await db_request(
        "GET",
        "orders",
        auth["token"],
        params={
            "id": f"eq.{order_id}",
            "customer_id": f"eq.{customer_id}",
            "select": "id,customer_id,total_amount,status,created_at",
        },
    )

    if not orders:
        raise HTTPException(404, "Order not found")

    order = orders[0]

    items = await db_request(
        "GET",
        "order_items",
        auth["token"],
        params={
            "order_id": f"eq.{order_id}",
            "select": "id,product_id,product_name,unit_price,quantity",
        },
    )

    return {
        "order": order,
        "items": items or [],
    }


# ---------------- OWNER ORDER MANAGEMENT ----------------

@app.get("/api/owner/orders")
async def owner_orders(auth=Depends(require_owner)):
    return await db_request(
        "GET",
        "orders",
        auth["token"],
        params={
            "select": "id,customer_id,total_amount,status,created_at,order_items!inner(id,product_id,product_name,unit_price,quantity,products!inner(owner_id))",
            "order": "created_at.desc",
            "order_items.products.owner_id": f"eq.{auth['user']['id']}",
        },
    )


class OrderStatusUpdate(BaseModel):
    status: str = Field(
        pattern="^(confirmed|processing|shipped|delivered|cancelled)$"
    )


@app.patch("/api/owner/orders/{order_id}")
async def update_order_status(
    order_id: UUID,
    update: OrderStatusUpdate,
    auth=Depends(require_owner),
):
    # Confirm this order contains a product owned by this owner.
    items = await db_request(
        "GET",
        "order_items",
        auth["token"],
        params={
            "select": "id,product_id,products!inner(owner_id)",
            "order_id": f"eq.{order_id}",
            "products.owner_id": f"eq.{auth['user']['id']}",
        },
    )

    if not items:
        raise HTTPException(404, "Order not found for this store")

    result = await db_request(
        "PATCH",
        "orders",
        auth["token"],
        params={"id": f"eq.{order_id}"},
        body={"status": update.status},
    )

    return {"message": "Order status updated", "status": update.status}


# SHOP_CORNER_ADSA_BRIDGE

ADSA_EXECUTABLE = (
    Path(__file__).resolve().parents[2]
    / "cpp_engine" / "build" / "shop_corner_adsa.exe"
)

async def run_adsa_engine(mode: str, arg1: str = "", arg2: str = ""):
    if not ADSA_EXECUTABLE.exists():
        raise HTTPException(status_code=500, detail="ADSA executable not found.")

    products = await db_request(
        "GET",
        "products",
        params={"select": "id,product_code,name,price,stock"}
    )

    if not isinstance(products, list):
        raise HTTPException(status_code=502, detail="Could not retrieve products.")

    lines = [f"{mode}|{arg1}|{arg2}"]

    for product in products:
        name = str(product.get("name") or "").replace("|", " ")
        product_id = str(product.get("id") or "")
        product_code = str(product.get("product_code") or "")
        price = str(product.get("price") or 0)
        stock = str(product.get("stock") or 0)

        if product_id:
            lines.append(
                f"{product_id}|{product_code}|{name}|{price}|{stock}"
            )

    try:
        result = subprocess.run(
            [str(ADSA_EXECUTABLE)],
            input="\n".join(lines) + "\n",
            capture_output=True,
            text=True,
            timeout=10
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="ADSA engine timed out.")

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail="ADSA engine failed: " + result.stderr[:500]
        )

    ids = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return ids



async def run_fifo_engine(request_ids: list[str]) -> list[str]:
    """Process request IDs using the C++ FIFO queue."""
    if not request_ids:
        return []

    engine_path = (
        Path(__file__).resolve().parents[2]
        / "cpp_engine"
        / "build"
        / "shop_corner_adsa.exe"
    )

    if not engine_path.exists():
        raise HTTPException(
            status_code=500,
            detail="C++ ADSA engine executable was not found."
        )

    input_data = "fifo_ids\n" + "\n".join(request_ids) + "\n"

    try:
        result = subprocess.run(
            [str(engine_path)],
            input=input_data,
            capture_output=True,
            text=True,
            timeout=10,
            check=True
        )
    except subprocess.CalledProcessError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"C++ FIFO processing failed: {exc.stderr}"
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=500,
            detail="C++ FIFO processing timed out."
        )

    return [
        line.strip()
        for line in result.stdout.splitlines()
        if line.strip()
    ]


@app.get("/api/owner/restock-requests")
async def get_restock_requests(auth=Depends(require_owner)):
    rows = await db_request(
        "GET",
        "/restock_requests",
        token=auth["token"],
        params={
            "select": "*,product:products(id,product_code,name,stock)",
            "owner_id": f"eq.{auth['user']['id']}",
            "status": "eq.pending",
            "order": "created_at.asc,id.asc"
        }
    )

    return {"requests": rows or []}


@app.post("/api/owner/restock-requests")
async def create_restock_request(
    payload: RestockRequestCreate,
    auth=Depends(require_owner)
):
    products = await db_request(
        "GET",
        "/products",
        token=auth["token"],
        params={
            "select": "id,owner_id",
            "id": f"eq.{payload.product_id}",
            "owner_id": f"eq.{auth['user']['id']}",
            "limit": "1"
        }
    )

    if not products:
        raise HTTPException(
            status_code=404,
            detail="Product not found in your inventory."
        )

    rows = await db_request(
        "POST",
        "/restock_requests",
        token=auth["token"],
        body={
            "owner_id": auth["user"]["id"],
            "product_id": str(payload.product_id),
            "requested_quantity": payload.requested_quantity,
            "status": "pending"
        },
        prefer="return=representation"
    )

    if not rows:
        raise HTTPException(
            status_code=500,
            detail="Could not create restock request."
        )

    return {"request": rows[0]}


@app.post("/api/owner/restock-requests/process-next")
async def process_next_restock_request(auth=Depends(require_owner)):
    pending = await db_request(
        "GET",
        "/restock_requests",
        token=auth["token"],
        params={
            "select": "*",
            "owner_id": f"eq.{auth['user']['id']}",
            "status": "eq.pending",
            "order": "created_at.asc,id.asc",
            "limit": "100"
        }
    )

    if not pending:
        return {
            "processed": None,
            "message": "No pending restock requests."
        }

    ordered_ids = await run_fifo_engine([
        str(request["id"]) for request in pending
    ])

    if not ordered_ids:
        return {
            "processed": None,
            "message": "No pending restock requests."
        }

    next_id = ordered_ids[0]

    result = await db_request(
        "POST",
        "/rpc/process_restock_request",
        token=auth["token"],
        body={"p_request_id": next_id}
    )

    return {
        "processed": result.get("processed"),
        "new_stock": result.get("new_stock"),
        "message": result.get(
            "message",
            "Restock completed and inventory updated."
        )
    }

@app.get("/api/adsa/autocomplete")
async def adsa_autocomplete(q: str = ""):
    if not q.strip():
        return {"operation": "trie_autocomplete", "results": []}

    ids = await run_adsa_engine("autocomplete", q.strip().lower())
    return {"operation": "trie_autocomplete", "results": ids}


@app.get("/api/adsa/price-range")
async def adsa_price_range(min_price: float = 0, max_price: float = 100000000):
    if min_price < 0 or max_price < min_price:
        raise HTTPException(status_code=400, detail="Invalid price range.")

    ids = await run_adsa_engine(
        "price_range", str(min_price), str(max_price)
    )
    return {"operation": "avl_price_range", "results": ids}


@app.get("/api/adsa/lookup/{product_id}")
async def adsa_product_lookup(product_id: str):
    ids = await run_adsa_engine("lookup", product_id)
    matched_id = ids[0] if ids else None

    if not matched_id:
        return {
            "operation": "hash_table_lookup",
            "found": False,
            "product_id": None,
            "product": None
        }

    products = await db_request(
        "GET",
        "products",
        params={
            "select": "id,product_code,name,description,category,price,stock,image_url",
            "id": f"eq.{matched_id}"
        }
    )

    if not isinstance(products, list) or not products:
        raise HTTPException(
            status_code=502,
            detail="Hash Table matched a product but its record could not be retrieved."
        )

    return {
        "operation": "hash_table_lookup",
        "found": True,
        "product_id": matched_id,
        "product": products[0]
    }


@app.get("/api/adsa/low-stock")
async def adsa_low_stock(threshold: int = 5):
    if threshold < 0:
        raise HTTPException(status_code=400, detail="Threshold cannot be negative.")

    ids = await run_adsa_engine("low_stock", str(threshold))
    return {"operation": "min_heap_low_stock", "results": ids}


@app.get("/api/adsa/restock-queue")
async def adsa_restock_queue(threshold: int = 5):
    if threshold < 0:
        raise HTTPException(status_code=400, detail="Threshold cannot be negative.")

    ids = await run_adsa_engine("restock_queue", str(threshold))
    return {"operation": "fifo_restock_queue", "results": ids}

@app.get("/api/owner/adsa/snapshot")
async def get_owner_adsa_snapshot(auth=Depends(require_owner)):
    """Return real C++ structure snapshots for the authenticated owner's data."""
    owner_id = auth["user"]["id"]
    products = await db_request(
        "GET",
        "products",
        token=auth["token"],
        params={
            "select": "id,product_code,name,price,stock",
            "owner_id": f"eq.{owner_id}",
            "order": "created_at.asc,id.asc",
        },
    )
    if not isinstance(products, list):
        raise HTTPException(status_code=502, detail="Could not retrieve owner inventory.")

    pending = await db_request(
        "GET",
        "restock_requests",
        token=auth["token"],
        params={
            "select": "id",
            "owner_id": f"eq.{owner_id}",
            "status": "eq.pending",
            "order": "created_at.asc,id.asc",
            "limit": "500",
        },
    )
    if not isinstance(pending, list):
        raise HTTPException(status_code=502, detail="Could not retrieve pending restock requests.")

    if not ADSA_EXECUTABLE.exists():
        raise HTTPException(status_code=500, detail="ADSA executable not found. Build the C++ engine first.")

    lines = ["visualize"]
    for product in products:
        name = str(product.get("name") or "").replace("|", " ").replace("\\n", " ")
        product_id = str(product.get("id") or "")
        product_code = str(product.get("product_code") or "").replace("|", " ")
        price = str(product.get("price") or 0)
        stock = str(product.get("stock") or 0)
        if product_id:
            lines.append(f"{product_id}|{product_code}|{name}|{price}|{stock}")
    for request in pending:
        request_id = str(request.get("id") or "")
        if request_id:
            lines.append(f"Q|{request_id}")

    try:
        result = subprocess.run(
            [str(ADSA_EXECUTABLE)],
            input="\n".join(lines) + "\n",
            capture_output=True,
            text=True,
            timeout=15,
            env={
                **os.environ,
                "PATH": os.pathsep.join([
                    r"C:\msys64\ucrt64\bin",
                    r"C:\msys64\usr\bin",
                    os.environ.get("PATH", ""),
                ]),
            },
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="ADSA snapshot generation timed out.")

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail="ADSA snapshot failed: " + result.stderr[:500],
        )

    import json
    try:
        snapshot = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="C++ ADSA engine returned invalid snapshot data.")

    return {
        "snapshot": snapshot,
        "products": products,
        "pendingRestockCount": len(pending),
        "source": "C++ engine structures built from this owner's inventory and pending restock requests",
    }

