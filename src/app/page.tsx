import MarketBoard from "@/components/market-board";
import { fetchSectorBoard } from "@/lib/eastmoney";

export default async function Home() {
  let initialBoard;

  try {
    initialBoard = await fetchSectorBoard("industry", 1, 20);
  } catch {
    initialBoard = undefined;
  }

  return <MarketBoard initialBoard={initialBoard} />;
}
