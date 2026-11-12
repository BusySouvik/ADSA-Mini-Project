
# 🛍️ Shop-Corner

<h2 align="center">
  Smart Shopping & Inventory Management System Powered by Data Structures and Algorithms
</h2>

<p align="center">
A full-stack shop and inventory management system developed as an ADSA mini-project, combining modern web technologies with custom C++ implementations of fundamental data structures and algorithms.
</p>

<p align="center">
  <a href="https://www.trikstarevitrace.in/">
    <img src="https://img.shields.io/badge/_Live_Demo-Visit_Shop--Corner-D9541E?style=for-the-badge" alt="Live Demo">
  </a>
</p>

---

## Live Application

**[Visit Shop-Corner](https://www.trikstarevitrace.in/)**

Explore the platform through separate customer and shop owner experiences.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, HTTPX |
| Database and Authentication | Supabase PostgreSQL, Supabase Auth |
| ADSA Engine | C++17 |
| UI Libraries | React Router, Lucide React, Recharts |
| Deployment | Vercel, Render, Supabase |

---

## Main Features

### Customer

- Browse and search available products.
- Filter products by category and price range.
- Sort products by price, name, or newest.
- Add products to the cart and complete checkout.
- View personal order history and order details.
- Cancel eligible pending orders.
- Track order status.

### Shop Owner

- Add, edit, and delete inventory products.
- View inventory statistics and stock information.
- Monitor low-stock products.
- View and manage customer orders.
- Update order processing status.
- Cancel eligible orders with stock restoration.
- Create and process persistent restock requests.

---

## Data Structures and Algorithms

The C++ engine supports the following ADSA operations:

| Data Structure | Application | Purpose |
|---|---|---|
| **AVL Tree** | Price-range searching | Efficient ordered searching |
| **Hash Table** | Product lookup | Fast key-based retrieval |
| **Trie** | Product-name autocomplete | Prefix-based searching |
| **Min Heap** | Low-stock prioritization | Identify products with minimum stock |
| **FIFO Queue** | Restock request processing | Process requests in arrival order |

The FastAPI backend communicates with the C++ executable through standard input and output.

---

## System Architecture

Shop-Corner follows a layered architecture in which the frontend communicates with the FastAPI backend, while Supabase handles persistent data and authentication. The backend also integrates the custom C++ ADSA engine for algorithm-based operations.

```text
             CUSTOMER / SHOP OWNER
                      |
                      ▼
          REACT + TYPESCRIPT FRONTEND
                    Vercel
                      |
                      ▼
               FASTAPI BACKEND
                    Render
                  /        \
                 /          \
                ▼            ▼
          SUPABASE        C++17 ADSA
          PostgreSQL       ENGINE
          & Auth           |
                           ▼
                    Algorithm Processing
                    Search, Stock & Restock
```

### Application Workflow

1. Customers and shop owners interact with the React frontend.
2. Frontend requests are handled by the FastAPI backend.
3. Supabase manages database operations and authentication.
4. ADSA-related operations are forwarded to the C++ engine.
5. The C++ engine processes the requested operation and returns results through standard output.
6. The frontend displays the processed information.

---

## Data Structure Implementation

One of the primary objectives of Shop-Corner 2.0 is to demonstrate the practical application of data structures and algorithms in a real-world shopping and inventory management scenario.

### 1. AVL Tree – Price Range Searching

Maintains products in an ordered tree structure to support price-range queries efficiently.

### 2. Hash Table – Product Lookup

Uses hashing to locate products using their identifiers without requiring a sequential search through the entire inventory.

### 3. Trie – Product Autocomplete

Organizes product names by prefixes to support autocomplete and product-name suggestions.

### 4. Min Heap – Low-Stock Monitoring

Prioritizes products with lower stock quantities, helping shop owners identify inventory that may require restocking.

### 5. FIFO Queue – Restock Processing

Maintains restock requests in first-in, first-out order to ensure requests are processed according to their arrival sequence.

---

## Database and Authentication

Shop-Corner uses **Supabase PostgreSQL** as its persistent database and **Supabase Auth** for user authentication.

The backend coordinates application operations involving:

- Customer and shop owner accounts.
- Product and inventory information.
- Customer orders and order items.
- Restock requests.
- Order status and stock management.

Database operations are handled through the FastAPI backend and Supabase services.

---

## Deployment

The application is deployed using separate frontend and backend hosting platforms.

| Component | Platform | Technology |
|---|---|---|
| Frontend | Vercel | React + Vite |
| Backend | Render | FastAPI |
| Database | Supabase | PostgreSQL |
| Authentication | Supabase | Supabase Auth |

**Live Website:** [Shop-Corner](https://www.trikstarevitrace.in/)

---

## Security and Configuration

- Supabase is used for authentication and persistent application data.
- Backend endpoints handle application-level operations.
- Database access is governed by the configured Row Level Security policies.
- Environment variables are maintained separately for frontend and backend configuration.
- Secret keys and credentials must never be committed to the public repository.

---

## Project Objectives

Shop-Cornervaims to demonstrate how theoretical concepts from Advanced Data Structures and Algorithms can be integrated into a practical full-stack application.

The project focuses on:

- Applying data structures to real-world inventory problems.
- Integrating C++ algorithms with a Python-based backend.
- Building a role-based shopping and inventory management platform.
- Working with relational databases and authentication.
- Understanding frontend-backend communication and deployment.

---

## Future Enhancements

- Automated testing and expanded test coverage.
- Advanced sales analytics and reporting.
- Inventory demand forecasting.
- Improved performance through API optimization and caching.
- Enhanced product recommendation functionality.

---

## THE MINDS BEHIND SHOP-CORNER

### Three Minds. One Vision. Limitless Innovation.

Shop-Corner is built through collaboration, creativity, and a shared passion for technology. Every idea, every line of code, and every feature represents our collective effort.

### MEET THE TEAM

<table align="center">
  <tr>
    <td align="center" width="33%">
      <h2>👨‍💻</h2>
      <h3>SOUVIK</h3>
      <sub>Project Team Member</sub>
    </td>
    <td align="center" width="33%">
      <h2>👨‍💻</h2>
      <h3>ADITY</h3>
      <sub>Project Team Member</sub>
    </td>
    <td align="center" width="33%">
      <h2>👨‍💻</h2>
      <h3>JATIN</h3>
      <sub>Project Team Member</sub>
    </td>
  </tr>
</table>

<p align="center">
  <strong>ONE TEAM. ONE VISION. ONE POWERFUL BUILD.</strong>
  <br/>
  <em>Turning ideas into innovation, together.</em>
</p>

---

