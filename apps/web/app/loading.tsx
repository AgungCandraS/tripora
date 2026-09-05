export default function Loading() {
  return (
    <main className="mx-auto max-w-[1400px] animate-pulse px-5 py-16 sm:px-8 lg:px-12" aria-busy="true" aria-label="Memuat halaman">
      <div className="h-3 w-40 rounded-full bg-line" />
      <div className="mt-4 h-10 w-2/3 rounded-[10px] bg-line" />
      <div className="mt-3 h-4 w-1/2 rounded-full bg-soft" />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-[16px] border border-line">
            <div className="aspect-[1.12] bg-soft" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-3/4 rounded-full bg-line" />
              <div className="h-4 w-1/2 rounded-full bg-soft" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
