import { HomeScreen } from "@/components/home/home-screen";
import { createSupabaseClient } from "@/lib/supabase";
import type { Venue } from "@/types/venue";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createSupabaseClient();

  if (!supabase) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-medium text-foreground">Supabase is not configured</p>
        <p className="text-sm text-muted-foreground">
          Add{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          to your environment.
        </p>
      </div>
    );
  }

  const { data, error } = await supabase.from("venues").select("*");

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="font-medium text-foreground">Could not load venues</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return <HomeScreen venues={(data ?? []) as Venue[]} />;
}
