import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock IndexedDB
const mockDB = {
  items: [],
  stockHistory: [],
  sales: [],
  categories: [],
};

global.Dexie = class MockDexie {
  constructor(name: string) {
    this.name = name;
  }

  async open() {
    return Promise.resolve();
  }

  version(version: number) {
    return this;
  }

  stores(stores: any) {
    return this;
  }

  items: any = {
    toArray: vi.fn(() => Promise.resolve(mockDB.items)),
    add: vi.fn((item) => {
      mockDB.items.push({ ...item, id: mockDB.items.length + 1 });
      return Promise.resolve(mockDB.items.length);
    }),
    update: vi.fn((id, changes) => Promise.resolve()),
    delete: vi.fn((id) => Promise.resolve()),
    get: vi.fn((id) => Promise.resolve(mockDB.items.find((i: any) => i.id === id))),
    where: vi.fn(() => ({
      equals: vi.fn(() => ({
        toArray: vi.fn(() => Promise.resolve([])),
      })),
      above: vi.fn(() => ({
        and: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  };

  stockHistory: any = {
    toArray: vi.fn(() => Promise.resolve(mockDB.stockHistory)),
    add: vi.fn((history) => {
      mockDB.stockHistory.push({ ...history, id: mockDB.stockHistory.length + 1 });
      return Promise.resolve(mockDB.stockHistory.length);
    }),
  };

  sales: any = {
    toArray: vi.fn(() => Promise.resolve(mockDB.sales)),
    add: vi.fn((sale) => {
      mockDB.sales.push({ ...sale, id: mockDB.sales.length + 1 });
      return Promise.resolve(mockDB.sales.length);
    }),
  };

  categories: any = {
    toArray: vi.fn(() => Promise.resolve(mockDB.categories)),
  };

  transaction() {
    return Promise.resolve();
  }

  async getLowStockItems() {
    return [];
  }

  async updateItemQuantity() {
    return;
  }

  async createSale() {
    return 1;
  }

  async getTodaySales() {
    return 0;
  }

  async getMonthSales() {
    return 0;
  }
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
