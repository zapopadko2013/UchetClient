import React, { useState } from "react";
import { Button, Input, Space, Table, message,Modal } from "antd";
import {
  AppstoreOutlined,
  BarcodeOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  MoneyCollectOutlined,
} from "@ant-design/icons";
import ProductListModal from "./ProductListModal";
import PaymentModal from "./PaymentModal";
import ReturnWorkspace from "./ReturnWorkspace";
import useApiRequest from "../../hooks/useApiRequest";
import type { TicketFromApi, TicketDetailFromApi } from "./types";
import ReceiptPrinter from "./ReceiptPrinter";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";


interface Props {
  //pointId: string;
  point: { id: string; name: string; address: string };
  cashboxUser: any;
  role4Users?: User[];
  companyInfo: any;
  ticketFormat: any;
}

interface User {
  id: number;
  name: string;
  role: string;
}

interface ReceiptPrinterProps {
  saleProducts: any[];
  totalAmount: number;
  clientName: string;
  confirmedDebtAmount?: number;
  cashboxUser?: { name: string; cashboxId: number }; // теперь optional
  selectedConsultant?: string;
  ticketNumber?: string;
  shiftNumber?: string;
  date?: string;
  storeName: string;         // Торговая точка
  storeAddress: string;      // Адрес точки
  companyName: string;       // Наименование компании
  companyBIN: string;        // БИН компании
  VAT?: string;              // НДС
  paymentMethodText?: string;
  Dopol1?: string;
  Dopol2?: string;
  showBIN: boolean;
  showNDS: boolean;
  showRNM: boolean;
  showZNM: boolean;
  tickettype?: number;

  displayFile?: string;
  onLogoLoaded?: () => void;
}

export const printReceipt = (props: ReceiptPrinterProps) => {
  // создаём скрытый iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  // создаём контейнер внутри iframe
  const container = doc.createElement("div");
  doc.body.appendChild(container);

  // создаём root в контейнере
  const root = createRoot(container);

  // 💡 ФУНКЦИЯ, КОТОРАЯ БУДЕТ ВЫЗВАНА ПОСЛЕ ЗАГРУЗКИ ЛОГО
  const finishPrinting = () => {
    // Ждем 50мс, чтобы React точно обновил DOM в iframe
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      // очистка
      root.unmount();
      document.body.removeChild(iframe);
    }, 50); 
  };
  
  // 💡 Рендерим компонент, передавая ему эту функцию как prop
  root.render(
    <BrowserRouter>
      {/* Передаем новую функцию-колбэк */}
      <ReceiptPrinter 
          {...props} 
          onLogoLoaded={finishPrinting} 
      />
    </BrowserRouter>
  );

  // 💡 Дополнительный таймаут (на случай, если что-то пошло не так с колбэком)
  setTimeout(() => {
      // Если печать еще не запущена, запускаем ее без логотипа
      if (document.body.contains(iframe)) {
          console.warn("Timeout reached: Printing fallback.");
          finishPrinting();
      }
  }, 5000); // 5 секунд на загрузку лого
};

const SaleWorkspace: React.FC<Props> = ({ 
  //pointId
  point
  , cashboxUser, role4Users,companyInfo,ticketFormat }) => {
  const [saleProducts, setSaleProducts] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [paymentVisible, setPaymentVisible] = useState(false);

  const [returnVisible, setReturnVisible] = useState(false);
const [returnItems, setReturnItems] = useState<any[]>([]);
  const { sendRequest } = useApiRequest();

const [manualDiscountVisible, setManualDiscountVisible] = useState(false);
const [manualDiscountAmount, setManualDiscountAmount] = useState<number>(0);
const [manualDiscountPercent, setManualDiscountPercent] = useState<number>(0);
const [selectedDiscountRowKey, setSelectedDiscountRowKey] = useState<string | null>(null);

const [returnTicket, setReturnTicket] = useState<TicketFromApi | null>(null);

type Mode = "sale" | "return";

const [mode, setMode] = useState<Mode>("sale");
const [isReturnMode, setIsReturnMode] = useState(false);

//////
/* const maxDiscountPercent =
  typeof cashboxUser?.discountinfo === "number"
    ? cashboxUser.discountinfo
    : cashboxUser?.discountinfo?.maxPercent ?? 0; */

const maxDiscountPercent = cashboxUser?.discountinfo ?? 0;    
/////

  const [productStock, setProductStock] = useState<Map<string, { initial: number; current: number }>>(
    new Map()
  );

  const total = saleProducts.reduce((sum, p) => sum + p.price * p.qty, 0);

  // --- Хелпер для округления ---
  const round = (num: number, precision = 3) => {
    const factor = 10 ** precision;
    return Math.round(num * factor) / factor;
  };

  // --- Генерация ключа товара ---
  const makeProductKey = (product: any, weight?: number) => `${product.id}_${weight ?? 0}`;

  // --- Парсинг штрих-кода ---
  const parseBarcode = (bar: string) => {
    const code = bar.trim();
    let temp = code;
    let productWeight: number | null = null;
    let productCode: string | null = null;

    if (code.startsWith("00") || code.startsWith("21")) {
      if (code.startsWith("00")) while (temp.length < 12) temp = "0" + temp;

      if (temp.length >= 12) {
        productCode = temp.substring(0, 7);
        const kg = Number(temp.substring(7, 9));
        const gr = Number(temp.substring(9, 12));
        if (!isNaN(kg) && !isNaN(gr)) productWeight = kg+ gr / 1000;
      }

      return { isWeight: true, productCode, productWeight };
    }

    return { isWeight: false, productCode: code, productWeight: null };
  };


// --- Применение скидки к выбранному товару ---
/* const applyManualDiscount = () => {
  if (!selectedDiscountRowKey) {
    message.warning("Сначала выберите товар");
    return;
  }

  setSaleProducts((prev) =>
    prev.map((item) => {
      if (item.key === selectedDiscountRowKey) {
        const discountAmount = Math.min(manualDiscountAmount, item.originalPrice);
        const newPrice = item.originalPrice - discountAmount;
        return {
          ...item,
          price: newPrice,
          discount: discountAmount,
        };
      }
      return item;
    })
  );

  setManualDiscountVisible(false);
  setManualDiscountAmount(0);
  setManualDiscountPercent(0);
}; */

// --- Обновление суммы при изменении процента ---
/* const handlePercentChange = (percent: number, originalPrice: number) => {
  const validPercent = Math.min(Math.max(percent, 0), 100);
  setManualDiscountPercent(validPercent);
  setManualDiscountAmount((originalPrice * validPercent) / 100);
}; */

const handlePercentChange = (percent: number, originalPrice: number) => {
  if (percent > maxDiscountPercent) {
    message.error(`Максимальная скидка ${maxDiscountPercent}%`);
    percent = maxDiscountPercent;
  }

  const validPercent = Math.min(Math.max(percent, 0), 100);
  setManualDiscountPercent(validPercent);
  setManualDiscountAmount((originalPrice * validPercent) / 100);
};

// --- Обновление процента при изменении суммы ---
/* const handleAmountChange = (amount: number, originalPrice: number) => {
  const validAmount = Math.min(Math.max(amount, 0), originalPrice);
  setManualDiscountAmount(validAmount);
  setManualDiscountPercent((validAmount / originalPrice) * 100);
}; */

const handleAmountChange = (amount: number, originalPrice: number) => {
  const maxAmountByPercent = (originalPrice * maxDiscountPercent) / 100;

  if (amount > maxAmountByPercent) {
    message.error(
      `Максимальная скидка ${maxDiscountPercent}% (${maxAmountByPercent.toFixed(2)})`
    );
    amount = maxAmountByPercent;
  }

  const validAmount = Math.min(Math.max(amount, 0), originalPrice);
  setManualDiscountAmount(validAmount);
  setManualDiscountPercent((validAmount / originalPrice) * 100);
};

const applyManualDiscount = () => {
  if (!selectedDiscountRowKey) return;

  const item = saleProducts.find(p => p.key === selectedDiscountRowKey);
  if (!item) return;

  const discountPercent = (manualDiscountAmount / item.originalPrice) * 100;

  if (discountPercent > maxDiscountPercent) {
    message.error(`Превышен лимит скидки (${maxDiscountPercent}%)`);
    return;
  }

  setSaleProducts(prev =>
    prev.map(p =>
      p.key === selectedDiscountRowKey
        ? {
            ...p,
            price: item.originalPrice - manualDiscountAmount,
            discount: manualDiscountAmount,
          }
        : p
    )
  );

  setManualDiscountVisible(false);
};

  //////


const handlePaymentClick = async () => {
  if (saleProducts.length === 0) {
    message.warning("Сначала добавьте товары");
    return;
  }

  const totalAmount = saleProducts.reduce((sum, p) => sum + p.price * p.qty, 0);

  if (mode !== "return") {
    // обычная продажа через модалку
    setPaymentVisible(true);
    return;
  }

  if (!returnTicket) {
    message.error("Не выбран чек для возврата");
    return;
  }

  const selectedTicket = returnTicket;

//  console.log(saleProducts);
  

  // Подготовка деталей транзакции
  
  const transactionDetails = saleProducts.map((item, index) => {
  const originalDetail = selectedTicket.details.find(
    d => d.product === item.product
  );

  if (!originalDetail) return null;

  return {
    bonusadd: originalDetail.bonusadd || 0,
    product: item.product,
    excisestamp: originalDetail.excisestamp || [],
    price: item.price,
    line: index + 1,
    ticketdiscount: originalDetail.ticketdiscount || 0,
    pieceunits: originalDetail.pieceunits || 0,
    discount: originalDetail.discount || 0,
    attributes: originalDetail.attributes || 0,
    units: -Math.abs(item.qty), 
    bonuspay: originalDetail.bonuspay || 0,
    cert: originalDetail.cert || [],
    bonusrate: originalDetail.bonusrate || 0,
    nds: originalDetail.nds || 0,
    coupon: originalDetail.coupon || [],
    invoicenumber: originalDetail.invoicenumber || "",
    promotions: originalDetail.promotions || [],
  };
}).filter(Boolean);

  const createTransaction = (type: string) => {
    let cashpay = 0, cardpay = 0, debtpay = 0, certpay = 0, debitpay = 0;

    switch (type) {
      case "cash":
        cashpay = Math.abs(totalAmount);
        break;
      case "debt":
        debtpay = Math.abs(totalAmount);
        break;
      case "card":
        cardpay = Math.abs(totalAmount);
        break;
      case "debit":
        debitpay = Math.abs(totalAmount);
        break;
      /* case "mixed":
        // можно реализовать логику смешанной оплаты, пока распределяем 50/50 как пример
        cashpay = Math.abs(totalAmount) / 2;
        cardpay = Math.abs(totalAmount) / 2;
        break; */
      default:
        message.error("Неизвестный тип оплаты");
        return null;
    }

    return {
      date: new Date().toLocaleString("ru-RU"),
      bonusadd: selectedTicket.bonusadd || 0,
      cashpay,
      cardpay,
      debitpay,
      debtpay,
      certpay,
      discount: selectedTicket.discount || 0,
      cert: selectedTicket.cert || [],
      bonuspay: selectedTicket.bonuspay || 0,
      debtorid: selectedTicket.debtorid || 0,
      parentid: selectedTicket.ticketid,
      coupon: selectedTicket.coupon || [],
      price: Math.abs(totalAmount),
      cashboxuser: selectedTicket.cashboxuser,
      details: transactionDetails,
      ofdnumber: selectedTicket.ofdnumber,
      tickettype: 1, // возврат
      ticketid: selectedTicket.id,
      bonusid: selectedTicket.bonusid || 0,
      cashbox: cashboxUser.cashboxId,
      sellerid: selectedTicket.sellerid || 0,
      customerid: selectedTicket.customerid || 0,
      fizid: selectedTicket.fizid || 0,
      paymenttype: type,
      hash: "",
      detailsdiscount: 0,
      shiftnumber: selectedTicket.shiftnumber,
      consignment: selectedTicket.consignment,
      total: Math.abs(totalAmount),
      issalebypiece: false,
      promotions: [],
    };
  };

  // Для "cash" и "debt" сразу создаем и отправляем транзакцию
  if (["cash", "debt"].includes(selectedTicket.paymenttype)) {
    const transaction = createTransaction(selectedTicket.paymenttype);
    if (!transaction) return;

    try {
      const data = await sendRequest(
        `${import.meta.env.VITE_API_URL}/external/api/invoice/transfertransactions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transactions: [transaction] }),
        }
      );

      if (data.code === "success") {
        message.success("Возврат успешно проведён");
        
        const productsForPrint = [...saleProducts];

  setSaleProducts([]);
  setIsReturnMode(false);
  setMode("sale"); 

        /////////

        const isTicketFormatEmpty =
          !ticketFormat ||
          (typeof ticketFormat === "object" &&
            Object.keys(ticketFormat).length === 0);
        
        const formatJSON = !isTicketFormatEmpty ? ticketFormat.json : null;
        
        const receiptFlags = {
          showBIN: formatJSON?.BIN ?? true,   
          showNDS: formatJSON?.NDS ?? false,
          showRNM: formatJSON?.RNM ?? false,
          showZNM: formatJSON?.ZNM ?? true,
        };
        
        
        const receiptData = isTicketFormatEmpty
          ? {
              storeName: point.name,
              storeAddress: point.address,
              companyName: companyInfo.name,
              companyBIN: companyInfo.bin,
              Dopol1:'Спасибо за покупку.',
            }
          : {
              storeName: ticketFormat.json.company || companyInfo.name,
              storeAddress: ticketFormat.json.address || point.address,
              companyName: ticketFormat.json.company || companyInfo.name,
              companyBIN: ticketFormat.json.BIN ? companyInfo.bin : "",
              Dopol1:ticketFormat.json.thanksMessage||"",
              Dopol2:ticketFormat.json.advertisementMessage||"",
              displayFile: ticketFormat.json.displayFile,
            };
        
        
        
        printReceipt({
          saleProducts: productsForPrint,
          totalAmount,
          clientName: "",
          confirmedDebtAmount: selectedTicket.debtpay,
          cashboxUser,
          selectedConsultant: "",
        
          // новые обязательные поля
          paymentMethodText: selectedTicket.paymenttype,
          tickettype: 1,
          VAT:"0",
          ...receiptData,
          ...receiptFlags, 
         
        });

        /////////

      } else {
        message.error(data.text || "Ошибка сервера при возврате");
      }
    } catch (err) {
      console.error(err);
      message.error("Ошибка передачи возврата на сервер");
    }

    return;
  }

  // Для "card", "debit", "mixed" показываем модальное окно с выбором
  Modal.info({
    title: "Выберите способ возврата",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {selectedTicket.paymenttype === "card" && (
          <>
            <button onClick={() => processReturn("card")}>Возврат на карту</button>
            <button onClick={() => processReturn("cash")}>Возврат наличными</button>
          </>
        )}
        {selectedTicket.paymenttype === "debit" && (
          <>
            <button onClick={() => processReturn("debit")}>Возврат безналичный</button>
            <button onClick={() => processReturn("cash")}>Возврат наличными</button>
          </>
        )}
        {selectedTicket.paymenttype === "mixed" && (
          <>
            <button onClick={() => processReturn("card")}>Возврат на карту</button>
            <button onClick={() => processReturn("debit")}>Возврат безналичный</button>
            <button onClick={() => processReturn("cash")}>Возврат наличными</button>
          </>
        )}
        <button onClick={() => Modal.destroyAll()}>Отмена</button>
      </div>
    ),
    onOk() {},
  });

  const processReturn = async (type: string) => {
    Modal.destroyAll(); // закрываем окно
    const transaction = createTransaction(type);
    if (!transaction) return;

    try {
      const data = await sendRequest(
        `${import.meta.env.VITE_API_URL}/external/api/invoice/transfertransactions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transactions: [transaction] }),
        }
      );

      if (data.code === "success") {
        message.success("Возврат успешно проведён");
        /* setSaleProducts([]);
        setIsReturnMode(false);
        setMode("sale"); */

        const productsForPrint = [...saleProducts];

  setSaleProducts([]);
  setIsReturnMode(false);
  setMode("sale"); 

        /////////

        const isTicketFormatEmpty =
          !ticketFormat ||
          (typeof ticketFormat === "object" &&
            Object.keys(ticketFormat).length === 0);
        
        const formatJSON = !isTicketFormatEmpty ? ticketFormat.json : null;
        
        const receiptFlags = {
          showBIN: formatJSON?.BIN ?? true,   
          showNDS: formatJSON?.NDS ?? false,
          showRNM: formatJSON?.RNM ?? false,
          showZNM: formatJSON?.ZNM ?? true,
        };
        
        
        const receiptData = isTicketFormatEmpty
          ? {
              storeName: point.name,
              storeAddress: point.address,
              companyName: companyInfo.name,
              companyBIN: companyInfo.bin,
              Dopol1:'Спасибо за покупку.',
            }
          : {
              storeName: ticketFormat.json.company || companyInfo.name,
              storeAddress: ticketFormat.json.address || point.address,
              companyName: ticketFormat.json.company || companyInfo.name,
              companyBIN: ticketFormat.json.BIN ? companyInfo.bin : "",
              Dopol1:ticketFormat.json.thanksMessage||"",
              Dopol2:ticketFormat.json.advertisementMessage||"",
              displayFile: ticketFormat.json.displayFile,
            };
        
        
        
        printReceipt({
          saleProducts: productsForPrint,
          totalAmount,
          clientName: "",
          confirmedDebtAmount: selectedTicket.debtpay,
          cashboxUser,
          selectedConsultant: "",
        
          // новые обязательные поля
          paymentMethodText: selectedTicket.paymenttype, 
          tickettype: 1,
          VAT:"0",
          ...receiptData,
          ...receiptFlags, 
         
        });

        /////////

      } else {
        message.error(data.text || "Ошибка сервера при возврате");
      }
    } catch (err) {
      console.error(err);
      message.error("Ошибка передачи возврата на сервер");
    }
  };
};


  //////

  // --- Добавление товара ---
  const addProduct = (product: any, qty: number = 1, weight?: number) => {
    const key = makeProductKey(product, weight);

    if (!productStock.has(key)) {
      productStock.set(key, { initial: product.stock, current: product.stock });
      setProductStock(new Map(productStock));
    }

    const stock = productStock.get(key)!;

    if (stock.current <= 0) {
      message.warning("Больше товара нет на складе");
      return;
    }

    const actualQty = Math.min(qty, stock.current);

    const existing = saleProducts.find((p) => p.key === key);
    if (existing) {
      existing.qty = round(existing.qty + actualQty);
      stock.current = round(stock.current - actualQty);
      setSaleProducts([...saleProducts]);
      setProductStock(new Map(productStock));
    } else {
      setSaleProducts([...saleProducts, { ...product, qty: round(actualQty), key, isWeight: !!weight }]);
      stock.current = round(stock.current - actualQty);
      setProductStock(new Map(productStock));
    }
  };

  // --- Увеличение количества ---
  const increaseQty = () => {
    if (!selectedRowKey) return;
    const row = saleProducts.find((p) => p.key === selectedRowKey);
    if (!row) return;

    const stock = productStock.get(selectedRowKey)!;
    const step = 1;

    if (stock.current < step) {
      message.warning("Больше товара нет на складе");
      return;
    }

    row.qty = round(row.qty + step);
    stock.current = round(stock.current - step);
    setSaleProducts([...saleProducts]);
    setProductStock(new Map(productStock));
  };

  // --- Уменьшение количества ---
  const decreaseQty = () => {
    if (!selectedRowKey) return;
    const row = saleProducts.find((p) => p.key === selectedRowKey);
    if (!row) return;

    const step = 1;

    if (row.qty <= step) {
      message.warning("Количество не может быть меньше минимального");
      return;
    }

    row.qty = round(row.qty - step);
    const stock = productStock.get(selectedRowKey)!;
    stock.current = round(stock.current + step);
    setSaleProducts([...saleProducts]);
    setProductStock(new Map(productStock));
  };

  // --- Удаление товара ---
  const deleteProduct = () => {
    if (!selectedRowKey) return;
    const row = saleProducts.find((p) => p.key === selectedRowKey);
    if (!row) return;

    const stock = productStock.get(selectedRowKey)!;
    stock.current = round(stock.current + row.qty);
    setSaleProducts(saleProducts.filter((p) => p.key !== selectedRowKey));
    setSelectedRowKey(null);
    setProductStock(new Map(productStock));
  };

  // --- Колонки таблицы ---
  const columns = [
    { title: "Наименование", dataIndex: "name" },
    /* { title: "Цена", dataIndex: "price" }, */
    { title: "Цена", dataIndex: "originalPrice" },
    {
      title: "Кол-во",
      dataIndex: "qty",
     
      render: (_: any, row: any) => {
        const stock = productStock.get(row.key)!;
        return (
          <Input
            type="number"
            //min={1}
            min={row.isWeight ? 0.001 : 1}
            //step={1}
            //step={row.isWeight ? 0.001 : 1}
            step={undefined}
            value={row.qty}
            disabled={mode === "return"} 
            onChange={(e) => {
              const newQty = Number(e.target.value);
              //if (newQty < 1) {
              if (isNaN(newQty) || newQty < (row.isWeight ? 0.001 : 1)) {
                message.warning("Количество не может быть меньше минимального");
                return;
              }
              if (newQty > stock.initial) {
                message.warning("Больше товара нет на складе");
                return;
              }
              row.qty = round(newQty);
              stock.current = round(stock.initial - newQty);
              setSaleProducts([...saleProducts]);
              setProductStock(new Map(productStock));
            }}
          />
        );
      },
    },
    {
      title: "Остаток",
      render: (_: any, row: any) => round(productStock.get(row.key)?.current ?? row.stock, 3),
    },
    { title: "Скидка", 
     // dataIndex: "discount"
    render: (_: any, row: any) => {
      const discount = row.originalPrice ? (row.originalPrice - row.price) : 0;
      return discount > 0 ? (Math.abs(row.qty) *discount).toFixed(2) : "0";
    },
    },
    {
      title: "Итого",
      render: (_: any, row: any) => (Math.abs(row.qty) * row.price).toFixed(2),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 10 }}>
        <Button icon={<AppstoreOutlined />} onClick={() => setModalVisible(true)}>
          Список товаров
        </Button>

        <Input
          prefix={<BarcodeOutlined />}
          placeholder="Штрих-код"
          style={{ width: 200 }}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onPressEnter={() => {
            const parsed = parseBarcode(barcode);

            if (!parsed.productCode) {
              message.warning("Неверный штрих-код");
              return;
            }

            const product = allProducts.find(
              (p) => p.code.trim() === parsed.productCode!.trim()
            );

            if (!product) {
              message.warning("Товар с таким штрих-кодом не найден");
              return;
            }

            const qty = parsed.isWeight && parsed.productWeight ? parsed.productWeight : 1;
            const weight = parsed.isWeight && parsed.productWeight != null ? parsed.productWeight : undefined;

            addProduct(product, qty, weight);
            setBarcode("");
          }}
        />

        <Button
  icon={<PlusOutlined />}
  onClick={increaseQty}
  disabled={mode === "return"}
/>

<Button
  icon={<MinusOutlined />}
  onClick={decreaseQty}
  disabled={mode === "return"}
/>

<Button
  icon={<DeleteOutlined />}
  danger
  onClick={deleteProduct}
  disabled={mode === "return"}
/>

        <Button
          icon={<MoneyCollectOutlined />}
          onClick={() => {
            const printWindow = window.open("", "_blank", "width=300,height=400");
            if (printWindow) {
              printWindow.document.write(`
                <html>
                  <head>
                    <title>Чек</title>
                    <style>
                      body { font-family: monospace; padding: 20px; }
                      .center { text-align: center; }
                    </style>
                  </head>
                  <body>
                    <div class="center"><h3>Спасибо за покупку!</h3></div>
                  </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
              printWindow.close();
            } else {
              message.error("Не удалось открыть окно печати");
            }
          }}
        >
          Денежный ящик
        </Button>

        <div style={{ background: "black", color: "white", padding: 10 }}>
          Сумма: {Math.abs(total.toFixed(2))}
        </div>
      </Space>

      <Table
        dataSource={saleProducts}
        columns={columns}
        rowKey="key"
        pagination={false}
        rowSelection={{
          type: "radio",
          selectedRowKeys: selectedRowKey ? [selectedRowKey] : [],
          onChange: (keys) => setSelectedRowKey(keys.length ? String(keys[0]) : null),
        }}
      />

      <Space style={{ marginTop: 10 }}>
      
  {mode === "sale" && (
  <Button
    danger
    onClick={() => setReturnVisible(true)}
  >
    Возврат
  </Button>
)}

{mode === "return" && (
  <Button
    danger
    onClick={() => {
      setSaleProducts((prev) => {
        const returnItems = prev.filter((p) => p.isReturn);
        const restoredStock = new Map(productStock);
        returnItems.forEach((item) => {
          const stock = restoredStock.get(item.key);
          if (stock) stock.current = stock.initial;
        });
        setProductStock(restoredStock);
        return prev.filter((p) => !p.isReturn);
      });
      setSelectedRowKey(null);
      setMode("sale");  // переключаем обратно
    }}
  >
    Отменить возврат
  </Button>
)}


<Button
  onClick={() => {
    if (!selectedRowKey) {
      message.warning("Сначала выберите товар");
      return;
    }
    if (!cashboxUser.discount) {
      message.warning("Выбранный пользователь кассы не может давать скидки!");
      return;
    }
    setSelectedDiscountRowKey(selectedRowKey);
    const selectedItem = saleProducts.find(p => p.key === selectedRowKey);
    if (selectedItem) {
      setManualDiscountAmount(selectedItem.discount || 0);
      setManualDiscountPercent(((selectedItem.discount || 0) / selectedItem.originalPrice) * 100);
    }
    setManualDiscountVisible(true);
  }}
>
  Скидка
</Button>


{/* <Button
          type="primary"
          size="large"
          onClick={() => {
            if (saleProducts.length === 0) {
              message.warning("Сначала добавьте товары для продажи");
              return;
            }
            setPaymentVisible(true);
          }}
        >
          Оплата
        </Button> */}

        <Button
  type="primary"
  size="large"
  onClick={handlePaymentClick} // вызываем новую функцию
>
  Оплата
</Button>
      </Space>

      <ProductListModal
        visible={modalVisible}
        //pointId={pointId}
        pointId={point.id}
        onClose={() => setModalVisible(false)}
        //onSelectProduct={(p: any) => addProduct(p)}
        onSelectProduct={(p: any) => addProduct({ 
          ...p, 
          originalPrice: p.originalPrice,  // цена без скидки
    price: p.price,                  // цена со скидкой
    discount: p.originalPrice - p.price,
        })}
        onLoadProducts={setAllProducts}
      />

      <PaymentModal
        open={paymentVisible}
        saleProducts={saleProducts}
        totalAmount={total}
        role4Users={role4Users}
        cashboxUser={cashboxUser}
        point={point}
        companyInfo={companyInfo}
        onClose={() => setPaymentVisible(false)}
        ticketFormat={ticketFormat}
        onCompletePayment={(_) => {
          //console.log("Оплата завершена:", data);
          setSaleProducts([]);        
          setSelectedRowKey(null);   
        }}
      />

{/* <ReturnWorkspace
  visible={returnVisible}
  pointId={point.id}
  onClose={() => {
    setReturnVisible(false);
    setIsReturnMode(false);
  }}
  onReturnReady={(returnedItems, __, allProducts) => {
  // Подготовка возвратных товаров
  const preparedReturnItems = returnedItems.map((item) => {
    const key = makeProductKey(item);
    const productFromCatalog = allProducts.find(p => p.id === item.product);

    return {
      ...item,
      key,
      isReturn: true,                               // помечаем как возврат
      name: item.name || productFromCatalog?.name || "Товар", // корректное имя
      qty: -Math.abs(item.qty),                     // отрицательное количество
      price: item.price,                            // цена со скидкой
      originalPrice: item.originalPrice || item.price, // оригинальная цена
    };
  });

  // Обновляем остатки
  const newStock = new Map(productStock);
  preparedReturnItems.forEach((item) => {
    if (newStock.has(item.key)) {
      const stock = newStock.get(item.key)!;
      stock.current = 0; // при возврате остаток = 0
    } else {
      newStock.set(item.key, {
        initial: Math.abs(item.qty),
        current: 0,
      });
    }
  });
  setProductStock(newStock);

  // Добавляем возврат в таблицу
  setSaleProducts((prev) => [...prev, ...preparedReturnItems]);

  // Переключаем режим возврата
  setIsReturnMode(true);
  setMode("return");

  // Закрываем окно возврата
  setReturnVisible(false);
}}

/> */}

<ReturnWorkspace
  visible={returnVisible}
  pointId={point.id}
  onClose={() => {
    setReturnVisible(false);
    setIsReturnMode(false);
  }}
  onReturnReady={(returnedItems, ticket, allProducts) => {
    // Сохраняем выбранный чек
    setReturnTicket(ticket);

    // Подготовка возвратных товаров
    const preparedReturnItems = returnedItems.map((item) => {
      const key = makeProductKey(item);
      const productFromCatalog = allProducts.find((p) => p.id === item.product);

      return {
        ...item,
        key,
        isReturn: true,                               // помечаем как возврат
        name: item.name || productFromCatalog?.name || "Товар", // корректное имя
        qty: -Math.abs(item.qty),                     // отрицательное количество
        price: item.price,                            // цена со скидкой
        originalPrice: item.originalPrice || item.price, // оригинальная цена
      };
    });

    // Обновляем остатки
    const newStock = new Map(productStock);
    preparedReturnItems.forEach((item) => {
      if (newStock.has(item.key)) {
        const stock = newStock.get(item.key)!;
        stock.current = 0; // при возврате остаток = 0
      } else {
        newStock.set(item.key, {
          initial: Math.abs(item.qty),
          current: 0,
        });
      }
    });
    setProductStock(newStock);

    // Добавляем возврат в таблицу
    setSaleProducts((prev) => [...prev, ...preparedReturnItems]);

    // Переключаем режим возврата
    setIsReturnMode(true);
    setMode("return");

    // Закрываем окно возврата
    setReturnVisible(false);
  }}
/>

<Modal
  title="Ручная скидка"
  open={manualDiscountVisible}
  onOk={applyManualDiscount}
  onCancel={() => setManualDiscountVisible(false)}
  okText="Применить"
  cancelText="Отмена"
>
  {selectedDiscountRowKey && (() => {
    const item = saleProducts.find(p => p.key === selectedDiscountRowKey);
    if (!item) return null;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {/* Поле для ввода суммы скидки */}
        <div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: 5 }}>
            Сумма скидки :
          </label>
          <Input
            type="number"
            min={0}
            max={item.originalPrice}
            value={manualDiscountAmount}
            onChange={(e) => handleAmountChange(Number(e.target.value), item.originalPrice)}
            placeholder="Введите сумму скидки"
          />
        </div>

        {/* Поле для ввода процента скидки */}
        <div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: 5 }}>
            Процент скидки (%):
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            value={manualDiscountPercent}
            onChange={(e) => handlePercentChange(Number(e.target.value), item.originalPrice)}
            placeholder="Введите процент скидки"
          />
        </div>
        <div style={{ color: "#888", fontSize: 12 }}>
  Максимальная скидка: {maxDiscountPercent}%
</div>
      </div>
    );
  })()}
</Modal>


    </>
  );
};

export default SaleWorkspace;
