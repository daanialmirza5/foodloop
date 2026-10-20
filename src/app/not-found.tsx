import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-forest-900">We couldn’t find that page</h1>
      <p className="mt-2 max-w-md text-muted">It may have moved, or you may not have permission to view it.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-primary">
          Home
        </Link>
        <Link href="/discover" className="btn-secondary">
          Discover food
        </Link>
      </div>
    </div>
  );
}
