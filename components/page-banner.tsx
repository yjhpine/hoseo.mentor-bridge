/** 소개·안내·강의 같은 공개 화면 위쪽의 제목 띠. 호서대 홈페이지의 하위 화면 제목처럼 빨간 선으로 구분합니다. */
export function PageBanner({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <header className="flex flex-col gap-2 border-b-2 border-primary pb-4 pt-2">
      {eyebrow && <p className="text-sm font-semibold text-brand">{eyebrow}</p>}
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {description && <p className="max-w-prose text-muted-foreground">{description}</p>}
    </header>
  );
}
