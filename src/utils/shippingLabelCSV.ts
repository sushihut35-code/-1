import Encoding from 'encoding-japanese';
import { ShippingLabel } from '../db/db';

// 郵便番号を住所文字列から抽出
export function extractPostalCode(address: string): string {
  const match = address.match(/〒?\s*(\d{3})-?(\d{4})/);
  if (match) {
    return match[1] + match[2];
  }
  return '';
}

// 住所文字列から郵便番号を除去
export function removePostalCode(address: string): string {
  return address.replace(/〒?\s*\d{3}-?\d{4}\s*/, '').trim();
}

// Shift-JISエンコード
function toShiftJIS(str: string): Uint8Array {
  const unicodeArray: number[] = [];
  for (let i = 0; i < str.length; i++) {
    unicodeArray.push(str.charCodeAt(i));
  }
  const sjisArray = Encoding.convert(unicodeArray, {
    to: 'SJIS',
    from: 'UNICODE'
  });
  return new Uint8Array(sjisArray);
}

// CSVファイルをダウンロード
function downloadCSV(csvContent: string, filename: string): void {
  const sjisData = toShiftJIS(csvContent);
  const blob = new Blob([sjisData], { type: 'text/csv;charset=shift_jis' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ヤマトB2 Cloud用CSV出力
export function exportYamatoCSV(labels: ShippingLabel[]): void {
  const rows = labels.map(label => {
    const recipientPostal = extractPostalCode(label.recipientAddress);
    const recipientAddr = removePostalCode(label.recipientAddress);
    const senderPostal = extractPostalCode(label.senderAddress);
    const senderAddr = removePostalCode(label.senderAddress);
    const itemName = label.items.map(i => i.itemName).join('、');

    // B2 Cloud: 42列フォーマット、ヘッダーなし
    const columns = [
      '',                    // 1: 管理番号
      recipientPostal,       // 2: お届け先郵便番号
      recipientAddr,         // 3: お届け先住所1
      '',                    // 4: お届け先住所2
      label.recipientName,   // 5: お届け先名称
      '',                    // 6: お届け先名称2
      label.recipientPhone,  // 7: お届け先電話番号
      '',                    // 8: 営業所コード
      '0',                   // 9: 荷姿・寸法（0=自動）
      '',                    // 10: 配達日指定
      '',                    // 11: 配達時間帯
      itemName,              // 12: 品名1
      '',                    // 13: 品名2
      '1',                   // 14: 元着区分（1=元払）
      '',                    // 15: コメント
      senderPostal,          // 16: 送り主郵便番号
      senderAddr,            // 17: 送り主住所1
      '',                    // 18: 送り主住所2
      label.senderName,      // 19: 送り主名称
      '',                    // 20: 送り主名称2
      label.senderPhone,     // 21: 送り主電話番号
      '',                    // 22: 送り主営業所コード
    ];
    while (columns.length < 42) columns.push('');
    return columns.join(',');
  });

  const csvContent = rows.join('\r\n');
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadCSV(csvContent, `b2_export_${timestamp}.csv`);
}

// 佐川急便e飛騨セレクト用CSV出力
export function exportSagawaCSV(labels: ShippingLabel[]): void {
  const rows = labels.map(label => {
    const recipientPostal = extractPostalCode(label.recipientAddress);
    const recipientAddr = removePostalCode(label.recipientAddress);
    const senderPostal = extractPostalCode(label.senderAddress);
    const senderAddr = removePostalCode(label.senderAddress);
    const itemName = label.items.map(i => i.itemName).join('、');

    // e飛騨セレクト: 25列フォーマット、ヘッダーなし
    const columns = [
      '',                    // 1: 荷受人コード
      recipientPostal,       // 2: 郵便番号
      recipientAddr,         // 3: 住所
      label.recipientPhone,  // 4: 電話番号
      label.recipientName,   // 5: 氏名
      '',                    // 6: 敬称
      itemName,              // 7: 品名
      '1',                   // 8: 元着区分（1=元払）
      '',                    // 9: 指定日
      '',                    // 10: 指定時間
      senderPostal,          // 11: 送り主郵便番号
      senderAddr,            // 12: 送り主住所
      label.senderPhone,     // 13: 送り主電話番号
      label.senderName,      // 14: 送り主氏名
    ];
    while (columns.length < 25) columns.push('');
    return columns.join(',');
  });

  const csvContent = rows.join('\r\n');
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadCSV(csvContent, `ehiden_export_${timestamp}.csv`);
}

// 日本郵便クリックポスト用CSV出力
export function exportClickPostCSV(labels: ShippingLabel[]): void {
  const header = [
    'お届け先郵便番号',
    'お届け先氏名',
    'お届け先住所',
    'お届け先電話番号',
    '内容品'
  ].join(',');

  const rows = labels.map(label => {
    const recipientPostal = extractPostalCode(label.recipientAddress);
    const recipientAddr = removePostalCode(label.recipientAddress);
    const itemName = label.items.map(i => i.itemName).join('、');

    return [
      recipientPostal,
      label.recipientName,
      recipientAddr,
      label.recipientPhone,
      itemName
    ].join(',');
  });

  const csvContent = header + '\r\n' + rows.join('\r\n');
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadCSV(csvContent, `clickpost_export_${timestamp}.csv`);
}

// 統合CSVエクスポート
export function exportCarrierCSV(labels: ShippingLabel[], carrier: string): void {
  switch (carrier) {
    case 'yamato':
      exportYamatoCSV(labels);
      break;
    case 'sagawa':
      exportSagawaCSV(labels);
      break;
    case 'yuupack':
      exportClickPostCSV(labels);
      break;
    default:
      throw new Error(`未対応の配送業者: ${carrier}`);
  }
}
