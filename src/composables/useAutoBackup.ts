import { useEffect } from 'react';
import { db } from '../db/db';
import { saveAutoBackup } from './useBackup';

// 自動バックアップフック
export function useAutoBackup() {
  useEffect(() => {
    // 各テーブルの変更を監視して自動バックアップ
    const tables = [
      db.items,
      db.customers,
      db.customerItems,
      db.paidItems,
      db.sales,
      db.categories
    ];

    // デバウンス用のタイマー（12時間）
    let backupTimer: NodeJS.Timeout | null = null;

    // 各テーブルの変更リスナーを登録
    const unsubscribers = tables.map(table => {
      return table.hook('creating', (primKey, obj, trans) => {
        if (backupTimer) clearTimeout(backupTimer);
        backupTimer = setTimeout(() => {
          saveAutoBackup();
        }, 12 * 60 * 60 * 1000); // 12時間デバウンス
      });
    });

    const unsubscribersUpdating = tables.map(table => {
      return table.hook('updating', (modifications, primKey, obj, trans) => {
        if (backupTimer) clearTimeout(backupTimer);
        backupTimer = setTimeout(() => {
          saveAutoBackup();
        }, 12 * 60 * 60 * 1000);
      });
    });

    const unsubscribersDeleting = tables.map(table => {
      return table.hook('deleting', (primKey, obj, trans) => {
        if (backupTimer) clearTimeout(backupTimer);
        backupTimer = setTimeout(() => {
          saveAutoBackup();
        }, 12 * 60 * 60 * 1000);
      });
    });

    // クリーンアップ
    return () => {
      if (backupTimer) clearTimeout(backupTimer);
      unsubscribers.forEach(unsub => unsub());
      unsubscribersUpdating.forEach(unsub => unsub());
      unsubscribersDeleting.forEach(unsub => unsub());
    };
  }, []);
}
