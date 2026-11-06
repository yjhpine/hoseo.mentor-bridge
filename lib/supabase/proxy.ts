import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import {
  BASE_SECURITY_HEADERS,
  buildContentSecurityPolicy,
  createNonce,
} from "@/lib/security/headers";

import { LOGIN_PATH, isPublicPath } from "@/lib/auth/public-paths";

const PIN_PATH = "/account/pin";
const ALWAYS_OPEN = new Set(["/privacy", "/manifest.webmanifest", "/sw.js"]);

// 이 함수가 돌려주는 모든 응답(화면, 로그인 화면으로 보내는 이동 응답 포함)에 보안 헤더를 붙입니다.
export async function updateSession(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    isDev: process.env.NODE_ENV === "development",
  });
  const response = await route(request, { csp, nonce });
  for (const { key, value } of BASE_SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// Next.js는 요청 헤더의 CSP에서 nonce를 읽어 자기 스크립트에 붙입니다. 화면 코드는 x-nonce로 읽습니다.
// 세션 쿠키를 갱신하면 request.cookies가 바뀌므로, 응답을 만들 때마다 그때의 요청 헤더를 복사합니다.
type Csp = { csp: string; nonce: string };

function nextWithCsp(request: NextRequest, { csp, nonce }: Csp) {
  const headers = new Headers(request.headers);
  headers.set("Content-Security-Policy", csp);
  headers.set("x-nonce", nonce);
  return NextResponse.next({ request: { headers } });
}

async function route(request: NextRequest, csp: Csp) {
  let supabaseResponse = nextWithCsp(request, csp);

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
          supabaseResponse = nextWithCsp(request, csp);
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
  const redirectTo = (pathname: string, next?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = next ? `?next=${encodeURIComponent(next)}` : "";
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/auth");

  // 공개 화면(메인, 소개, 멘토 카드 목록 등)은 누구나 봅니다.
  if (!user) {
    if (isAuthPage || isPublicPath(pathname)) return supabaseResponse;
    // 그 밖의 화면은 로그인으로 안내하고, 로그인한 뒤 원래 화면으로 돌려보냅니다 (docs/architecture.md 2.2).
    const next = pathname + request.nextUrl.search;
    return redirectTo(LOGIN_PATH, request.method === "GET" && next !== "/" ? next : undefined);
  }

  // 처리방침·매니페스트·서비스 워커는 임시 PIN 상태여도 받을 수 있어야 합니다.
  if (ALWAYS_OPEN.has(pathname)) {
    return supabaseResponse;
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
