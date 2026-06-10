import Link from "next/link";

// Admin/calibration shell (handoff §8). Wider than the player frame.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FBFBF8]">
      <header className="border-b border-[#E4ECE7] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/admin" className="font-display text-lg font-extrabold text-deep">
            Calibration <span className="text-green">desk</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Prove Your Worth
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
