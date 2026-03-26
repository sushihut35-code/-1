import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Sale, type Customer } from '../db/db';

// 売上一覧を取得
export function useSales() {
  return useLiveQuery(() =>
    db.sales
      .orderBy('createdAt')
      .reverse()
      .toArray()
  );
}

// 今日の売上を取得
export function useTodaySales() {
  return useLiveQuery(() => db.getTodaySales());
}

// 今月の売上を取得
export function useMonthSales() {
  return useLiveQuery(() => db.getMonthSales());
}

// 特定の売上を取得
export function useSale(id: number | undefined) {
  return useLiveQuery(() => {
    if (!id) return Promise.resolve(undefined);
    return db.sales.get(id);
  }, [id]);
}

// 商品別の売上統計を取得
export function useSalesByItem() {
  return useLiveQuery(async () => {
    const sales = await db.sales
      .where('status')
      .equals('completed')
      .toArray();

    const stats = new Map<number, { quantity: number; total: number }>();

    sales.forEach(sale => {
      const current = stats.get(sale.itemId) || { quantity: 0, total: 0 };
      stats.set(sale.itemId, {
        quantity: current.quantity + sale.quantity,
        total: current.total + sale.totalPrice
      });
    });

    return Array.from(stats.entries()).map(([itemId, data]) => ({
      itemId,
      ...data
    }));
  });
}

// 日次売上データを取得（グラフ用）
export function useDailySales(days: number = 30) {
  return useLiveQuery(async () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sales = await db.sales
      .where('createdAt')
      .above(startDate)
      .and(sale => sale.status === 'completed')
      .toArray();

    // 日付ごとに集計
    const dailyData = new Map<string, number>();

    sales.forEach(sale => {
      const dateKey = sale.createdAt.toISOString().split('T')[0];
      const current = dailyData.get(dateKey) || 0;
      dailyData.set(dateKey, current + sale.totalPrice);
    });

    // 全ての日付のデータを埋める
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      result.push({
        date: dateKey,
        amount: dailyData.get(dateKey) || 0
      });
    }

    return result;
  }, [days]);
}

// 顧客一覧を取得
export function useCustomers() {
  return useLiveQuery(() =>
    db.customers
      .orderBy('createdAt')
      .reverse()
      .toArray()
  );
}

// 特定の顧客を取得
export function useCustomer(id: number | undefined) {
  return useLiveQuery(() => {
    if (!id) return Promise.resolve(undefined);
    return db.customers.get(id);
  }, [id]);
}

// 顧客の購入履歴を取得
export function useCustomerSales(customerId: number | undefined) {
  return useLiveQuery(() => {
    if (!customerId) return Promise.resolve([]);
    return db.sales
      .where('customerId')
      .equals(customerId)
      .orderBy('createdAt')
      .reverse()
      .toArray();
  }, [customerId]);
}

// 売上を登録
export async function createSale(
  sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>
): Promise<number> {
  return await db.createSale(sale);
}

// 売上をキャンセル
export async function cancelSale(saleId: number): Promise<void> {
  const sale = await db.sales.get(saleId);
  if (!sale) throw new Error('売上が見つかりません');
  if (sale.status === 'cancelled') throw new Error('既にキャンセルされています');
  if (sale.status === 'refunded') throw new Error('返品済みのためキャンセルできません');

  await db.transaction('rw', [db.sales, db.items, db.stockHistory], async () => {
    // 在庫を戻す
    const item = await db.items.get(sale.itemId);
    if (item) {
      const newQuantity = item.quantity + sale.quantity;
      await db.updateItemQuantity(sale.itemId, newQuantity, 'adjustment', `売上キャンセル #${saleId}`);
    }

    // 売上ステータスを更新
    await db.sales.update(saleId, {
      status: 'cancelled',
      updatedAt: new Date()
    });
  });
}

// 返品を処理
export async function refundSale(saleId: number): Promise<void> {
  const sale = await db.sales.get(saleId);
  if (!sale) throw new Error('売上が見つかりません');
  if (sale.status === 'refunded') throw new Error('既に返品されています');

  await db.transaction('rw', [db.sales, db.items, db.stockHistory], async () => {
    // 在庫を戻す
    const item = await db.items.get(sale.itemId);
    if (item) {
      const newQuantity = item.quantity + sale.quantity;
      await db.updateItemQuantity(sale.itemId, newQuantity, 'adjustment', `返品 #${saleId}`);
    }

    // 売上ステータスを更新
    await db.sales.update(saleId, {
      status: 'refunded',
      updatedAt: new Date()
    });
  });
}

// 顧客を追加
export async function addCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  return await db.customers.add({
    ...customer,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

// 顧客を更新
export async function updateCustomer(id: number, updates: Partial<Customer>): Promise<void> {
  await db.customers.update(id, {
    ...updates,
    updatedAt: new Date()
  });
}

// 顧客を削除
export async function deleteCustomer(id: number): Promise<void> {
  await db.customers.delete(id);
}

// 顧客を検索
export async function searchCustomers(query: string): Promise<Customer[]> {
  if (!query) return [];

  const lowerQuery = query.toLowerCase();
  return await db.customers
    .filter(customer =>
      customer.name.toLowerCase().includes(lowerQuery) ||
      customer.email?.toLowerCase().includes(lowerQuery) ||
      customer.phone?.includes(query)
    )
    .toArray();
}

// 売上統計を取得
export function useSalesStats() {
  const todaySales = useTodaySales();
  const monthSales = useMonthSales();
  const allSales = useSales();

  const todaySalesAmount = todaySales || 0;
  const monthSalesAmount = monthSales || 0;
  const totalSales = allSales?.reduce((sum, sale) => {
    if (sale.status === 'completed') {
      return sum + sale.totalPrice;
    }
    return sum;
  }, 0) || 0;

  const todaySalesCount = allSales?.filter(sale => {
    if (sale.status !== 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sale.createdAt >= today;
  }).length || 0;

  return {
    todaySalesAmount,
    monthSalesAmount,
    totalSales,
    todaySalesCount
  };
}
