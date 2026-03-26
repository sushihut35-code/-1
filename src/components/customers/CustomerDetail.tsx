import { useState } from 'react';
import { Customer } from '../../db/db';
import { useItems } from '../../composables/useInventory';
import { useCustomerItems, addCustomerItem, deleteCustomerItem, markAsPaid, markSelectedAsPaid, usePaidItems } from '../../composables/useCustomerItems';
import { useToast } from '../common/Toast';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface CustomerDetailProps {
  customer: Customer;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomerDetail({ customer, onEdit, onDelete }: CustomerDetailProps) {
  const items = useItems();
  const customerItems = useCustomerItems(customer.id);
  const paidItems = usePaidItems(customer.id);
  const [showAddItem, setShowAddItem] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const { showToast } = useToast();

  const handleAddItem = async (itemId: number) => {
    if (!customer.id) return;

    const item = items?.find(i => i.id === itemId);
    if (!item) return;

    try {
      await addCustomerItem(customer.id, item);
      showToast('商品を追加しました', 'success');
      setShowAddItem(false);
    } catch (error) {
      console.error('Failed to add item:', error);
      const errorMessage = error instanceof Error ? error.message : '商品の追加に失敗しました';
      showToast(errorMessage, 'error');
    }
  };

  const handleRemoveItem = async (id: number) => {
    try {
      await deleteCustomerItem(id);
      showToast('商品を削除しました', 'success');
    } catch (error) {
      console.error('Failed to remove item:', error);
      showToast('商品の削除に失敗しました', 'error');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!customer.id) return;

    if ((customerItems?.length || 0) === 0) {
      showToast('キープ中の商品がないため、支払い処理を行えません', 'error');
      return;
    }

    setShowPaidConfirm(true);
  };

  const confirmMarkAsPaid = async () => {
    if (!customer.id) return;

    setIsProcessing(true);
    setShowPaidConfirm(false);
    try {
      if (selectedItems.length > 0) {
        // 選択した商品のみを支払い済みに
        await markSelectedAsPaid(customer.id, selectedItems);
        setSelectedItems([]);
        showToast(`選択した${selectedItems.length}点の商品を支払い済みに移動しました`, 'success');
      } else {
        // 全商品を支払い済みに
        await markAsPaid(customer.id);
        showToast('支払い済みに移動しました', 'success');
      }
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      showToast('支払い済みへの移動に失敗しました。もう一度お試しください', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleItemSelection = (itemId: number) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAllItems = () => {
    if (customerItems) {
      const allIds = customerItems.map(item => item.id!).filter(Boolean);
      setSelectedItems(allIds);
    }
  };

  const deselectAllItems = () => {
    setSelectedItems([]);
  };

  // 合計金額を計算
  const totalAmount = customerItems?.reduce((sum, item) => sum + (item.itemPrice || 0), 0) || 0;
  const selectedTotalAmount = customerItems
    ?.filter(item => item.id && selectedItems.includes(item.id))
    .reduce((sum, item) => sum + (item.itemPrice || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* 顧客情報 */}
      <div className="bg-white rounded-lg shadow-md p-6" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            {customer.image ? (
              <img
                src={customer.image}
                alt={customer.name}
                className="w-20 h-20 object-cover rounded-lg border border-gray-300"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-gray-900">{customer.name}</h3>
              {customer.nickname && (
                <p className="text-sm text-gray-500">💬 {customer.nickname}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              編集
            </button>
            <button
              onClick={() => customer.id && onDelete()}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              削除
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {customer.email && <p className="text-sm text-gray-600">📧 {customer.email}</p>}
          {customer.phone && <p className="text-sm text-gray-600">📞 {customer.phone}</p>}
          {customer.address && <p className="text-sm text-gray-600">📍 {customer.address}</p>}
          <div className="flex gap-2">
            <div className="bg-green-50 border border-green-300 rounded-lg p-3 flex-1">
              <p className="text-sm font-semibold text-gray-900">💰 支払い済み合計</p>
              <p className="text-2xl font-bold text-green-600">
                ¥{((customer.totalAmount || 0)).toLocaleString()}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex-1">
              <p className="text-sm font-semibold text-gray-900">💰 現在のキープ金額</p>
              <p className="text-2xl font-bold text-yellow-600">
                ¥{(customerItems?.reduce((sum, item) => sum + (item.itemPrice || 0), 0) || 0).toLocaleString()}
              </p>
            </div>
          </div>
          {customer.notes && <p className="text-sm text-gray-600">📝 {customer.notes}</p>}
        </div>
      </div>

      {/* キープ中の商品（未支払い商品） */}
      <div className="bg-white rounded-lg shadow-md p-6" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">🛒 キープ中の商品</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
            >
              {showAddItem ? '閉じる' : '商品を追加'}
            </button>
            {(customerItems?.length || 0) > 0 && (
              <button
                onClick={handleMarkAsPaid}
                disabled={isProcessing}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? '支払い処理中...' : '💰 支払い済み'}
              </button>
            )}
          </div>
        </div>

        {/* 商品追加ドロップダウン */}
        {showAddItem && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">商品を選択してください：</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items?.map((item) => (
                <button
                  key={item.id}
                  onClick={() => item.id && handleAddItem(item.id)}
                  className="flex flex-col items-center p-2 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full aspect-square object-cover rounded mb-1"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-200 rounded mb-1 flex items-center justify-center">
                      <span className="text-2xl">📦</span>
                    </div>
                  )}
                  <p className="text-xs text-center text-gray-900 truncate">{item.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 購入商品一覧 */}
        {(customerItems?.length || 0) === 0 ? (
          <p className="text-center text-gray-500 py-8">キープ中の商品がありません。「商品を追加」ボタンから商品を追加してください。</p>
        ) : (
          <div>
            {/* 選択コントロール */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
              <div className="flex gap-2">
                <button
                  onClick={selectAllItems}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  disabled={selectedItems.length === (customerItems?.length || 0)}
                >
                  すべて選択
                </button>
                <button
                  onClick={deselectAllItems}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  disabled={selectedItems.length === 0}
                >
                  選択解除
                </button>
              </div>
              <span className="text-sm text-gray-600">
                {selectedItems.length > 0
                  ? `${selectedItems.length}点選択（¥${selectedTotalAmount.toLocaleString()}）`
                  : `${customerItems?.length || 0}点の商品`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {customerItems?.map((item) => (
                <div
                  key={item.id}
                  className={`relative cursor-pointer border-2 rounded-lg transition-all ${
                    selectedItems.includes(item.id!)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  onClick={() => item.id && toggleItemSelection(item.id)}
                >
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id!)}
                      onChange={() => item.id && toggleItemSelection(item.id)}
                      className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {item.itemImage ? (
                    <img
                      src={item.itemImage}
                      alt={item.itemName}
                      className={`w-full aspect-square object-cover rounded-lg ${
                        selectedItems.includes(item.id!) ? 'opacity-75' : ''
                      }`}
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📦</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      item.id && handleRemoveItem(item.id);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full text-sm hover:bg-red-700 transition-colors z-10"
                  >
                    ×
                  </button>
                  <p className="text-sm text-gray-900 mt-1 truncate">{item.itemName}</p>
                  <p className="text-xs text-gray-500">¥{(item.itemPrice || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* 部分支払いボタン */}
            {selectedItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleMarkAsPaid}
                  disabled={isProcessing}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isProcessing
                    ? '支払い処理中...'
                    : `選択した${selectedItems.length}点を支払い済みに移動（¥${selectedTotalAmount.toLocaleString()}）`
                  }
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 支払い済み商品 */}
      <div className="bg-white rounded-lg shadow-md p-6" style={{ backgroundColor: '#FFFFFF' }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ 支払い済み商品</h3>
        {(paidItems?.length || 0) === 0 ? (
          <p className="text-center text-gray-500 py-8">支払い済み商品がありません</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {paidItems?.map((item) => (
              <div key={item.id}>
                {item.itemImage ? (
                  <img
                    src={item.itemImage}
                    alt={item.itemName}
                    className="w-full aspect-square object-cover rounded-lg border border-green-300"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center border border-green-300">
                    <span className="text-2xl">📦</span>
                  </div>
                )}
                <p className="text-sm text-gray-900 mt-1 truncate">{item.itemName}</p>
                <p className="text-xs text-gray-500">
                  {item.paidAt && new Date(item.paidAt).toLocaleDateString('ja-JP')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 支払い確認ダイアログ */}
      <ConfirmDialog
        isOpen={showPaidConfirm}
        title="支払い済みに移動"
        message={
          selectedItems.length > 0
            ? `選択した${selectedItems.length}点の商品を支払い済みに移動してもよろしいですか？`
            : `${customerItems?.length || 0}点の商品すべてを支払い済みに移動してもよろしいですか？`
        }
        details={`合計金額: ¥${(selectedItems.length > 0 ? selectedTotalAmount : totalAmount).toLocaleString()}`}
        confirmText="支払い済みに移動"
        cancelText="キャンセル"
        type="info"
        onConfirm={confirmMarkAsPaid}
        onCancel={() => setShowPaidConfirm(false)}
      />
    </div>
  );
}
