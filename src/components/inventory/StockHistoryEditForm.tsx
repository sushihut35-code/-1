import { useState } from 'react';
import { db } from '../../db/db';
import { useItems } from '../../composables/useInventory';

interface StockHistoryEditFormProps {
  recordId: number;
  itemId: number;
  originalQuantity: number;
  originalType: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function StockHistoryEditForm({
  recordId,
  itemId,
  originalQuantity,
  originalType,
  onCancel,
  onSuccess
}: StockHistoryEditFormProps) {
  const items = useItems();
  const [newQuantity, setNewQuantity] = useState<number>(originalQuantity);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const item = items?.find(i => i.id === itemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await db.transaction('rw', [db.stockHistory, db.items, db.notifications], async () => {
        // 元の履歴を取得
        const history = await db.stockHistory.get(recordId);
        if (!history) throw new Error('履歴が見つかりません');

        // 在庫に戻す（元の履歴の影響を取り除く）
        const revertQuantity = history.type === 'in' ? -history.quantity : history.quantity;
        const currentQuantity = item?.quantity || 0;
        const revertedQuantity = currentQuantity + revertQuantity;

        // 新しい数量で在庫を更新
        const adjustedQuantity = history.type === 'in'
          ? revertedQuantity + newQuantity
          : revertedQuantity - newQuantity;

        // 在庫を更新
        await db.items.update(itemId, {
          quantity: adjustedQuantity,
          updatedAt: new Date()
        });

        // 新しい履歴を追加（調整として記録）
        await db.stockHistory.add({
          itemId,
          type: 'adjustment',
          quantity: adjustedQuantity - currentQuantity,
          previousQuantity: currentQuantity,
          newQuantity: adjustedQuantity,
          notes: `履歴#${recordId}を訂正: ${originalType} ${originalQuantity} → ${newTypeLabel(newQuantity, originalType)}${notes ? `. メモ: ${notes}` : ''}`,
          createdAt: new Date()
        });

        // 元の履歴を削除
        await db.stockHistory.delete(recordId);

        // 在庫不足チェック
        if (item && adjustedQuantity <= item.minStock) {
          await db.notifications.add({
            type: 'low_stock',
            itemId,
            message: `${item.name}の在庫が不足しています（残り: ${adjustedQuantity}${item.unit || ''}）`,
            read: false,
            createdAt: new Date()
          });
        }
      });

      onSuccess();
    } catch (error) {
      console.error('Failed to edit stock history:', error);
      alert('履歴の訂正に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const newTypeLabel = (qty: number, type: string) => {
    if (type === 'in') return `入庫 ${qty}`;
    if (type === 'out') return `出庫 ${qty}`;
    return `${qty}`;
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        zIndex: 999999,
        backgroundColor: '#000000'
      }}
    >
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto text-white">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            履歴の訂正
          </h2>

          {item && (
            <div className="bg-gray-700 p-3 rounded-md mb-4">
              <p className="text-sm">
                <span style={{color: '#FFD700'}}>商品:</span> {item.name}
              </p>
              <p className="text-sm mt-1">
                <span style={{color: '#FFD700'}}>現在の在庫:</span> {item.quantity} {item.unit || ''}
              </p>
              <p className="text-sm mt-1">
                <span style={{color: '#FFD700'}}>元の記録:</span> {newTypeLabel(originalQuantity, originalType)}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="newQuantity" className="block text-sm font-medium mb-1" style={{color: '#FFD700', fontSize: '16px', fontWeight: 'bold'}}>
                新しい数量 <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                id="newQuantity"
                value={newQuantity}
                onChange={(e) => setNewQuantity(Number(e.target.value))}
                required
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                {originalType === 'in' ? '入庫数' : '出庫数'}を変更します
              </p>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1" style={{color: '#FFD700', fontSize: '16px', fontWeight: 'bold'}}>
                訂正理由
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="訂正理由（オプション）"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-8 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-8 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? '訂正中...' : '訂正'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
