import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next"; // 1. Импорт хука
import styles from "./Sale.module.css";

interface SaleProduct {
  name: string;
  price: number;
  originalPrice: number;
  qty: number;
  discount?: number;
  markup?: number;
}

interface ReceiptPrinterProps {
  qr?: string;
  saleProducts: SaleProduct[];
  totalAmount: number;
  clientName?: string;
  confirmedDebtAmount?: number;
  cashboxUser?: { name: string; cashboxId: number };
  selectedConsultant?: string;
  ticketNumber?: string;
  shiftNumber?: string;
  date?: string;
  storeName: string;
  storeAddress: string;
  companyName: string;
  companyBIN: string;
  VAT?: string;
  paymentMethodText?: string;
  Dopol1?: string;
  Dopol2?: string;
  showBIN: boolean;
  showNDS: boolean;
  showRNM: boolean;
  showZNM: boolean;
  displayFile?: string;
  tickettype?: number;
  discount?: number;
  markup?: number;
  onLogoLoaded?: () => void;
}

const padRight = (text: string, length: number) => text.padEnd(length, " ");
const padLeft = (text: string, length: number) => text.padStart(length, " ");

const ReceiptPrinter: React.FC<ReceiptPrinterProps> = ({
  qr,
  saleProducts,
  totalAmount,
  cashboxUser,
  selectedConsultant = "",
  date = new Date().toLocaleString("ru-RU"),
  storeName,
  storeAddress,
  companyName,
  companyBIN,
  VAT,
  paymentMethodText,
  Dopol1,
  Dopol2,
  showBIN,
  showZNM,
  displayFile,
  onLogoLoaded,
  tickettype,
  discount,
  markup
}) => {
  const { t } = useTranslation(); // 2. Инициализация перевода
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (displayFile) {
      fetch(displayFile)
        .then(response => {
          if (!response.ok) throw new Error("Logo load failed");
          return response.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          setLogoUrl(url); 
          if (onLogoLoaded) onLogoLoaded();
        })
        .catch(error => {
          console.error("Error loading logo:", error);
          setLogoUrl(undefined);
          if (onLogoLoaded) onLogoLoaded();
        });
        
      return () => {
        if (logoUrl) {
          URL.revokeObjectURL(logoUrl);
        }
      };
    } else {
        setLogoUrl(undefined);
        if (onLogoLoaded) onLogoLoaded();
    }
  }, [displayFile, onLogoLoaded]);

  const productLines = saleProducts.map((p) => {
    const lineTotal = (p.price || p.originalPrice) * p.qty;
    const totalStr = lineTotal.toFixed(2) + " ";
    const priceStr = p.originalPrice.toFixed(2) + " ";
    const qtyStr = p.qty.toFixed(3);

    let line = `${padRight(p.name, 20)}\n${padLeft(priceStr, 10)} x${padLeft(qtyStr, 7)} ${padLeft(totalStr, 10)}`;

    if (p.discount && p.discount > 0) {
      // Локализация слова "Скидка" внутри чека
      line += `\n${padRight(t('sale.receipt.discountLabel') || "Скидка:", 20)}-${padLeft(p.discount.toFixed(2) + " ", 10)}`;
    }

    /////16.02.2026
    if (p.markup && p.markup > 0) {
      // Локализация слова "Скидка" внутри чека
      line += `\n${padRight(t('sale.workspace.buttons.markup') || "Наценка:", 20)}-${padLeft(p.markup.toFixed(2) + " ", 10)}`;
    } 
    /////16.02.2026

    return line;
  });

  const discountSafe = discount ?? 0;
  const totalDiscount = saleProducts.reduce((sum, p) => sum + (p.discount || 0), 0) + discountSafe;

  /////16.02.2026
  const markupSafe = markup ?? 0;
  const totalMarkup = saleProducts.reduce((sum, p) => sum + (p.markup || 0), 0) + markupSafe;

  /////16.02.2026


  return (
    <div 
     className={styles.receiptContainer}
    >
      {logoUrl && (
        <div className={styles.logoWrapper}>
          <img
            src={logoUrl}
            alt={t('sale.receipt.logoAlt') || "Логотип компании"}
            style={{ 
        width: "120px",      // Жестко задаем ширину
        maxWidth: "120px", 
        height: "auto",      // Сохраняем пропорции
        display: "block"
      }}
          />
        </div>
      )}

      <pre>
        {storeName + "\n"}
        {padLeft(storeAddress, 25) + "\n"}
        {padLeft(companyName, 25) + "\n"}
        {showBIN ? `${t('sale.receipt.binLabel') || "ЖСН(БСН)/ИИН(БИН)"} : ${companyBIN}\n` : ""}
        {showZNM && cashboxUser ? `ЗНМ : Qaz-Invent000000${cashboxUser.cashboxId}\n` : ""}
        {`       ${t('sale.receipt.header') || "Тауарлық чек/Товарный чек"}\n`}
        {date + "               " + "\n"}
        {tickettype === 1 
          ? (t('sale.receipt.returnType') || "Қайтару/Возврат") 
          : (t('sale.receipt.saleType') || "Сату/Продажа :") + "\n"}
        {"\n"}
        {"------------------------------------------\n"}
        {productLines.join("\n------------------------------------------\n")}
        {"\n------------------------------------------\n"}
        {`${padRight(t('sale.receipt.itemsCount') || "Тауарлар/Товаров:", 34)}${saleProducts.reduce((sum, p) => sum + p.qty, 0).toFixed(3)}\n`}
        {`${padRight(t('sale.receipt.amount') || "Сомасы/Сумма:", 34)}${(totalAmount).toFixed(2)}\n`}
        {`${padRight(t('sale.receipt.discounts') || "Жеңілдіктер/Скидки:", 34)}${totalDiscount.toFixed(2)}\n`}
        {`${padRight(t('sale.receipt.markups') || "Yстеме/Наценка:", 34)}${totalMarkup.toFixed(2)}\n`}
        {"\n"}
        {`${padRight(t('sale.receipt.total') || "БАРЛЫҒЫ/ИТОГ:", 34)}${(totalAmount).toFixed(2)}\n`}
        {`${t('sale.receipt.vatLabel') || "ҚҚС/НДС:"}                           ${VAT || ""}\n`}
        {"\n"}
        {paymentMethodText ? paymentMethodText + "\n" : ""}
        {cashboxUser ? `${padRight(t('sale.receipt.cashier') || "Кассир/Кассир:", 34)}${cashboxUser.name}\n` : ""}
        {`${padRight(t('sale.receipt.consultant') || "Сатушы/Консультант:", 25)}${selectedConsultant}\n`}
        {`${padRight(t('sale.receipt.terminal') || "Терминал/Терминал:", 37)}${cashboxUser ? cashboxUser.cashboxId : ""}\n\n`}
        
{qr && (
  <>
    {"\n------------------------------------------\n"}
    {t('sale.receipt.fiscalUrl') || "Ссылка на чек:" + "\n"}
    <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
      {qr + "\n"}
    </div>
  </>
)}
        {Dopol1 && (
  <>{Dopol1 + "\n"}
  </>
)}
{Dopol2 && (
  <>
        {Dopol2 + "\n"}
        </>
)}
      </pre>
    </div>
  );
};

export default ReceiptPrinter;