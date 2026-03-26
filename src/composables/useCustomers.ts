import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Customer } from '../db/db';

// 顧客一覧を取得
export function useCustomers() {
  return useLiveQuery(() => db.customers.orderBy('createdAt').reverse().toArray());
}

// 特定の顧客を取得
export function useCustomer(id: number | undefined) {
  return useLiveQuery(() => {
    if (!id) return Promise.resolve(undefined);
    return db.customers.get(id);
  }, [id]);
}

// 顧客を追加
export async function addCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  return await db.customers.add({
    ...customer,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

// 顧客を更新
export async function updateCustomer(id: number, customer: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  await db.customers.update(id, {
    ...customer,
    updatedAt: new Date()
  });
}

// 顧客を削除
export async function deleteCustomer(id: number): Promise<void> {
  await db.customers.delete(id);
}
