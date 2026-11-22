"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";

interface StaffOrderSearchProps {
  status: string;
  defaultValue?: string;
  /** Hiện dưới ô khi tìm không thấy đơn nào. */
  notFoundMessage?: string;
}

/** Ô tìm Mã đơn: Enter mới gửi, ô rỗng thì không gửi. */
export function StaffOrderSearch({
  status,
  defaultValue = "",
  notFoundMessage,
}: StaffOrderSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/staff?status=${status}&q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full md:w-[300px]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Tìm mã đơn (VD: 4F9A2C)"
          aria-label="Tìm mã đơn"
          autoComplete="off"
          className={cn(inputClass, "pl-9 ring-slate-300")}
        />
      </div>
      {notFoundMessage && (
        <p role="status" className="mt-1.5 text-sm text-slate-500">
          {notFoundMessage}
        </p>
      )}
    </form>
  );
}
