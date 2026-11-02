import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 단위 시험 (docs/testing.md). 화면·DB 없이 돌아가는 계산만 시험합니다.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
