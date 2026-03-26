import { useState } from 'react';
import { useItems } from '../../composables/useInventory';
import { ButtonLoading } from '../common/LoadingSpinner';

interface StockInFormProps {
  onSubmit: (itemId: number, quantity: number, notes?: string, date?: Date) => Promise<void>;
  onCancel: () => void;
  preselectedItemId?: number;
}

export function StockInForm({ onSubmit, onCancel, preselectedItemId }: StockInFormProps) {
  const items = useItems();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(preselectedItemId || null);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [stockDate, setStockDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || quantity < 0) {
      alert('商品を選択し、入庫数を入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const date = stockDate ? new Date(stockDate) : undefined;
      await onSubmit(selectedItemId, quantity, notes, date);
    } catch (error) {
      console.error('Failed to record stock in:', error);
      alert('入庫の記録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedItem = items?.find(item => item.id === selectedItemId);

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
            入庫登録
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="item" className="block text-sm font-medium mb-1" style={{color: '#FFD700', fontSize: '16px', fontWeight: 'bold'}}>
                商品 <span className="text-red-600">*</span>
              </label>
              <select
                id="item"
                value={selectedItemId || ''}
                onChange={(e) => setSelectedItemId(e.target.value ? Number(e.target.value) : null)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">商品を選択</option>
                {items?.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}（現在の在庫: {item.quantity} {item.unit || ''}）
                  </option>
                ))}
              </select>
            </div>

            {selectedItem && (
              <div className="bg-gray-700 p-3 rounded-md">
                <p className="text-sm">
                  <span style={{color: '#FFD700'}}>現在の在庫:</span> {selectedItem.quantity} {selectedItem.unit || ''}
                </p>
                <p className="text-sm mt-1">
                  <span style={{color: '#FFD700'}}>入庫後の在庫:</span> {selectedItem.quantity + quantity} {selectedItem.unit || ''}
                </p>
              </div>
            )}

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium mb-1" style={{color: '#FFD700', fontSize: '16px', fontWeight: 'bold'}}>
                入庫数 <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="stockDate" className="block text-sm font-medium mb-1" style={{color: '#FFD700', fontSize: '16px', fontWeight: 'bold'}}>
                入庫日
              </label>
              <input
                type="date"
                id="stockDate"
                value={stockDate}
                onChange={(e) => setStockDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1" style={{color: '#FFD700', fontSize: '16px', fontWeight: 'bold'}}>
                メモ
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="入庫に関するメモ（オプション）"
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
                className="flex-1 px-4 py-8 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={isSubmitting || !selectedItemId}
              >
                {isSubmitting ? <ButtonLoading message="登録中..." /> : '入庫'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
