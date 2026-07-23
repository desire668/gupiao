export type SectorType = "industry" | "concept" | "index";

type EastmoneySectorRow = {
  f2?: number;
  f3?: number;
  f4?: number;
  f12?: string;
  f14?: string;
};

type EastmoneyResponse = {
  data?: {
    total?: number;
    diff?: EastmoneySectorRow[];
  };
};

type EastmoneyIndexRow = {
  f43?: number;
  f57?: string;
  f58?: string;
  f169?: number;
  f170?: number;
};

type EastmoneyIndexResponse = {
  data?: EastmoneyIndexRow;
};

export type SectorItem = {
  code: string;
  name: string;
  latest: number;
  changePercent: number;
  changeAmount: number;
};

export type SectorBoardPayload = {
  type: SectorType;
  source: string;
  disclaimer: string;
  refreshedAt: string;
  page: number;
  pageSize: number;
  items: SectorItem[];
  summary: {
    total: number;
    totalPages: number;
    rising: number;
    falling: number;
    flat: number;
  };
};

const TYPE_TO_FS: Record<SectorType, string> = {
  industry: "m:90+t:2",
  concept: "m:90+t:3",
  index: "",
};

const API_BASE_URL = "https://push2.eastmoney.com/api/qt/clist/get";
const INDEX_API_BASE_URL = "https://push2.eastmoney.com/api/qt/stock/get";
const DATA_SOURCE = "东方财富公开行情接口";
const DATA_DISCLAIMER = "页面仅作学习与演示使用，不构成投资建议。";

const FETCH_TIMEOUT_MS = 8000;

const INDEX_SECIDS = [
  "1.000001",
  "0.399001",
  "0.399006",
  "1.000688",
  "1.000300",
  "1.000905",
  "1.000852",
  "0.899050",
] as const;

function sanitizeNumber(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function normalizeIndexNumber(value: number | undefined) {
  return sanitizeNumber(value) / 100;
}

async function fetchWithTimeout(
  url: string | URL,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchIndexBoard(): Promise<SectorBoardPayload> {
  const items = await Promise.all(
    INDEX_SECIDS.map(async (secid) => {
      const url = new URL(INDEX_API_BASE_URL);
      url.searchParams.set("secid", secid);
      url.searchParams.set("fields", "f57,f58,f43,f169,f170");

      const response = await fetchWithTimeout(url, {
        cache: "no-store",
        headers: {
          Referer: "https://quote.eastmoney.com/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`东方财富指数接口请求失败: ${response.status}`);
      }

      const json = (await response.json()) as EastmoneyIndexResponse;
      const row = json.data;

      if (!row?.f57 || !row.f58) {
        throw new Error("东方财富指数接口返回异常");
      }

      return {
        code: row.f57,
        name: row.f58,
        latest: normalizeIndexNumber(row.f43),
        changePercent: normalizeIndexNumber(row.f170),
        changeAmount: normalizeIndexNumber(row.f169),
      };
    }),
  );

  const rising = items.filter((item) => item.changePercent > 0).length;
  const falling = items.filter((item) => item.changePercent < 0).length;
  const flat = items.length - rising - falling;

  return {
    type: "index",
    source: DATA_SOURCE,
    disclaimer: DATA_DISCLAIMER,
    refreshedAt: new Date().toISOString(),
    page: 1,
    pageSize: items.length,
    items,
    summary: {
      total: items.length,
      totalPages: 1,
      rising,
      falling,
      flat,
    },
  };
}

export async function fetchSectorBoard(
  type: SectorType,
  page = 1,
  pageSize = 20,
): Promise<SectorBoardPayload> {
  if (type === "index") {
    return fetchIndexBoard();
  }

  const url = new URL(API_BASE_URL);

  url.searchParams.set("pn", String(page));
  url.searchParams.set("pz", String(pageSize));
  url.searchParams.set("po", "1");
  url.searchParams.set("np", "1");
  url.searchParams.set("ut", "bd1d9ddb04089700cf9c27f6f7426281");
  url.searchParams.set("fltt", "2");
  url.searchParams.set("invt", "2");
  url.searchParams.set("fid", "f3");
  url.searchParams.set("fs", TYPE_TO_FS[type]);
  url.searchParams.set("fields", "f2,f3,f4,f12,f14");

  const response = await fetchWithTimeout(url, {
    cache: "no-store",
    headers: {
      Referer: "https://quote.eastmoney.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`东方财富接口请求失败: ${response.status}`);
  }

  const json = (await response.json()) as EastmoneyResponse;
  const rows = json.data?.diff ?? [];
  const items = rows
    .filter((row) => row.f12 && row.f14)
    .map((row) => ({
      code: row.f12 as string,
      name: row.f14 as string,
      latest: sanitizeNumber(row.f2),
      changePercent: sanitizeNumber(row.f3),
      changeAmount: sanitizeNumber(row.f4),
    }));

  const rising = items.filter((item) => item.changePercent > 0).length;
  const falling = items.filter((item) => item.changePercent < 0).length;
  const flat = items.length - rising - falling;
  const total = json.data?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    type,
    source: DATA_SOURCE,
    disclaimer: DATA_DISCLAIMER,
    refreshedAt: new Date().toISOString(),
    page,
    pageSize,
    items,
    summary: {
      total,
      totalPages,
      rising,
      falling,
      flat,
    },
  };
}
