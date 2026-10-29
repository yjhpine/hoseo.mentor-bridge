// 역공학용 레퍼런스 레포를 references/ 폴더에 얕게(depth 1) 복제하거나 갱신한다.
// references/ 는 .gitignore 대상이다. 라이선스별 사용 규칙은 docs/references.md 를 따른다.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

// exclude: 라이선스가 다른 경로는 체크아웃하지 않는다 (sparse-checkout, 레포 루트 기준).
const REFERENCES = [
  { dir: "find-a-mentor", repo: "Coding-Coach/find-a-mentor" },
  { dir: "bulletproof-react", repo: "alan2207/bulletproof-react" },
  { dir: "answer", repo: "apache/answer" },
  { dir: "chatwoot", repo: "chatwoot/chatwoot", exclude: ["/enterprise/"] },
  { dir: "frappe-lms", repo: "frappe/lms" },
];

// 레퍼런스 프로젝트의 에이전트 지침 파일은 이 프로젝트의 지침과 섞이지 않도록 모든 위치에서 뺀다.
const AGENT_FILES = [
  "CLAUDE.md",
  "AGENTS.md",
  ".claude/",
  ".cursor/",
  ".cursorrules",
  ".github/copilot-instructions.md",
];

const root = path.resolve(import.meta.dirname, "..", "references");
mkdirSync(root, { recursive: true });

const git = (...args) => execFileSync("git", args, { stdio: "inherit" });

for (const { dir, repo, exclude = [] } of REFERENCES) {
  const target = path.join(root, dir);
  const isNew = !existsSync(target);

  console.log(`\n[${isNew ? "clone" : "update"}] ${repo}`);
  if (isNew) {
    git("clone", "--depth", "1", "--no-checkout", `https://github.com/${repo}.git`, target);
  }

  const patterns = ["/*", ...[...exclude, ...AGENT_FILES].map((p) => `!${p}`)];
  git("-C", target, "sparse-checkout", "set", "--no-cone", ...patterns);

  if (isNew) {
    git("-C", target, "checkout");
  } else {
    git("-C", target, "pull", "--depth", "1", "--ff-only");
  }
}
