# Express file structure reference

This file describes `aurellano-server` from the web programming long exam. Use it as the pattern for this financial tracker API.

The exam app is a shop (users, categories, products, suppliers, carts, orders, reviews). Do not copy those shop features into the tracker. Copy the Express shape: CommonJS, one `index.js`, config split, route files that export a router, controllers that talk to models, and middleware for auth and validation.

## Stack shape

- CommonJS: `require` and `module.exports`.
- Entry: `index.js` creates the app, mounts routes, and starts the server.
- Config: `config/config.js` reads `.env`. `config/constants.js` holds `HttpStatus`.
- Database: `config/db.js` exports `connectDB()`.
- Auth: JWT in `Authorization: Bearer <token>`. Login returns `{ message, token, user }`.
- Validation: `express-validator` chains in `middleware/validationMiddleware.js`.
- Controllers use `try/catch` and `res.status(HttpStatus.X).json(...)`.
- Passwords are hashed in the model `pre("save")` hook. The field is `password`.

## Folder tree

```text
aurellano-server/
├── index.js
├── package.json
├── seed.js
├── seedSuppliers.js
├── config/
│   ├── config.js
│   ├── constants.js
│   ├── db.js
│   └── cloudinary.js
├── routes/
│   ├── userRoutes.js
│   ├── categoryRoutes.js
│   ├── productRoutes.js
│   ├── supplierRoutes.js
│   ├── cartRoutes.js
│   ├── ordersRoutes.js
│   └── reviewsRoutes.js
├── controllers/
│   ├── userController.js
│   ├── categoryController.js
│   ├── productController.js
│   ├── supplierController.js
│   ├── cartController.js
│   ├── ordersController.js
│   └── reviewsController.js
├── models/
│   ├── userModel.js
│   ├── categoryModel.js
│   ├── productModel.js
│   ├── supplierModel.js
│   ├── cartModel.js
│   ├── orderModel.js
│   ├── reviewModel.js
│   └── logModel.js
├── middleware/
│   ├── authMiddleware.js
│   ├── validationMiddleware.js
│   ├── rateLimiterMiddleware.js
│   ├── tokenBlacklist.js
│   ├── loginLockoutMiddleware.js
│   ├── auditLoggerMiddleware.js
│   └── uploadImageMiddleware.js
└── utils/
    ├── jwt.js
    ├── pagination.js
    ├── listSort.js
    ├── loginLockout.js
    ├── cloudinaryUpload.js
    ├── orderItems.js
    └── stock.js
```

## What each file does

| Path | Purpose |
|---|---|
| `index.js` | Helmet, CORS, JSON body parser, route mounts, error handler, `connectDB()`, `app.listen` |
| `config/config.js` | `MONGO_DB_URL`, `PORT`, `SALT`, `SECRET_KEY`, `JWT_EXPIRES_IN`, Cloudinary keys |
| `config/constants.js` | `HttpStatus` names for 200, 201, 400, 401, 403, 404, 500 |
| `config/db.js` | Connects Mongoose and exits the process if MongoDB fails |
| `config/cloudinary.js` | Cloudinary client for product images |
| `routes/*.js` | Declares paths, attaches middleware, points at a controller. Exports the router |
| `controllers/*.js` | Reads the request, calls the model, sends the JSON response |
| `models/*.js` | Mongoose schemas. `userModel.js` hashes `password` and has `comparePassword` |
| `middleware/authMiddleware.js` | `protect` reads the Bearer token. `authorize(...)` checks `userRole`. `forbidIfNotOwner` blocks another user's record |
| `middleware/validationMiddleware.js` | `express-validator` rules and a shared `handleValidation` response |
| `middleware/rateLimiterMiddleware.js` | Limits login, register, and write requests |
| `middleware/tokenBlacklist.js` | In-memory set of logged-out tokens |
| `middleware/loginLockoutMiddleware.js` | Blocks an email after repeated failed logins |
| `middleware/auditLoggerMiddleware.js` | Writes a request log document |
| `middleware/uploadImageMiddleware.js` | Multer image upload for products |
| `utils/jwt.js` | `generateToken` and `verifyToken` |
| `utils/pagination.js` | Page, limit, and paginated JSON |
| `utils/listSort.js` | Sort options for list endpoints |
| `seed.js`, `seedSuppliers.js` | Sample data scripts |

## Request flow

```text
HTTP request
    |
    v
index.js
    helmet, cors, express.json, audit logger
    |
    v
routes/<resource>Routes.js
    rate limiter, protect, authorize, express-validator
    |
    v
controllers/<resource>Controller.js
    try/catch
    |
    v
models/<resource>Model.js
    |
    v
res.status(HttpStatus).json(...)
```

`index.js` mounts routers on plural bases:

```text
GET  /
app.use("/api/users", userRoutes)
app.use("/api/categories", categoryRoutes)
app.use("/api/suppliers", supplierRoutes)
app.use("/api/products", productRoutes)
app.use("/api/carts", cartRoutes)
app.use("/api/orders", ordersRoutes)
app.use("/api/reviews", reviewsRoutes)
```

A failing CORS check or an unhandled error is answered by the error function at the bottom of `index.js`.

Protected routes expect:

```text
Authorization: Bearer <token>
```

`protect` rejects a missing token, a blacklisted token, an invalid token, a missing user, and an inactive user. `authorize("Admin")` rejects any other role with 403.

## Routes

### Users — `/api/users`

| Method | Path | Access |
|---|---|---|
| POST | `/login` | Public, login rate limit |
| POST | `/register` | Public, register rate limit |
| POST | `/logout` | Logged in |
| GET | `/session` | Logged in |
| GET | `/getAllUsers` | Admin |
| POST | `/adminCreate` | Admin |
| GET | `/get/:id` | Logged in, owner or Admin |
| PUT | `/update/:id` | Logged in, owner or Admin |
| DELETE | `/delete/:id` | Admin |

### Categories — `/api/categories`

| Method | Path | Access |
|---|---|---|
| GET | `/getAllCategories` | Public |
| GET | `/get/:id` | Public |
| POST | `/create` | Admin |
| PUT | `/update/:id` | Admin |
| DELETE | `/delete/:id` | Admin |

### Suppliers — `/api/suppliers`

| Method | Path | Access |
|---|---|---|
| GET | `/getAllSuppliers` | Public |
| GET | `/get/:id` | Public |
| POST | `/create` | Admin |
| PUT | `/update/:id` | Admin or supplier |
| DELETE | `/delete/:id` | Admin |

### Products — `/api/products`

| Method | Path | Access |
|---|---|---|
| GET | `/getAllProducts` | Public |
| GET | `/get/slug/:slug` | Public |
| GET | `/get/:id` | Public |
| POST | `/create` | Admin or supplier, image upload |
| PUT | `/update/:id` | Admin or supplier, image upload |
| DELETE | `/delete/:id` | Admin or supplier |
| GET | `/v1` | Public alias of the list |
| GET | `/v1/slug/:slug` | Public |
| GET | `/v1/:id` | Public |
| GET | `/supplier/v1` | Supplier |
| POST | `/v1` | Admin or supplier |
| PUT | `/v1/:id` | Admin or supplier |
| DELETE | `/v1/:id` | Admin or supplier |
| POST | `/:id/upload-image` | Admin or supplier |

### Carts — `/api/carts`

Every cart route requires a logged-in customer or Admin.

| Method | Path |
|---|---|
| GET | `/getAllCarts` |
| GET | `/get/:id` |
| POST | `/create` |
| PUT | `/update/:id` |
| DELETE | `/delete/:id` |

### Orders — `/api/orders`

| Method | Path | Access |
|---|---|---|
| GET | `/getAllOrders` | Customer, Admin, or supplier |
| GET | `/get/:id` | Customer, Admin, or supplier |
| POST | `/create` | Customer or Admin |
| PUT | `/update/:id` | Customer, Admin, or supplier |
| DELETE | `/delete/:id` | Admin |

### Reviews — `/api/reviews`

| Method | Path | Access |
|---|---|---|
| GET | `/getAllReviews` | Public |
| GET | `/supplier/getAllReviews` | Supplier |
| GET | `/customer/getReviewable` | Customer or Admin |
| GET | `/get/:id` | Public |
| POST | `/create` | Customer or Admin |
| PUT | `/update/:id` | Customer or Admin |
| DELETE | `/delete/:id` | Customer or Admin |

## How to mirror this in the tracker

Add a resource by copying this chain, not by putting logic in `index.js`:

1. `models/<name>Model.js`
2. `controllers/<name>Controller.js`
3. `routes/<name>Routes.js` that exports the router
4. `app.use("/api/<plural>", <name>Routes)` in `index.js`
5. Validation rules in `middleware/validationMiddleware.js` when the body needs checks

Use `HttpStatus` from `config/constants.js`. Use `protect` and `authorize` on anything that is not public. Keep financial rules in the controller that owns that model, the same way the exam keeps order and stock rules next to those controllers.
