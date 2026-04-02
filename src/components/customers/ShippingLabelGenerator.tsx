import { useState, useEffect } from 'react';
import { usePaidItems } from '../../composables/useCustomerItems';
import { createShippingLabel } from '../../composables/useShippingLabels';
import { generateShippingLabelPDF } from '../../utils/shippingLabelPDF';
import { useToast } from '../common/Toast';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface ShippingLabelGeneratorProps {
  customerId: number | undefined;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  onClose: () => void;
}

type Carrier = 'yuupack' | 'yamato' | 'sagawa';

// localStorageから送り元情報を読み込む
function loadSenderInfo(): { name: string; address: string; phone: string } {
  try {
    const saved = localStorage.getItem('sender_info');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load sender info:', e);
  }
  return { name: '', address: '', phone: '' };
}

export function ShippingLabelGenerator({
  customerId,
  customerName,
  customerAddress,
  customerPhone,
  onClose
}: ShippingLabelGeneratorProps) {
  const paidItems = usePaidItems(customerId);
  const { showToast } = useToast();

  const savedSender = loadSenderInfo();

  const [carrier, setCarrier] = useState<Carrier>('yuupack');
  const [senderName, setSenderName] = useState(savedSender.name);
  const [senderAddress, setSenderAddress] = useState(savedSender.address);
  const [senderPhone, setSenderPhone] = useState(savedSender.phone);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 商品選択のトグル
  const toggleItemSelection = (itemId: number) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // 全選択/全解除
  const selectAll = () => {
    if (paidItems) {
      setSelectedItemIds(paidItems.map(item => item.id!).filter(Boolean));
    }
  };

  const deselectAll = () => {
    setSelectedItemIds([]);
  };

  // 選択した商品の合計金額
  const selectedTotal = paidItems
    ?.filter(item => item.id && selectedItemIds.includes(item.id))
    .reduce((sum, item) => sum + (item.itemPrice || 0), 0) || 0;

  // 送り状作成
  const handleCreateLabel = async () => {
    if (!customerId) return;

    // バリデーション
    if (!customerAddress || !customerPhone) {
      showToast('お届け先情報が不足しています。顧客の住所と電話番号を登録してください。', 'error');
      return;
    }

    if (!senderName.trim() || !senderAddress.trim() || !senderPhone.trim()) {
      showToast('送り元情報を入力してください', 'error');
      return;
    }

    if (selectedItemIds.length === 0) {
      showToast('商品を少なくとも1つ選択してください', 'error');
      return;
    }

    setShowConfirm(true);
  };

  const confirmCreateLabel = async () => {
    if (!customerId) return;

    setIsProcessing(true);
    setShowConfirm(false);

    try {
      // 送り状を作成
      const labelId = await createShippingLabel(
        customerId,
        carrier,
        senderName,
        senderAddress,
        senderPhone,
        selectedItemIds
      );

      // 作成した送り状を取得してPDF生成
      const { db } = await import('../../db/db');
      const label = await db.shippingLabels.get(labelId);

      if (label) {
        generateShippingLabelPDF(label);
        await db.shippingLabels.update(labelId, { status: 'printed' });
        showToast(`送り状 ${label.labelNumber} を作成しました`, 'success');
        onClose();
      }
    } catch (error) {
      console.error('Failed to create shipping label:', error);
      showToast(error instanceof Error ? error.message : '送り状の作成に失敗しました', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 配送業者選択 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          配送業者
        </label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="carrier"
              value="yuupack"
              checked={carrier === 'yuupack'}
              onChange={() => setCarrier('yuupack')}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-sm">📦 ゆうパック</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="carrier"
              value="yamato"
              checked={carrier === 'yamato'}
              onChange={() => setCarrier('yamato')}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-sm">🚚 クロネコヤマト</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="carrier"
              value="sagawa"
              checked={carrier === 'sagawa'}
              onChange={() => setCarrier('sagawa')}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-sm">🚛 佐川急便</span>
          </label>
        </div>
      </div>

      {/* 送り元情報 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">送り元情報</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="例: 山田 太郎"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              住所 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={senderAddress}
              onChange={(e) => setSenderAddress(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="例: 〒100-0001 東京都千代田区1-1-1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="例: 03-1234-5678"
            />
          </div>
        </div>
      </div>

      {/* お届け先情報確認 */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">お届け先情報（確認）</h4>
        <div className="space-y-2 text-sm">
          <p><span className="font-semibold">お名前:</span> {customerName}</p>
          <p className="break-words"><span className="font-semibold">住所:</span> {customerAddress || '未登録'}</p>
          <p><span className="font-semibold">電話:</span> {customerPhone || '未登録'}</p>
          {(!customerAddress || !customerPhone) && (
            <p className="text-red-600 text-xs">⚠️ 住所と電話番号が必要です。顧客情報を編集して登録してください。</p>
          )}
        </div>
      </div>

      {/* 商品選択 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">商品選択</h4>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              すべて選択
            </button>
            <button
              onClick={deselectAll}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              選択解除
            </button>
          </div>
        </div>

        {!paidItems || paidItems.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">
            支払い済み商品がありません
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {paidItems.map((item) => (
              <label
                key={item.id}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedItemIds.includes(item.id!)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedItemIds.includes(item.id!)}
                  onChange={() => item.id && toggleItemSelection(item.id)}
                  className="mt-1 w-4 h-4 text-primary-600 rounded"
                />
                {item.itemImage ? (
                  <img
                    src={item.itemImage}
                    alt={item.itemName}
                    loading="lazy"
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-xl">📦</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.itemName}</p>
                  <p className="text-xs text-gray-600">¥{(item.itemPrice || 0).toLocaleString()}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* 合計金額 */}
        {selectedItemIds.length > 0 && (
          <div className="mt-3 p-3 bg-green-50 border border-green-300 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">
                選択した商品（{selectedItemIds.length}点）
              </span>
              <span className="text-lg font-bold text-green-600">
                ¥{selectedTotal.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          キャンセル
        </button>
        <button
          onClick={handleCreateLabel}
          disabled={isProcessing}
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isProcessing ? '作成中...' : '送り状を作成'}
        </button>
      </div>

      {/* 確認ダイアログ */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="送り状を作成"
        message="送り状を作成してPDFをダウンロードします。よろしいですか？"
        details={
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">配送業者:</span> {carrier === 'yuupack' ? 'ゆうパック' : carrier === 'yamato' ? 'クロネコヤマト' : '佐川急便'}</p>
            <p><span className="font-semibold">商品数:</span> {selectedItemIds.length}点</p>
            <p><span className="font-semibold">合計金額:</span> ¥{selectedTotal.toLocaleString()}</p>
          </div>
        }
        type="info"
        confirmText="作成する"
        cancelText="キャンセル"
        onConfirm={confirmCreateLabel}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
