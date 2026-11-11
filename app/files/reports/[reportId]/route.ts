import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 멘토 학기 보고서 내려받기 (11장 35번, Storage mentor-reports). 비공개 버킷이라 볼 수 있는 사람
// (멘토 본인·관리자)에게만 짧게 쓰는 서명 URL을 만들어 넘깁니다. 볼 수 있는지는 RLS가 판단합니다.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const id = Number(reportId);
  if (!Number.isInteger(id) || id < 1) {
    return new NextResponse("찾을 수 없습니다.", { status: 404 });
  }

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("mentor_reports")
    .select("file_path, file_name")
    .eq("id", id)
    .maybeSingle();
  if (!report) {
    return new NextResponse("이 보고서를 볼 수 없습니다.", { status: 404 });
  }

  const { data } = await supabase.storage
    .from("mentor-reports")
    .createSignedUrl(report.file_path, 60, { download: report.file_name });
  if (!data?.signedUrl) {
    return new NextResponse("보고서를 열지 못했습니다.", { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl);
}
