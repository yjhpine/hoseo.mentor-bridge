import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
      <Link href="/auth/login" className="text-lg font-semibold">
        호서대학교 멘토링
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
