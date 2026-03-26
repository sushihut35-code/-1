import { useState } from 'react';
import { SaleForm } from './SaleForm';
import { useSales, createSale, cancelSale, refundSale } from '../../composables/useSales';
import { useItems } from '../../composables/useInventory';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useToast } from '../common/Toast';

interface SaleCardProps {
  sale: any;
  itemName: string;
  itemUnit?: string;
  onCancel: (id: number) => void;
  onRefund: (id: number) => void;
}

function SaleCard({ sale, itemName, itemUnit, onCancel, onRefund }: SaleCardProps) {
  const statusColors = {
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    refunded: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    completed: '完了',
    cancelled: 'キャンセル',
    refunded: '返品',
  };

  const paymentMethodLabels = {
    cash: '現金',
    card: 'カード',
    electronic: '電子マネー',
    other: 'その他',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-3">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{itemName}</h3>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[sale.status]}`}>
              {statusLabels[sale.status]}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {new Date(sale.createdAt).toLocaleString('ja-JP')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-600">
            ¥{sale.totalPrice.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {paymentMethodLabels[sale.paymentMethod]}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 border-t pt-3">
        <div>
          <span>数量: {sale.quantity} {itemUnit || ''}</span>
          <span className="mx-2">|</span>
          <span>単価: ¥{sale.unitPrice.toLocaleString()}</span>
        </div>

        {sale.status === 'completed' && (
          <div className="flex gap-2">
            <button
              onClick={() => onCancel(sale.id)}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              キャンセル
            </button>
            <button
              onClick={() => onRefund(sale.id)}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              返品
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SaleList() {
  const sales = useSales();
  const items = useItems();
  const [showForm, setShowForm] = useState(false);
  const { showToast } = useToast();

  const handleCreateSale = async (saleData: any) => {
    try {
      await createSale(saleData);
      setShowForm(false);
      showToast('売上を登録しました', 'success');
    } catch (error) {
      console.error('Failed to create sale:', error);
      showToast('売上の登録に失敗しました', 'error');
    }
  };

  const handleButtonClick = () => {
    console.log('Button clicked, showForm:', showForm);
    setShowForm(true);
  };

  const handleCancel = async (id: number) => {
    if (confirm('本当にキャンセルしますか？')) {
      try {
        await cancelSale(id);
        showToast('売上をキャンセルしました', 'success');
      } catch (error) {
        console.error('Failed to cancel sale:', error);
        showToast('キャンセルに失敗しました', 'error');
      }
    }
  };

  const handleRefund = async (id: number) => {
    if (confirm('本当に返品しますか？')) {
      try {
        await refundSale(id);
        showToast('返品処理を完了しました', 'success');
      } catch (error) {
        console.error('Failed to refund sale:', error);
        showToast('返品処理に失敗しました', 'error');
      }
    }
  };

  const getItemName = (itemId: number) => {
    return items?.find(item => item.id === itemId)?.name || '不明な商品';
  };

  const getItemUnit = (itemId: number) => {
    return items?.find(item => item.id === itemId)?.unit;
  };

  const todaySales = sales?.filter(sale => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sale.createdAt >= today && sale.status === 'completed';
  }) || [];

  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.totalPrice, 0);

  return (
    <div className="pb-20">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">売上一覧</h2>
          <button
            onClick={handleButtonClick}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors shadow-md"
          >
            売上を登録
          </button>
        </div>

        {/* 今日の売上サマリー */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-md p-6 mb-6 text-white">
          <h3 className="text-lg font-semibold mb-2">今日の売上</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">¥{todayTotal.toLocaleString()}</span>
            <span className="text-sm opacity-90">（{todaySales?.length || 0}件）</span>
          </div>
        </div>

        {!sales || sales.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">売上がありません</h3>
            <p className="mt-1 text-sm text-gray-500">最初の売上を登録してください</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              {sales?.length || 0} 件の売上
            </p>
            {sales?.map(sale => (
              <SaleCard
                key={sale.id}
                sale={sale}
                itemName={getItemName(sale.itemId)}
                itemUnit={getItemUnit(sale.itemId)}
                onCancel={handleCancel}
                onRefund={handleRefund}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <SaleForm
          onSubmit={handleCreateSale}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
