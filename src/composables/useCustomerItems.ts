import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CustomerItem, type PaidItem, type Item } from '../db/db';

// 顧客の未支払い商品を取得
export function useCustomerItems(customerId: number | undefined) {
  return useLiveQuery(() => {
    if (!customerId) return Promise.resolve([]);
    return db.customerItems
      .where('customerId')
      .equals(customerId)
      .toArray();
  }, [customerId]);
}

// 全顧客の未支払い商品を取得
export function useAllCustomerItems() {
  return useLiveQuery(() => db.customerItems.toArray());
}

// 顧客の商品を追加
export async function addCustomerItem(customerId: number, item: Item): Promise<number> {
  if (!item.id) {
    throw new Error('商品IDがありません');
  }

  return await db.transaction('rw', [db.customerItems, db.customers, db.items, db.stockHistory], async () => {
    // 在庫チェック
    const stockItem = await db.items.get(item.id);
    if (!stockItem) {
      throw new Error('商品が見つかりません');
    }

    if (stockItem.quantity <= 0) {
      throw new Error('在庫が不足しています');
    }

    // 在庫を減らす
    const newQuantity = stockItem.quantity - 1;
    await db.items.update(item.id, {
      quantity: newQuantity,
      updatedAt: new Date()
    });

    // 在庫履歴を追加
    await db.stockHistory.add({
      itemId: item.id,
      type: 'out',
      quantity: -1,
      previousQuantity: stockItem.quantity,
      newQuantity: newQuantity,
      notes: `顧客キープ: ${item.name}`,
      createdAt: new Date()
    });

    const itemId = await db.customerItems.add({
      customerId,
      itemId: item.id,
      itemName: item.name,
      itemImage: item.image || '',
      itemPrice: item.price || 0,
      addedAt: new Date()
    });

    // 顧客の累計額を更新
    const customer = await db.customers.get(customerId);
    if (customer) {
      const currentTotal = customer.totalAmount || 0;
      await db.customers.update(customerId, {
        totalAmount: currentTotal + (item.price || 0),
        updatedAt: new Date()
      });
    }

    return itemId;
  });
}

// 顧客の商品を削除
export async function deleteCustomerItem(id: number): Promise<void> {
  await db.transaction('rw', [db.customerItems, db.customers, db.items, db.stockHistory], async () => {
    const item = await db.customerItems.get(id);
    if (!item) return;

    // 在庫を戻す
    const stockItem = await db.items.get(item.itemId);
    if (stockItem) {
      const newQuantity = stockItem.quantity + 1;
      await db.items.update(item.itemId, {
        quantity: newQuantity,
        updatedAt: new Date()
      });

      // 在庫履歴を追加
      await db.stockHistory.add({
        itemId: item.itemId,
        type: 'in',
        quantity: 1,
        previousQuantity: stockItem.quantity,
        newQuantity: newQuantity,
        notes: `キープキャンセル: ${item.itemName}`,
        createdAt: new Date()
      });
    }

    const customer = await db.customers.get(item.customerId);
    if (customer && customer.totalAmount) {
      await db.customers.update(item.customerId, {
        totalAmount: Math.max(0, customer.totalAmount - item.itemPrice),
        updatedAt: new Date()
      });
    }

    await db.customerItems.delete(id);
  });
}

// 支払い完了（未支払い→支払い済みに移動）
export async function markAsPaid(customerId: number): Promise<void> {
  const items = await db.customerItems.where('customerId').equals(customerId).toArray();

  await db.transaction('rw', [db.customerItems, db.paidItems, db.customers], async () => {
    // 顧客の累計額をリセット
    await db.customers.update(customerId, {
      totalAmount: 0,
      updatedAt: new Date()
    });

    for (const item of items) {
      // 支払い済みに追加
      await db.paidItems.add({
        customerId: item.customerId,
        itemId: item.itemId,
        itemName: item.itemName,
        itemImage: item.itemImage,
        itemPrice: item.itemPrice,
        paidAt: new Date()
      });

      // 未支払いから削除
      await db.customerItems.delete(item.id!);
    }
  });
}

// 選択した商品のみを支払い済みに移動
export async function markSelectedAsPaid(customerId: number, itemIds: number[]): Promise<void> {
  const items = await db.customerItems.where('customerId').equals(customerId).toArray();
  const selectedItems = items.filter(item => item.id && itemIds.includes(item.id));

  if (selectedItems.length === 0) return;

  await db.transaction('rw', [db.customerItems, db.paidItems, db.customers], async () => {
    // 選択した商品の合計額を計算
    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.itemPrice || 0), 0);

    // 顧客の累計額から選択した商品の合計額を減算
    const customer = await db.customers.get(customerId);
    if (customer && customer.totalAmount) {
      await db.customers.update(customerId, {
        totalAmount: Math.max(0, customer.totalAmount - totalAmount),
        updatedAt: new Date()
      });
    }

    for (const item of selectedItems) {
      // 支払い済みに追加
      await db.paidItems.add({
        customerId: item.customerId,
        itemId: item.itemId,
        itemName: item.itemName,
        itemImage: item.itemImage,
        itemPrice: item.itemPrice,
        paidAt: new Date()
      });

      // 未支払いから削除
      await db.customerItems.delete(item.id!);
    }
  });
}

// 支払い済み商品を取得
export function usePaidItems(customerId: number | undefined) {
  return useLiveQuery(() => {
    if (!customerId) return Promise.resolve([]);
    return db.paidItems
      .where('customerId')
      .equals(customerId)
      .orderBy('paidAt')
      .reverse()
      .toArray();
  }, [customerId]);
}

// 全支払い済み商品を取得
export function useAllPaidItems() {
  return useLiveQuery(() => db.paidItems.orderBy('paidAt').reverse().toArray());
}
