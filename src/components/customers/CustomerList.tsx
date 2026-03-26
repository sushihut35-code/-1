import { useState } from 'react';
import { Customer } from '../../db/db';
import { addCustomer, updateCustomer, deleteCustomer, useCustomers } from '../../composables/useCustomers';
import { useToast } from '../common/Toast';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CustomerForm } from './CustomerForm';
import { CustomerDetail } from './CustomerDetail';

export function CustomerList() {
  const customers = useCustomers();
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | undefined>();
  const { showToast } = useToast();

  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  ) || [];

  const handleAdd = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addCustomer(customerData);
      setShowForm(false);
      showToast('顧客を追加しました', 'success');
    } catch (error) {
      console.error('Failed to add customer:', error);
      showToast('顧客の追加に失敗しました', 'error');
    }
  };

  const handleEdit = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingCustomer?.id) {
        await updateCustomer(editingCustomer.id, customerData);
        setEditingCustomer(undefined);
        showToast('顧客を更新しました', 'success');
      }
    } catch (error) {
      console.error('Failed to update customer:', error);
      showToast('顧客の更新に失敗しました', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCustomer(id);
      setSelectedCustomer(undefined);
      setDeleteConfirm(undefined);
      showToast('顧客を削除しました', 'success');
    } catch (error) {
      console.error('Failed to delete customer:', error);
      showToast('顧客の削除に失敗しました', 'error');
    }
  };

  const openDeleteConfirm = (customer: Customer) => {
    setDeleteConfirm(customer);
    setSelectedCustomer(undefined);
  };

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer);
    setSelectedCustomer(undefined);
  };

  const openCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  return (
    <div className="pb-20">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">顧客管理</h2>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-lg font-bold shadow-md"
          >
            顧客を追加
          </button>
        </div>

        {/* 検索 */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="名前、メールアドレス、電話番号で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* 顧客一覧 */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? '該当する顧客がいません' : '顧客がいません。最初の顧客を追加してください。'}
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => openCustomerDetail(customer)}
                className="bg-white rounded-lg shadow-md p-4 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start gap-3">
                    {/* 顧客画像 */}
                    {customer.image ? (
                      <img
                        src={customer.image}
                        alt={customer.name}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
                      {customer.nickname && (
                        <p className="text-sm text-gray-500">💬 {customer.nickname}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditForm(customer)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(customer)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
                <div className="ml-[76px]">
                  {customer.email && (
                    <p className="text-sm text-gray-600">📧 {customer.email}</p>
                  )}
                  {customer.phone && (
                    <p className="text-sm text-gray-600">📞 {customer.phone}</p>
                  )}
                  {customer.address && (
                    <p className="text-sm text-gray-600">📍 {customer.address}</p>
                  )}
                  <div className="mt-2 inline-block bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-1">
                    <p className="text-xs text-gray-600">💰 支払い済み合計</p>
                    <p className="text-sm font-bold text-yellow-600">¥{((customer.totalAmount || 0)).toLocaleString()}</p>
                  </div>
                </div>
                {customer.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">📝 {customer.notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 顧客フォームモーダル */}
      {(showForm || editingCustomer) && (
        <CustomerForm
          customer={editingCustomer}
          onSubmit={editingCustomer ? handleEdit : handleAdd}
          onCancel={() => {
            setShowForm(false);
            setEditingCustomer(undefined);
          }}
        />
      )}

      {/* 顧客詳細モーダル */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          }}
          onClick={() => setSelectedCustomer(undefined)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
            style={{ backgroundColor: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">顧客詳細</h2>
              <button
                onClick={() => setSelectedCustomer(undefined)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <CustomerDetail
              customer={selectedCustomer}
              onEdit={() => {
                setSelectedCustomer(undefined);
                openEditForm(selectedCustomer);
              }}
              onDelete={() => selectedCustomer && openDeleteConfirm(selectedCustomer)}
            />
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          title="顧客の削除"
          message={`${deleteConfirm.name}さんを削除してもよろしいですか？`}
          details="この操作は取り消せません。関連するキープ中の商品や支払い済み商品もすべて削除されます。"
          confirmText="削除する"
          cancelText="キャンセル"
          type="danger"
          onConfirm={() => deleteConfirm.id && handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(undefined)}
        />
      )}
    </div>
  );
}
