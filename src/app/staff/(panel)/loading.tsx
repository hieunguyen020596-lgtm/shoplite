export default function StaffLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8" aria-busy="true">
      <h1 className="mb-4 text-2xl font-bold">Danh sách đơn</h1>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </ul>
    </div>
  );
}
