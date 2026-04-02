import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ShippingLabel, type ShippingLabelItem, type PaidItem } from '../db/db';

// 顧客の送り状を取得
export function useCustomerShippingLabels(customerId: number | undefined) {
  return useLiveQuery(() => {
    if (!customerId) return Promise.resolve([]);
    return db.shippingLabels
      .where('customerId')
      .equals(customerId)
      .toArray();
  }, [customerId]);
}

// 全送り状を取得
export function useAllShippingLabels() {
  return useLiveQuery(() => db.shippingLabels.orderBy('createdAt').reverse().toArray());
}

// 送り状番号を生成（日付+ランダム）
export function generateLabelNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${year}${month}${day}-${random}`;
}

// 送り状を作成
export async function createShippingLabel(
  customerId: number,
  carrier: 'yuupack' | 'yamato' | 'sagawa',
  senderName: string,
  senderAddress: string,
  senderPhone: string,
  paidItemIds: number[]
): Promise<number> {
  // 顧客情報を取得
  const customer = await db.customers.get(customerId);
  if (!customer) {
    throw new Error('顧客が見つかりません');
  }

  // お届け先情報をチェック
  if (!customer.address || !customer.phone) {
    throw new Error('お届け先情報が不足しています。顧客の住所と電話番号を登録してください。');
  }

  // 商品情報を取得
  const paidItems = await db.paidItems
    .where('customerId')
    .equals(customerId)
    .toArray();

  // 選択された商品のみをフィルタリング
  const selectedItems = paidItems.filter(item => paidItemIds.includes(item.id!));
  if (selectedItems.length === 0) {
    throw new Error('商品が見つかりません');
  }

  // 送り状商品明細を作成
  const items: ShippingLabelItem[] = selectedItems.map(item => ({
    paidItemId: item.id!,
    itemName: item.itemName,
    itemPrice: item.itemPrice
  }));

  // 合計金額を計算
  const totalValue = items.reduce((sum, item) => sum + item.itemPrice, 0);

  // 送り状を作成
  const labelId = await db.shippingLabels.add({
    customerId,
    labelNumber: generateLabelNumber(),
    carrier,
    recipientName: customer.name,
    recipientAddress: customer.address,
    recipientPhone: customer.phone,
    senderName,
    senderAddress,
    senderPhone,
    items,
    totalValue,
    shippingDate: new Date(),
    status: 'draft',
    createdAt: new Date()
  });

  return labelId;
}

// 送り状を更新
export async function updateShippingLabel(
  id: number,
  updates: Partial<ShippingLabel>
): Promise<void> {
  await db.shippingLabels.update(id, updates);
}

// 送り状を削除
export async function deleteShippingLabel(id: number): Promise<void> {
  await db.shippingLabels.delete(id);
}

// 送り状のステータスを更新
export async function updateShippingLabelStatus(
  id: number,
  status: ShippingLabel['status']
): Promise<void> {
  await db.shippingLabels.update(id, { status });
}
