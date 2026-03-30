import { useState } from 'react';
import { Item } from '../../db/db';
import { ButtonLoading } from '../common/LoadingSpinner';
import { useToast } from '../common/Toast';
import { generateImage } from '../../lib/gemini';

interface ItemFormProps {
  item?: Item;
  onSubmit: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export function ItemForm({ item, onSubmit, onCancel }: ItemFormProps) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    sku: item?.sku || '',
    quantity: item?.quantity || 0,
    minStock: item?.minStock || 0,
    maxStock: item?.maxStock || 0,
    unit: item?.unit || '',
    location: item?.location || '',
    supplier: item?.supplier || '',
    cost: item?.cost || 0,
    price: item?.price || 0,
    barcode: item?.barcode || '',
    image: item?.image || '',
  });

  const [imagePreview, setImagePreview] = useState(item?.image || '');
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const { showToast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['quantity', 'minStock', 'maxStock', 'cost', 'price'].includes(name)
        ? value === '' ? 0 : parseFloat(value)
        : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像ファイルかチェック
    if (!file.type.startsWith('image/')) {
      showToast('画像ファイルを選択してください', 'error');
      return;
    }

    // ファイルサイズが2MBを超える場合は圧縮・縮小
    if (file.size > 2 * 1024 * 1024) {
      setIsCompressing(true);
      showToast('画像を圧縮しています...', 'info');
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

        const originalSize = Math.round(file.size / 1024);
        const compressedSize = Math.round(compressedDataUrl.length * 0.75 / 1024);

        console.log('圧縮完了:', {
          元のサイズ: originalSize + 'KB',
          圧縮後のサイズ: compressedSize + 'KB',
          解像度: width + 'x' + height
        });

        setIsCompressing(false);
        showToast(`画像を圧縮しました（${originalSize}KB → ${compressedSize}KB）`, 'success');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setFormData(prev => ({ ...prev, image: '' }));
  };

  const handleGenerateImage = async () => {
    if (!formData.name && !aiPrompt) {
      showToast('商品名またはプロンプトを入力してください', 'error');
      return;
    }

    setIsGeneratingImage(true);
    showToast('画像を生成しています...', 'info');

    try {
      const prompt = aiPrompt || `Professional product photo of ${formData.name}`;
      const imageUrl = await generateImage({
        prompt,
        itemName: formData.name,
        style: 'product'
      });

      setImagePreview(imageUrl);
      setFormData(prev => ({ ...prev, image: imageUrl }));
      showToast('画像を生成しました！', 'success');
      setAiPrompt(''); // Clear prompt after successful generation
    } catch (error) {
      console.error('Failed to generate image:', error);
      const errorMessage = error instanceof Error ? error.message : '画像の生成に失敗しました';
      showToast(errorMessage, 'error');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to save item:', error);
      const errorMessage = error instanceof Error ? error.message : '商品の保存に失敗しました。もう一度お試しください。';
      showToast(errorMessage, 'error');
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
            {item ? '商品を編集' : '新規商品'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 画像アップロード - 最初に配置 */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                📷 商品画像
              </label>
              {imagePreview ? (
                <div className="space-y-2">
                  <img
                    src={imagePreview}
                    alt="プレビュー（クリックで拡大）"
                    className="object-cover rounded-md border border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ width: '128px', height: '128px' }}
                    onClick={() => setIsImageExpanded(true)}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    画像を削除
                  </button>
                </div>
              ) : isCompressing ? (
                <div className="border-2 border-dashed rounded-md text-center py-8 bg-gray-50">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
                    <p className="text-sm text-gray-600">画像を圧縮中...</p>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-md text-center transition-colors"
                  style={{ borderColor: '#d1d5db', backgroundColor: '#ffffff', padding: '8px' }}
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
                    <div style={{ padding: '4px 0' }}>
                      <svg className="mx-auto" style={{ height: '24px', width: '24px' }} stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="block" style={{ marginTop: '4px', fontSize: '12px', fontWeight: '500', color: '#111827' }}>
                        ここをクリック
                      </span>
                      <span className="block" style={{ marginTop: '2px', fontSize: '10px', color: '#6b7280' }}>
                        PNG, JPG, GIF （2MB以上は自動圧縮）
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* AI画像生成セクション */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                🤖 AIで画像生成
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="商品名を入力すると自動生成されます（例：赤いリンゴ、高級時計）"
                  className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400 text-sm"
                />
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || (!formData.name && !aiPrompt)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 transition-all disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {isGeneratingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      生成中...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      AIで画像を生成
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-600 text-center">
                  ※ 画像生成には数秒〜数十秒かかります
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-semibold mb-1 text-gray-700">
                商品名 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-400"
                placeholder="商品名を入力"
              />
            </div>

            <div>
              <label htmlFor="sku" className="block text-sm font-semibold mb-1 text-gray-700">
                SKU
              </label>
              <input
                type="text"
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-400"
                placeholder="SKUを入力"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-semibold mb-1 text-gray-700">
                  在庫数 <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div>
                <label htmlFor="minStock" className="block text-sm font-semibold mb-1 text-gray-700">
                  最小在庫 <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  id="minStock"
                  name="minStock"
                  value={formData.minStock}
                  onChange={handleChange}
                  required
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cost" className="block text-sm font-semibold mb-1 text-gray-700">
                  原価
                </label>
                <input
                  type="number"
                  id="cost"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-semibold mb-1 text-gray-700">
                  💰 売価（販売価格） <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="unit" className="block text-sm font-semibold mb-1 text-gray-700">
                単位
              </label>
              <input
                type="text"
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-400"
                placeholder="個、箱、kgなど"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-semibold mb-1 text-gray-700">
                保管場所
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-400"
                placeholder="A-1-1など"
              />
            </div>

            <div>
              <label htmlFor="supplier" className="block text-sm font-semibold mb-1 text-gray-700">
                サプライヤー
              </label>
              <input
                type="text"
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-400"
                placeholder="サプライヤー名"
              />
            </div>

            <div>
              <label htmlFor="barcode" className="block text-sm font-semibold mb-1 text-gray-700">
                バーコード
              </label>
              <input
                type="text"
                id="barcode"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-400"
                placeholder="バーコード番号"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center text-lg font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? <ButtonLoading message="保存中..." /> : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 画像拡大モーダル */}
      {isImageExpanded && imagePreview && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[999999]"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setIsImageExpanded(false)}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-auto">
            <img
              src={imagePreview}
              alt="拡大画像"
              className="max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setIsImageExpanded(false)}
              className="mt-4 w-full px-4 py-2 bg-white text-black rounded-md hover:bg-gray-200 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
