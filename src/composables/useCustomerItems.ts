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
  return await db.transaction('rw', [db.customerItems, db.customers], async () => {
    const itemId = await db.customerItems.add({
      customerId,
      itemId: item.id!,
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
  await db.transaction('rw', [db.customerItems, db.customers], async () => {
    const item = await db.customerItems.get(id);
    if (!item) return;

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
