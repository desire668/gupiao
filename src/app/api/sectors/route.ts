import type { NextRequest } from "next/server";
import { fetchSectorBoard, type SectorType } from "@/lib/eastmoney";

const MAX_LIMIT = 60;
const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;

function getSectorType(value: string | null): SectorType {
  if (value === "concept") {
    return "concept";
  }

  if (value === "index") {
    return "index";
  }

  return "industry";
}

function getLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
}

function getPage(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PAGE;
  }

  return Math.max(Math.floor(parsed), 1);
}

export async function GET(request: NextRequest) {
  try {
    const type = getSectorType(request.nextUrl.searchParams.get("type"));
    const page = getPage(request.nextUrl.searchParams.get("page"));
    const limit = getLimit(request.nextUrl.searchParams.get("limit"));
    const payload = await fetchSectorBoard(type, page, limit);

    return Response.json(payload, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("东方财富数据获取失败:", error);
    const message =
      error instanceof Error ? error.message : "数据服务暂时不可用，请稍后再试。";

    return Response.json({ message }, { status: 500 });
  }
}
