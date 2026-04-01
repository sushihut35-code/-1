import jsPDF from 'jspdf';
import { DateTime } from 'luxon';
import { ShippingLabel } from '../db/db';

// A6サイズ: 105mm x 148mm
const PAGE_WIDTH = 105;
const PAGE_HEIGHT = 148;
const MARGIN = 5;

// 送り状PDFを生成
export function generateShippingLabelPDF(label: ShippingLabel): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_WIDTH, PAGE_HEIGHT]
  });

  let yPosition = MARGIN;

  // 配送業者ロゴ（テキストで代用）
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const carrierName = label.carrier === 'yuupack' ? 'ゆうパック' : 'クロネコヤマト';
  doc.text(carrierName, PAGE_WIDTH / 2, yPosition, { align: 'center' });

  yPosition += 8;

  // 送り状番号
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('送り状番号', MARGIN, yPosition);
  yPosition += 5;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(label.labelNumber, MARGIN, yPosition);

  yPosition += 10;

  // お届け先情報
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('【お届け先】', MARGIN, yPosition);
  yPosition += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`お名前: ${label.recipientName}`, MARGIN, yPosition);
  yPosition += 4;

  // 住所は折り返し表示
  const addressLines = doc.splitTextToSize(`住所: ${label.recipientAddress}`, PAGE_WIDTH - MARGIN * 2);
  doc.text(addressLines, MARGIN, yPosition);
  yPosition += addressLines.length * 4 + 2;

  doc.text(`電話: ${label.recipientPhone}`, MARGIN, yPosition);
  yPosition += 8;

  // 送り元情報
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('【送り元】', MARGIN, yPosition);
  yPosition += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`お名前: ${label.senderName}`, MARGIN, yPosition);
  yPosition += 4;

  const senderAddressLines = doc.splitTextToSize(`住所: ${label.senderAddress}`, PAGE_WIDTH - MARGIN * 2);
  doc.text(senderAddressLines, MARGIN, yPosition);
  yPosition += senderAddressLines.length * 4 + 2;

  doc.text(`電話: ${label.senderPhone}`, MARGIN, yPosition);

  yPosition += 8;

  // 商品明細
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('【商品明細】', MARGIN, yPosition);
  yPosition += 5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  // ヘッダー
  doc.setFillColor(200, 200, 200);
  doc.rect(MARGIN, yPosition - 3, PAGE_WIDTH - MARGIN * 2, 5, 'F');
  doc.text('商品名', MARGIN + 1, yPosition);
  doc.text('金額', PAGE_WIDTH - MARGIN - 10, yPosition);
  yPosition += 5;

  // 明細行
  label.items.forEach((item, index) => {
    if (yPosition > PAGE_HEIGHT - 15) {
      doc.addPage();
      yPosition = MARGIN;
    }

    const itemNameLines = doc.splitTextToSize(`${index + 1}. ${item.itemName}`, PAGE_WIDTH - MARGIN * 2 - 20);
    itemNameLines.forEach((line, i) => {
      doc.text(line, MARGIN + 1, yPosition + i * 3);
    });
    yPosition += itemNameLines.length * 3;

    doc.text(`¥${item.itemPrice.toLocaleString()}`, PAGE_WIDTH - MARGIN - 10, yPosition - itemNameLines.length * 3 + 3);
    yPosition += 2;
  });

  yPosition += 3;

  // 合計金額
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`合計金額: ¥${label.totalValue.toLocaleString()}`, MARGIN, yPosition);

  yPosition += 8;

  // 発送日
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const shippingDate = DateTime.fromJSDate(label.shippingDate).toFormat('yyyy年MM月dd日');
  doc.text(`発送日: ${shippingDate}`, MARGIN, yPosition);

  // ステータス
  const statusText = {
    draft: '【作成中】',
    printed: '【印刷済】',
    shipped: '【発送済】'
  }[label.status];
  doc.text(statusText, PAGE_WIDTH - MARGIN, yPosition, { align: 'right' });

  // PDFをダウンロード
  const filename = `送り状_${label.labelNumber}.pdf`;
  doc.save(filename);
}

// 送り状PDFをBlobとして取得（プレビュー用）
export function getShippingLabelPDFBlob(label: ShippingLabel): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_WIDTH, PAGE_HEIGHT]
  });

  let yPosition = MARGIN;

  // 配送業者ロゴ（テキストで代用）
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const carrierName = label.carrier === 'yuupack' ? 'ゆうパック' : 'クロネコヤマト';
  doc.text(carrierName, PAGE_WIDTH / 2, yPosition, { align: 'center' });

  yPosition += 8;

  // 送り状番号
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('送り状番号', MARGIN, yPosition);
  yPosition += 5;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(label.labelNumber, MARGIN, yPosition);

  yPosition += 10;

  // お届け先情報
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('【お届け先】', MARGIN, yPosition);
  yPosition += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`お名前: ${label.recipientName}`, MARGIN, yPosition);
  yPosition += 4;

  // 住所は折り返し表示
  const addressLines = doc.splitTextToSize(`住所: ${label.recipientAddress}`, PAGE_WIDTH - MARGIN * 2);
  doc.text(addressLines, MARGIN, yPosition);
  yPosition += addressLines.length * 4 + 2;

  doc.text(`電話: ${label.recipientPhone}`, MARGIN, yPosition);
  yPosition += 8;

  // 送り元情報
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('【送り元】', MARGIN, yPosition);
  yPosition += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`お名前: ${label.senderName}`, MARGIN, yPosition);
  yPosition += 4;

  const senderAddressLines = doc.splitTextToSize(`住所: ${label.senderAddress}`, PAGE_WIDTH - MARGIN * 2);
  doc.text(senderAddressLines, MARGIN, yPosition);
  yPosition += senderAddressLines.length * 4 + 2;

  doc.text(`電話: ${label.senderPhone}`, MARGIN, yPosition);

  yPosition += 8;

  // 商品明細
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('【商品明細】', MARGIN, yPosition);
  yPosition += 5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  // ヘッダー
  doc.setFillColor(200, 200, 200);
  doc.rect(MARGIN, yPosition - 3, PAGE_WIDTH - MARGIN * 2, 5, 'F');
  doc.text('商品名', MARGIN + 1, yPosition);
  doc.text('金額', PAGE_WIDTH - MARGIN - 10, yPosition);
  yPosition += 5;

  // 明細行
  label.items.forEach((item, index) => {
    if (yPosition > PAGE_HEIGHT - 15) {
      doc.addPage();
      yPosition = MARGIN;
    }

    const itemNameLines = doc.splitTextToSize(`${index + 1}. ${item.itemName}`, PAGE_WIDTH - MARGIN * 2 - 20);
    itemNameLines.forEach((line, i) => {
      doc.text(line, MARGIN + 1, yPosition + i * 3);
    });
    yPosition += itemNameLines.length * 3;

    doc.text(`¥${item.itemPrice.toLocaleString()}`, PAGE_WIDTH - MARGIN - 10, yPosition - itemNameLines.length * 3 + 3);
    yPosition += 2;
  });

  yPosition += 3;

  // 合計金額
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`合計金額: ¥${label.totalValue.toLocaleString()}`, MARGIN, yPosition);

  yPosition += 8;

  // 発送日
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const shippingDate = DateTime.fromJSDate(label.shippingDate).toFormat('yyyy年MM月dd日');
  doc.text(`発送日: ${shippingDate}`, MARGIN, yPosition);

  // ステータス
  const statusText = {
    draft: '【作成中】',
    printed: '【印刷済】',
    shipped: '【発送済】'
  }[label.status];
  doc.text(statusText, PAGE_WIDTH - MARGIN, yPosition, { align: 'right' });

  // Blobとして返す
  return new Blob([doc.output('blob')], { type: 'application/pdf' });
}
