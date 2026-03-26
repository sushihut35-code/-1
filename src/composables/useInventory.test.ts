import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useItems, addItem, updateItem, deleteItem } from './useInventory';
import { db } from '../db/db';

// Mock db module
vi.mock('../db/db', () => ({
  db: {
    items: {
      toArray: vi.fn(() => Promise.resolve([])),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('useInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useItems', () => {
    it('should return items array', async () => {
      const mockItems = [
        { id: 1, name: '商品A', quantity: 10, minStock: 5, price: 1000, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: '商品B', quantity: 3, minStock: 5, price: 2000, createdAt: new Date(), updatedAt: new Date() },
      ];

      vi.mocked(db.items.toArray).mockResolvedValue(mockItems as any);

      const { result } = renderHook(() => useItems(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toEqual(mockItems);
      });
    });
  });

  describe('addItem', () => {
    it('should add item successfully', async () => {
      const newItem = {
        name: '新商品',
        quantity: 10,
        minStock: 5,
        price: 1500,
      };

      vi.mocked(db.items.add).mockResolvedValue(1);

      await addItem(newItem as any);

      expect(db.items.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '新商品',
          quantity: 10,
          minStock: 5,
          price: 1500,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );
    });
  });

  describe('updateItem', () => {
    it('should update item successfully', async () => {
      const updates = { name: '更新後の商品名', price: 2000 };

      await updateItem(1, updates);

      expect(db.items.update).toHaveBeenCalledWith(1, {
        ...updates,
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('deleteItem', () => {
    it('should delete item successfully', async () => {
      await deleteItem(1);

      expect(db.items.delete).toHaveBeenCalledWith(1);
    });
  });
});
