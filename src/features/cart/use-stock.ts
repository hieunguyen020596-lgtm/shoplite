"use client";

import { useEffect, useState } from "react";

const MAX_IDS = 50;

/**
 * Lấy Tồn kho thật cho các sản phẩm trong giỏ từ GET /api/inventory.
 * Trả null khi chưa tải xong hoặc tải lỗi: người dùng giới hạn 10 và server kiểm lần cuối.
 */
export function useStock(productIds: string[]): Record<string, number> | null {
  const key = [...new Set(productIds)].sort().slice(0, MAX_IDS).join(",");
  const [result, setResult] = useState<{
    key: string;
    stock: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/inventory?ids=${encodeURIComponent(key)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { stock?: Record<string, number> } | null) => {
        if (body?.stock) setResult({ key, stock: body.stock });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [key]);

  return result && result.key === key ? result.stock : null;
}
