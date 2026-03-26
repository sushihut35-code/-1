import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ItemCard } from './ItemCard';
import { ItemForm } from './ItemForm';
import { StockInForm } from './StockInForm';
import { Item } from '../../db/db';
import { addItem, updateItem, deleteItem, useItems, addStock } from '../../composables/useInventory';
import { useToast } from '../common/Toast';

export function ItemList() {
  const items = useItems();
  const [showForm, setShowForm] = useState(false);
  const [showStockInForm, setShowStockInForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>();
  const [selectedItemId, setSelectedItemId] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  // URLパラメータでnew=trueがある場合は自動的にフォームを開く
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowForm(true);
      // パラメータを削除
      window.history.replaceState({}, '', '/inventory');
    }
    if (searchParams.get('stockin') === 'true') {
      setShowStockInForm(true);
      // パラメータを削除
      window.history.replaceState({}, '', '/inventory');
    }
  }, [searchParams]);

  const filteredItems = items?.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAdd = async (itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addItem(itemData);
      setShowForm(false);
      showToast('商品を追加しました', 'success');
    } catch (error) {
      console.error('Failed to add item:', error);
      showToast('商品の追加に失敗しました', 'error');
    }
  };

  const handleEdit = async (itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingItem?.id) {
        await updateItem(editingItem.id, itemData);
        setEditingItem(undefined);
        showToast('商品を更新しました', 'success');
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      showToast('商品の更新に失敗しました', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('本当に削除しますか？')) {
      try {
        await deleteItem(id);
        showToast('商品を削除しました', 'success');
      } catch (error) {
        console.error('Failed to delete item:', error);
        showToast('商品の削除に失敗しました', 'error');
      }
    }
  };

  const handleStockIn = async (itemId: number, quantity: number, notes?: string, date?: Date) => {
    try {
      await addStock(itemId, quantity, notes, date);
      setShowStockInForm(false);
      setSelectedItemId(undefined);
      showToast('入庫を記録しました', 'success');
    } catch (error) {
      console.error('Failed to record stock in:', error);
      showToast('入庫の記録に失敗しました', 'error');
    }
  };

  const openEditForm = (item: Item) => {
    setEditingItem(item);
  };

  const openStockInForm = (item: Item) => {
    setSelectedItemId(item.id);
    setShowStockInForm(true);
  };

  return (
    <div className="pb-20">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">在庫一覧</h2>
          <div className="flex gap-3">
            <Link
              to="/history"
              className="px-6 py-3 text-base bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors shadow-md"
            >
              履歴
            </Link>
            <button
              onClick={() => {
                setSelectedItemId(undefined);
                setShowStockInForm(true);
              }}
              className="px-6 py-3 text-base bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-md"
            >
              入庫
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-8 py-4 text-lg bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors shadow-md"
            >
              新規追加
            </button>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="商品名やSKUで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">アイテムがありません</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? '検索条件に一致するアイテムがありません' : '最初のアイテムを追加してください'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              {filteredItems.length} 件のアイテム
            </p>
            {filteredItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={openEditForm}
                onDelete={handleDelete}
                onStockIn={openStockInForm}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ItemForm
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingItem && (
        <ItemForm
          item={editingItem}
          onSubmit={handleEdit}
          onCancel={() => setEditingItem(undefined)}
        />
      )}

      {showStockInForm && (
        <StockInForm
          onSubmit={handleStockIn}
          onCancel={() => {
            setShowStockInForm(false);
            setSelectedItemId(undefined);
          }}
          preselectedItemId={selectedItemId}
        />
      )}
    </div>
  );
}
