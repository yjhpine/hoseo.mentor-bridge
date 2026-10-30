import * as React from "react";

import { cn } from "@/lib/utils";

/** 브라우저 기본 select에 Input과 같은 모양을 입힌 것. 서버·클라이언트 컴포넌트 모두에서 씁니다. */
export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
