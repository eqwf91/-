
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: TransactionType;
  note: string;
}

export interface SpendingSummary {
  category: string;
  amount: number;
}

export interface AIAnalysis {
  summary: string;
  recommendations: string[];
  autoCategorization?: {
    category: string;
    confidence: number;
  };
}
