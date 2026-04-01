import { useState, useEffect } from 'react';
import { Customer } from '../../db/db';
import { useCustomerItems, deleteCustomerItem, markAsPaid, markSelectedAsPaid, usePaidItems, addEvidenceImage, removeEvidenceImage, addKeepItemWithImage } from '../../composables/useCustomerItems';
import { useCustomerShippingLabels } from '../../composables/useShippingLabels';
import { useToast } from '../common/Toast';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ShippingLabelGenerator } from './ShippingLabelGenerator';
import { generateShippingLabelPDF } from '../../utils/shippingLabelPDF';

interface CustomerDetailProps {
  customer: Customer;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomerDetail({ customer, onEdit, onDelete }: CustomerDetailProps) {
  const customerItems = useCustomerItems(customer.id);
  const paidItems = usePaidItems(customer.id);
  const shippingLabels = useCustomerShippingLabels(customer.id);
  const [showAddItem, setShowAddItem] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [selectedItemForEvidence, setSelectedItemForEvidence] = useState<number | null>(null);
  const [newKeepItem, setNewKeepItem] = useState({
    itemName: '',
    itemPrice: 0,
    itemImage: '' as string | null,
    evidenceImages: [] as string[]
  });
  const [showShippingLabelModal, setShowShippingLabelModal] = useState(false);
  const { showToast } = useToast();

  // 現在の保有額をstateに保存（強制的に再レンダリング）
  const [currentKeepAmount, setCurrentKeepAmount] = useState(0);

  // customerItemsが変更されたら再計算
  useEffect(() => {
    const amount = customerItems && customerItems.length > 0
      ? customerItems.reduce((sum, item) => sum + (item.itemPrice || 0), 0)
      : 0;
    setCurrentKeepAmount(amount);
  }, [customerItems]);

  const handleAddKeepItem = async () => {
    if (!customer.id) return;

    if (!newKeepItem.itemName.trim()) {
      showToast('商品名を入力してください', 'error');
      return;
    }

    if (newKeepItem.itemPrice <= 0) {
      showToast('金額を入力してください', 'error');
      return;
    }

    if (!newKeepItem.itemImage) {
      showToast('キープ画像をアップロードしてください', 'error');
      return;
    }

    try {
      await addKeepItemWithImage(
        customer.id,
        newKeepItem.itemName,
        newKeepItem.itemPrice,
        newKeepItem.itemImage,
        newKeepItem.evidenceImages
      );
      showToast('キープ商品を追加しました', 'success');
      setNewKeepItem({
        itemName: '',
        itemPrice: 0,
        itemImage: null,
        evidenceImages: []
      });
      setShowAddItem(false);
    } catch (error) {
      console.error('Failed to add keep item:', error);
      showToast('キープ商品の追加に失敗しました', 'error');
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

    console.log('confirmMarkAsPaid - starting payment process');
    console.log('confirmMarkAsPaid - customer.id:', customer.id);
    console.log('confirmMarkAsPaid - selectedItems:', selectedItems);

    setIsProcessing(true);
    setShowPaidConfirm(false);
    try {
      if (selectedItems.length > 0) {
        // 選択した商品のみを支払い済みに
        console.log('confirmMarkAsPaid - marking selected items as paid');
        await markSelectedAsPaid(customer.id, selectedItems);
        setSelectedItems([]);
        showToast(`選択した${selectedItems.length}点の商品を支払い済みに移動しました`, 'success');
      } else {
        // 全商品を支払い済みに
        console.log('confirmMarkAsPaid - marking all items as paid');
        await markAsPaid(customer.id);
        showToast('支払い済みに移動しました', 'success');
      }
      console.log('confirmMarkAsPaid - payment completed successfully');
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

  // 証拠画像を追加
  const handleAddEvidenceImage = async (customerItemId: number, file: File) => {
    try {
      // ファイルをBase64に変換
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageData = reader.result as string;
        await addEvidenceImage(customerItemId, imageData);
        showToast('証拠画像を追加しました', 'success');
      };
      reader.onerror = () => {
        showToast('画像の読み込みに失敗しました', 'error');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to add evidence image:', error);
      showToast('証拠画像の追加に失敗しました', 'error');
    }
  };

  // 証拠画像を削除
  const handleRemoveEvidenceImage = async (customerItemId: number, imageIndex: number) => {
    try {
      await removeEvidenceImage(customerItemId, imageIndex);
      showToast('証拠画像を削除しました', 'success');
    } catch (error) {
      console.error('Failed to remove evidence image:', error);
      showToast('証拠画像の削除に失敗しました', 'error');
    }
  };

  // 証拠画像ダイアログを開く
  const openEvidenceDialog = (itemId: number) => {
    setSelectedItemForEvidence(itemId);
    setShowEvidenceDialog(true);
  };

  // 送り状を再生成
  const handleRegenerateLabel = async (labelId: number) => {
    try {
      const { db } = await import('../../db/db');
      const label = await db.shippingLabels.get(labelId);
      if (label) {
        generateShippingLabelPDF(label);
        await db.shippingLabels.update(labelId, { status: 'printed' });
        showToast('送り状を再生成しました', 'success');
      }
    } catch (error) {
      console.error('Failed to regenerate shipping label:', error);
      showToast('送り状の再生成に失敗しました', 'error');
    }
  };

  // 支払い済み商品を日付でグループ化
  const groupPaidItemsByDate = (items: typeof paidItems) => {
    if (!items) return {};

    const grouped: Record<string, typeof items> = {};
    items.forEach(item => {
      if (item.paidAt) {
        const date = new Date(item.paidAt).toLocaleDateString('ja-JP');
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(item);
      }
    });

    return grouped;
  };

  const groupedPaidItems = groupPaidItemsByDate(paidItems);

  // 選択した商品の合計金額を計算
  const selectedTotalAmount = customerItems
    ?.filter(item => item.id && selectedItems.includes(item.id))
    .reduce((sum, item) => sum + (item.itemPrice || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* 顧客情報 */}
      <div className="bg-white rounded-lg shadow-md p-6" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{customer.name}</h3>
            {customer.nickname && (
              <p className="text-base text-gray-600 mt-1">💬 {customer.nickname}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              編集
            </button>
            <button
              onClick={() => customer.id && onDelete()}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              削除
            </button>
          </div>
        </div>

        {/* 連絡先情報 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2">
          <p className="text-sm font-semibold text-gray-700 mb-3">連絡先</p>
          {customer.email && (
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <span>📧</span>
              <span>{customer.email}</span>
            </p>
          )}
          {customer.phone && (
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <span>📞</span>
              <span>{customer.phone}</span>
            </p>
          )}
          {customer.address && (
            <p className="text-sm text-gray-700 flex items-start gap-2">
              <span className="flex-shrink-0">📍</span>
              <span className="break-words">{customer.address}</span>
            </p>
          )}
        </div>

        {/* 金額情報 */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">金額情報</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-green-50 border border-green-300 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-900">💰 支払い済み合計</p>
              <p className="text-2xl font-bold text-green-600">
                ¥{((customer.totalAmount || 0)).toLocaleString()}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-900">💰 現在のキープ額</p>
              <p className="text-2xl font-bold text-yellow-600" key={`keep-amount-${currentKeepAmount}`}>
                ¥{currentKeepAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* メモ */}
        {customer.notes && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-2">📝 メモ</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
          </div>
        )}
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
              {showAddItem ? '閉じる' : 'キープ画像を追加'}
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

        {/* キープ商品追加フォーム */}
        {showAddItem && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">キープ商品を追加</h4>
            <div className="space-y-3">
              {/* 商品名 */}
              <div>
                <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
                  商品名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="itemName"
                  value={newKeepItem.itemName}
                  onChange={(e) => setNewKeepItem({...newKeepItem, itemName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="例: サマーセット"
                />
              </div>

              {/* 金額 */}
              <div>
                <label htmlFor="itemPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  金額 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="itemPrice"
                  value={newKeepItem.itemPrice || ''}
                  onChange={(e) => setNewKeepItem({...newKeepItem, itemPrice: parseInt(e.target.value) || 0})}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="例: 5000"
                />
              </div>

              {/* キープ画像（メイン） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  キープ画像（証拠写真） <span className="text-red-500">*</span>
                </label>
                <div className="flex items-start gap-3">
                  {newKeepItem.itemImage ? (
                    <div className="relative">
                      <img
                        src={newKeepItem.itemImage}
                        alt="キープ画像"
                        loading="lazy"
                        className="w-24 h-24 object-cover rounded border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => setNewKeepItem({...newKeepItem, itemImage: null})}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full text-sm hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-gray-400">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewKeepItem({...newKeepItem, itemImage: reader.result as string});
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <span className="text-2xl">📷</span>
                    </label>
                  )}
                  <p className="text-xs text-gray-500">配信で購入した際の証拠写真（スクショなど）をアップロードしてください</p>
                </div>
              </div>

              {/* 追加の証拠画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  追加の証拠画像（オプション）
                </label>
                <div className="flex flex-wrap gap-2">
                  {newKeepItem.evidenceImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={img}
                        alt={`証拠${idx + 1}`}
                        loading="lazy"
                        className="w-16 h-16 object-cover rounded border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = newKeepItem.evidenceImages.filter((_, i) => i !== idx);
                          setNewKeepItem({...newKeepItem, evidenceImages: newImages});
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-xs hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="flex items-center justify-center w-16 h-16 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-gray-400">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewKeepItem({
                              ...newKeepItem,
                              evidenceImages: [...newKeepItem.evidenceImages, reader.result as string]
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <span className="text-xl">+</span>
                  </label>
                </div>
              </div>

              {/* 追加ボタン */}
              <button
                onClick={handleAddKeepItem}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
              >
                キープ商品を追加
              </button>
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
                      loading="lazy"
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

                  {/* 証拠画像プレビューと追加ボタン */}
                  <div className="mt-2 space-y-1">
                    {(item.evidenceImages && item.evidenceImages.length > 0) && (
                      <div className="flex gap-1 flex-wrap">
                        {item.evidenceImages.slice(0, 3).map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`証拠${idx + 1}`}
                            loading="lazy"
                            className="w-12 h-12 object-cover rounded border border-gray-300"
                          />
                        ))}
                        {item.evidenceImages.length > 3 && (
                          <div className="w-12 h-12 bg-gray-200 rounded border border-gray-300 flex items-center justify-center text-xs text-gray-600">
                            +{item.evidenceImages.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        item.id && openEvidenceDialog(item.id);
                      }}
                      className="w-full px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
                    >
                      📷 証拠画像 {item.evidenceImages?.length || 0}
                    </button>
                  </div>

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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">✅ 支払い済み商品</h3>
          {(paidItems?.length || 0) > 0 && (
            <button
              onClick={() => setShowShippingLabelModal(true)}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              📦 送り状を作成
            </button>
          )}
        </div>
        {(paidItems?.length || 0) === 0 ? (
          <p className="text-center text-gray-500 py-8">支払い済み商品がありません</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPaidItems)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, items]) => {
                const dateTotal = items.reduce((sum, item) => sum + (item.itemPrice || 0), 0);
                return (
                  <div key={date} className="bg-blue-50 border-2 border-blue-300 rounded-lg overflow-hidden">
                    {/* フォルダ風ヘッダー */}
                    <div className="bg-blue-100 border-b-2 border-blue-300 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📁</span>
                          <div>
                            <h4 className="text-lg font-bold text-blue-900">{date}</h4>
                            <p className="text-xs text-blue-700">💳 {items.length}点の商品</p>
                          </div>
                        </div>
                        <div className="text-right bg-white px-4 py-2 rounded-lg border border-blue-300">
                          <p className="text-xs text-blue-600 font-semibold">合計金額</p>
                          <p className="text-2xl font-bold text-green-600">¥{dateTotal.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* 商品一覧（フォルダ内） */}
                    <div className="p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {items.map((item) => (
                          <div key={item.id} className="bg-white rounded-lg p-2 shadow-sm border border-gray-200">
                            {item.itemImage ? (
                              <img
                                src={item.itemImage}
                                alt={item.itemName}
                                loading="lazy"
                                className="w-full aspect-square object-cover rounded-lg border border-green-300"
                              />
                            ) : (
                              <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center border border-green-300">
                                <span className="text-2xl">📦</span>
                              </div>
                            )}
                            <div className="mt-2">
                              <p className="text-xs text-gray-900 font-semibold truncate">{item.itemName}</p>
                              <p className="text-sm text-green-600 font-bold">¥{(item.itemPrice || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
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
        details={
          <div>
            <div className="mb-2">
              <span className="font-semibold text-gray-900">合計金額: </span>
              <span className="font-bold text-green-600">
                ¥{(selectedItems.length > 0
                  ? selectedTotalAmount
                  : customerItems?.reduce((sum: number, item) => sum + (item.itemPrice || 0), 0) || 0
                ).toLocaleString()}
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto border-t border-gray-200 pt-2 mt-2">
              <p className="font-semibold text-gray-900 mb-2">移動する商品:</p>
              <div className="space-y-1">
                {(selectedItems.length > 0
                  ? customerItems?.filter(item => item.id && selectedItems.includes(item.id))
                  : customerItems
                )?.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs flex-shrink-0">
                      {item.itemImage ? '📷' : '📦'}
                    </div>
                    <span className="flex-1 truncate">{item.itemName}</span>
                    <span className="text-gray-600">¥{(item.itemPrice || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
        type="info"
        confirmText="支払い済みに移動"
        cancelText="キャンセル"
        onConfirm={confirmMarkAsPaid}
        onCancel={() => setShowPaidConfirm(false)}
      />

      {/* 証拠画像管理ダイアログ */}
      {showEvidenceDialog && selectedItemForEvidence && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">📷 証拠画像管理</h3>
                <button
                  onClick={() => setShowEvidenceDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                {(() => {
                  const currentItem = customerItems?.find(item => item.id === selectedItemForEvidence);
                  return currentItem ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">商品:</span> {currentItem.itemName}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {(currentItem.evidenceImages || []).map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={img}
                              alt={`証拠${idx + 1}`}
                              loading="lazy"
                              className="w-full aspect-square object-cover rounded-lg border border-gray-300"
                            />
                            <button
                              onClick={() => currentItem.id && handleRemoveEvidenceImage(currentItem.id!, idx)}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              title="削除"
                            >
                              ×
                            </button>
                            <p className="text-xs text-gray-500 mt-1 text-center">#{idx + 1}</p>
                          </div>
                        ))}
                        {(currentItem.evidenceImages || []).length === 0 && (
                          <p className="col-span-full text-center text-gray-500 py-8">
                            証拠画像がありません
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block">
                  <span className="sr-only">証拠画像を追加</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && selectedItemForEvidence) {
                        handleAddEvidenceImage(selectedItemForEvidence, file);
                        e.target.value = ''; // Reset input
                      }
                    }}
                  />
                  <div className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium cursor-pointer">
                    📷 証拠画像を追加
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 送り状一覧 */}
      <div className="bg-white rounded-lg shadow-md p-6" style={{ backgroundColor: '#FFFFFF' }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📦 送り状履歴</h3>
        {(!shippingLabels || shippingLabels.length === 0) ? (
          <p className="text-center text-gray-500 py-8">送り状がありません</p>
        ) : (
          <div className="space-y-3">
            {shippingLabels.map((label) => (
              <div key={label.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {label.carrier === 'yuupack' ? '📦 ゆうパック' : '🚚 クロネコヤマト'}
                    </p>
                    <p className="text-xs text-gray-600">送り状番号: {label.labelNumber}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    label.status === 'draft'
                      ? 'bg-gray-100 text-gray-700'
                      : label.status === 'printed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {label.status === 'draft' ? '作成中' : label.status === 'printed' ? '印刷済' : '発送済'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-1 mb-3">
                  <p>📅 {new Date(label.shippingDate).toLocaleDateString('ja-JP')}</p>
                  <p>📦 {label.items.length}点の商品</p>
                  <p>💰 ¥{label.totalValue.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => label.id && handleRegenerateLabel(label.id)}
                  className="w-full px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                >
                  📄 PDFを再ダウンロード
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 送り状作成モーダル */}
      {showShippingLabelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">📦 送り状を作成</h3>
                <button
                  onClick={() => setShowShippingLabelModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <ShippingLabelGenerator
                customerId={customer.id}
                customerName={customer.name}
                customerAddress={customer.address}
                customerPhone={customer.phone}
                onClose={() => setShowShippingLabelModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
