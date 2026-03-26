import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStockHistory } from '../../composables/useInventory';
import { useItems } from '../../composables/useInventory';
import { StockHistoryEditForm } from './StockHistoryEditForm';

export function StockHistoryList() {
  const stockHistory = useStockHistory();
  const items = useItems();
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);

  const getItemName = (itemId: number) => {
    const item = items?.find(i => i.id === itemId);
    return item?.name || '不明な商品';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'in':
        return { label: '入庫', color: 'bg-green-100 text-green-800' };
      case 'out':
        return { label: '出庫', color: 'bg-red-100 text-red-800' };
      case 'adjustment':
        return { label: '調整', color: 'bg-blue-100 text-blue-800' };
      default:
        return { label: type, color: 'bg-gray-100 text-gray-800' };
    }
  };

  // 日付でグループ化
  const groupedHistory = stockHistory?.reduce((acc, record) => {
    const date = new Date(record.createdAt).toLocaleDateString('ja-JP');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(record);
    return acc;
  }, {} as Record<string, typeof stockHistory>) || {};

  return (
    <div className="pb-20">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">入出庫履歴</h2>
          <Link
            to="/inventory"
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            在庫一覧に戻る
          </Link>
        </div>

        {!stockHistory || stockHistory.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">履歴がありません</h3>
            <p className="mt-1 text-sm text-gray-500">
              入出庫の記録がここに表示されます
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([date, records]) => (
              <div key={date}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 sticky top-0 bg-white py-2">
                  {date}
                </h3>
                <div className="space-y-3">
                  {records.map(record => {
                    const typeInfo = getTypeLabel(record.type);
                    const time = new Date(record.createdAt).toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div key={record.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-400">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className="text-sm text-gray-500">{time}</span>
                            </div>
                            <h4 className="text-base font-semibold text-gray-900">
                              {getItemName(record.itemId)}
                            </h4>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">変更前:</span>
                                <span className="ml-2 font-semibold text-gray-900">
                                  {record.previousQuantity}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">変更後:</span>
                                <span className="ml-2 font-semibold text-gray-900">
                                  {record.newQuantity}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">増減:</span>
                                <span className={`ml-2 font-semibold ${
                                  record.quantity > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {record.quantity > 0 ? '+' : ''}{record.quantity}
                                </span>
                              </div>
                            </div>
                            {record.notes && (
                              <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                メモ: {record.notes}
                              </p>
                            )}
                          </div>

                          {/* アクションボタン */}
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => setEditingRecordId(record.id!)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                              aria-label="訂正"
                              title="訂正"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 訂正フォーム */}
      {editingRecordId && (() => {
        const record = stockHistory?.find(r => r.id === editingRecordId);
        if (!record) return null;
        return (
          <StockHistoryEditForm
            recordId={record.id!}
            itemId={record.itemId}
            originalQuantity={record.quantity}
            originalType={record.type}
            onCancel={() => setEditingRecordId(null)}
            onSuccess={() => {
              setEditingRecordId(null);
            }}
          />
        );
      })()}
    </div>
  );
}
