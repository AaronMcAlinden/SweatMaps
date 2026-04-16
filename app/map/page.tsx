import Link from "next/link";

export default function MapPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-heading text-lg font-semibold text-foreground">Map</p>
      <p className="text-sm text-muted-foreground">This screen is coming soon.</p>
      <Link href="/" className="text-sm font-medium text-brand hover:underline">
        Back to Discover
      </Link>
    </div>
  );
}
