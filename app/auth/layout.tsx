import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full flex-col">
      <div className="h-1.5 bg-primary" aria-hidden />
      <main className="flex w-full flex-1 flex-col items-center justify-center gap-6 p-6 md:p-10">
        <BrandMark />
        <div className="flex w-full max-w-sm flex-col gap-3">
          {children}
          <Link
            href="/"
            className="flex h-10 items-center justify-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            홈으로
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
