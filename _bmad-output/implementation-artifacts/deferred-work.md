- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-may-trang-thai-don-hang.md`
  summary: Integrate `transitionOrder` and `statusHistory` initialization into `orderService.placeOrder` and `orderService.cancelOrder` (`PATCH /api/orders/:id`) in Story 1.3.
  evidence: Confirmed via verification-gap review of `src/features/orders/order-service.ts:90-132` and `src/app/api/orders/[id]/route.ts:19-32`; intentionally excluded from Story 1.1 per Boundaries & `epics.md` (Story 1.3).
