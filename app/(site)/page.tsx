import { Suspense } from "react";
import { displayName, getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default function Home() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
      <Welcome />
    </Suspense>
  );
}

// 단과대학 구역·멘토 목록은 2단계에서 이 화면에 들어옵니다.
async function Welcome() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  let notice = "단과대학 구역과 멘토 목록은 준비 중입니다.";
  if (user.role === "mentor") {
    const supabase = await createClient();
    const { data: mentor } = await supabase
      .from("mentor_profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();
    if (mentor?.status === "pending") {
      notice = "관리자가 단과대학 구역에 배치하고 멘토 페이지를 개설하면 멘티에게 공개됩니다.";
    }
  } else if (user.role === "admin") {
    notice = "관리자 화면은 준비 중입니다.";
  }

  return (
    <section className="flex flex-col gap-2 py-6">
      <h1 className="text-2xl font-semibold">{displayName(user)}님, 반갑습니다.</h1>
      <p className="text-muted-foreground">{notice}</p>
    </section>
  );
}
