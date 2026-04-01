import Dexie from 'dexie';

// 在庫アイテム
export interface Item {
  id?: number;
  name: string;
  sku?: string;
  categoryId?: number;
  quantity: number;
  minStock: number;
  maxStock?: number;
  unit?: string;
  location?: string;
  supplier?: string;
  cost?: number;
  price?: number;
  barcode?: string;
  image?: string; // Base64形式の画像データ
  createdAt: Date;
  updatedAt: Date;
}

// カテゴリ
export interface Category {
  id?: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

// 入出庫履歴
export interface StockHistory {
  id?: number;
  itemId: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  notes?: string;
  userId?: string;
  createdAt: Date;
}

// 売上記録
export interface Sale {
  id?: number;
  itemId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customerId?: number;
  paymentMethod: 'cash' | 'card' | 'electronic' | 'other';
  status: 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 売上明細
export interface SaleItem {
  id?: number;
  saleId: number;
  itemId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount?: number;
  tax?: number;
}

// 顧客
export interface Customer {
  id?: number;
  name: string;
  nickname?: string;
  email?: string;
  phone?: string;
  address?: string;
  image?: string; // 互換性維持のため残す（非推奨）
  images?: string[]; // キープ画像（未払い商品画像）の配列
  totalAmount?: number; // 支払い済み合計
  keepAmount?: number; // キープ累積金額
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// サプライヤー
export interface Supplier {
  id?: number;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
}

// 保管場所
export interface Location {
  id?: number;
  name: string;
  description?: string;
  parentLocationId?: number;
}

// 通知
export interface Notification {
  id?: number;
  type: 'low_stock' | 'reorder' | 'sale' | 'system';
  itemId?: number;
  message: string;
  read: boolean;
  createdAt: Date;
  acknowledgedAt?: Date;
}

// ユーザー設定
export interface UserPreference {
  key: string;
  value: any;
}

// 同期ログ
export interface SyncLog {
  id?: number;
  action: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: number;
  timestamp: Date;
  synced: boolean;
}

// 顧客購入商品（未支払い）
export interface CustomerItem {
  id?: number;
  customerId: number;
  itemId: number;
  itemName: string;
  itemImage: string;
  itemPrice: number; // 商品価格
  evidenceImages?: string[]; // 購入証拠画像（配信でのスクショなど）
  addedAt: Date;
}

// 支払い済み商品
export interface PaidItem {
  id?: number;
  customerId: number;
  itemId: number;
  itemName: string;
  itemImage: string;
  itemPrice: number; // 商品価格
  evidenceImages?: string[]; // 購入証拠画像
  paidAt: Date;
}

// 送り状商品明細
export interface ShippingLabelItem {
  paidItemId: number;
  itemName: string;
  itemPrice: number;
}

// 送り状
export interface ShippingLabel {
  id?: number;
  customerId: number;
  labelNumber: string; // 送り状番号（日付+ランダム）
  carrier: 'yuupack' | 'yamato'; // 配送業者
  recipientName: string; // お届け先名前
  recipientAddress: string; // お届け先住所
  recipientPhone: string; // お届け先電話番号
  senderName: string; // 送り元名前
  senderAddress: string; // 送り元住所
  senderPhone: string; // 送り元電話番号
  items: ShippingLabelItem[]; // 商品明細
  totalValue: number; // 合計金額
  shippingDate: Date; // 発送日
  status: 'draft' | 'printed' | 'shipped'; // ステータス
  notes?: string; // メモ
  createdAt: Date;
}

export class InventoryDatabase extends Dexie {
  items!: any;
  categories!: any;
  stockHistory!: any;
  sales!: any;
  saleItems!: any;
  customers!: any;
  suppliers!: any;
  locations!: any;
  notifications!: any;
  userPreferences!: any;
  syncLog!: any;
  customerItems!: any; // 顧客購入商品
  paidItems!: any; // 支払い済み商品
  shippingLabels!: any; // 送り状

  constructor() {
    super('InventoryDatabase');

    // データベースバージョンとスキーマ定義
    this.version(1).stores({
      items: '++id, name, sku, categoryId, quantity, location, supplier, barcode, createdAt, updatedAt',
      categories: '++id, &name',
      stockHistory: '++id, itemId, type, createdAt',
      sales: '++id, itemId, customerId, paymentMethod, status, createdAt',
      saleItems: '++id, saleId, itemId',
      customers: '++id, &name, email, phone, createdAt',
      suppliers: '++id, &name',
      locations: '++id, &name, parentLocationId',
      notifications: '++id, type, itemId, read, createdAt',
      userPreferences: 'key, value',
      syncLog: '++id, action, tableName, recordId, timestamp, synced',
      customerItems: '++id, customerId, addedAt',
      paidItems: '++id, customerId, paidAt'
    });

    // バージョン2: 顧客テーブルにkeepAmountフィールドを追加
    this.version(2).stores({
      items: '++id, name, sku, categoryId, quantity, location, supplier, barcode, createdAt, updatedAt',
      categories: '++id, &name',
      stockHistory: '++id, itemId, type, createdAt',
      sales: '++id, itemId, customerId, paymentMethod, status, createdAt',
      saleItems: '++id, saleId, itemId',
      customers: '++id, &name, email, phone, createdAt, keepAmount',
      suppliers: '++id, &name',
      locations: '++id, &name, parentLocationId',
      notifications: '++id, type, itemId, read, createdAt',
      userPreferences: 'key, value',
      syncLog: '++id, action, tableName, recordId, timestamp, synced',
      customerItems: '++id, customerId, addedAt',
      paidItems: '++id, customerId, paidAt'
    }).upgrade(tx => {
      // 既存の顧客データのkeepAmountを0で初期化
      return tx.table('customers').toCollection().modify(customer => {
        if (!customer.keepAmount) {
          customer.keepAmount = 0;
        }
      });
    });

    // バージョン3: 顧客テーブルにimagesフィールドを追加（複数画像対応）
    this.version(3).stores({
      items: '++id, name, sku, categoryId, quantity, location, supplier, barcode, createdAt, updatedAt',
      categories: '++id, &name',
      stockHistory: '++id, itemId, type, createdAt',
      sales: '++id, itemId, customerId, paymentMethod, status, createdAt',
      saleItems: '++id, saleId, itemId',
      customers: '++id, &name, email, phone, createdAt, keepAmount',
      suppliers: '++id, &name',
      locations: '++id, &name, parentLocationId',
      notifications: '++id, type, itemId, read, createdAt',
      userPreferences: 'key, value',
      syncLog: '++id, action, tableName, recordId, timestamp, synced',
      customerItems: '++id, customerId, addedAt',
      paidItems: '++id, customerId, paidAt'
    }).upgrade(tx => {
      // 既存の顧客データのimageをimages配列に変換
      return tx.table('customers').toCollection().modify(customer => {
        if (customer.image && !customer.images) {
          customer.images = [customer.image];
        } else if (!customer.images) {
          customer.images = [];
        }
      });
    });

    // バージョン4: CustomerItemにevidenceImagesフィールドを追加（購入証拠画像）
    this.version(4).stores({
      items: '++id, name, sku, categoryId, quantity, location, supplier, barcode, createdAt, updatedAt',
      categories: '++id, &name',
      stockHistory: '++id, itemId, type, createdAt',
      sales: '++id, itemId, customerId, paymentMethod, status, createdAt',
      saleItems: '++id, saleId, itemId',
      customers: '++id, &name, email, phone, createdAt, keepAmount',
      suppliers: '++id, &name',
      locations: '++id, &name, parentLocationId',
      notifications: '++id, type, itemId, read, createdAt',
      userPreferences: 'key, value',
      syncLog: '++id, action, tableName, recordId, timestamp, synced',
      customerItems: '++id, customerId, addedAt',
      paidItems: '++id, customerId, paidAt'
    }).upgrade(tx => {
      // 既存のCustomerItemデータのevidenceImagesを空配列で初期化
      return tx.table('customerItems').toCollection().modify(item => {
        if (!item.evidenceImages) {
          item.evidenceImages = [];
        }
      });
    });

    // バージョン5: PaidItemにevidenceImagesフィールドを追加
    this.version(5).stores({
      items: '++id, name, sku, categoryId, quantity, location, supplier, barcode, createdAt, updatedAt',
      categories: '++id, &name',
      stockHistory: '++id, itemId, type, createdAt',
      sales: '++id, itemId, customerId, paymentMethod, status, createdAt',
      saleItems: '++id, saleId, itemId',
      customers: '++id, &name, email, phone, createdAt, keepAmount',
      suppliers: '++id, &name',
      locations: '++id, &name, parentLocationId',
      notifications: '++id, type, itemId, read, createdAt',
      userPreferences: 'key, value',
      syncLog: '++id, action, tableName, recordId, timestamp, synced',
      customerItems: '++id, customerId, addedAt',
      paidItems: '++id, customerId, paidAt'
    }).upgrade(tx => {
      // 既存のPaidItemデータのevidenceImagesを空配列で初期化
      return tx.table('paidItems').toCollection().modify(item => {
        if (!item.evidenceImages) {
          item.evidenceImages = [];
        }
      });
    });

    // バージョン6: 送り状テーブルを追加
    this.version(6).stores({
      items: '++id, name, sku, categoryId, quantity, location, supplier, barcode, createdAt, updatedAt',
      categories: '++id, &name',
      stockHistory: '++id, itemId, type, createdAt',
      sales: '++id, itemId, customerId, paymentMethod, status, createdAt',
      saleItems: '++id, saleId, itemId',
      customers: '++id, &name, email, phone, createdAt, keepAmount',
      suppliers: '++id, &name',
      locations: '++id, &name, parentLocationId',
      notifications: '++id, type, itemId, read, createdAt',
      userPreferences: 'key, value',
      syncLog: '++id, action, tableName, recordId, timestamp, synced',
      customerItems: '++id, customerId, addedAt',
      paidItems: '++id, customerId, paidAt',
      shippingLabels: '++id, customerId, labelNumber, carrier, status, shippingDate, createdAt'
    });

    // 既存のDBを削除してクリーンインストール
    this.on('populate', () => {
      // DBが正常に作成されたことを確認
      console.log('Database populated successfully');
    });
  }

  // 在庫不足のアイテムを取得
  async getLowStockItems(): Promise<Item[]> {
    const allItems = await this.items.toArray();
    return allItems.filter(item => item.quantity <= item.minStock);
  }

  // アイテムの在庫を更新
  async updateItemQuantity(
    itemId: number,
    newQuantity: number,
    type: StockHistory['type'],
    notes?: string
  ): Promise<void> {
    await this.transaction('rw', [this.items, this.stockHistory], async () => {
      const item = await this.items.get(itemId);
      if (!item) throw new Error('Item not found');

      const previousQuantity = item.quantity;

      // 在庫を更新
      await this.items.update(itemId, {
        quantity: newQuantity,
        updatedAt: new Date()
      });

      // 履歴を記録
      await this.stockHistory.add({
        itemId,
        type,
        quantity: newQuantity - previousQuantity,
        previousQuantity,
        newQuantity,
        notes,
        createdAt: new Date()
      });

      // 在庫不足チェック
      if (newQuantity <= item.minStock) {
        await this.notifications.add({
          type: 'low_stock',
          itemId,
          message: `${item.name}の在庫が不足しています（残り: ${newQuantity}${item.unit || ''}）`,
          read: false,
          createdAt: new Date()
        });
      }
    });
  }

  // 売上を登録して在庫を減らす
  async createSale(sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    return await this.transaction('rw', [this.sales, this.items, this.stockHistory], async () => {
      const item = await this.items.get(sale.itemId);
      if (!item) throw new Error('Item not found');
      if (item.quantity < sale.quantity) {
        throw new Error('在庫が不足しています');
      }

      // 売上を記録
      const saleId = await this.sales.add({
        ...sale,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // 在庫を減らす
      const newQuantity = item.quantity - sale.quantity;
      await this.updateItemQuantity(sale.itemId, newQuantity, 'out', `売上 #${saleId}`);

      return saleId;
    });
  }

  // 今日の売上合計を取得
  async getTodaySales(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sales = await this.sales
      .where('createdAt')
      .above(today)
      .and(sale => sale.status === 'completed')
      .toArray();

    return sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  }

  // 今月の売上合計を取得
  async getMonthSales(): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const sales = await this.sales
      .where('createdAt')
      .above(monthStart)
      .and(sale => sale.status === 'completed')
      .toArray();

    return sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  }
}

// データベースインスタンスをエクスポート
export const db = new InventoryDatabase();

// データベース接続を開く
export async function initDatabase(): Promise<void> {
  await db.open();
  console.log('Database initialized');
}
