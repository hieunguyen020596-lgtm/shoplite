"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function RefreshStatusButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (isPending) {
      refreshingRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      refreshingRef.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, [isPending]);

  function handleRefresh() {
    if (isPending || refreshingRef.current) return;
    refreshingRef.current = true;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Button
      variant="secondary"
      onClick={handleRefresh}
      disabled={isPending}
      className="min-h-11 h-auto w-full sm:w-auto"
    >
      <RefreshCw
        className={cn("size-4 shrink-0", isPending && "animate-spin")}
        aria-hidden="true"
      />
      {isPending ? "Đang làm mới…" : "Làm mới trạng thái"}
    </Button>
  );
}
