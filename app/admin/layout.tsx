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
          <nav className="flex items-center gap-4 text-[12.5px] font-semibold text-muted">
            <Link href="/admin" className="hover:text-deep">
              Skills
            </Link>
            <Link href="/admin/disputes" className="hover:text-deep">
              Disputes
            </Link>
            <Link href="/admin/raffle" className="hover:text-deep">
              Raffle
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
