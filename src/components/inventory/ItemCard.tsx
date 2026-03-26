import { useState } from 'react';
import { Item } from '../../db/db';

interface ItemCardProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (id: number) => void;
  onStockIn?: (item: Item) => void;
}

export function ItemCard({ item, onEdit, onDelete, onStockIn }: ItemCardProps) {
  const isLowStock = item.quantity <= item.minStock;

  const handleImageClick = () => {
    if (onStockIn) {
      onStockIn(item);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-3 border-l-4 border-gray-300 hover:shadow-lg transition-shadow">
      <div className="flex gap-4">
        {/* 画像エリア */}
        {item.image ? (
          <div className="flex-shrink-0">
            <img
              src={item.image}
              alt={item.name}
              className="object-cover rounded-md border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ width: '216px', height: '216px' }}
              onClick={handleImageClick}
            />
          </div>
        ) : (
          <div
            className="flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
            style={{ width: '216px', height: '216px' }}
            onClick={handleImageClick}
          >
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* コンテンツエリア */}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                {isLowStock && (
                  <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
                    在庫不足
                  </span>
                )}
              </div>
              {item.sku && (
                <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">在庫数:</span>
                  <span className={`ml-2 font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                    {item.quantity} {item.unit || ''}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">最小在庫:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {item.minStock} {item.unit || ''}
                  </span>
                </div>
                {item.price && (
                  <div>
                    <span className="text-gray-600">販売価格:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      ¥{item.price.toLocaleString()}
                    </span>
                  </div>
                )}
                {item.cost && (
                  <div>
                    <span className="text-gray-600">原価:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      ¥{item.cost.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              {item.location && (
                <p className="text-sm text-gray-600 mt-2">
                  場所: {item.location}
                </p>
              )}
            </div>

            {/* アクションボタン */}
            <div className="flex flex-col gap-2 ml-4">
              <button
                onClick={() => onEdit(item)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                aria-label="編集"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(item.id!)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                aria-label="削除"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
