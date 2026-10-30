import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

const LOGIN_PATH = "/auth/login";
const PIN_PATH = "/account/pin";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // 세션 쿠키를 갱신했을 수 있으므로 이동 응답에도 쿠키를 옮겨 담습니다.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/auth");

  // 비로그인 사용자는 로그인·회원가입 화면만 볼 수 있습니다 (docs/architecture.md 2.2).
  if (!user) {
    return isAuthPage ? supabaseResponse : redirectTo(LOGIN_PATH);
  }

  if (isAuthPage) {
    return redirectTo("/");
  }

  // 임시 PIN으로 로그인한 사용자는 PIN을 바꿀 때까지 PIN 변경 화면으로 보냅니다 (6.1).
  // 서버 액션(POST)은 막지 않습니다. 로그아웃은 어느 화면에서나 되어야 합니다.
  if (request.method === "GET" && pathname !== PIN_PATH) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_pin")
      .eq("id", user.sub)
      .maybeSingle();
    if (profile?.must_change_pin) {
      return redirectTo(PIN_PATH);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
