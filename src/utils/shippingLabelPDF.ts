import { ShippingLabel } from '../db/db';

// 送り状をHTMLで生成して印刷ウィンドウを開く
export function generateShippingLabelPDF(label: ShippingLabel): void {
  const carrierName = label.carrier === 'yuupack' ? 'ゆうパック' : label.carrier === 'yamato' ? 'クロネコヤマト' : '佐川急便';
  const statusText = {
    draft: '【作成中】',
    printed: '【印刷済】',
    shipped: '【発送済】'
  }[label.status];

  const shippingDate = new Date(label.shippingDate).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const itemsHtml = label.items.map((item, index) => `
    <tr>
      <td style="padding: 4px 8px; border-bottom: 1px solid #eee; font-size: 12px;">${index + 1}. ${item.itemName}</td>
      <td style="padding: 4px 8px; border-bottom: 1px solid #eee; font-size: 12px; text-align: right; white-space: nowrap;">¥${item.itemPrice.toLocaleString()}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>送り状_${label.labelNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif; width: 105mm; margin: 0 auto; padding: 5mm; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 8px; }
    .label-number { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
    .section { margin-bottom: 10px; }
    .section-title { font-size: 12px; font-weight: bold; border-bottom: 2px solid #333; margin-bottom: 4px; padding-bottom: 2px; }
    .info { font-size: 11px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; }
    .total { font-size: 14px; font-weight: bold; text-align: right; margin-top: 6px; }
    .footer { font-size: 10px; display: flex; justify-content: space-between; margin-top: 10px; padding-top: 6px; border-top: 1px solid #ccc; }
    @media print {
      body { width: 105mm; margin: 0; padding: 5mm; }
    }
  </style>
</head>
<body>
  <h1>${carrierName}</h1>
  <div class="label-number">送り状番号: ${label.labelNumber}</div>

  <div class="section">
    <div class="section-title">お届け先</div>
    <div class="info">
      お名前: ${label.recipientName}<br>
      住所: ${label.recipientAddress}<br>
      電話: ${label.recipientPhone}
    </div>
  </div>

  <div class="section">
    <div class="section-title">送り元</div>
    <div class="info">
      お名前: ${label.senderName}<br>
      住所: ${label.senderAddress}<br>
      電話: ${label.senderPhone}
    </div>
  </div>

  <div class="section">
    <div class="section-title">商品明細</div>
    <table>
      <thead>
        <tr style="background: #f0f0f0;">
          <th style="padding: 4px 8px; text-align: left; font-size: 11px;">商品名</th>
          <th style="padding: 4px 8px; text-align: right; font-size: 11px;">金額</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <div class="total">合計: ¥${label.totalValue.toLocaleString()}</div>
  </div>

  <div class="footer">
    <span>発送日: ${shippingDate}</span>
    <span>${statusText}</span>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    // ポップアップがブロックされた場合はダウンロード
    const link = document.createElement('a');
    link.href = url;
    link.download = `送り状_${label.labelNumber}.html`;
    link.click();
  }

  URL.revokeObjectURL(url);
}

// 送り状HTMLをBlobとして取得
export function getShippingLabelPDFBlob(label: ShippingLabel): Blob {
  const html = `<html><body>送り状: ${label.labelNumber}</body></html>`;
  return new Blob([html], { type: 'text/html' });
}
