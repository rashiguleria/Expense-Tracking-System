export const BASE_URL = "http://127.0.0.1:5000";
export const DATA_CHANGED_EVENT = "expense-data-changed";

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Healthcare", "Groceries", "Utilities"];

export const PAYMENT_METHODS = ["Credit Card", "Debit Card", "Cash", "UPI", "Net Banking"];

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

export interface DashboardSummary {
  total_users: number;
  total_expense: number;
  total_income: number;
  average_expense: number;
  highest_spender_name: string;
  highest_spender_total: number;
}

export interface UserExpenseEntry {
  user_id: number;
  total_expense: number;
  user_name?: string;
  name?: string;
}

export interface UserSummaryResponse {
  total_income: number;
  total_expense: number;
  total_budget: number;
  savings: number;
  budget: number;
  remaining_budget: number;
}

export interface BudgetStatusResponse {
  budget: number;
  total_expense: number;
  remaining_budget: number;
  budget_used: number;
  status: string;
}

export interface InsightCard {
  title: string;
  text: string;
  tone?: string;
}

export interface RecentTransaction {
  id: number ;
  user_id: number;
  amount: number;
  category?: string;
  merchant?: string;
  payment_mode?: string;
  date?: string;
  notes?: string;
  transaction_type?: string;
}

export interface PersonalMonthlyTransaction {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  type: "Expense" | "Income";
}

export interface PersonalMonthlyDetails {
  user_id: number;
  year: number;
  month: number;
  total_expenses: number;
  total_income: number;
  transaction_count: number;
  category_totals: Record<string, number>;
  transactions: PersonalMonthlyTransaction[];
}

export interface PersonalDashboardData {
  user_id: number;
  year: number;
  available_years: number[];
  total_income: number;
  total_expense: number;
  savings: number;
  by_month: number[];
  categories: Record<string, number>;
  current_year: number;
  current_month: number;
  month_income: number;
  month_expense: number;
  month_savings: number;
  current_month_categories: Record<string, number>;
  latest: PersonalMonthlyTransaction[];
}

export interface ApiError extends Error {
  status?: number;
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value ?? 0);
}

export async function fetchJson<T>(path: string): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}${path}`);
    if (!response.ok) {
      const text = await response.text();
      const error = new Error(text || `Request failed with ${response.status}`) as ApiError;
      error.status = response.status;
      console.error(error);
      throw error;
    }
    return (await response.json()) as T;
  } catch (err) {
    console.error("API Error:", path, err);
    throw err;
}
}

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeUser(value: any): ApiUser {
  return {
    id: Number(value.id ?? value.user_id ?? 0),
    name: String(value.full_name ?? value.name ?? value.user_name ?? "Unknown"),
    email: String(value.email ?? value.user_email ?? ""),
    phone: value.phone ?? value.user_phone ?? undefined,
  };
}

function normalizeTransaction(value: any): RecentTransaction {
  return {
    id: value.transaction_id ?? value.id,
    user_id: Number(value.user_id ?? value.userId ?? 0),
    amount: toNumber(value.amount),
    category: value.category_name ?? value.category,
    merchant: value.merchant,
    payment_mode: value.payment_mode,
    date: value.transaction_date ?? value.date,
    notes: value.description,
    transaction_type: value.transaction_type,
  };
}

function asRecord(value: unknown): Record<string, number> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.reduce<Record<string, number>>((acc, [key, item]) => {
      acc[key] = toNumber(item);
      return acc;
    }, {});
  }
  return {};
}

function asArrayRecord(value: unknown): Record<string, number> {
  if (Array.isArray(value)) {
    return value.reduce<Record<string, number>>((acc, item) => {
      if (item && typeof item === "object") {
        const name = String((item as any).category_name ?? (item as any).merchant ?? (item as any).payment_mode ?? (item as any).name ?? "");
        const total = toNumber((item as any).total ?? (item as any).amount ?? (item as any).value ?? (item as any).frequency ?? 0);
        if (name) acc[name] = total;
      }
      return acc;
    }, {});
  }
  return {};
}

export async function fetchDashboard(): Promise<DashboardSummary> {
  const data = await fetchJson<any>("/api/dashboard");
  const highestSpender = data.highest_spender && typeof data.highest_spender === "object" ? data.highest_spender : undefined;
  const highestSpenderUser = highestSpender?.user && typeof highestSpender.user === "object" ? highestSpender.user : highestSpender;
  return {
    total_users: toNumber(data.total_users ?? data.totalUsers ?? 0),
    total_expense: toNumber(data.total_expense ?? data.totalExpense ?? 0),
    total_income: toNumber(data.total_income ?? data.totalIncome ?? 0),
    average_expense: toNumber(data.average_expense ?? data.averageExpense ?? 0),
    highest_spender_name: String(highestSpenderUser?.full_name ?? highestSpenderUser?.name ?? data.highest_spender_name ?? data.highestSpenderName ?? "—"),
    highest_spender_total: toNumber(highestSpender?.total ?? highestSpender?.amount ?? data.highest_spender_total ?? data.highestSpenderTotal ?? 0),
  };
}

export async function fetchUserDashboard(userId: number, year: number): Promise<PersonalDashboardData> {
  return fetchJson<PersonalDashboardData>(`/api/user/${userId}/dashboard?year=${year}`);
}

export async function fetchPersonalMonthlyDetails(
  userId: number,
  year: number,
  month: number,
): Promise<PersonalMonthlyDetails> {
  return fetchJson<PersonalMonthlyDetails>(
    `/api/user/${userId}/personal/month/${year}/${month}`,
  );
}



export async function fetchUserTransactions(userId: number): Promise<RecentTransaction[]> {
  console.log("USER ID =", userId);
  console.log("REQUEST =", `${BASE_URL}/api/user/${userId}/transactions`);

  const response = await fetch(`${BASE_URL}/api/user/${userId}/transactions`);

  console.log("STATUS =", response.status);

  const text = await response.text();
  console.log("BODY =", text);

  if (!response.ok) {
    throw new Error(text);
  }

  const data = JSON.parse(text);

  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data?.transactions)
    ? data.transactions
    : [];

  return rows.map(normalizeTransaction);
}


export async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  return (await response.json().catch(() => undefined)) as T;
}

export function onDataChanged(listener: () => void): () => void {
  window.addEventListener(DATA_CHANGED_EVENT, listener);
  return () => window.removeEventListener(DATA_CHANGED_EVENT, listener);
}

export async function fetchUsers(): Promise<ApiUser[]> {
  const data = await fetchJson<any>("/api/users");
  if (Array.isArray(data)) return data.map(normalizeUser);
  if (Array.isArray(data.users)) return data.users.map(normalizeUser);
  return [];
}

export async function fetchUserExpenses(): Promise<UserExpenseEntry[]> {
  const data = await fetchJson<any>("/api/user-expenses");
  if (Array.isArray(data)) {
    return data.map((entry: any) => ({
      user_id: Number(entry.user_id ?? entry.userId ?? entry.id ?? 0),
      total_expense: toNumber(entry.total_expense ?? entry.totalExpense ?? entry.expense ?? 0),
      user_name: entry.full_name ?? entry.user_name ?? entry.userName ?? entry.name,
      name: entry.full_name ?? entry.name ?? entry.user_name ?? entry.userName,
    }));
  }
  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>).map(([key, value]) => ({
      user_id: Number(key),
      total_expense: toNumber((value as any)?.total_expense ?? (value as any)?.totalExpense ?? value),
      user_name: (value as any)?.full_name ?? (value as any)?.user_name ?? (value as any)?.name ?? undefined,
      name: (value as any)?.full_name ?? (value as any)?.name ?? (value as any)?.user_name ?? undefined,
    }));
  }
  return [];
}

export async function fetchUserSummary(userId: number): Promise<UserSummaryResponse> {
  const data = await fetchJson<any>(`/api/user/${userId}/summary`);

  const budget = toNumber(data.total_budget ?? data.budget ?? 0);
  const totalExpense = toNumber(data.total_expense ?? data.totalExpense ?? 0);

  const remainingBudget =
    data.remaining_budget ??
    data.remainingBudget ??
    (budget - totalExpense);

  return {
  total_income: toNumber(data.total_income ?? data.totalIncome ?? 0),
  total_expense: totalExpense,
  total_budget: budget,
  savings: toNumber(data.savings ?? 0),
  budget,
  remaining_budget: toNumber(remainingBudget),
};
}

export async function fetchUserYearlyExpenses(userId: number): Promise<number[]> {
  const data = await fetchJson<any>(`/api/user/${userId}/yearly`);
  if (Array.isArray(data)) {
    const values = Array(12).fill(0);
    data.forEach((entry: any) => {
      const monthIndex = Math.max(0, Math.min(11, Number(entry.month_no ?? entry.month ?? entry.monthNumber ?? 0) - 1));
      values[monthIndex] = toNumber(entry.total ?? entry.amount ?? entry.value ?? 0);
    });
    return values;
  }
  if (Array.isArray(data.monthly_expenses)) return data.monthly_expenses.map(toNumber);
  if (Array.isArray(data.expenses)) return data.expenses.map(toNumber);
  if (data && typeof data === "object") {
    const values = Object.values(data as Record<string, unknown>).map(toNumber);
    return values;
  }
  return Array(12).fill(0);
}

export async function fetchUserAnalyticsYear(userId: number): Promise<number> {
  const data = await fetchJson<any>(`/api/user/${userId}/yearly`);
  const year = Array.isArray(data) ? data.find((entry: any) => Number(entry.year) > 0)?.year : undefined;
  return Number(year) || new Date().getFullYear();
}

export async function fetchUserMonthlyCategoryBreakdownForYear(
  userId: number,
  month: number,
  year: number
): Promise<Record<string, number>> {
  const data = await fetchJson<any>(`/api/user/${userId}/month/${month}/categories?year=${year}`);
  if (Array.isArray(data?.categories)) return asArrayRecord(data.categories);
  return {};
}

export async function fetchUserMonthlyCategoryBreakdown(userId: number, month: number): Promise<Record<string, number>> {
  const data = await fetchJson<any>(`/api/user/${userId}/month/${month}`);
  if (Array.isArray(data)) return asArrayRecord(data);
  if (data && typeof data === "object") {
    if (typeof data.categories === "object" && data.categories) return asRecord(data.categories);
    if (typeof data.category_breakdown === "object" && data.category_breakdown) return asRecord(data.category_breakdown);
    if (typeof data.expenses === "object" && data.expenses) return asRecord(data.expenses);
    if (typeof data.data === "object" && data.data) return asRecord(data.data);
  }
  return {};
}


export async function fetchUserYearlyCategoryBreakdown(
  userId: number
): Promise<Record<string, number>> {

  const data = await fetchJson<any>(
    `/api/user/${userId}/categories`
  );

  if (Array.isArray(data))
    return asArrayRecord(data);

  if (data && typeof data === "object") {
    if (typeof data.categories === "object" && data.categories)
      return asRecord(data.categories);

    if (typeof data.category_breakdown === "object" && data.category_breakdown)
      return asRecord(data.category_breakdown);

    if (typeof data.data === "object" && data.data)
      return asRecord(data.data);
  }

  return {};
}

export async function fetchUserMerchantBreakdown(userId: number): Promise<Record<string, number>> {
  const data = await fetchJson<any>(`/api/user/${userId}/merchant`);
  if (Array.isArray(data)) return asArrayRecord(data);
  if (data && typeof data === "object") {
    if (typeof data.merchants === "object" && data.merchants) return asRecord(data.merchants);
    if (typeof data.merchant_spending === "object" && data.merchant_spending) return asRecord(data.merchant_spending);
    if (typeof data.data === "object" && data.data) return asRecord(data.data);
  }
  return {};
}

export async function fetchUserMonthlyMerchantBreakdown(userId: number, month: number): Promise<Record<string, number>> {
  try {
    const data = await fetchJson<any>(`/api/user/${userId}/month/${month}/merchant`);
    if (Array.isArray(data)) return asArrayRecord(data);
    if (data && typeof data === "object") {
      if (typeof data.merchants === "object" && data.merchants) return asRecord(data.merchants);
      if (typeof data.merchant_spending === "object" && data.merchant_spending) return asRecord(data.merchant_spending);
      if (typeof data.data === "object" && data.data) return asRecord(data.data);
    }
  } catch (err) {
    if ((err as ApiError).status !== 404) throw err;
  }
  return fetchUserMerchantBreakdown(userId);
}

export async function fetchUserPaymentModes(
  userId: number
): Promise<Record<string, number>> {

  const data = await fetchJson<any>(
    `/api/user/${userId}/payment-mode`
  );

  // <-- THIS IS THE MISSING PART
  if (Array.isArray(data)) {
    return asArrayRecord(data);
  }

  if (data && typeof data === "object") {
    if (typeof data.payment_modes === "object" && data.payment_modes)
      return asRecord(data.payment_modes);

    if (typeof data.payment_mode_usage === "object" && data.payment_mode_usage)
      return asRecord(data.payment_mode_usage);

    if (typeof data.data === "object" && data.data)
      return asRecord(data.data);

    if (data.payment_mode)
      return {
        [String(data.payment_mode)]:
          toNumber(data.frequency ?? data.count ?? 0),
      };
  }

  return {};
}

export async function fetchUserMonthlyPaymentModes(userId: number, month: number): Promise<Record<string, number>> {
  try {
    const data = await fetchJson<any>(`/api/user/${userId}/month/${month}/payment-mode`);
    if (Array.isArray(data)) return asArrayRecord(data);
    if (data && typeof data === "object") {
      if (typeof data.payment_modes === "object" && data.payment_modes) return asRecord(data.payment_modes);
      if (typeof data.payment_mode_usage === "object" && data.payment_mode_usage) return asRecord(data.payment_mode_usage);
      if (typeof data.data === "object" && data.data) return asRecord(data.data);
    }
  } catch (err) {
    if ((err as ApiError).status !== 404) throw err;
  }
  return fetchUserPaymentModes(userId);
}


export async function fetchFavoriteCategory(userId: number): Promise<string> {
  const data = await fetchJson<any>(`/api/user/${userId}/favorite-category`);
  return String(data.favorite_category ?? data.favoriteCategory ?? data.category_name ?? data.category ?? data.highest_spending_category ?? "—");
}

export async function fetchBudgetStatus(userId: number): Promise<BudgetStatusResponse> {
  const data = await fetchJson<any>(`/api/user/${userId}/budget-status`);
  return {
    budget: toNumber(data.budget ?? 0),
    total_expense: toNumber(data.expense ?? data.total_expense ?? data.totalExpense ?? 0),
    remaining_budget: toNumber(data.remaining ?? data.remaining_budget ?? data.remainingBudget ?? 0),
    budget_used: toNumber(data.budget_used ?? data.budgetUsed ?? 0),
    status: String(data.status ?? "On track"),
  };
}

export async function fetchUserInsights(userId: number): Promise<InsightCard[]> {
  const data = await fetchJson<any>(`/api/user/${userId}/insights`);
  if (Array.isArray(data)) {
    return data.map((item: any) => ({ title: String(item.title ?? "Insight"), text: String(item.text ?? item.description ?? ""), tone: String(item.tone ?? "primary") }));
  }
  if (data && typeof data === "object") {
    const cards: InsightCard[] = [];
    if (data.favorite_category && typeof data.favorite_category === "object") {
      cards.push({ title: "Favorite Category", text: `${String((data.favorite_category as any).category_name ?? "—")} · ${formatINR(toNumber((data.favorite_category as any).total ?? 0))}`, tone: "danger" });
    }
    if (data.favorite_merchant && typeof data.favorite_merchant === "object") {
      cards.push({ title: "Top Merchant", text: `${String((data.favorite_merchant as any).merchant ?? "—")} · ${formatINR(toNumber((data.favorite_merchant as any).total ?? 0))}`, tone: "primary" });
    }
    if (data.payment_mode && typeof data.payment_mode === "object") {
      cards.push({ title: "Preferred Payment", text: `${String((data.payment_mode as any).payment_mode ?? "—")} · ${toNumber((data.payment_mode as any).frequency ?? 0)} uses`, tone: "success" });
    }
    return cards;
  }
  return [];
}

export async function deleteExpense(expenseId: number) {
  const response = await fetch(`${BASE_URL}/api/expenses/${expenseId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete expense");
  }

  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));

  return await response.json();
}

export async function deleteMonthData(userId: number, year: number, month: number) {
  const response = await fetch(`${BASE_URL}/api/user/${userId}/month/${year}/${month}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to delete month data");
  }

  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  return await response.json();
}

export async function login(email: string, password: string) {
  return postJson<{
    success: boolean;
    user: ApiUser;
  }>("/api/login", {
    email,
    password,
  });
}
