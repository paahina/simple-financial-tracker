# React file structure reference

This file describes `aurellano-client` from the web programming long exam. Use it as the pattern for this financial tracker React app.

The exam app is a shop (products, cart, orders, reviews, admin, supplier). Do not copy those shop screens into the tracker. Copy the React shape: Vite, React Router, one `services/api.js`, context for the signed-in user, layouts per role, and pages grouped by area.

## Stack shape

- React with Vite and JavaScript.
- Entry: `src/main.jsx` mounts `src/App.jsx`.
- Routing: `createBrowserRouter` in `App.jsx`. Layouts render child pages through `<Outlet />`.
- HTTP: one module, `src/services/api.js`. It uses `fetch` and sends `Authorization: Bearer <token>`.
- Auth state: `src/context/AuthContext.jsx` stores the token and user in `localStorage` or `sessionStorage`.
- Feedback: `ToastContext` plus a `Toast` component.
- Styling: Tailwind classes. Global CSS is `src/assets/styles/index.css`.

## Folder tree

```text
aurellano-client/
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
├── public/
│   └── assets/
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── assets/
    │   ├── img/
    │   └── styles/
    ├── components/
    │   ├── Admin/
    │   ├── Customer/
    │   ├── Button.jsx
    │   ├── ConfirmDialog.jsx
    │   ├── CustomerNavBar.jsx
    │   ├── Footer.jsx
    │   ├── GuestRoute.jsx
    │   ├── NavBar.jsx
    │   ├── ProductCard.jsx
    │   ├── ProductImage.jsx
    │   ├── ProductList.jsx
    │   ├── ProtectedRoute.jsx
    │   └── Toast.jsx
    ├── context/
    │   ├── AuthContext.jsx
    │   └── ToastContext.jsx
    ├── hooks/
    │   └── useAdminTableQuery.js
    ├── layouts/
    │   ├── Layout.jsx
    │   ├── AuthLayout.jsx
    │   ├── CustomerLayout.jsx
    │   ├── AdminLayout.jsx
    │   └── SupplierLayout.jsx
    ├── pages/
    │   ├── LandingPages/
    │   ├── AuthPages/
    │   ├── CustomerPages/
    │   ├── AccountPages/
    │   ├── AdminPages/
    │   └── NotFoundPage.jsx
    ├── services/
    │   └── api.js
    └── utils/
        ├── format.js
        └── stock.js
```

## What each folder does

| Path | Purpose |
|---|---|
| `src/main.jsx` | Creates the React root and imports global CSS |
| `src/App.jsx` | Defines every route, wraps the app in `AuthProvider` and `ToastProvider` |
| `src/assets/` | Images and global styles |
| `src/components/` | Shared UI used by more than one page |
| `src/components/Admin/` | Admin table pieces: modal, toolbar, pagination, skeleton, status chips |
| `src/components/Customer/` | Shop cards, empty states, list skeletons, cart and order cards |
| `src/components/ProtectedRoute.jsx` | Sends guests to `/auth/signin`. Sends a signed-in user to their own area when the role does not match |
| `src/components/GuestRoute.jsx` | Keeps a signed-in user out of sign-in and sign-up |
| `src/context/AuthContext.jsx` | Login, signup, logout, session restore, and the current user |
| `src/context/ToastContext.jsx` | Short success and error messages |
| `src/hooks/useAdminTableQuery.js` | Reads and writes `search`, `sort`, and `page` in the URL |
| `src/layouts/Layout.jsx` | Public shell: navbar, page, footer |
| `src/layouts/AuthLayout.jsx` | Sign-in and sign-up shell |
| `src/layouts/CustomerLayout.jsx` | Signed-in customer shell |
| `src/layouts/AdminLayout.jsx` | Admin shell |
| `src/layouts/SupplierLayout.jsx` | Supplier shell. Reuses several admin pages |
| `src/pages/LandingPages/` | Public marketing and product pages |
| `src/pages/AuthPages/` | Sign in and sign up |
| `src/pages/CustomerPages/` | Shop list and product detail |
| `src/pages/AccountPages/` | Cart, orders, reviews, and profile |
| `src/pages/AdminPages/` | Overview, products, orders, reviews, and users |
| `src/pages/NotFoundPage.jsx` | Unknown route and router error page |
| `src/services/api.js` | Every API call. Pages do not call `fetch` themselves |
| `src/utils/format.js` | Ids, peso formatting, dates, average rating |
| `src/utils/stock.js` | Stock status labels for products |

## How a screen is built

```text
main.jsx
    |
    v
App.jsx
    AuthProvider
    ToastProvider
    RouterProvider
    |
    v
GuestRoute or ProtectedRoute
    |
    v
Layout (public, auth, customer, admin, or supplier)
    |
    v
Page in src/pages/<Area>/
    |
    +--> useAuth() for the token and user
    +--> functions in services/api.js
    +--> shared components
```

`ProtectedRoute` checks `user.userRole`:

- No user: redirect to `/auth/signin`.
- `Admin` on a customer route: redirect to `/admin`.
- `supplier` on a customer route: redirect to `/supplier`.
- `customer` on an admin route: redirect to `/shop`.

`GuestRoute` sends an already signed-in user to `/admin`, `/supplier`, or `/shop`.

`services/api.js` groups calls by resource: users, products, categories, reviews, carts, orders, and suppliers. JSON calls go through `apiRequest`. Image uploads go through `apiFormRequest`.

## Routes

Defined in `src/App.jsx`.

### Public — `Layout`

| Path | Page |
|---|---|
| `/` | `LandingPages/HomePage` |
| `/about` | `LandingPages/AboutPage` |
| `/products` | `LandingPages/ProductListPage` |
| `/products/:name` | `LandingPages/ProductPage` |

### Guest only — `GuestRoute` and `AuthLayout`

| Path | Page |
|---|---|
| `/auth/signin` | `AuthPages/SignInPage` |
| `/auth/signup` | `AuthPages/SignUpPage` |

### Customer — `ProtectedRoute` role `customer` and `CustomerLayout`

| Path | Page |
|---|---|
| `/shop` | `CustomerPages/ProductsPage` |
| `/shop/:slug` | `CustomerPages/ProductDetailPage` |
| `/account` | Redirects to `/account/cart` |
| `/account/cart` | `AccountPages/CartPage` |
| `/account/orders` | `AccountPages/OrdersPage` |
| `/account/reviews` | `AccountPages/ReviewPage` |
| `/profile` | `AccountPages/ProfilePage` |

`AccountActivityPage` is the parent shell for `/account` and its child pages.

### Admin — `ProtectedRoute` role `Admin` and `AdminLayout`

| Path | Page |
|---|---|
| `/admin` | `AdminPages/OverviewPage` |
| `/admin/products` | `AdminPages/ProductsPage` |
| `/admin/orders` | `AdminPages/OrdersPage` |
| `/admin/reviews` | `AdminPages/ReviewsPage` |
| `/admin/users` | `AdminPages/UsersPage` |

### Supplier — `ProtectedRoute` role `supplier` and `SupplierLayout`

| Path | Page |
|---|---|
| `/supplier` | `AdminPages/OverviewPage` |
| `/supplier/products` | `AdminPages/ProductsPage` |
| `/supplier/orders` | `AdminPages/OrdersPage` |
| `/supplier/reviews` | `AdminPages/ReviewsPage` |
| `/supplier/profile` | `AccountPages/ProfilePage` |

Unknown paths render `NotFoundPage`.
