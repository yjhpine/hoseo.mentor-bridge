import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 브라우저 기본 select에 Input과 같은 모양을 입힌 것. 서버·클라이언트 컴포넌트 모두에서 씁니다.
 * 펼친 목록은 select의 배경색을 따르므로 투명 대신 테마 배경을 주고, 항목에도 테마 색을 줍니다 (다크 모드 가독성).
 */
export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 text-foreground py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [&_optgroup]:bg-background [&_optgroup]:text-muted-foreground [&_option]:bg-background [&_option]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
