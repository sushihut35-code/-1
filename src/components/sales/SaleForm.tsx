import { useState, useEffect } from 'react';
import { useItems } from '../../composables/useInventory';
import { Item } from '../../db/db';
import { ButtonLoading } from '../common/LoadingSpinner';

interface SaleFormProps {
  onSubmit: (sale: {
    itemId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    paymentMethod: 'cash' | 'card' | 'electronic' | 'other';
    customerId?: number;
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function SaleForm({ onSubmit, onCancel }: SaleFormProps) {
  const items = useItems();

  console.log('SaleForm rendered, items:', items);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'electronic' | 'other'>('cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPrice = unitPrice * quantity;

  useEffect(() => {
    if (selectedItem) {
      setUnitPrice(selectedItem.price || 0);
    }
  }, [selectedItem]);

  // itemsがundefinedまたは空の場合のハンドリング
  if (!items || items.length === 0) {
    console.log('No items available, showing error');
    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 99999999, backgroundColor: '#000000' }}
      >
        <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 text-white text-center">
          <h2 className="text-xl font-bold text-white mb-4">エラー</h2>
          <p className="text-white">商品が登録されていません。先に商品を登録してください。</p>
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  console.log('Rendering SaleForm with', items.length, 'items');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      alert('商品を選択してください');
      return;
    }

    if (quantity > selectedItem.quantity) {
      alert('在庫が不足しています');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        itemId: selectedItem.id!,
        quantity,
        unitPrice,
        totalPrice,
        paymentMethod,
        notes: notes || undefined,
      });
    } catch (error) {
      console.error('Failed to create sale:', error);
      alert('売上の登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 999999999,
        backgroundColor: 'rgba(0, 0, 0, 0.98)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto text-white" style={{ border: '2px solid #FFD700' }}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4" style={{ borderBottom: '1px solid #FFD700', paddingBottom: '10px' }}>売上登録</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="item" className="block text-sm font-medium mb-1" style={{color: '#FFD700', fontSize: '16px', fontWeight: 'bold'}}>
                商品 <span className="text-red-600">*</span>
              </label>
              <select
                id="item"
                value={selectedItem?.id || ''}
                onChange={(e) => {
                  const item = items?.find(i => i.id === Number(e.target.value));
                  setSelectedItem(item || null);
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">商品を選択</option>
                {items?.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} - 在庫: {item.quantity} {item.unit || ''} - ¥{item.price?.toLocaleString() || 0}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium mb-1" style={{color: '#FFD700', fontSize: '16px', fontWeight: 'bold'}}>
                数量 <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                min="1"
                max={selectedItem?.quantity || 1}
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
              {selectedItem && (
                <p className="text-xs text-gray-400 mt-1">
                  在庫: {selectedItem.quantity} {selectedItem.unit || ''}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="unitPrice" className="block text-sm font-medium mb-1" style={{color: '#FFD700', fontSize: '16px', fontWeight: 'bold'}}>
                単価 <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                id="unitPrice"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                required
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>

            <div className="bg-gray-700 p-4 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-white">合計:</span>
                <span className="text-2xl font-bold text-green-400">
                  ¥{totalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium mb-1" style={{color: '#FFD700', fontSize: '16px', fontWeight: 'bold'}}>
                支払い方法 <span className="text-red-600">*</span>
              </label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="cash">現金</option>
                <option value="card">カード</option>
                <option value="electronic">電子マネー</option>
                <option value="other">その他</option>
              </select>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                placeholder="メモを入力（オプション）"
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
                className="flex-1 px-4 py-8 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? <ButtonLoading message="登録中..." /> : '登録'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
