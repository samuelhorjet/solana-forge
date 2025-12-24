// FILE: hooks/useTransactionHistory.ts

import { useHistory } from "@/components/history-provider";

export function useTransactionHistory() {
  const { history, isLoading, refreshHistory } = useHistory();
  return { history, isLoading, refreshHistory };
}

export type { HistoryItem } from "@/components/history-provider";