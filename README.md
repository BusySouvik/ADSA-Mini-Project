# Shop-Corner

A full-stack shop and inventory management system developed as an ADSA mini-project. It supports customers and shop owners, with data structures and algorithms implemented in C++ and integrated through a FastAPI backend.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, HTTPX |
| Database and Authentication | Supabase PostgreSQL, Supabase Auth |
| ADSA Engine | C++17 |
| UI Libraries | React Router, Lucide React, Recharts |

## Main Features

### Customer
- Browse and search available products.
- Filter products by category and price range.
- Sort products by price, name, or newest.
- Add products to the cart and complete checkout.
- View personal order history and order details.

### Shop Owner
- Add, edit, and delete inventory products.
- View inventory statistics and stock information.
- Monitor low-stock products.
- View and manage customer orders.
- Create and process persistent restock requests.

### Data Structures and Algorithms
The C++ engine supports the following ADSA operations:

- **AVL Tree:** Price-range searching.
- **Hash Table:** Product lookup.
- **Trie:** Product-name autocomplete.
- **Min Heap:** Low-stock product prioritization.
- **FIFO Queue:** Restock request processing.

The FastAPI backend communicates with the C++ executable through standard input and output.
