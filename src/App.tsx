import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/layout/Header';
import { TabBar } from './components/layout/TabBar';
import { Dashboard } from './components/dashboard/Dashboard';
import { ItemList } from './components/inventory/ItemList';
import { StockHistoryList } from './components/inventory/StockHistory';
import { SaleList } from './components/sales/SaleList';
import { CustomerList } from './components/customers/CustomerList';
import { PaidItemsPage } from './components/customers/PaidItemsPage';
import { Analytics } from './components/analytics/Analytics';
import { ToastProvider } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { initDatabase } from './db/db';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ToastProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <Header />
              <main className="flex-1 max-w-7xl mx-auto w-full">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/inventory" element={<ItemList />} />
                  <Route path="/history" element={<StockHistoryList />} />
                  <Route path="/sales" element={<SaleList />} />
                  <Route path="/customers" element={<CustomerList />} />
                  <Route path="/paid-items" element={<PaidItemsPage />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<div className="p-6"><h2 className="text-2xl font-bold">設定（開発中）</h2></div>} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </ToastProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
