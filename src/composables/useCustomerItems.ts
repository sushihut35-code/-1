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

// 顧客の商品を追加（在庫使用）
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

    // 顧客のキープ累積金額を更新
    const customer = await db.customers.get(customerId);
    if (customer) {
      const currentKeepAmount = customer.keepAmount || 0;
      await db.customers.update(customerId, {
        keepAmount: currentKeepAmount + (item.price || 0),
        updatedAt: new Date()
      });
    }

    return itemId;
  });
}

// 顧客の商品を追加（キープ画像直接アップロード）
export async function addKeepItemWithImage(
  customerId: number,
  itemName: string,
  itemPrice: number,
  itemImage: string,
  evidenceImages?: string[]
): Promise<number> {
  console.log('addKeepItemWithImage - adding item:', { customerId, itemName, itemPrice });

  return await db.transaction('rw', [db.customerItems], async () => {
    const itemId = await db.customerItems.add({
      customerId,
      itemId: 0, // 在庫商品ではないので0
      itemName,
      itemImage,
      itemPrice,
      evidenceImages: evidenceImages || [],
      addedAt: new Date()
    });
    console.log('addKeepItemWithImage - added customer item:', itemId);

    return itemId;
  });
}

// 顧客の商品を削除
export async function deleteCustomerItem(id: number): Promise<void> {
  await db.transaction('rw', [db.customerItems, db.items, db.stockHistory], async () => {
    const item = await db.customerItems.get(id);
    if (!item) return;

    // 在庫を戻す（在庫商品の場合のみ）
    if (item.itemId > 0) {
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
    }

    await db.customerItems.delete(id);
  });
}

// 支払い完了（未支払い→支払い済みに移動）
export async function markAsPaid(customerId: number): Promise<void> {
  const items = await db.customerItems.where('customerId').equals(customerId).toArray();
  console.log('markAsPaid - items to move:', items);

  await db.transaction('rw', [db.customerItems, db.paidItems, db.customers], async () => {
    // 支払い済み合計を計算
    const totalAmount = items.reduce((sum, item) => sum + (item.itemPrice || 0), 0);
    console.log('markAsPaid - total amount:', totalAmount);

    // 顧客の支払い済み合計を更新
    const customer = await db.customers.get(customerId);
    if (customer) {
      const currentPaidAmount = customer.totalAmount || 0;
      await db.customers.update(customerId, {
        totalAmount: currentPaidAmount + totalAmount,
        updatedAt: new Date()
      });
      console.log('markAsPaid - updated customer paid amount');
    }

    for (const item of items) {
      // 支払い済みに追加
      const paidItemId = await db.paidItems.add({
        customerId: item.customerId,
        itemId: item.itemId,
        itemName: item.itemName,
        itemImage: item.itemImage,
        itemPrice: item.itemPrice,
        evidenceImages: item.evidenceImages || [], // 証拠画像もコピー
        paidAt: new Date()
      });
      console.log('markAsPaid - added paid item:', paidItemId);

      // 未支払いから削除
      await db.customerItems.delete(item.id!);
      console.log('markAsPaid - deleted customer item:', item.id);
    }
  });
}

// 選択した商品のみを支払い済みに移動
export async function markSelectedAsPaid(customerId: number, itemIds: number[]): Promise<void> {
  const items = await db.customerItems.where('customerId').equals(customerId).toArray();
  const selectedItems = items.filter(item => item.id && itemIds.includes(item.id));
  console.log('markSelectedAsPaid - selected items:', selectedItems);

  if (selectedItems.length === 0) return;

  await db.transaction('rw', [db.customerItems, db.paidItems, db.customers], async () => {
    // 選択した商品の合計額を計算
    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.itemPrice || 0), 0);
    console.log('markSelectedAsPaid - total amount:', totalAmount);

    // 顧客の支払い済み合計を更新
    const customer = await db.customers.get(customerId);
    if (customer) {
      const currentPaidAmount = customer.totalAmount || 0;
      await db.customers.update(customerId, {
        totalAmount: currentPaidAmount + totalAmount,
        updatedAt: new Date()
      });
      console.log('markSelectedAsPaid - updated customer paid amount');
    }

    for (const item of selectedItems) {
      // 支払い済みに追加
      const paidItemId = await db.paidItems.add({
        customerId: item.customerId,
        itemId: item.itemId,
        itemName: item.itemName,
        itemImage: item.itemImage,
        itemPrice: item.itemPrice,
        evidenceImages: item.evidenceImages || [], // 証拠画像もコピー
        paidAt: new Date()
      });
      console.log('markSelectedAsPaid - added paid item:', paidItemId);

      // 未支払いから削除
      await db.customerItems.delete(item.id!);
      console.log('markSelectedAsPaid - deleted customer item:', item.id);
    }
  });
}

// 支払い済み商品を取得
export function usePaidItems(customerId: number | undefined) {
  console.log('usePaidItems - called with customerId:', customerId);
  return useLiveQuery(() => {
    console.log('usePaidItems - executing query for customerId:', customerId);
    if (!customerId) {
      console.log('usePaidItems - no customerId, returning empty array');
      return Promise.resolve([]);
    }
    return db.paidItems
      .where('customerId')
      .equals(customerId)
      .toArray()
      .then(items => {
        console.log('usePaidItems - fetched items:', items);
        // paidAtでソート
        return items.sort((a, b) => {
          const dateA = a.paidAt ? new Date(a.paidAt).getTime() : 0;
          const dateB = b.paidAt ? new Date(b.paidAt).getTime() : 0;
          return dateB - dateA; // 新しい順
        });
      })
      .catch(error => {
        console.error('usePaidItems - error:', error);
        return [];
      });
  }, [customerId]);
}

// 全支払い済み商品を取得
export function useAllPaidItems() {
  return useLiveQuery(() => db.paidItems.orderBy('paidAt').reverse().toArray());
}

// 顧客商品に証拠画像を追加
export async function addEvidenceImage(customerItemId: number, imageData: string): Promise<void> {
  const item = await db.customerItems.get(customerItemId);
  if (!item) {
    throw new Error('商品が見つかりません');
  }

  const currentImages = item.evidenceImages || [];
  await db.customerItems.update(customerItemId, {
    evidenceImages: [...currentImages, imageData]
  });
}

// 顧客商品から証拠画像を削除
export async function removeEvidenceImage(customerItemId: number, imageIndex: number): Promise<void> {
  const item = await db.customerItems.get(customerItemId);
  if (!item) {
    throw new Error('商品が見つかりません');
  }

  const currentImages = item.evidenceImages || [];
  if (imageIndex >= 0 && imageIndex < currentImages.length) {
    const newImages = currentImages.filter((_, index) => index !== imageIndex);
    await db.customerItems.update(customerItemId, {
      evidenceImages: newImages
    });
  }
}
