import { db } from '../db/db';
import { DateTime } from 'luxon';

// バックアップデータの型
export interface BackupData {
  version: number;
  timestamp: string;
  tables: {
    items: any[];
    categories: any[];
    stockHistory: any[];
    sales: any[];
    saleItems: any[];
    customers: any[];
    suppliers: any[];
    locations: any[];
    notifications: any[];
    userPreferences: any[];
    syncLog: any[];
    customerItems: any[];
    paidItems: any[];
  };
}

// 全データをバックアップ
export async function createBackup(): Promise<BackupData> {
  const backup: BackupData = {
    version: 1,
    timestamp: new Date().toISOString(),
    tables: {
      items: await db.items.toArray(),
      categories: await db.categories.toArray(),
      stockHistory: await db.stockHistory.toArray(),
      sales: await db.sales.toArray(),
      saleItems: await db.saleItems.toArray(),
      customers: await db.customers.toArray(),
      suppliers: await db.suppliers.toArray(),
      locations: await db.locations.toArray(),
      notifications: await db.notifications.toArray(),
      userPreferences: await db.userPreferences.toArray(),
      syncLog: await db.syncLog.toArray(),
      customerItems: await db.customerItems.toArray(),
      paidItems: await db.paidItems.toArray(),
    }
  };

  return backup;
}

// バックアップをローカルストレージに保存（自動バックアップ用）
const BACKUP_KEY = 'inventory_backup_auto';
const MAX_BACKUPS = 50;

export async function saveAutoBackup(): Promise<void> {
  try {
    const backup = await createBackup();
    const backups = getAutoBackups();

    // 新しいバックアップを追加
    backups.push(backup);

    // 古いバックアップを削除（最大5世代）
    while (backups.length > MAX_BACKUPS) {
      backups.shift();
    }

    localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
    console.log('Auto backup saved:', DateTime.fromISO(backup.timestamp).toFormat('yyyy-MM-dd HH:mm:ss'));
  } catch (error) {
    console.error('Failed to save auto backup:', error);
  }
}

// ローカルストレージからバックアップを取得
export function getAutoBackups(): BackupData[] {
  try {
    const data = localStorage.getItem(BACKUP_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get auto backups:', error);
    return [];
  }
}

// バックアップをJSONファイルとしてダウンロード
export function downloadBackup(backup: BackupData): void {
  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  const timestamp = DateTime.fromISO(backup.timestamp).toFormat('yyyy-MM-dd_HH-mm-ss');
  link.href = url;
  link.download = `inventory_backup_${timestamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// JSONファイルからバックアップをインポート
export function importBackup(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        resolve(backup);
      } catch (error) {
        reject(new Error('バックアップファイルの読み込みに失敗しました'));
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file);
  });
}

// バックアップからデータを復元
export async function restoreBackup(backup: BackupData): Promise<void> {
  try {
    // すべてのテーブルをクリア
    await db.transaction('rw', [
      db.items,
      db.categories,
      db.stockHistory,
      db.sales,
      db.saleItems,
      db.customers,
      db.suppliers,
      db.locations,
      db.notifications,
      db.userPreferences,
      db.syncLog,
      db.customerItems,
      db.paidItems
    ], async () => {
      // 各テーブルにデータを復元
      if (backup.tables.items.length > 0) await db.items.bulkAdd(backup.tables.items);
      if (backup.tables.categories.length > 0) await db.categories.bulkAdd(backup.tables.categories);
      if (backup.tables.stockHistory.length > 0) await db.stockHistory.bulkAdd(backup.tables.stockHistory);
      if (backup.tables.sales.length > 0) await db.sales.bulkAdd(backup.tables.sales);
      if (backup.tables.saleItems.length > 0) await db.saleItems.bulkAdd(backup.tables.saleItems);
      if (backup.tables.customers.length > 0) await db.customers.bulkAdd(backup.tables.customers);
      if (backup.tables.suppliers.length > 0) await db.suppliers.bulkAdd(backup.tables.suppliers);
      if (backup.tables.locations.length > 0) await db.locations.bulkAdd(backup.tables.locations);
      if (backup.tables.notifications.length > 0) await db.notifications.bulkAdd(backup.tables.notifications);
      if (backup.tables.userPreferences.length > 0) await db.userPreferences.bulkAdd(backup.tables.userPreferences);
      if (backup.tables.syncLog.length > 0) await db.syncLog.bulkAdd(backup.tables.syncLog);
      if (backup.tables.customerItems.length > 0) await db.customerItems.bulkAdd(backup.tables.customerItems);
      if (backup.tables.paidItems.length > 0) await db.paidItems.bulkAdd(backup.tables.paidItems);
    });

    console.log('Backup restored successfully');
  } catch (error) {
    console.error('Failed to restore backup:', error);
    throw new Error('バックアップの復元に失敗しました');
  }
}

// データベースを完全にクリアしてから復元（危険なので使用には注意）
export async function restoreBackupWithClear(backup: BackupData): Promise<void> {
  try {
    // すべてのテーブルをクリア
    await db.items.clear();
    await db.categories.clear();
    await db.stockHistory.clear();
    await db.sales.clear();
    await db.saleItems.clear();
    await db.customers.clear();
    await db.suppliers.clear();
    await db.locations.clear();
    await db.notifications.clear();
    await db.userPreferences.clear();
    await db.syncLog.clear();
    await db.customerItems.clear();
    await db.paidItems.clear();

    // データを復元
    await restoreBackup(backup);
  } catch (error) {
    console.error('Failed to restore backup with clear:', error);
    throw new Error('バックアップの復元に失敗しました');
  }
}
