import { useAllPaidItems, useCustomers } from '../../composables/useCustomerItems';

export function PaidItemsPage() {
  const paidItems = useAllPaidItems();
  const customers = useCustomers();

  // 顧客名を取得
  const getCustomerName = (customerId: number) => {
    const customer = customers?.find(c => c.id === customerId);
    return customer?.name || '不明';
  };

  return (
    <div className="pb-20">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">✅ 支払い済み商品</h2>

        {/* 顧客ごとの支払い済み商品 */}
        <div className="space-y-6">
          {customers?.map((customer) => {
            const customerPaidItems = paidItems?.filter(item => item.customerId === customer.id) || [];

            if (customerPaidItems.length === 0) return null;

            return (
              <div key={customer.id} className="bg-white rounded-lg shadow-md p-6" style={{ backgroundColor: '#FFFFFF' }}>
                <div className="flex items-center gap-3 mb-4">
                  {customer.image ? (
                    <img
                      src={customer.image}
                      alt={customer.name}
                      className="w-12 h-12 object-cover rounded-full border border-gray-300"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                <div className="grid grid-cols-3 gap-4">
                  {customerPaidItems.map((item) => (
                    <div key={item.id}>
                      {item.itemImage ? (
                        <img
                          src={item.itemImage}
                          alt={item.itemName}
                          className="w-full aspect-square object-cover rounded-lg border border-green-300 shadow-sm"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center border border-green-300">
                          <span className="text-2xl">📦</span>
                        </div>
                      )}
                      <p className="text-sm text-gray-900 mt-1 truncate">{item.itemName}</p>
                      <p className="text-xs text-green-600 font-semibold">
                        ¥{(item.itemPrice || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.paidAt && new Date(item.paidAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    合計: <span className="font-bold text-gray-900">{customerPaidItems.length}点</span>
                    <span className="ml-3 text-sm text-green-600 font-semibold">
                      ¥{customerPaidItems.reduce((sum, item) => sum + (item.itemPrice || 0), 0).toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {(!paidItems || paidItems.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">支払い済み商品がありません</p>
            <p className="text-gray-400 text-sm mt-2">顧客の「購入画像」から商品を追加して、「支払い済み」ボタンを押してください</p>
          </div>
        )}
      </div>
    </div>
  );
}
