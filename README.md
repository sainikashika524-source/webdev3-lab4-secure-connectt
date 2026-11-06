# Lab 3 — Inventory and Data Management System

REST API for a store/warehouse product catalogue. Node.js + Express + MongoDB (Mongoose) + dotenv only.

## Run

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run seed                # inserts 12 sample products in 5 categories
npm start                   # http://localhost:5000
```

MongoDB must be running locally (or put an Atlas URI in `MONGO_URI`).

## Project structure

```
config/db.js                  Mongoose connection
models/Product.js             Schema + field validation + stockValue virtual
controllers/productController CRUD, filtering/sorting/pagination, stock adjust, reports
routes/productRoutes.js       Route table (report routes before /:id)
middleware/validate.js        ObjectId check, body whitelist, stock-change check
middleware/errorHandler.js    404 + centralized error handler
utils/                        asyncHandler, ApiError
app.js / server.js            Express app / bootstrap
seed.js                       Sample data
```

## Endpoints

| Method | URL | Purpose |
|---|---|---|
| POST | `/api/products` | Create product (201) |
| GET | `/api/products` | List with filters, sorting, pagination |
| GET | `/api/products/:id` | Single product |
| PUT | `/api/products/:id` | Update details (validators run on update) |
| PATCH | `/api/products/:id/stock` | `{ "change": 10 }` restock / `{ "change": -3 }` sale |
| DELETE | `/api/products/:id` | Delete |
| GET | `/api/products/low-stock` | Items where `quantity <= reorderLevel` |
| GET | `/api/products/summary` | Category-wise aggregation report |

### Query params for `GET /api/products`

| Param | Example | Effect |
|---|---|---|
| `category` | `Electronics` or `Electronics,Apparel` | Exact category match |
| `search` | `pen` | Case-insensitive match on name or SKU |
| `supplier` | `ikea` | Case-insensitive partial match |
| `minPrice` / `maxPrice` | `1000` / `5000` | Price range |
| `minQty` / `maxQty` | `0` / `10` | Quantity range |
| `inStock` | `true` / `false` | Only in-stock / only out-of-stock |
| `sort` | `-price,name` | `-` = descending; fields are whitelisted |
| `page` / `limit` | `2` / `5` | Pagination (default 1 / 10, max limit 100) |

Response shape: `{ total, page, totalPages, count, products: [...] }`

## Postman test sequence

1. `GET /api/products` → `total: 12, page: 1, totalPages: 2, count: 10`
2. `POST /api/products` with
   `{ "name": "Gel Pen Pack of 15", "sku": "STNY-PN-713", "category": "Stationery", "price": 120, "quantity": 40, "reorderLevel": 20, "supplier": "Cello Pens" }` → 201, `stockValue: 4800`
3. `PUT /api/products/<id>` with `{ "price": 140, "quantity": 60 }` → `stockValue: 8400`
4. `GET /api/products/low-stock` → `count: 4`
5. `GET /api/products/summary` → `categories: 5`
6. `PATCH /api/products/<Study Table id>/stock` with `{ "change": 10 }` → quantity 2 → 12
7. `DELETE /api/products/<id>` → `{ "message": "Product deleted", "id": "..." }`

Try the error cases too: duplicate SKU (409), negative price / wrong category (400 with per-field details), invalid id (400), selling more than in stock (400), unknown route (404).

## Design notes

- **Validation:** required fields, min/max, category enum, integer quantity, SKU format + unique index, unknown body fields rejected.
- **Safe stock updates:** `PATCH /stock` uses a single atomic `findOneAndUpdate` with `$inc` and a `quantity >= needed` condition, so two simultaneous sales can never take stock below zero.
- **Aggregation:** `$group` by category → `totalItems`, `totalQuantity`, `totalStockValue` (`$multiply` price × qty), `avgPrice`, `lowStockCount`; sorted by stock value.
- **Errors:** every handler is wrapped by `asyncHandler`; `errorHandler` turns Mongoose `ValidationError`, `CastError`, duplicate key (11000) and malformed JSON into clean 4xx responses.
