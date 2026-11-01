import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
      <BrandMark full />
      <div className="w-full max-w-sm">{children}</div>
      <SiteFooter />
    </div>
  );
}
