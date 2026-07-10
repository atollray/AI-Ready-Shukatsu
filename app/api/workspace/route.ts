import { NextResponse } from "next/server";

import {
  loadWorkspace,
  saveWorkspace,
  WorkspaceConflictError,
} from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const workspace = await loadWorkspace();
  return NextResponse.json({ workspace });
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    // 新形式は { workspace, baseUpdatedAt }。旧形式（workspace を直接送る）にも後方互換で対応する。
    const body = (payload ?? {}) as Record<string, unknown>;
    const hasEnvelope =
      typeof body === "object" && body !== null && "workspace" in body;
    const workspaceInput = hasEnvelope ? body.workspace : payload;
    const baseUpdatedAt =
      typeof body.baseUpdatedAt === "string" ? body.baseUpdatedAt : undefined;

    const workspace = await saveWorkspace(workspaceInput, baseUpdatedAt);
    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof WorkspaceConflictError) {
      return NextResponse.json(
        {
          message:
            "ディスク上のデータが読み込み後に更新されています。再読込してから保存してください。",
          currentUpdatedAt: error.currentUpdatedAt,
        },
        { status: 409 }
      );
    }

    console.error(error);
    return NextResponse.json(
      { message: "workspace の保存に失敗しました。" },
      { status: 400 }
    );
  }
}
