- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-may-trang-thai-don-hang.md`
  summary: Integrate `transitionOrder` and `statusHistory` initialization into `orderService.placeOrder` and `orderService.cancelOrder` (`PATCH /api/orders/:id`) in Story 1.3.
  evidence: Confirmed via verification-gap review of `src/features/orders/order-service.ts:90-132` and `src/app/api/orders/[id]/route.ts:19-32`; intentionally excluded from Story 1.1 per Boundaries & `epics.md` (Story 1.3).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-xac-thuc-quan-tri-fail-closed.md`
  summary: Wire `assertAdminRequest` into `/api/admin/orders/**` Route Handlers (Stories 1.3, 2.1, 3.1) and implement `/admin/login` & `/admin/orders` UI (Epic 3) to verify full proxy-to-API integration.
  evidence: Confirmed via verification-gap review of `src/features/orders/admin-auth.ts:154-179` and `src/app/api/admin/`; `/api/admin/orders/**` and `/admin/*` pages belong to Stories 1.3, 2.1, 3.1, and 3.2 per `epics.md`.
