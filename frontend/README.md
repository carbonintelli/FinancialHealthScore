# Legacy static HTML frontend (deprecated)

The platform UI is now a **React + TypeScript SPA** in [`../client/`](../client/).

- **Development:** `npm run dev` from repo root (API on :8080, Vite on :5173 with API proxy)
- **Production:** `cd client && npm run build` — Express serves `client/dist` at `/app/`

This folder is retained as a fallback when the React build is not present.
