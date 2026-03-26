import { useMemo } from 'react';
import { useDailySales, useSales, useSalesByItem, useSalesStats } from '../../composables/useSales';
import { useItems } from '../../composables/useInventory';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: '現金',
  card: 'カード',
  electronic: '電子マネー',
  other: 'その他',
};

export function Analytics() {
  const dailySales = useDailySales(30);
  const salesByItem = useSalesByItem();
  const items = useItems();
  const salesStats = useSalesStats();
  const allSales = useSales();

  // 商品別売上ランキングデータの準備
  const itemRankingData = useMemo(() => {
    if (!salesByItem || !items) return [];
    return salesByItem
      .map(stat => {
        const item = items.find(i => i.id === stat.itemId);
        return {
          name: item?.name || '不明',
          total: stat.total,
          quantity: stat.quantity,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [salesByItem, items]);

  // 支払い方法別の集計（実際のデータから）
  const paymentMethodData = useMemo(() => {
    if (!allSales) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = allSales.filter(sale => {
      return sale.createdAt >= today && sale.status === 'completed';
    });

    const paymentTotals = todaySales.reduce((acc, sale) => {
      const key = sale.paymentMethod;
      if (!acc[key]) {
        acc[key] = 0;
      }
      acc[key] += sale.totalPrice;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(paymentTotals)
      .map(([method, value]) => ({
        name: PAYMENT_METHOD_LABELS[method] || method,
        value,
        color:
          method === 'cash' ? '#0ea5e9' :
          method === 'card' ? '#10b981' :
          method === 'electronic' ? '#f59e0b' :
          '#ef4444',
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [allSales]);

  return (
    <div className="pb-20">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">分析・レポート</h2>

        {/* 統計サマリー */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">今日の売上</h3>
            <p className="text-3xl font-bold text-gray-900">
              ¥{salesStats.todaySalesAmount.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {salesStats.todaySalesCount} 件
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">今月の売上</h3>
            <p className="text-3xl font-bold text-gray-900">
              ¥{salesStats.monthSalesAmount.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">総売上</h3>
            <p className="text-3xl font-bold text-gray-900">
              ¥{salesStats.totalSales.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 日次売上トレンド */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">売上トレンド（過去30日間）</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis
                tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => `¥${value.toLocaleString()}`}
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#0ea5e9"
                strokeWidth={2}
                name="売上額"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 商品別売上ランキング */}
        {itemRankingData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">商品別売上ランキング</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={itemRankingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis
                  tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => `¥${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="total" fill="#0ea5e9" name="売上額" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 支払い方法別比率 */}
        {paymentMethodData.length > 0 && salesStats.todaySalesAmount > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">支払い方法別比率（今日）</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* トップ売上商品テーブル */}
        {itemRankingData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">トップ商品</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      順位
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      商品名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      売上数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      売上額
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {itemRankingData.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-50 text-blue-600'
                          } font-semibold`}>
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ¥{item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
