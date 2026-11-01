import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 강의 자료 파일 내려받기 (7장 course-files). 비공개 버킷이라 볼 수 있는 사람에게만
// 짧게 쓰는 서명 URL을 만들어 넘깁니다. 볼 수 있는지는 lessons·storage RLS가 판단합니다.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const id = Number(lessonId);
  if (!Number.isInteger(id) || id < 1) {
    return new NextResponse("찾을 수 없습니다.", { status: 404 });
  }

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("file_path, file_name")
    .eq("id", id)
    .eq("kind", "file")
    .maybeSingle();
  if (!lesson?.file_path) {
    return new NextResponse("이 자료를 볼 수 없습니다. 수강 신청을 했는지 확인해 주세요.", { status: 404 });
  }

  const { data } = await supabase.storage
    .from("course-files")
    .createSignedUrl(lesson.file_path, 60, { download: lesson.file_name ?? true });
  if (!data?.signedUrl) {
    return new NextResponse("자료를 열지 못했습니다.", { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl);
}
