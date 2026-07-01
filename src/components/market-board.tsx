"use client";
import { useCallback, useState } from "react";
import styles from "@/app/page.module.css";
import type { SectorBoardPayload, SectorType } from "@/lib/eastmoney";

const PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;

// 1. 移除了类型定义中的 sectionTitle 和 sectionHint
const TYPE_META: Record<
  SectorType,
  {
    heroTitle: string;
    badge: string;
    // sectionTitle: string;  <-- 已移除
    // sectionHint: string;   <-- 已移除
    menuLabel: string;
    menuIcon: string;
  }
> = {
  industry: {
    heroTitle: "A股行业板块",
    badge: "东方财富行业榜",
    // sectionTitle: "行业板块", <-- 已移除
    // sectionHint: "查看最新行业板块数据", <-- 已移除
    menuLabel: "行业",
    menuIcon: "🏭",
  },
  concept: {
    heroTitle: "A股概念板块",
    badge: "东方财富概念榜",
    // sectionTitle: "概念板块", <-- 已移除
    // sectionHint: "探索热门概念板块", <-- 已移除
    menuLabel: "概念",
    menuIcon: "💡",
  },
  index: {
    heroTitle: "沪深京指数",
    badge: "东方财富指数榜",
    // sectionTitle: "沪深京指数", <-- 已移除
    // sectionHint: "沪深京市场主要指数", <-- 已移除
    menuLabel: "指数",
    menuIcon: "📊",
  },
};

const ICON_RULES: Array<{ pattern: RegExp; icon: string }> = [
  { pattern: /AI|算力|人工智能/i, icon: "🧠" },
  { pattern: /芯片|半导体|集成电路/i, icon: "💾" },
  { pattern: /机器人|自动化/i, icon: "🤖" },
  { pattern: /汽车|智驾|驾驶/i, icon: "🚗" },
  { pattern: /卫星|航天|军工/i, icon: "🚀" },
  { pattern: /电池|储能|锂|新能源/i, icon: "🔋" },
  { pattern: /电网|电力|风电|光伏/i, icon: "⚡" },
  { pattern: /石油|天然气/i, icon: "🛢️" },
  { pattern: /黄金|有色|铜/i, icon: "🟡" },
  { pattern: /医药|生物/i, icon: "🧬" },
  { pattern: /银行|金融/i, icon: "🏦" },
  { pattern: /消费|零售/i, icon: "🛒" },
];

function getSectorIcon(name: string) {
  const matched = ICON_RULES.find((rule) => rule.pattern.test(name));
  return matched?.icon ?? "📈";
}

function formatRefreshTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatSignedNumber(value: number, digits = 2) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(digits)}`;
}

function getEastmoneyBoardUrl(type: SectorType, code: string) {
  if (type === "index") {
    return `https://quote.eastmoney.com/zs${code}.html`;
  }
  return `https://quote.eastmoney.com/bk/90.${code}.html`;
}

async function fetchBoard(type: SectorType, page: number) {
  const response = await fetch(
    `/api/sectors?type=${type}&page=${page}&limit=${PAGE_SIZE}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(payload?.message ?? "获取板块数据失败");
  }
  return (await response.json()) as SectorBoardPayload;
}

type MarketBoardProps = {
  initialBoard?: SectorBoardPayload;
};

export default function MarketBoard({ initialBoard }: MarketBoardProps) {
  const [activeType, setActiveType] = useState<SectorType>("industry");
  const [boards, setBoards] = useState<
    Partial<Record<SectorType, SectorBoardPayload>>
  >({
    industry: initialBoard,
  });
  const [loadingType, setLoadingType] = useState<SectorType | null>(null);
  const [error, setError] = useState("");
  const [jumpPages, setJumpPages] = useState<Record<SectorType, string>>({
    industry: String(initialBoard?.page ?? DEFAULT_PAGE),
    concept: String(DEFAULT_PAGE),
    index: String(DEFAULT_PAGE),
  });

  const loadPage = useCallback(async (type: SectorType, page: number) => {
    setLoadingType(type);
    try {
      const payload = await fetchBoard(type, page);
      setBoards((currentBoards) => ({
        ...currentBoards,
        [type]: payload,
      }));
      setJumpPages((currentJumpPages) => ({
        ...currentJumpPages,
        [type]: String(payload.page),
      }));
      setError("");
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "获取板块数据失败";
      setError(message);
    } finally {
      setLoadingType(null);
    }
  }, []);

  const board = boards[activeType];
  const currentMeta = TYPE_META[activeType];
  const currentPage = board?.page ?? DEFAULT_PAGE;
  const totalPages = board?.summary.totalPages ?? DEFAULT_PAGE;
  const source = board?.source ?? "东方财富公开行情接口";
  const refreshedAt = board?.refreshedAt ? formatRefreshTime(board.refreshedAt) : "--";
  const pageRangeStart = board ? (board.page - 1) * board.pageSize + 1 : 0;
  const pageRangeEnd = board ? pageRangeStart + board.items.length - 1 : 0;
  const hasBoard = Boolean(board);
  const isLoading = loadingType === activeType;
  const jumpPage = jumpPages[activeType];

  function handleRefresh() {
    void loadPage(activeType, board?.page ?? DEFAULT_PAGE);
  }

  function handleJump() {
    const parsed = Number(jumpPage);
    if (!Number.isFinite(parsed)) {
      setError("请输入正确的页码");
      return;
    }
    const targetPage = Math.min(Math.max(Math.floor(parsed), 1), totalPages);
    setJumpPages((currentJumpPages) => ({
      ...currentJumpPages,
      [activeType]: String(targetPage),
    }));
    void loadPage(activeType, targetPage);
  }

  function handleTypeChange(type: SectorType) {
    setActiveType(type);
    setError("");
    if (!boards[type]) {
      void loadPage(type, DEFAULT_PAGE);
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <section className={styles.heroCard}>
          <div className={styles.heroHeader}>
            <div>
              <h1 className={styles.heroTitle}>{currentMeta.heroTitle}</h1>
            </div>
            <div className={styles.heroActions}>
              <button
                type="button"
                className={styles.refreshButton}
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? "刷新中..." : "刷新"}
              </button>
              <div className={styles.pageBadge}>{currentMeta.badge}</div>
            </div>
          </div>
          <div className={styles.heroMeta}>
            <span>数据源：{source}</span>
            <span>刷新时间：{refreshedAt}</span>
            <span>每页数量：20</span>
          </div>
          <div className={styles.summaryRow}></div>
        </section>

        <section className={styles.boardCard}>
          {/* 2. 移除了 sectionHeader 的渲染 (包含 h2 和 p) */}
          
          {/* 3. 移除了 pageInfoRow 的渲染 */}

          {isLoading && !hasBoard ? (
            <div className={styles.loadingState}>正在拉取实时板块数据...</div>
          ) : null}
          {!isLoading && error && !hasBoard ? (
            <div className={styles.errorState}>
              <p>{error}</p>
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => void loadPage(activeType, currentPage)}
              >
                重试
              </button>
            </div>
          ) : null}
          {board ? (
            <div className={styles.grid}>
              {board.items.map((item) => {
                const trendClass =
                  item.changePercent > 0
                    ? styles.upText
                    : item.changePercent < 0
                    ? styles.downText
                    : styles.flatText;
                return (
                  <a
                    key={item.code}
                    className={styles.sectorCard}
                    href={getEastmoneyBoardUrl(activeType, item.code)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className={styles.sectorMain}>
                      <span className={styles.sectorIcon}>
                        {getSectorIcon(item.name)}
                      </span>
                      <div>
                        <h3>{item.name}</h3>
                        <p>
                          指数 {item.latest.toFixed(2)} / 涨跌{" "}
                          {formatSignedNumber(item.changeAmount)}
                        </p>
                      </div>
                    </div>
                    <strong className={trendClass}>
                      {item.changePercent > 0 ? "▲" : item.changePercent < 0 ? "▼" : "•"}{" "}
                      {formatSignedNumber(item.changePercent)}%
                    </strong>
                  </a>
                );
              })}
            </div>
          ) : null}
          {error && hasBoard ? (
            <p className={styles.inlineNotice}>分页请求失败：{error}</p>
          ) : null}
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => void loadPage(activeType, currentPage - 1)}
              disabled={isLoading || currentPage <= 1}
            >
              上一页
            </button>
            <span className={styles.pageIndicator}>
              第 {currentPage} / {totalPages} 页
            </span>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => void loadPage(activeType, currentPage + 1)}
              disabled={isLoading || currentPage >= totalPages}
            >
              下一页
            </button>
            <div className={styles.jumpBox}>
              <input
                type="number"
                min={1}
                max={totalPages}
                inputMode="numeric"
                className={styles.pageInput}
                value={jumpPage}
                onChange={(event) =>
                  setJumpPages((currentJumpPages) => ({
                    ...currentJumpPages,
                    [activeType]: event.target.value,
                  }))
                }
                placeholder={`1-${totalPages}`}
              />
              <button
                type="button"
                className={styles.pageButton}
                onClick={handleJump}
                disabled={isLoading}
              >
                跳转
              </button>
            </div>
          </div>
        </section>
      </main>
      <nav className={styles.bottomMenu}>
        {(Object.keys(TYPE_META) as SectorType[]).map((type) => {
          const meta = TYPE_META[type];
          const isActive = activeType === type;
          return (
            <button
              key={type}
              type="button"
              className={isActive ? styles.activeMenuItem : styles.menuItem}
              onClick={() => handleTypeChange(type)}
            >
              <span className={styles.menuIcon}>{meta.menuIcon}</span>
              <span>{meta.menuLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}