import { useAllShippingLabels } from '../../composables/useShippingLabels';
import { generateShippingLabelPDF } from '../../utils/shippingLabelPDF';
import { deleteShippingLabel, updateShippingLabelStatus } from '../../composables/useShippingLabels';
import { useToast } from '../common/Toast';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useState } from 'react';

export function ShippingLabels() {
  const shippingLabels = useAllShippingLabels();
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);

  // ステータス変更
  const handleStatusChange = async (id: number, status: 'draft' | 'printed' | 'shipped') => {
    try {
      await updateShippingLabelStatus(id, status);
      showToast('ステータスを更新しました', 'success');
    } catch (error) {
      console.error('Failed to update status:', error);
      showToast('ステータスの更新に失敗しました', 'error');
    }
  };

  // 送り状を再ダウンロード
  const handleRegenerate = async (label: any) => {
    try {
      generateShippingLabelPDF(label);
      await updateShippingLabelStatus(label.id, 'printed');
      showToast('送り状を再生成しました', 'success');
    } catch (error) {
      console.error('Failed to regenerate label:', error);
      showToast('送り状の再生成に失敗しました', 'error');
    }
  };

  // 削除確認
  const confirmDelete = (id: number) => {
    setSelectedLabelId(id);
    setShowDeleteConfirm(true);
  };

  // 削除実行
  const executeDelete = async () => {
    if (selectedLabelId === null) return;

    try {
      await deleteShippingLabel(selectedLabelId);
      showToast('送り状を削除しました', 'success');
      setShowDeleteConfirm(false);
      setSelectedLabelId(null);
    } catch (error) {
      console.error('Failed to delete label:', error);
      showToast('送り状の削除に失敗しました', 'error');
    }
  };

  return (
    <div className="pb-20">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📦 送り状管理</h2>

        {!shippingLabels || shippingLabels.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">送り状がありません</p>
            <p className="text-sm text-gray-400 mt-2">
              顧客詳細画面から送り状を作成できます
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {shippingLabels.map((label) => (
              <div key={label.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {label.carrier === 'yuupack' ? '📦' : '🚚'}
                      </span>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          {label.carrier === 'yuupack' ? 'ゆうパック' : 'クロネコヤマト'}
                        </p>
                        <p className="text-sm text-gray-600">
                          送り状番号: {label.labelNumber}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">お届け先</p>
                        <p className="text-sm text-gray-900">{label.recipientName}</p>
                        <p className="text-xs text-gray-600">{label.recipientAddress}</p>
                        <p className="text-xs text-gray-600">{label.recipientPhone}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">送り元</p>
                        <p className="text-sm text-gray-900">{label.senderName}</p>
                        <p className="text-xs text-gray-600">{label.senderAddress}</p>
                        <p className="text-xs text-gray-600">{label.senderPhone}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>📅 {new Date(label.shippingDate).toLocaleDateString('ja-JP')}</span>
                      <span>📦 {label.items.length}点</span>
                      <span>💰 ¥{label.totalValue.toLocaleString()}</span>
                    </div>

                    {label.notes && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded text-sm text-gray-700">
                        📝 {label.notes}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <select
                      value={label.status}
                      onChange={(e) => handleStatusChange(label.id!, e.target.value as any)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="draft">作成中</option>
                      <option value="printed">印刷済</option>
                      <option value="shipped">発送済</option>
                    </select>

                    <button
                      onClick={() => handleRegenerate(label)}
                      className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      📄 PDF
                    </button>

                    <button
                      onClick={() => confirmDelete(label.id!)}
                      className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* 商品明細 */}
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">商品明細</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {label.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                        <span className="text-gray-700">{item.itemName}</span>
                        <span className="font-semibold text-gray-900">¥{item.itemPrice.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">合計</span>
                    <span className="text-lg font-bold text-green-600">¥{label.totalValue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="送り状を削除"
        message="この送り状を削除してもよろしいですか？"
        type="warning"
        confirmText="削除"
        cancelText="キャンセル"
        onConfirm={executeDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedLabelId(null);
        }}
      />
    </div>
  );
}
