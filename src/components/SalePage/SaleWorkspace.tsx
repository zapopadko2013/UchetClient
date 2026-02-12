import React, { useState } from "react";
import { Button, Input, Space, Table, message,Modal,InputNumber, Select } from "antd";
import {
  AppstoreOutlined,
  BarcodeOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  MoneyCollectOutlined,UnorderedListOutlined, LoadingOutlined,
  ScanOutlined, SearchOutlined, ArrowDownOutlined,
} from "@ant-design/icons";
import ProductListModal from "./ProductListModal";
import PaymentModal from "./PaymentModal";
import ReturnWorkspace from "./ReturnWorkspace";
import useApiRequest from "../../hooks/useApiRequest";
import type { TicketFromApi, TicketDetailFromApi } from "./types";
import ReceiptPrinter from "./ReceiptPrinter";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./Sale.module.css";
import ClientSelectModal from "./ClientSelectModal";
import moment from "moment";
import DebtWriteOffModal from './DebtWriteOffModal';

import BarcodeScanner from '../../components/BarcodeScanner';


interface Props {
  //pointId: string;
  point: { id: string; name: string; address: string };
  cashboxUser: any;
  role4Users?: User[];
  companyInfo: any;
  ticketFormat: any;
  KaspiIp : any;
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
  , cashboxUser, role4Users,companyInfo,ticketFormat
  ,KaspiIp
}) => {
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

//////11.02.22026
const [isDebtWriteOffOpen, setIsDebtWriteOffOpen] = useState(false);
/*
const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });
const [isDebtWriteOffOpen, setIsDebtWriteOffOpen] = useState(false);
const [debtorType, setDebtorType] = useState<0 | 1>(0);
const [selectedClient, setSelectedClient] = useState<any>(null);
const [writeOffAmount, setWriteOffAmount] = useState<string>("");
const [writeOffMethod, setWriteOffMethod] = useState("Наличными");

// Состояния для ручного ввода
const [debtPhone, setDebtPhone] = useState("");
const [debtFirstname, setDebtFirstname] = useState("");
const [debtLastname, setDebtLastname] = useState("");

const [legalBIN, setLegalBIN] = useState("");
const [legalName, setLegalName] = useState("");

// Для случая, если найдено несколько клиентов по имени/фамилии
const [foundClients, setFoundClients] = useState<any[]>([]);

const [isClientListModalOpen, setIsClientListModalOpen] = useState(false);

const clearFields = () => {
  setSelectedClient(null);
  setWriteOffAmount("");
  
  // Очистка полей физ. лица
  setDebtPhone("");
  setDebtFirstname("");
  setDebtLastname("");
  
  // Очистка полей юр. лица
  setLegalBIN("");
  setLegalName("");
  
  // Сброс типа (опционально, можно оставить текущий)
  // setDebtorType(0); 
};

// Поиск по БИН
const searchLegalByBIN = async () => {
  if (!legalBIN) return message.error(t('sale.payment.messages.searchByBin'));
  try {
    const data = await sendRequest(
      `${import.meta.env.VITE_API_URL}/external/api/customers?bin=${legalBIN}`,
      { headers: getHeaders() }
    );
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return message.error(t('sale.payment.messages.notFound'));
    }

    const selected = Array.isArray(data) ? data[0] : data;

    // Важно: переиспользуем общее состояние выбранного клиента
    setSelectedClient(selected); 
    setDebtorType(1); // Устанавливаем тип "Юр. лицо"
    setLegalBIN(selected.bin || "");
    setLegalName(selected.name || "");
    
   // message.success(t('common.success') || "Данные загружены");
  } catch {
    message.error(t('sale.payment.messages.searchError'));
  }
};

// Поиск по Наименованию
const searchLegalByName = async () => {
  if (!legalName) return message.error(t('sale.payment.messages.searchByName'));
  try {
    const data = await sendRequest(
      `${import.meta.env.VITE_API_URL}/external/api/customers?name=${encodeURIComponent(legalName)}`,
      { headers: getHeaders() }
    );
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return message.error(t('sale.payment.messages.notFound'));
    }

    // Если найдено несколько — используем вашу общую модалку выбора
    if (Array.isArray(data) && data.length > 1) {
      setFoundClients(data);
      setIsClientListModalOpen(true);
    } else {
      const selected = Array.isArray(data) ? data[0] : data;
      setSelectedClient(selected);
      setDebtorType(1);
      setLegalBIN(selected.bin || "");
      setLegalName(selected.name || "");
    }
  } catch {
    message.error(t('sale.payment.messages.searchError'));
  }
};

const searchByPhone = async () => {
    if (!debtPhone) return message.error(t('sale.payment.errors.enterPhone'));
    try {
        const data = await sendRequest(`${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfo?telephone=${debtPhone}`, 
          { headers: getHeaders() }

        );
        if (!data || (Array.isArray(data) && data.length === 0)) return message.error(t('sale.payment.errors.clientNotFound'));
        
        const client = Array.isArray(data) ? data[0] : data;
        fillClientData(client);
    } catch {
        message.error(t('sale.payment.errors.searchError'));
    }
};

const searchByFirstname = async () => {
  // Проверяем именно ту переменную, которую меняем в onChange инпута
  if (!debtFirstname) {
    return message.error(t('sale.payment.errors.enterFirstname'));
  }

  try {
    const data = await sendRequest(
      `${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfobyname?name=${encodeURIComponent(debtFirstname)}`, 
      { headers: getHeaders() }
    );

    // Обрабатываем результат (функция handleSearchResult ниже)
    handleSearchResult(data);

  } catch (error) {
    message.error(t('sale.payment.errors.searchError'));
  }
};

const searchByLastname = async () => {
    if (!debtLastname) return message.error(t('sale.payment.errors.enterLastname'));
    try {
        const data = await sendRequest(`${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfobylastname?name=${encodeURIComponent(debtLastname)}`, 
      { headers: getHeaders() }
      );
        handleSearchResult(data);
    } catch {
        message.error(t('sale.payment.errors.searchError'));
    }
};

const handleSearchResult = (data: any) => {
  // 1. Проверяем, что данные вообще пришли
  if (!data) {
    setFoundClients([]); // Очищаем список
    return message.error(t('sale.payment.errors.clientNotFound'));
  }

  // 2. Превращаем данные в массив, если это не он (бывает, сервер возвращает объект)
  const clientsArray = Array.isArray(data) ? data : (data.rows || data.data || [data]);

  if (clientsArray.length === 0) {
    setFoundClients([]);
    return message.error(t('sale.payment.errors.clientNotFound'));
  }

  if (clientsArray.length === 1) {
    // Если найден один — сразу выбираем его
    fillClientData(clientsArray[0]);
    setFoundClients([]); 
  } else {
    // Если найдено несколько — сохраняем массив и открываем модалку выбора
    setFoundClients(clientsArray);
    setIsClientListModalOpen(true);
  }
};

const fillClientData = (client: any) => {
    setSelectedClient(client);
    setDebtFirstname(client.firstname || "");
    setDebtLastname(client.lastname || "");
    
    if (client.telephone) {
       setDebtPhone(client.telephone || "");
    }
    setDebtorType(0); // Переключаем на физ лицо
};

const handleRepay = async () => {
  // Проверяем выбранного клиента и сумму (используем ваши переменные)
  if (!selectedClient) return message.warning(t('Выберите клиента'));
  if (!writeOffAmount || Number(writeOffAmount) <= 0) {
    return message.warning(t('Введите корректную сумму'));
  }

  try {
    await sendRequest(`${import.meta.env.VITE_API_URL}/api/report/fizcustomers/writeoff_debt`,  {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({writeoff_debt_customers: {
        id: selectedClient.id,
        debt: Number(writeOffAmount),
        user: localStorage.getItem('userId') || "2", // берем ID пользователя
        clientType: debtorType // 0 для физ, 1 для юр лиц
      }
      })
    });

    message.success(t('report.debt.repaySuccess') || "Долг успешно списан");

    
    
    // Закрываем модалку и очищаем данные
    setIsDebtWriteOffOpen(false);
    setSelectedClient(null);
    setWriteOffAmount("");
    setDebtPhone("");
    setDebtFirstname("");
    setDebtLastname("");

    clearFields();
    
    
  } catch (err) {
    console.error(err);
    message.error(t('report.debt.repayError') || "Ошибка при списании");
  }
};
*/
//////11.02.2026


const { t } = useTranslation();

 ////
  
    // СОСТОЯНИЕ ДЛЯ СКАНЕРА
  
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [barcodeLoading, setBarcodeLoading] = useState<boolean>(false);
  
    const handleScanSuccess = (decodedText: string) => {
    //console.log("Отсканированный код:", decodedText); 
    setBarcode(decodedText); // Обновляем состояние
    setIsScannerOpen(false); // Закрываем камеру
  };
  
    ////


const [actionsModalVisible, setActionsModalVisible] = useState(false);

//////

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




const handlePercentChange = (percent: number, originalPrice: number) => {
  if (percent > maxDiscountPercent) {
    //message.error(`Максимальная скидка ${maxDiscountPercent}%`);
    message.error(t('sale.workspace.errors.maxDiscountExceeded', { percent: maxDiscountPercent }));
    percent = maxDiscountPercent;
  }

  const validPercent = Math.min(Math.max(percent, 0), 100);
  setManualDiscountPercent(validPercent);
  setManualDiscountAmount((originalPrice * validPercent) / 100);
};



const handleAmountChange = (amount: number, originalPrice: number) => {
  const maxAmountByPercent = (originalPrice * maxDiscountPercent) / 100;

  if (amount > maxAmountByPercent) {
   /*  message.error(
      `Максимальная скидка ${maxDiscountPercent}% (${maxAmountByPercent.toFixed(2)})`
    ); */
    message.error(t('sale.workspace.errors.maxAmountExceeded', { 
        percent: maxDiscountPercent, 
        amount: maxAmountByPercent.toFixed(2) 
      }));
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
    //message.error(`Превышен лимит скидки (${maxDiscountPercent}%)`);
    message.error(t('sale.workspace.errors.maxDiscountExceeded', { percent: maxDiscountPercent }));
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


//////28.01.2026

const executeKaspiRefund = async (paymenttransid: string, amount: number, terminalIp: string) => {
  // Проверка, что это транзакция Kaspi 
  if (!paymenttransid || !paymenttransid.includes("KASPI")) {
    //throw new Error("Эта транзакция не поддерживает автоматический возврат через Kaspi");
    throw new Error(t('kaspi.errors.notSupported'));
  }

  // Извлекаем метод (QR/CARD) и ID транзакции
  const splitIndex = paymenttransid.indexOf("KASPI");
  const method = paymenttransid.substring(0, splitIndex); // QR или CARD
  const transactionId = paymenttransid.substring(splitIndex + 5);

  const baseUrl = terminalIp.startsWith('http') ? terminalIp : `http://${terminalIp}`;
  // Для возврата используется эндпоинт /remains
  const url = `${baseUrl}/remains?method=${method}&amount=${Math.round(Math.abs(amount))}&transactionId=${transactionId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) 
    throw new Error(t('kaspi.errors.noConnection'));
    //throw new Error("Нет связи с терминалом Kaspi");
  return await response.json();
};

//////28.01.2026


const handlePaymentClick = async () => {
  if (saleProducts.length === 0) {
    //message.warning("Сначала добавьте товары");
    message.warning(t('sale.workspace.errors.emptyCart'));
    return;
  }

  const totalAmount = saleProducts.reduce((sum, p) => sum + p.price * p.qty, 0);

  if (mode !== "return") {
    // обычная продажа через модалку
    setPaymentVisible(true);
    return;
  }

  if (!returnTicket) {
    //message.error("Не выбран чек для возврата");
    message.error(t('sale.workspace.errors.noReturnTicket'));
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
       // message.error("Неизвестный тип оплаты");
       message.error(t('sale.payment.unknown'));
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

      ////29.01.2026
      paymenttransid: selectedTicket.paymenttransid, 
      ////29.01.2026

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
       // message.success("Возврат успешно проведён");
       message.success(t('sale.workspace.messages.returnSuccess'));
        
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
             // Dopol1:'Спасибо за покупку.',
             Dopol1:t('sale.payment.labels.thanks'),
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
       // message.error(data.text || "Ошибка сервера при возврате");
       message.error(data.text || t('sale.workspace.errors.serverError'));
      }
    } catch (err) {
      console.error(err);
      //message.error("Ошибка передачи возврата на сервер");
      message.error(t('sale.workspace.errors.transferError'));
    }

    return;
  }

  // Для "card", "debit", "mixed" показываем модальное окно с выбором
  Modal.info({
    //title: "Выберите способ возврата",
    title: t('sale.workspace.modals.returnMethod.title'),
    content: (
      <div className={styles.returnActions}>
        {selectedTicket.paymenttype === "card" && (
          <>
            {/* <button onClick={() => processReturn("card")}>Возврат на карту</button>
            <button onClick={() => processReturn("cash")}>Возврат наличными</button> */}
            <Button onClick={() => processReturn("card")}>{t('sale.workspace.modals.returnMethod.toCard')}</Button>
            <Button onClick={() => processReturn("cash")}>{t('sale.workspace.modals.returnMethod.toCash')}</Button>
          </>
        )}
        {selectedTicket.paymenttype === "debit" && (
          <>
            {/* <button onClick={() => processReturn("debit")}>Возврат безналичный</button>
            <button onClick={() => processReturn("cash")}>Возврат наличными</button> */}
            <Button onClick={() => processReturn("debit")}>{t('sale.workspace.modals.returnMethod.toDebit')}</Button>
            <Button onClick={() => processReturn("cash")}>{t('sale.workspace.modals.returnMethod.toCash')}</Button>
          </>
        )}
        {selectedTicket.paymenttype === "mixed" && (
          <>
           {/*  <button onClick={() => processReturn("card")}>Возврат на карту</button>
            <button onClick={() => processReturn("debit")}>Возврат безналичный</button>
            <button onClick={() => processReturn("cash")}>Возврат наличными</button> */}
             <Button onClick={() => processReturn("card")}>{t('sale.workspace.modals.returnMethod.toCard')}</Button>
            <Button onClick={() => processReturn("debit")}>{t('sale.workspace.modals.returnMethod.toDebit')}</Button>
            <Button onClick={() => processReturn("cash")}>{t('sale.workspace.modals.returnMethod.toCash')}</Button>
          </>
        )}
        {/* <button onClick={() => Modal.destroyAll()}>Отмена</button> */}
        <Button onClick={() => Modal.destroyAll()}>{t('sale.workspace.buttons.cancel')}</Button>
      </div>
    ),
    onOk() {},
  });

  const processReturn = async (type: string) => {
    Modal.destroyAll(); // закрываем окно


  /////28.01.2026  
    // --- ВСТАВКА KASPI ---
  if (type === "card") {
    const transId = selectedTicket.paymenttransid;
    //console.log(KaspiIp);
    // Если в ID есть KASPI и это не ручной ввод (bezintegr)
    if (transId && transId.includes("KASPI") && !transId.includes("bezintegr")) {
      try {
        const terminalIp = KaspiIp; // Получаем IP из настроек точки
     //   console.log(terminalIp);
        if (!terminalIp) {
          //message.error("IP терминала не настроен в системе");
          message.error(t('kaspi.errors.ipNotConfigured'));
          return;
        }

        //message.loading({ content: "Ожидание ответа от Kaspi...", key: "kaspi_status" });
        message.loading({ content: t('kaspi.status.waiting'), key: "kaspi_status" });
        const res = await executeKaspiRefund(transId, totalAmount, terminalIp);

        if (res.status === 200 || res.status === "success") {
        //  message.success({ content: "Kaspi: Возврат успешно проведен", key: "kaspi_status" });
        message.success({ content: t('kaspi.status.success'), key: "kaspi_status" });  
      } else {
        //  message.error({ content: "Kaspi: Отказ в возврате", key: "kaspi_status" });
        message.error({ content: t('kaspi.errors.denied'), key: "kaspi_status" });
        return; // Прерываем сохранение в БД, так как банк отказал
        }
      } catch (
       // err
       err: any
      ) {
        //message.error({ content: "Ошибка связи с терминалом", key: "kaspi_status" });
        message.error({ content: err.message || t('kaspi.errors.terminalError'), key: "kaspi_status" });
        return;
      }
    }
  }
  // --- КОНЕЦ ВСТАВКИ ---
  /////28.01.2026  

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
       // message.success("Возврат успешно проведён");
        message.success(t('sale.workspace.messages.returnSuccess'));
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
              //Dopol1:'Спасибо за покупку.',
              Dopol1:t('sale.payment.labels.thanks'),
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
        //message.error(data.text || "Ошибка сервера при возврате");
        message.error(data.text || t('sale.workspace.errors.serverError'));
      }
    } catch (err) {
      console.error(err);
     //message.error("Ошибка передачи возврата на сервер");
     message.error(t('sale.workspace.errors.transferError'));
    }
  };
};


  //////

  // --- Добавление товара ---
  const addProduct = (product: any, qty: number = 1, weight?: number) => {

    ////13.01.2026
    //console.log(product);
    if (product.category==-1){
       weight=1;
    }
    ////13.01.2026

    const key = makeProductKey(product, weight);

    if (!productStock.has(key)) {
      productStock.set(key, { initial: product.stock, current: product.stock });
      setProductStock(new Map(productStock));
    }

    const stock = productStock.get(key)!;

    if (stock.current <= 0) {
     // message.warning("Больше товара нет на складе");
     message.warning(t('sale.workspace.errors.noStock'));
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
      //message.warning("Больше товара нет на складе");
      message.warning(t('sale.workspace.errors.noStock'));
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
      //message.warning("Количество не может быть меньше минимального");
      message.warning(t('sale.workspace.errors.minQty'));
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
     { 
      // title: "Наименование",
      title: t('sale.workspace.table.name'),
       dataIndex: "name" },
    
    /* { title: "Цена", dataIndex: "price" }, */
    { 
      //title: "Цена",
       title: t('sale.workspace.table.price'),
      dataIndex: "originalPrice" },
    {
      //title: "Кол-во",
      title: t('sale.workspace.table.qty'),
      dataIndex: "qty",
     
      render: (_: any, row: any) => {
        const stock = productStock.get(row.key)!;
        return (

          /*
          <InputNumber
  type="number"
  // 1. Устанавливаем шаг для браузера
  step={row.isWeight ? "0.001" : "1"}
  min={row.isWeight ? 0.001 : 1}
  value={row.qty}
  disabled={mode === "return"} 
  onChange={(e) => {
    const val = e.target.value;
    
    // Позволяем пользователю очистить поле или оставить точку в конце (для ввода 1.2)
    if (val === "" || val.endsWith(".") || val.endsWith(",")) {
      row.qty = val; // Временно сохраняем как строку, если стейт позволяет
      setSaleProducts([...saleProducts]);
      return;
    }

    const newQty = parseFloat(val);

    // 2. Проверка на NaN и минимальное значение
    if (isNaN(newQty)) return;

    // Проверяем минимальное значение только если число "законченное"
    const minLimit = row.isWeight ? 0.001 : 1;
    if (newQty < minLimit) {
      // Не блокируем сразу, чтобы дать возможность допечатать, 
      // либо выводим предупреждение только при потере фокуса (onBlur)
      return; 
    }

    // 3. Проверка остатка
    if (newQty > stock.initial) {
      message.warning(t('sale.workspace.errors.noStock'));
      return;
    }

    // 4. Важно: Округление должно поддерживать знаки после запятой
    // Используйте precision для веса (например, 3 знака)
    const precision = row.isWeight ? 3 : 0;
    const roundedValue = Number(newQty.toFixed(precision));

    row.qty = roundedValue;
    stock.current = Number((stock.initial - roundedValue).toFixed(precision));
    
    setSaleProducts([...saleProducts]);
    setProductStock(new Map(productStock));
  }}
/>
*/
          /* <Input
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
                //message.warning("Количество не может быть меньше минимального");
                message.warning(t('sale.workspace.errors.minQty'));
                return;
              }
              if (newQty > stock.initial) {
                //message.warning("Больше товара нет на складе");
                message.warning(t('sale.workspace.errors.noStock'));
                return;
              }
              row.qty = round(newQty);
              stock.current = round(stock.initial - newQty);
              setSaleProducts([...saleProducts]);
              setProductStock(new Map(productStock));
            }}
          /> */

           <InputNumber
  // type="number" больше не нужен, InputNumber сам это контролирует
  min={row.isWeight ? 0.001 : 1}
  step={row.isWeight ? 0.001 : 1}
  precision={row.isWeight ? 3 : 0}
  value={row.qty}
  disabled={mode === "return"}
  // Важно: здесь приходит сразу значение (value), а не событие (e)
  onChange={(value) => {
    // InputNumber может вернуть null, если поле пустое
    if (value === null) return;

    const newQty = Number(value);

    if (isNaN(newQty) || newQty < (row.isWeight ? 0.001 : 1)) {
      message.warning(t('sale.workspace.errors.minQty'));
      return;
    }

    if (newQty > stock.initial) {
      message.warning(t('sale.workspace.errors.noStock'));
      return;
    }

    // Обновляем данные
    row.qty = round(newQty);
    stock.current = round(stock.initial - newQty);
    
    setSaleProducts([...saleProducts]);
    setProductStock(new Map(productStock));
  }}
/>

/*

<InputNumber
  min={row.isWeight ? 0.001 : 1}
  step={1} // ВАЖНО: всегда 1
  value={row.qty}
  disabled={mode === 'return'}

  parser={(value = '') => value.replace(',', '.')}

  onChange={(value) => {
    // AntD: может быть null
    if (value === null) return;

    let newQty = Number(value);

    // Невалидное число
    if (isNaN(newQty)) return;

    // ❌ Дроби для не весовых
    if (!row.isWeight && !Number.isInteger(newQty)) {
      message.warning(t('sale.workspace.errors.integerOnly'));
      return;
    }

    // Округление ТОЛЬКО для весовых
    if (row.isWeight) {
      newQty = Math.round(newQty * 1000) / 1000;
    }

    // Минимум
    const minQty = row.isWeight ? 0.001 : 1;
    if (newQty < minQty) {
      message.warning(t('sale.workspace.errors.minQty'));
      return;
    }

    // Остаток
    if (newQty > stock.initial) {
      message.warning(t('sale.workspace.errors.noStock'));
      return;
    }

    // ✅ Обновляем
    row.qty = newQty;
    stock.current = Math.round((stock.initial - newQty) * 1000) / 1000;

    setSaleProducts([...saleProducts]);
    setProductStock(new Map(productStock));
  }}
/>


*/
          
        );
      },
    },
    {
      //title: "Остаток",
      title: t('sale.workspace.table.stock'),
      render: (_: any, row: any) => round(productStock.get(row.key)?.current ?? row.stock, 3),
    },
    { 
      //title: "Скидка", 
       title: t('sale.workspace.table.discount'), 
     // dataIndex: "discount"
    render: (_: any, row: any) => {
      const discount = row.originalPrice ? (row.originalPrice - row.price) : 0;
      return discount > 0 ? (Math.abs(row.qty) *discount).toFixed(2) : "0";
    },
    },
    {
      //title: "Итого",
      title: t('sale.workspace.table.total'),
      render: (_: any, row: any) => (Math.abs(row.qty) * row.price).toFixed(2),
    },
  ];

  return (
    <>
      <Space className={styles.workspaceActions}>
        <Button icon={<AppstoreOutlined />} onClick={() => setModalVisible(true)}>
          {/* Список товаров */}
          {t('sale.workspace.buttons.productList')}
        </Button>

        <Input
          prefix={<BarcodeOutlined />}
         /*  placeholder="Штрих-код" */
         placeholder={t('sale.workspace.placeholders.barcode')}
          className={styles.barcodeInput}
          value={barcode}

          suffix={
            barcodeLoading ? (
              <LoadingOutlined spin />
            ) : (
              <>
                  <ScanOutlined 
                    onClick={() => setIsScannerOpen(true)} 
                    style={{ cursor: 'pointer', color: '#1890ff', fontSize: '18px' }} 
                  />
              
                </>
            )
          }

          onChange={(e) => setBarcode(e.target.value)}
          onPressEnter={() => {
            const parsed = parseBarcode(barcode);

            if (!parsed.productCode) {
              //message.warning("Неверный штрих-код");
              message.warning(t('sale.errors.invalidBarcode'));
              return;
            }

            const product = allProducts.find(
              (p) => p.code.trim() === parsed.productCode!.trim()
            );

            if (!product) {
              //message.warning("Товар с таким штрих-кодом не найден");
              message.warning(t('sale.workspace.errors.barcodeNotFound'));
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

            const receiptTitle = t('sale.receipt.windowTitle');
            const thankYouMsg = t('sale.receipt.thankYou');

            if (printWindow) {
              printWindow.document.write(`
                <html>
                  <head>
                    <title>${receiptTitle}</title>
                    <style>
                      body {
  font-family: 
    'JetBrains Mono',   
    'Courier New',      
    Courier,            
    monospace;          
  padding: 20px;
}

                      .center { text-align: center; }
                    </style>
                  </head>
                  <body>
                    <div class="center"><h3>${thankYouMsg}</h3></div>
                  </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
              printWindow.close();
            } else {
             // message.error("Не удалось открыть окно печати");
             message.error(t('sale.receipt.errors.printWindowFailed'));
            }
          }}
        >
          {/* Денежный ящик */}
          {t('sale.workspace.buttons.cashDrawer')}
        </Button>

        <div className={styles.totalDisplay}>
          {/* Сумма */}
          {t('sale.workspace.labels.totalSum')}: {Math.abs(total.toFixed(2))}
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

      <Space className={styles.detailsFooter}>
      
  {mode === "sale" && (
  <Button
    danger
    onClick={() => setReturnVisible(true)}
  >
    {/* Возврат */}
    {t('sale.workspace.buttons.return')}
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
   {/*  Отменить возврат */}
   {t('sale.workspace.buttons.cancelReturn')}
  </Button>
)}


{/* <Button
  onClick={() => {
    if (!selectedRowKey) {
     // message.warning("Сначала выберите товар");
     message.warning(t('sale.workspace.errors.selectProductFirst'));
      return;
    }
    if (!cashboxUser.discount) {
      //message.warning("Выбранный пользователь кассы не может давать скидки!");
      message.warning(t('sale.workspace.errors.noDiscountPermission'));
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
 
  {t('sale.workspace.buttons.discount')}
</Button> */}

<Button
  icon={<UnorderedListOutlined />}
  onClick={() => {
    /* if (!selectedRowKey) {
      message.warning(t('sale.workspace.errors.selectProductFirst'));
      return;
    } */
    setActionsModalVisible(true);
  }}
>
  {t('sale.workspace.buttons.actions')}
</Button>

<Modal
  title={t('sale.workspace.modals.title')} 
  open={actionsModalVisible}
  footer={null} // кнопки внутри
  onCancel={() => setActionsModalVisible(false)}
>
  <Space direction="vertical" style={{ width: '100%' }}>
    <Button
      type="primary"
      block
      onClick={() => {

        ///////06.02.2026

        if (!selectedRowKey) {
      message.warning(t('sale.workspace.errors.selectProductFirst'));
      return; // Прерываем выполнение, модалка скидки не откроется
    }
        ///////06.02.2026

        // открываем модалку скидки
        if (!cashboxUser.discount) {
          message.warning(t('sale.workspace.errors.noDiscountPermission'));
          return;
        }
        const selectedItem = saleProducts.find(p => p.key === selectedRowKey);
        if (selectedItem) {

          /////
          setSelectedDiscountRowKey(selectedRowKey);
          //////

          setManualDiscountAmount(selectedItem.discount || 0);
          setManualDiscountPercent(
            ((selectedItem.discount || 0) / selectedItem.originalPrice) * 100
          );
        }
        setManualDiscountVisible(true);
        setActionsModalVisible(false);
      }}
    >
      {t('sale.workspace.buttons.discount')}
    </Button>

    <Button
      type="default"
      block
      danger
      /* onClick={() => {
        // TODO: логика списания долга
        message.info('Списание долга');
        setActionsModalVisible(false);
      }} */
     onClick={() => setIsDebtWriteOffOpen(true)}
    >
      {t('sale.workspace.buttons.writeOffDebt')}
    </Button>

    <Button
      type="dashed"
      block
      onClick={() => {
        // TODO: логика наценки
        message.info('Наценка');
        setActionsModalVisible(false);
      }}
    >
      {t('sale.workspace.buttons.markup')}
    </Button>
  </Space>
</Modal>

        <Button
  type="primary"
  size="large"
  onClick={handlePaymentClick} // вызываем новую функцию
>
{/*   Оплата */}
{t('sale.workspace.buttons.payment')}
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
        KaspiIp={KaspiIp}
        onCompletePayment={(_) => {
          //console.log("Оплата завершена:", data);
          setSaleProducts([]);        
          setSelectedRowKey(null);   
        }}
      />
<ReturnWorkspace
  visible={returnVisible}
  pointId={point.id}
  onClose={() => {
    setReturnVisible(false);
    setIsReturnMode(false);
  }}
  /* onReturnReady={(returnedItems, ticket, allProducts) => {
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
  }} */
 onReturnReady={(returnedItems, ticket, allProducts) => {
    // 1. Сохраняем выбранный чек
    setReturnTicket(ticket);

    // 2. Очищаем текущие остатки (Map) перед загрузкой новых
    const newStock = new Map(); 

    // 3. Подготовка возвратных товаров
    const preparedReturnItems = returnedItems.map((item) => {
      const key = makeProductKey(item);
      const productFromCatalog = allProducts.find((p) => p.id === item.product);

      // Заполняем новые остатки для каждого возвратного товара
      newStock.set(key, {
        initial: Math.abs(item.qty),
        current: 0, // при возврате остаток в рабочей области устанавливаем в 0
      });

      return {
        ...item,
        key,
        isReturn: true,
        name: item.name || productFromCatalog?.name || "Товар",
        qty: -Math.abs(item.qty),
        price: item.price,
        originalPrice: item.originalPrice || item.price,
      };
    });

    // 4. ПРИНУДИТЕЛЬНАЯ ОЧИСТКА И ОБНОВЛЕНИЕ
    setProductStock(newStock); // заменяем старый Map новым
    setSaleProducts(preparedReturnItems); // заменяем список (убираем (...prev))
    setSelectedRowKey(null); // сбрасываем выбор строки

    // 5. Переключаем режимы
    setIsReturnMode(true);
    setMode("return");

    // 6. Закрываем окно возврата
    setReturnVisible(false);
  }}
/>

<Modal
  // title="Ручная скидка"
  title={t('sale.workspace.modals.manualDiscount.title')}
  open={manualDiscountVisible}
  onOk={applyManualDiscount}
  onCancel={() => setManualDiscountVisible(false)}
  //okText="Применить"
 // cancelText="Отмена"
 okText={t('sale.workspace.buttons.apply')}
 cancelText={t('sale.workspace.buttons.cancel')}
>
  {selectedDiscountRowKey && (() => {
    const item = saleProducts.find(p => p.key === selectedDiscountRowKey);
    if (!item) return null;

    return (
      <div className={styles.discountModalContent}>
        {/* Поле для ввода суммы скидки */}
        <div>
          <label className={styles.inputLabel}>
            {/* Сумма скидки : */}
            {t('sale.workspace.modals.manualDiscount.amountLabel')}
          </label>
          <Input
            type="number"
            min={0}
            max={item.originalPrice}
            value={manualDiscountAmount}
            onChange={(e) => handleAmountChange(Number(e.target.value), item.originalPrice)}
            //placeholder="Введите сумму скидки"
            placeholder={t('sale.payment.discount.enterSum')}
          />
        </div>

        {/* Поле для ввода процента скидки */}
        <div>
          <label className={styles.inputLabel}>
            {/* Процент скидки (%): */}
            {t('sale.workspace.modals.manualDiscount.percentLabel')}
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            value={manualDiscountPercent}
            onChange={(e) => handlePercentChange(Number(e.target.value), item.originalPrice)}
            //placeholder="Введите процент скидки"
            placeholder={t('sale.payment.discount.enterPercent')}
          />
        </div>
        <div className={styles.discountLimitHint}>
  {/* Максимальная скидка: {maxDiscountPercent}% */}
  {t('sale.workspace.modals.manualDiscount.maxLimit', { percent: maxDiscountPercent })}
</div>
      </div>
    );
  })()}
</Modal>


<DebtWriteOffModal 
  open={isDebtWriteOffOpen} 
  onClose={() => setIsDebtWriteOffOpen(false)} 
  
/>
{/* Модальное окно списания долга */}
{/* <Modal
  title={<b>{t('report.debt.modalRepayTitle') || "Списание долга"}</b>}
  open={isDebtWriteOffOpen}
  onCancel={() => {
    setIsDebtWriteOffOpen(false);
    clearFields(); 
  }}
  onOk={handleRepay}
  okText={t('sale.payment.buttons.confirm')}
  cancelText={t('sale.payment.buttons.cancel')}
  destroyOnHidden={true}
>
  <Space direction="vertical" style={{ width: '100%' }} size="middle">
    
    <div style={{ display: 'flex', gap: 10 }}>
      <Button 
        style={{ flex: 1, backgroundColor: debtorType === 0 ? '#52c41a' : '', color: debtorType === 0 ? 'white' : '', borderColor: debtorType === 0 ? '#52c41a' : '' }}
        onClick={() => setDebtorType(0)}
      >
        {t('sale.payment.labels.individual') || "Физ. лицо"}
      </Button>
      <Button 
        style={{ flex: 1, backgroundColor: debtorType === 1 ? '#52c41a' : '', color: debtorType === 1 ? 'white' : '', borderColor: debtorType === 1 ? '#52c41a' : '' }}
        onClick={() => setDebtorType(1)}
      >
        {t('sale.payment.labels.legal') || "Юр. лицо"}
      </Button>
    </div>

    {debtorType === 0 ? (
      <>
        
        <div style={{ marginBottom: '5px' }}>
          <b>{t('sale.payment.labels.phone')}</b>
          <Space.Compact style={{ width: '100%', display: 'flex' }}>
            <Input 
              style={{ width: '50px', textAlign: 'center', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.85)', flexShrink: 0 }} 
              value="+7" 
              disabled 
            />
            <Input
              placeholder="7071234567"
              value={debtPhone}
              onChange={(e) => setDebtPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              style={{ flexGrow: 1 }}
            />
            <Button 
              icon={<SearchOutlined />} 
              onClick={searchByPhone}
              style={{ height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </Space.Compact>
        </div>

       
        <div style={{ marginBottom: '5px' }}>
          <b>{t('sale.payment.labels.firstname')}</b>
          <Space.Compact style={{ width: '100%', display: 'flex' }}>
            <Input 
              value={debtFirstname} 
              onChange={(e) => setDebtFirstname(e.target.value)} 
              style={{ flex: 1 }}
            />
            <Button 
              icon={<SearchOutlined />} 
              onClick={searchByFirstname} 
              style={{ height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            />
          </Space.Compact>
        </div>

        
        <div style={{ marginBottom: '5px' }}>
          <b>{t('sale.payment.labels.lastname')}</b>
          <Space.Compact style={{ width: '100%', display: 'flex' }}>
            <Input 
              value={debtLastname} 
              onChange={(e) => setDebtLastname(e.target.value)} 
              style={{ flex: 1 }}
            />
            <Button 
              icon={<SearchOutlined />} 
              onClick={searchByLastname} 
              style={{ height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            />
          </Space.Compact>
        </div>
      </>
    ) : (
      <>
        
        <div style={{ marginBottom: '5px' }}>
          <b>{t('sale.payment.messages.binLabel')}</b>
          <Space.Compact style={{ width: '100%', display: 'flex' }}>
            <Input
              placeholder="БИН"
              value={legalBIN}
              onChange={(e) => setLegalBIN(e.target.value.replace(/\D/g, ""))}
              style={{ flex: 1 }}
            />
            <Button 
              icon={<SearchOutlined />} 
              onClick={searchLegalByBIN} 
              style={{ height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </Space.Compact>
        </div>

        
        <div style={{ marginBottom: '5px' }}>
          <b>{t('sale.payment.messages.nameLabel')}</b>
          <Space.Compact style={{ width: '100%', display: 'flex' }}>
            <Input 
              placeholder="Наименование"
              value={legalName} 
              onChange={(e) => setLegalName(e.target.value)} 
              style={{ flex: 1 }}
            />
            <Button 
              icon={<SearchOutlined />} 
              onClick={searchLegalByName} 
              style={{ height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </Space.Compact>
        </div>
      </>
    )}

    
    <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #d9d9d9' }}>
      <span>{t('sale.payment.labels.currentDebt')}: <b>{selectedClient?.debt || 0} </b></span>
      <ArrowDownOutlined 
        style={{ color: '#1890ff', fontSize: '18px', cursor: 'pointer' }} 
        onClick={() => setWriteOffAmount(String(selectedClient?.debt || 0))} 
      />
    </div>

   
    <div>
      <b>{t('sale.payment.labels.debtAmount') || "Сумма списания"}</b>
      <Input 
        type="number" 
        size="large"
        placeholder="0.00" 
        value={writeOffAmount} 
        onChange={e => setWriteOffAmount(e.target.value)} 
        
      />
    </div>
  </Space>
</Modal> */}

{/* Дополнительная модалка, если найдено много клиентов (как в PaymentModal) */}
{/* <ClientSelectModal
  open={isClientListModalOpen}
  // Если foundClients вдруг null/undefined, передаем пустой массив, чтобы не было ошибки .some()
  clients={foundClients || []} 
  onCancel={() => setIsClientListModalOpen(false)}
  onSelect={(client) => {
    fillClientData(client);
    setIsClientListModalOpen(false);
  }}
/> */}




<BarcodeScanner 
        visible={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScanSuccess} 
      />

    </>
  );
};

export default SaleWorkspace;
