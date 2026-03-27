import { NextResponse } from "next/server";

import { loadWorkspace, saveWorkspace } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const workspace = await loadWorkspace();
  return NextResponse.json({ workspace });
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    const workspace = await saveWorkspace(payload);
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "workspace の保存に失敗しました。" },
      { status: 400 }
    );
  }
}
