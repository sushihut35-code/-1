import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import {
  createBackup,
  downloadBackup,
  importBackup,
  restoreBackupWithClear,
  getAutoBackups,
  type BackupData
} from '../composables/useBackup';
import { useToast } from './common/Toast';

export function BackupManager() {
  const [autoBackups, setAutoBackups] = useState<BackupData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  // 自動バックアップを読み込む
  useEffect(() => {
    loadAutoBackups();
  }, []);

  const loadAutoBackups = () => {
    const backups = getAutoBackups();
    setAutoBackups(backups);
  };

  // 手動バックアップを作成してダウンロード
  const handleCreateBackup = async () => {
    setIsProcessing(true);
    try {
      const backup = await createBackup();
      downloadBackup(backup);
      showToast('バックアップを作成しました', 'success');
    } catch (error) {
      console.error('Failed to create backup:', error);
      showToast('バックアップの作成に失敗しました', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 自動バックアップをダウンロード
  const handleDownloadAutoBackup = (backup: BackupData) => {
    downloadBackup(backup);
    showToast('バックアップをダウンロードしました', 'success');
  };

  // 自動バックアップから復元
  const handleRestoreAutoBackup = async (backup: BackupData) => {
    const timestamp = DateTime.fromISO(backup.timestamp).toFormat('yyyy-MM-dd HH:mm:ss');
    if (!confirm(`「${timestamp}」のバックアップから復元します。\n\n現在のデータはすべて上書きされます。よろしいですか？`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await restoreBackupWithClear(backup);
      showToast('バックアップから復元しました', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to restore backup:', error);
      showToast('バックアップの復元に失敗しました', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ファイルからインポート
  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const backup = await importBackup(file);
      const timestamp = DateTime.fromISO(backup.timestamp).toFormat('yyyy-MM-dd HH:mm:ss');

      if (!confirm(`「${timestamp}」のバックアップから復元します。\n\n現在のデータはすべて上書きされます。よろしいですか？`)) {
        return;
      }

      await restoreBackupWithClear(backup);
      showToast('バックアップから復元しました', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to import backup:', error);
      showToast('バックアップのインポートに失敗しました', 'error');
    } finally {
      setIsProcessing(false);
      event.target.value = ''; // Reset input
    }
  };

  // 自動バックアップを削除
  const handleDeleteAutoBackup = (index: number) => {
    if (!confirm('このバックアップを削除しますか？')) {
      return;
    }

    const backups = [...autoBackups];
    backups.splice(index, 1);
    localStorage.setItem('inventory_backup_auto', JSON.stringify(backups));
    setAutoBackups(backups);
    showToast('バックアップを削除しました', 'success');
  };

  // バックアップのサマリーを表示
  const getBackupSummary = (backup: BackupData): string => {
    const tables = backup.tables;
    const parts = [];

    if (tables.customers.length > 0) parts.push(`顧客: ${tables.customers.length}件`);
    if (tables.items.length > 0) parts.push(`商品: ${tables.items.length}件`);
    if (tables.customerItems.length > 0) parts.push(`キープ中: ${tables.customerItems.length}件`);
    if (tables.paidItems.length > 0) parts.push(`支払済: ${tables.paidItems.length}件`);

    return parts.join('、');
  };

  return (
    <div className="space-y-6">
      {/* 手動バックアップ */}
      <div className="bg-white rounded-lg shadow-md p-6" style={{ backgroundColor: '#FFFFFF' }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">💾 バックアップ作成</h2>
        <p className="text-sm text-gray-600 mb-4">
          現在のデータをJSONファイルとしてダウンロードします。定期的にバックアップを作成することをお勧めします。
        </p>
        <button
          onClick={handleCreateBackup}
          disabled={isProcessing}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isProcessing ? '作成中...' : '📥 バックアップを作成してダウンロード'}
        </button>
      </div>

      {/* インポート */}
      <div className="bg-white rounded-lg shadow-md p-6" style={{ backgroundColor: '#FFFFFF' }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">📤 バックアップから復元</h2>
        <p className="text-sm text-gray-600 mb-4">
          バックアップファイル（JSON）からデータを復元します。現在のデータはすべて上書きされます。
        </p>
        <label className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer font-medium">
          <input
            type="file"
            accept="application/json"
            onChange={handleImportBackup}
            disabled={isProcessing}
            className="hidden"
          />
          {isProcessing ? '復元中...' : '📂 バックアップファイルを選択'}
        </label>
      </div>

      {/* 自動バックアップ一覧 */}
      <div className="bg-white rounded-lg shadow-md p-6" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">🔄 自動バックアップ</h2>
          <button
            onClick={loadAutoBackups}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            更新
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          データ変更時に自動的に保存されたバックアップ（最新50世代、12時間ごとに作成）
        </p>

        {autoBackups.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">自動バックアップがありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {autoBackups.map((backup, index) => {
              const timestamp = DateTime.fromISO(backup.timestamp);
              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        📅 {timestamp.toFormat('yyyy-MM-dd HH:mm:ss')}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {getBackupSummary(backup)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadAutoBackup(backup)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        title="ダウンロード"
                      >
                        📥
                      </button>
                      <button
                        onClick={() => handleRestoreAutoBackup(backup)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        title="復元"
                      >
                        ↩️
                      </button>
                      <button
                        onClick={() => handleDeleteAutoBackup(index)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
