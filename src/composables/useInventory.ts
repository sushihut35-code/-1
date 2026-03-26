import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Item, type StockHistory } from '../db/db';

// 在庫アイテム一覧を取得
export function useItems() {
  return useLiveQuery(() => db.items.orderBy('createdAt').reverse().toArray());
}

// 在庫不足アイテムを取得
export function useLowStockItems() {
  return useLiveQuery(() => db.getLowStockItems());
}

// 特定のアイテムを取得
export function useItem(id: number | undefined) {
  return useLiveQuery(() => {
    if (!id) return Promise.resolve(undefined);
    return db.items.get(id);
  }, [id]);
}

// アイテムの在庫履歴を取得
export function useStockHistory(itemId?: number) {
  return useLiveQuery(() => {
    if (itemId) {
      return db.stockHistory
        .where('itemId')
        .equals(itemId)
        .orderBy('createdAt')
        .reverse()
        .toArray();
    } else {
      return db.stockHistory
        .orderBy('createdAt')
        .reverse()
        .toArray();
    }
  }, [itemId]);
}

// アイテムを追加
export async function addItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  return await db.items.add({
    ...item,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

// アイテムを更新
export async function updateItem(id: number, updates: Partial<Item>): Promise<void> {
  await db.items.update(id, {
    ...updates,
    updatedAt: new Date()
  });
}

// アイテムを削除
export async function deleteItem(id: number): Promise<void> {
  await db.items.delete(id);
  // 関連する在庫履歴も削除
  await db.stockHistory.where('itemId').equals(id).delete();
}

// 入庫を記録
export async function addStock(
  itemId: number,
  quantity: number,
  notes?: string,
  date?: Date
): Promise<void> {
  const item = await db.items.get(itemId);
  if (!item) throw new Error('アイテムが見つかりません');

  const newQuantity = item.quantity + quantity;

  // 日付が指定されている場合は、その日時で記録
  const stockDate = date || new Date();

  // updateItemQuantityを直接使わず、トランザクション内で処理
  await db.transaction('rw', [db.items, db.stockHistory], async () => {
    const previousQuantity = item.quantity;

    // 在庫を更新
    await db.items.update(itemId, {
      quantity: newQuantity,
      updatedAt: new Date()
    });

    // 履歴を記録（指定された日時）
    await db.stockHistory.add({
      itemId,
      type: 'in',
      quantity: quantity,
      previousQuantity,
      newQuantity,
      notes,
      createdAt: stockDate
    });

    // 在庫不足チェック
    if (newQuantity <= item.minStock) {
      await db.notifications.add({
        type: 'low_stock',
        itemId,
        message: `${item.name}の在庫が不足しています（残り: ${newQuantity}${item.unit || ''}）`,
        read: false,
        createdAt: new Date()
      });
    }
  });
}

// 出庫を記録
export async function removeStock(
  itemId: number,
  quantity: number,
  notes?: string
): Promise<void> {
  const item = await db.items.get(itemId);
  if (!item) throw new Error('アイテムが見つかりません');
  if (item.quantity < quantity) {
    throw new Error('在庫が不足しています');
  }

  const newQuantity = item.quantity - quantity;
  await db.updateItemQuantity(itemId, newQuantity, 'out', notes);
}

// 在庫調整
export async function adjustStock(
  itemId: number,
  newQuantity: number,
  notes?: string
): Promise<void> {
  await db.updateItemQuantity(itemId, newQuantity, 'adjustment', notes);
}

// アイテムを検索
export async function searchItems(query: string): Promise<Item[]> {
  if (!query) return [];

  const lowerQuery = query.toLowerCase();
  return await db.items
    .filter(item =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.sku?.toLowerCase().includes(lowerQuery) ||
      item.barcode?.includes(query)
    )
    .toArray();
}

// カテゴリ別のアイテムを取得
export function useItemsByCategory(categoryId: number | undefined) {
  return useLiveQuery(() => {
    if (!categoryId) return Promise.resolve([]);
    return db.items.where('categoryId').equals(categoryId).toArray();
  }, [categoryId]);
}

// 在庫統計を取得
export function useInventoryStats() {
  const allItems = useItems();
  const lowStockItems = useLowStockItems();

  return {
    totalItems: allItems?.length || 0,
    lowStockCount: lowStockItems?.length || 0,
    totalValue: allItems?.reduce((sum, item) => {
      const cost = item.cost || 0;
      return sum + (cost * item.quantity);
    }, 0) || 0
  };
}
