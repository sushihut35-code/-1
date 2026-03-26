import { useState } from 'react';
import { Customer } from '../../db/db';

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export function CustomerForm({ customer, onSubmit, onCancel }: CustomerFormProps) {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    nickname: customer?.nickname || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    notes: customer?.notes || '',
    image: customer?.image || '',
  });

  const [imagePreview, setImagePreview] = useState(customer?.image || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像ファイルかチェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    // ファイルサイズが2MBを超える場合は圧縮・縮小
    if (file.size > 2 * 1024 * 1024) {
      console.log('画像を圧縮・縮小します...');
      compressImage(file);
    } else {
      // 小さい場合はそのまま使用
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setFormData(prev => ({ ...prev, image: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Canvasを作成して画像をリサイズ
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // 最大サイズを設定（幅800px、高さ600px）
        const maxWidth = 800;
        const maxHeight = 600;

        let width = img.width;
        let height = img.height;

        // アスペクト比を維持しながらリサイズ
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 画像を描画
        ctx.drawImage(img, 0, 0, width, height);

        // JPEGとしてエクスポート（quality 0.7で圧縮）
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

        setImagePreview(compressedDataUrl);
        setFormData(prev => ({ ...prev, image: compressedDataUrl }));

        console.log('圧縮完了:', {
          元のサイズ: Math.round(file.size / 1024) + 'KB',
          圧縮後のサイズ: Math.round(compressedDataUrl.length * 0.75 / 1024) + 'KB',
          解像度: width + 'x' + height
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setFormData(prev => ({ ...prev, image: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to save customer:', error);
      alert('顧客の保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {customer ? '顧客を編集' : '新規顧客'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                顧客名 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="顧客名を入力"
              />
            </div>

            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                ニックネーム
              </label>
              <input
                type="text"
                id="nickname"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="ニックネームを入力"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                電話番号
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="090-1234-5678"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                住所
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="住所を入力"
              />
            </div>

            {/* 画像アップロード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                顧客画像
              </label>
              {imagePreview ? (
                <div className="space-y-2">
                  <img
                    src={imagePreview}
                    alt="プレビュー"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    画像を削除
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-md text-center transition-colors"
                  style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb', padding: '12px' }}
                >
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="image"
                    className="cursor-pointer block"
                  >
                    <div style={{ padding: '8px 0' }}>
                      <svg className="mx-auto" style={{ height: '32px', width: '32px' }} stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="block" style={{ marginTop: '8px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                        ここをクリック
                      </span>
                      <span className="block" style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                        PNG, JPG, GIF （2MB以上は自動圧縮）
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                メモ
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="メモを入力"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
