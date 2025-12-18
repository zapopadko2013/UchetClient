import React, { useState, useEffect } from "react";
import useApiRequest from "../../hooks/useApiRequest";

interface SaleProduct {
  name: string;
  price: number;
  originalPrice: number;
  qty: number;
  discount?: number;
}

interface ReceiptPrinterProps {
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
  onLogoLoaded?: () => void;
}

const padRight = (text: string, length: number) => text.padEnd(length, " ");
const padLeft = (text: string, length: number) => text.padStart(length, " ");

const ReceiptPrinter: React.FC<ReceiptPrinterProps> = ({
  saleProducts,
  totalAmount,
  cashboxUser,
  selectedConsultant = "",
  date = new Date().toLocaleString("ru-RU"),
  storeName,
  storeAddress,
  companyName,
  companyBIN,
  VAT ,
  paymentMethodText,
  Dopol1,
  Dopol2,
  showBIN,
  showZNM,
  displayFile,
  onLogoLoaded,
  tickettype,
  discount
}) => {

  
  // 1. Хук для хранения Blob URL
const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  // 2. Асинхронная загрузка Blob URL
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
          // 💡 УСПЕХ: вызываем колбэк
          if (onLogoLoaded) onLogoLoaded();
        })
        .catch(error => {
          console.error("Error loading logo:", error);
          setLogoUrl(undefined);
          // 💡 ОШИБКА: вызываем колбэк, чтобы печать не заблокировалась
          if (onLogoLoaded) onLogoLoaded();
        });
        
      return () => {
        if (logoUrl) {
          URL.revokeObjectURL(logoUrl);
        }
      };
    } else {
        setLogoUrl(undefined);
        // 💡 НЕТ ФАЙЛА: вызываем колбэк немедленно
        if (onLogoLoaded) onLogoLoaded();
    }
  }, [displayFile, onLogoLoaded]); // onLogoLoaded должен быть в зависимостях

  /* const productLines = saleProducts.map((p) => {
    const priceStr = p.price.toFixed(2) + " ";
    const qtyStr = p.qty.toFixed(3);
    const totalStr = (p.price * p.qty).toFixed(2) + " ";
    return `${padRight(p.name, 20)}\n${padLeft(priceStr, 10)} x${padLeft(qtyStr, 7)} ${padLeft(totalStr, 10)}`;
  }); */

  /* const productLines = saleProducts.map((p) => {
    const priceStr = p.originalPrice.toFixed(2) + " ";
    const qtyStr = p.qty.toFixed(3);
    const totalStr = (p.originalPrice * p.qty).toFixed(2) + " ";
    return `${padRight(p.name, 20)}\n${padLeft(priceStr, 10)} x${padLeft(qtyStr, 7)} ${padLeft(totalStr, 10)}`;
  }); */

  const productLines = saleProducts.map((p) => {
  const lineTotal = (p.price || p.originalPrice) * p.qty; // цена после скидки или оригинал
  const totalStr = lineTotal.toFixed(2) + " ";
  const priceStr = p.originalPrice.toFixed(2) + " ";
  const qtyStr = p.qty.toFixed(3);

  // Основная строка товара
  let line = `${padRight(p.name, 20)}\n${padLeft(priceStr, 10)} x${padLeft(qtyStr, 7)} ${padLeft(totalStr, 10)}`;

  // Если есть скидка, показываем её прямо под товаром
  if (p.discount && p.discount > 0) {
    line += `\n${padRight("Скидка:", 20)}-${padLeft(p.discount.toFixed(2) + " ", 10)}`;
  }

  return line;
});

const discountSafe = discount ?? 0;

  const totalDiscount = saleProducts.reduce((sum, p) => sum + (p.discount || 0), 0)+discountSafe;

  return (
   
<div 
      style={{ 
        fontFamily: "monospace", 
        fontSize: "12px",
        maxWidth: "300px", // Типичная ширина для термочека
        margin: "0 auto"    // Автоматические отступы слева и справа для центрирования
      }}
    >
     
      {/* Логотип сверху */}
      {logoUrl && ( // <--- Используем logoUrl для отображения
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <img
            src={logoUrl} // <--- ИСПОЛЬЗУЕМ Blob URL
            alt="Логотип компании"
            style={{ maxWidth: "150px", maxHeight: "80px", objectFit: "contain" }}
          />
        </div>
      )}

      {/* Текст чека */}
      <pre>
        {storeName + "\n"}
        {padLeft(storeAddress, 25) + "\n"}
        {padLeft(companyName, 25) + "\n"}
        {showBIN ? `ЖСН(БСН)/ИИН(БИН) : ${companyBIN}\n` : ""}
        {showZNM && cashboxUser ? `ЗНМ : UCHET000000${cashboxUser.cashboxId}\n` : ""}
        {"       Тауарлық чек/Товарный чек\n"}
        {date + "               " + "\n"}
        {tickettype === 1 ? "Қайтару/Возврат" : "Сату/Продажа :\n"}
        {"\n"}
        {"------------------------------------------\n"}
        {productLines.join("\n------------------------------------------\n")}
        {/* {totalDiscount > 0 && `\n↳ скидка${padLeft(totalDiscount.toFixed(2) + " ", 30)}`}
         */}
        {"\n------------------------------------------\n"}
        {`Тауарлар/Товаров:                 ${saleProducts.reduce((sum, p) => sum + p.qty, 0).toFixed(3)}\n`}
        {/* {`Сомасы/Сумма:                   ${(totalAmount - totalDiscount).toFixed(2)} \n`} */}
        {`Сомасы/Сумма:                   ${(totalAmount ).toFixed(2)} \n`}
        {`Жеңілдіктер/Скидки:              ${totalDiscount.toFixed(2)} \n`}
        {"\n"}
        {/* {`БАРЛЫҒЫ/ИТОГ:                   ${(totalAmount - totalDiscount).toFixed(2)} \n`} */}
        {`БАРЛЫҒЫ/ИТОГ:                   ${(totalAmount).toFixed(2)} \n`}
        {"ҚҚС/НДС:                           " + VAT + "\n"}
        {"\n"}
        {paymentMethodText ? paymentMethodText + "\n" : ""}
        {cashboxUser ? `Кассир/Кассир:                     ${cashboxUser.name}\n` : ""}
        {`Сатушы/Консультант:      ${selectedConsultant}\n`}
        {`Терминал/Терминал:                   ${cashboxUser ? `${cashboxUser.cashboxId}\n` : ""}\n`}
        {Dopol1 + "\n"}
        {Dopol2 + "\n"}
      </pre>
    </div>
    
  );
};

export default ReceiptPrinter;