import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Select, Checkbox, message,Radio,Space } from "antd";
import useApiRequest from "../../hooks/useApiRequest";
import ClientSelectModal from "./ClientSelectModal";
import { SearchOutlined } from "@ant-design/icons";
import ReceiptPrinter from "./ReceiptPrinter";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./Sale.module.css";
import KaspiPayment from './KaspiPayment';



const { Option } = Select;

interface Props {
  open: boolean;
  totalAmount: number;
  saleProducts: any[];
  onClose: () => void;
  onCompletePayment: (data: any) => void;
  cashboxUser: any;
  role4Users?: User[];
  point: any;
  companyInfo: any;
  ticketFormat: any;
  KaspiIp: any;
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
  discount?: number;

  displayFile?: string;
  onLogoLoaded?: () => void;
}

// -------------------- Функция печати --------------------


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

const PaymentModal: React.FC<Props> = ({
  open,
  totalAmount,
  onClose,
  cashboxUser,
  role4Users,
  saleProducts,
  onCompletePayment,
  point,
  companyInfo,
  ticketFormat,
  KaspiIp,
}) => {
  const { sendRequest } = useApiRequest();

  const [amountModalVisible, setAmountModalVisible] = useState(false);

  // Оплата
  const [cashAmount, setCashAmount] = useState<number>(totalAmount);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [change, setChange] = useState<number>(0);

  const [discount, setDiscount] = useState<number>(0);
  const [markup, setMarkup] = useState<number>(0);
  const [usedBonuses, setUsedBonuses] = useState<number>(0);
  const [accruedBonuses, setAccruedBonuses] = useState<number>(0);
  const [clientName] = useState<string>("Физическое лицо");
  const [clientIIN, setClientIIN] = useState<string>("");
  const [certificateAmount] = useState<number>(0);
  const [useBonuses, setUseBonuses] = useState<boolean>(true);

  const [selectedConsultant, setSelectedConsultant] = useState<User | null>(
  role4Users && role4Users.length > 0 ? role4Users[0] : null
);

  const [currentPaymentType, setCurrentPaymentType] =
    useState<"cash" | "card" | "mixed" | "debit" | "debt" | "certificate" | null>(
      null
    );

  const [selectClientModalOpen, setSelectClientModalOpen] = useState(false);
  const [foundClients, setFoundClients] = useState<any[]>([]);
   

  // -------------------- Юридическое лицо --------------------
const [legalModalVisible, setLegalModalVisible] = useState(false);
const [legalBIN, setLegalBIN] = useState("");
const [legalName, setLegalName] = useState("");
const [selectedLegal, setSelectedLegal] = useState<any>(null);
const [foundLegalClients, setFoundLegalClients] = useState<any[]>([]);



    // --- Продажа в долг ---
  const [debtModalVisible, setDebtModalVisible] = useState(false);
const [debtClient, setDebtClient] = useState<any>(null); // хранит найденного клиента
const [debtPhone, setDebtPhone] = useState<string>("");
const [debtFirstname, setDebtFirstname] = useState<string>("");
const [debtLastname, setDebtLastname] = useState<string>("");
const [debtAmount, setDebtAmount] = useState<number>(0);  

const [confirmedDebt, setConfirmedDebt] = useState<{ client: any; amount: number } | null>(null);

const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [discountType, setDiscountType] = useState<"sum" | "percent">("sum");
  const [discountValue, setDiscountValue] = useState(0);

  const { t } = useTranslation();


///////28.01.2026
const [posIp] = KaspiIp; // IP из настроек компании
const handleKaspiSuccess = (transactionId: string) => {
    console.log("Транзакция завершена:", transactionId);
    // Здесь ваша логика:
    // 1. Отправить transactionId на сервер для закрытия чека
    // 2. Очистить корзину
    // 3. Перейти на страницу успеха
  };

///////28.01.2026


///
const maxDiscountPercent = cashboxUser?.discountinfo ?? 0;


const originalTotal = saleProducts.reduce(
  (sum, p) => sum + p.originalPrice * Math.abs(p.qty),
  0
);

const itemsDiscountTotal = saleProducts.reduce(
  (sum, p) => sum + (p.discount || 0) * Math.abs(p.qty),
  0
);

const totalAfterItems = originalTotal - itemsDiscountTotal;

const applyReceiptPercentDiscount = (percent: number) => {
  const safePercent = Math.max(percent, 0);

  const maxReceiptDiscountAmount =
    (originalTotal * maxDiscountPercent) / 100
    - itemsDiscountTotal;

  const available = Math.max(maxReceiptDiscountAmount, 0);

  const calculatedDiscount =
    (totalAfterItems * safePercent) / 100;

  if (calculatedDiscount > available) {
    /* message.warning(
      `Превышен лимит скидки. Доступно: ${available.toFixed(2)}`
    ); */

    message.warning(t('sale.payment.errors.limitExceeded', { amount: available.toFixed(2) }));
    
    return;
  }

  setDiscount((originalTotal * safePercent) / 100);
};


const applyReceiptSumDiscount = (amount: number) => {
  const safeAmount = Math.max(amount, 0);

  const maxReceiptDiscountAmount =
    (originalTotal * maxDiscountPercent) / 100
    - itemsDiscountTotal;

  const available = Math.max(maxReceiptDiscountAmount, 0);

  if (safeAmount > available) {
   /*  message.warning(
      `Превышен лимит скидки. Доступно: ${available.toFixed(2)}`
    ); */

     message.warning(t('sale.payment.errors.limitExceeded', { amount: available.toFixed(2) }));
   
   
    return;
  }

  setDiscount(safeAmount);
};



const applyDiscount = () => {
  if (discountType === "percent") {
    applyReceiptPercentDiscount(discountValue);
  } else {
    applyReceiptSumDiscount(discountValue);
  }

  setDiscountModalVisible(false);
};
////

  useEffect(() => {
    const effectiveTotal = totalAmount - discount;
    let totalPaid = 0;
    if (currentPaymentType === "cash") totalPaid = cashAmount;
    else if (currentPaymentType === "mixed") totalPaid = cardAmount;
    else totalPaid = cashAmount + cardAmount + transferAmount;

    setChange(totalPaid - effectiveTotal);
  }, [cashAmount, cardAmount, transferAmount, currentPaymentType, totalAmount, discount]);


   const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });


const resetPaymentForm = () => {
  //setCashAmount(totalAmount);
  setCashAmount(0);
  setCardAmount(0);
  setTransferAmount(0);
  setChange(0);

  setDiscount(0);
  setMarkup(0);
  setUsedBonuses(0);
  setAccruedBonuses(0);
  // clientName оставим "Физическое лицо" по умолчанию
  setClientIIN("");
  setUseBonuses(true);
  setSelectedConsultant(role4Users && role4Users.length > 0 ? role4Users[0] : null);

  setCurrentPaymentType(null);
  setAmountModalVisible(false);

  // Сброс долга
  setDebtModalVisible(false);
  setDebtClient(null);
  setDebtPhone("");
  setDebtFirstname("");
  setDebtLastname("");
  setDebtAmount(0);
  setConfirmedDebt(null);

  // Сброс юридического лица
  setLegalModalVisible(false);
  setLegalBIN("");
  setLegalName("");
  setSelectedLegal(null);

  // Сброс поиска клиентов
  setFoundClients([]);
  setSelectClientModalOpen(false);
};


// ======================= ПОИСК КЛИЕНТА ========================

const searchByPhone = async () => {
   //const phone = debtPhone.replace(/\D/g, "").slice(1); // убираем +7
   const phone = debtPhone;
  if (!phone) return 
  //message.error("Введите номер телефона");
  message.error(t('sale.payment.errors.enterPhone'))

  try {
    const data = await sendRequest(
      `${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfo?telephone=${phone}`
    ,{ headers: getHeaders() }
    );

    if (!data) return 
    //message.error("Клиент не найден");
    message.error(t('sale.payment.errors.clientNotFound'));

    const client = Array.isArray(data) ? data[0] : data;

    setDebtClient(client);
    setDebtFirstname(client.firstname || "");
    setDebtLastname(client.lastname || "");
    setDebtPhone(debtPhone);

  } catch {
   // message.error("Ошибка поиска клиента");
   message.error(t('sale.payment.errors.searchError'));
  }
};

const searchByFirstname = async () => {
  if (!debtFirstname) return 
  //message.error("Введите имя");
  message.error(t('sale.payment.errors.enterFirstname'));

  try {
    const data = await sendRequest(
      `${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfobyname?name=${encodeURIComponent(debtFirstname)}`
    ,{ headers: getHeaders() }
    );

    if (!data) return 
    //message.error("Клиент не найден");
    message.error(t('sale.payment.errors.clientNotFound'));

    

    if (data.length === 1) {
      const client = Array.isArray(data) ? data[0] : data;
      setDebtClient(client);
      setDebtFirstname(client.firstname || "");
      setDebtLastname(client.lastname || "");
      setDebtPhone(`${client.telephone}`);
    } else {
      // несколько клиентов — открываем модалку выбора
      setFoundClients(data);
      setSelectClientModalOpen(true);
    }

  } catch {
   // message.error("Ошибка поиска клиента");
   message.error(t('sale.payment.errors.searchError'));
  }
};

const searchByLastname = async () => {
  if (!debtLastname) return 
  //message.error("Введите фамилию")
  message.error(t('sale.payment.errors.enterLastname'))
  ;

  try {
    const data = await sendRequest(
      `${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfobylastname?name=${encodeURIComponent(debtLastname)}`
    ,{ headers: getHeaders() }
    );

    if (!data) return 
    //message.error("Клиент не найден");
    message.error(t('sale.payment.errors.clientNotFound'));

    if (data.length === 1) {
      const client = Array.isArray(data) ? data[0] : data;
      setDebtClient(client);
      setDebtFirstname(client.firstname || "");
      setDebtLastname(client.lastname || "");
      setDebtPhone(`${client.telephone}`);
    } else {
      // несколько клиентов — открываем модалку выбора
      setFoundClients(data);
      setSelectClientModalOpen(true);
    }

  } catch {
    //message.error("Ошибка поиска клиента");
    message.error(t('sale.payment.errors.searchError'));
  }
};

const handleClientSelect = (client: any) => {
  setDebtClient(client);
  setDebtFirstname(client.firstname || "");
  setDebtLastname(client.lastname || "");
  setDebtPhone(client.telephone || "");
  setSelectClientModalOpen(false);
};


const handleOpenDebt = () => {
  // если уже выбран клиент
  if (confirmedDebt) {
    Modal.confirm({
      //title: "Удалить долг?",
      //content: "Вы хотите удалить текущего должника?",
      title: t('sale.payment.modals.debt.deleteTitle'),
      content: t('sale.payment.modals.debt.deleteContent'),
      zIndex: 3502,
      //okText: "Да",
      //cancelText: "Нет",
      okText: t('sale.payment.buttons.yes'),
      cancelText: t('sale.payment.buttons.no'),
      onOk: () => {
        setConfirmedDebt(null);
        setDebtClient(null);
        setSelectedLegal(null);
        setDebtPhone("");
        setDebtFirstname("");
        setDebtLastname("");
        setDebtAmount(0);
      }
    });
    return;
  }

  setCurrentPaymentType("debt");
  setDebtModalVisible(true);
};

const confirmDebt = () => {
  if (!debtClient && !selectedLegal) {
    //message.error("Сначала найдите клиента или выберите предприятие!");
    message.error(t('sale.payment.errors.selectClientOrCompany'));
    return;
  }

  if (debtAmount <= 0) {
    //message.error("Введите сумму долга");
    message.error(t('sale.payment.errors.enterDebtAmount'));
    return;
  }

 
  //if (debtAmount > totalAmount) {
  if (debtAmount > totalAmount- discount) {
    //message.error("Сумма долга не может превышать сумму оплаты");
    message.error(t('sale.payment.errors.debtExceedsTotal'));
    return;
  }

  // Сценарий: долг равен сумме чека
  //if (debtAmount === totalAmount) {
  if (debtAmount === totalAmount- discount) {
    Modal.confirm({
      //title: "Подтвердите оплату в долг",
      //content: `Продать в долг ${debtAmount} клиенту ${debtClient.firstname} ${debtClient.lastname}?`,
      //content: `Продать в долг ${debtAmount}  ?`,
      title: t('sale.payment.modals.debt.confirmTitle'),
      zIndex: 3502,
      content: t('sale.payment.modals.debt.confirmContent', { amount: debtAmount }),
      onOk: () => {
        setConfirmedDebt({ client: debtClient, amount: debtAmount });
        setDebtModalVisible(false);
        setCurrentPaymentType("debt");
        //message.success("Оплата в долг подтверждена");
        message.success(t('sale.payment.messages.successMessage'));
        handlePayment("debt", { client: debtClient, amount: debtAmount }); // сразу запускаем оплату
      },
    });
    return;
  }

  // Сценарий: долг меньше суммы чека → смешанная оплата
  setConfirmedDebt({ client: debtClient, amount: debtAmount });
  setDebtModalVisible(false);
  setCurrentPaymentType("mixed");
  //message.success("Долг установлен, будет смешанная оплата");
  message.success(t('sale.payment.messages.debtMixedSet'));
};


const resetDebtForm = () => {
  setDebtClient(null);
  setDebtPhone("");
  setDebtFirstname("");
  setDebtLastname("");
  setDebtAmount(0);
};

useEffect(() => {
  if (!debtModalVisible) resetDebtForm();
}, [debtModalVisible]);

/////
// Открытие модального окна
const handleOpenLegalModal = () => {
  if (selectedLegal) {
    Modal.confirm({
      title: 
      /* "Удалить выбранное предприятие?" */
      t('sale.payment.messages.deleteConfirm')
      ,
      zIndex: 3502,
      onOk: () => setSelectedLegal(null),
    });
  } else {
    setLegalModalVisible(true);
  }
};

// Поиск по БИН
const searchLegalByBIN = async () => {
  if (!legalBIN) return message.error(
    /* "Введите БИН" */
    t('sale.payment.messages.searchByBin')
  );
  try {
    const data = await sendRequest(
      `${import.meta.env.VITE_API_URL}/external/api/customers?bin=${legalBIN}`,
      { headers: getHeaders() }
    );
    if (!data || data.length === 0) return message.error(
      /* "Предприятие не найдено" */
    t('sale.payment.messages.notFound')
    );
    const selected = Array.isArray(data) ? data[0] : data;

    setSelectedLegal(selected); // сохраняем объект
    setLegalModalVisible(false);
    setLegalBIN("");
    setLegalName("");

  } catch {
    message.error(
      /* "Ошибка поиска предприятия" */
      t('sale.payment.messages.searchError')
    );
  }
};

// Поиск по Наименованию
const searchLegalByName = async () => {
  if (!legalName) return message.error(
    /* "Введите наименование" */
    t('sale.payment.messages.searchByName')
  );
  try {
    const data = await sendRequest(
      `${import.meta.env.VITE_API_URL}/external/api/customers?name=${encodeURIComponent(legalName)}`,
      { headers: getHeaders() }
    );
    if (!data || data.length === 0) return message.error(
     /*  "Предприятие не найдено" */
     t('sale.payment.messages.notFound')
    );
   const selected = Array.isArray(data) ? data[0] : data;

    setSelectedLegal(selected); // сохраняем объект
    setLegalModalVisible(false);
    setLegalBIN("");
    setLegalName("");

  } catch {
    message.error(
      /* "Ошибка поиска предприятия" */
      t('sale.payment.messages.searchError')
    );
  }
};

// Подтверждение выбора юридического лица
const confirmLegalClient = (client: any) => {
  setSelectedLegal(client);
  setLegalModalVisible(false);
  setLegalBIN("");
  setLegalName("");
  setDebtClient(null); // физ лицо = 0
  //setConfirmedDebt(null);
};
/////

  // -----------------------------------------
  // Открытие модала оплаты
  // -----------------------------------------
  const handleOpenAmountModal = (
  type: "cash" | "card" | "mixed" | "debit" | "debt" | "certificate"
) => {


  // --- ЕСЛИ ДОЛГ УСТАНОВЛЕН И ОН < полной суммы ---
  //if (confirmedDebt && confirmedDebt.amount < totalAmount) {
  if (confirmedDebt && confirmedDebt.amount < totalAmount- discount) {
    setCurrentPaymentType("mixed");
    setAmountModalVisible(true);
    return;
  }

  setCurrentPaymentType(type);

  // Если смешанная оплата — учитываем долг
  if (type === "cash" || type === "mixed") {
    setAmountModalVisible(true);
    return;
  }

  
  // Прямые подтверждения (карта / дебет / сертификат)
  Modal.confirm({
    //title: "Подтвердите оплату",
    title: t('sale.payment.modals.confirm.title'),
    zIndex: 3502,
    content:
      type === "card"
     //   ? `Подтверждаете оплату картой на сумму ${totalAmount}?`
     //   : `Подтверждаете оплату на сумму ${totalAmount}?`,
      //  ? `Подтверждаете оплату картой на сумму ${totalAmount- discount}?`
      //   : `Подтверждаете оплату на сумму ${totalAmount- discount}?`,
      ? t('sale.payment.modals.confirm.card', { amount: totalAmount- discount }) 
      : t('sale.payment.modals.confirm.generic', { amount: totalAmount- discount }),
    onOk: () => handlePayment(type),
  });
};

/////

const openDiscountModal = () => {
    setDiscountValue(discount);
    setDiscountModalVisible(true);
  };

/////

  // -----------------------------------------
  // Основная логика оплаты
  // -----------------------------------------
  const handlePayment = async (
    forcedType?: "cash" | "card" | "mixed" | "debit" | "debt" | "certificate"
  
    ,debtInfo?: { client: any; amount: number; fizid?: number; customerid?: number } | null
  
    /////28.01.2026
    , transId?: string
    /////28.01.2026

  ) => {
    const type = forcedType ?? currentPaymentType;

   

    if (!type) {
      message.error(
        /* "Не выбран тип оплаты!" */
        t('sale.payment.errors.noType')
      );
      return;
    }

   
   // if (type === "cash" && cashAmount < totalAmount) {
    if (type === "cash" && cashAmount < totalAmount- discount) {
      message.error(
        /* "Сумма наличных меньше суммы к оплате" */
        t('sale.payment.errors.insufficientCash')
      );
      return;
    }

  const actualDebt = debtInfo || confirmedDebt;  

  if (type === "mixed") {
  //const debtPay = confirmedDebt ? confirmedDebt.amount : 0;

  
  const debtPay = actualDebt ? actualDebt.amount : 0;
  //const requiredMixedPay = totalAmount - debtPay;
  const requiredMixedPay = totalAmount- discount - debtPay;

  const realPay = cashAmount + cardAmount + transferAmount;

  if (realPay < requiredMixedPay) {
    message.error(
      /* `Недостаточно средств. Не хватает ${requiredMixedPay - realPay}` */
      t('sale.payment.errors.insufficientMixed', { amount: (requiredMixedPay - realPay).toFixed(2) })
    );
    return;
  }

  if (realPay > requiredMixedPay) {
    message.error(
      /* "Сумма оплаты превышает остаток после учета долга" */
      t('sale.errors.excessPayment')
    );
    return;
  }
}

    if (!saleProducts.length) {
      message.error(
        /* "Нет товаров в чеке" */
        t('sale.errors.noProducts')
      );
      return;
    }

    const transactionDetails = saleProducts.map((p, index) => ({
      bonusadd: 0,
      //product: Number(p.id.split("_")[0]),
      product: p.productId,
      excisestamp: [],
      price: p.price,
      line: index + 1,
      ticketdiscount: 0,
      pieceunits: 0,
      discount: p.discount || 0,
      attributes: p.listcode,
      units: p.qty,
      bonuspay: 0,
      cert: p.certificates || [],
      bonusrate: 0,
      nds: 0,
      coupon: p.coupons || [],
      invoicenumber: p.invoiceNumber || "",
      promotions: p.promotions || [],
    }));

    const transaction = {
      date: new Date().toLocaleString("ru-RU"),
      bonusadd: accruedBonuses,
      //cashpay: type === "cash" ? cashAmount : cashAmount,
      //cashpay: cashAmount,
      //cashpay: Math.min(cashAmount, totalAmount),
      cashpay: Math.min(cashAmount, totalAmount-discount),
      discount,
      cert: [],
      bonuspay: usedBonuses,
      debtorid: 0,
      parentid: 0,
      coupon: [],
      ofdurl: "",

      /////28.01.2026
      paymenttransid: transId || "",
      /////28.01.2026

      //price: totalAmount,
      price: totalAmount-discount,
      cashboxuser: cashboxUser.id,
      details: transactionDetails,
      ofdnumber: "1",
      certpay: certificateAmount,
      tickettype: 0,
      //cardpay: type === "card" ? totalAmount : cardAmount,
      cardpay: cardAmount,
      ticketid: 0,
      bonusid: 0,
      cashbox: cashboxUser.cashboxId,
      sellerid: selectedConsultant?.id ?? 0,
      //customerid: 0,
      customerid: selectedLegal ? selectedLegal.id : 0,
      //selectedLegal
      //fizid: 0,
      //fizid: type === "debt" && debtClient ? debtClient.id : 0,
      //debtpay: type === "debt" ? totalAmount : 0,
      //debtpay: type === "debt" ? debtAmount : 0,
      //fizid: confirmedDebt ? confirmedDebt.client.id : 0,
      fizid: debtClient ? debtClient.id : 0,
      //debtpay: confirmedDebt ? confirmedDebt.amount : 0,
      debtpay: actualDebt ? actualDebt.amount : 0,
      paymenttype: type,
      hash: "",
      debitpay: transferAmount,
      detailsdiscount: 0,
      shiftnumber: 1,
      consignment: false,
      total: totalAmount-discount,
      issalebypiece: false,
      promotions: [],
    };

    const getPaymentMethodText = () => {
  switch (currentPaymentType) {
    case "cash":
      return        t('sale.payment.methods.cash')
      /* "Наличный расчет" */
      
      ;
    case "card":
        return   t('sale.payment.methods.card')
      /* "Оплата картой" */
      ;
    case "mixed":
      return   t('sale.payment.methods.mixed')
      /* "Смешанная оплата" */
      ;
    case "debit":
      return  t('sale.payment.methods.debit')
      /* "Безналичный перевод" */
      ;
    case "debt":
      return   t('sale.payment.methods.debt')
      /* "Продажа в долг" */
      ;
    /* case "certificate":
      return "Оплата сертификатом"; */
    default:
      return  t('sale.payment.methods.unknown')
      /* "Не указан" */
      ;
  }
};




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
        //message.success("Оплата проведена");
        message.success(t('sale.payment.messages.success'));

       

        setAmountModalVisible(false);
        onClose();
        onCompletePayment([]);

        // после успешной оплаты

        // Вставляем компонент печати
// Печать чека через iframe

/*  if (!cashboxUser) {
  message.error("Не указан пользователь кассы");
  return;
} */




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

//console.log(saleProducts);

printReceipt({
  saleProducts,
  //totalAmount,
  totalAmount:totalAmount- discount,
  discount,
  clientName: confirmedDebt
    ? `${confirmedDebt.client.firstname} ${confirmedDebt.client.lastname}`
    : 
    /* "Физическое лицо" */
    t('sale.payment.labels.individual')
    ,
  confirmedDebtAmount: confirmedDebt?.amount,
  cashboxUser,
  selectedConsultant: selectedConsultant ? selectedConsultant.name :"",

  // новые обязательные поля
  paymentMethodText: getPaymentMethodText(), 
  VAT:"0",
  ...receiptData,
  ...receiptFlags, 
 
});

 // Сбрасываем все формы и состояния
  resetPaymentForm();

      } else {
       // message.error(data.text || "Ошибка сервера");
       message.error(data.text || t('sale.payment.errors.serverError'));
      }
    } catch (err) {
      console.error(err);
     // message.error("Ошибка передачи транзакции на сервер");
     message.error(t('sale.payment.errors.transferError'));
    }
  };

  return (
    <>
      {/* главное модальное окно */}
      <Modal open={open} title=
      /* "Оплата" */
      {t('sale.payment.title')}
       onCancel={onClose} footer={null} width={1000} zIndex={3500}>
        <div className={styles.flexRow}>
          {/* ------------------- ЛЕВАЯ ПАНЕЛЬ ------------------- */}
          <div className={styles.flexContent}> 
            <div className={styles.justifyBetween}> 
              <span><b>
               {/*  Итого к оплате */}
                {t('sale.payment.labels.totalToPay')}:</b></span>
               <span>{totalAmount-discount}</span>
             </div>
             <div className={styles.justifyBetween}>
               <span><b>
                {/* Сумма чека */}
                {t('sale.payment.labels.totalCheckAmount')}:</b></span> 
               <span>{totalAmount-discount}</span> 
             </div>
             <div className={styles.justifyBetween}>
                <span><b>
                  {/* Клиент */}
                  {t('sale.payment.labels.client')}:</b></span>
                {/* <span>{clientName}</span>  */}
                <span>
   {/* {confirmedDebt
     ? `${confirmedDebt.client.firstname} ${confirmedDebt.client.lastname}`
      : ""} */}

       {selectedLegal
      ? 
      //`Юридическое лицо ${selectedLegal.name} (${selectedLegal.bin})`
      t('sale.payment.labels.legalEntity', { 
    name: selectedLegal.name, 
    bin: selectedLegal.bin 
  })
      : confirmedDebt
      ? 
      //`Физическое лицо ${confirmedDebt.client.firstname} ${confirmedDebt.client.lastname}`
      t('sale.payment.labels.physicalPerson', { 
    firstname: confirmedDebt.client.firstname, 
    lastname: confirmedDebt.client.lastname 
  })
  : ""}
  </span>
                </div> 
                <div className={styles.justifyBetween}> 
                  <span><b>
                    {/* ИИН клиента   */}                  
                    {t('sale.payment.labels.iin')}:</b></span> 
                  <Input value={clientIIN} onChange={(e) => setClientIIN(e.target.value)} className={styles.mainContentArea} /> 
                </div> 
                <div className={styles.justifyBetween}> 
                  <span><b>
                    {/* Скидка на чек */}
                    {t('sale.payment.labels.discount')}:</b></span> 
                  <span>{discount}</span> 
                </div> 
                <div className={styles.justifyBetween}> 
                  <span><b>
                    {/* Наценка на чек */}
                    {t('sale.payment.labels.markups')}:</b></span> 
                  <span>{markup}</span> 
                </div> 
                <div className={styles.justifyBetween}> 
                  <span><b>
                    {/* Использовано бонусов */}
                    {t('sale.payment.labels.bonusesUsed')}:</b></span> 
                  <span>{usedBonuses}</span> 
                </div> 
                <div className={styles.justifyBetween}> 
                  <span><b>
                    {/* Начислено бонусов */}
                    {t('sale.payment.labels.bonusesEarned')}:</b></span> 
                  <span>{accruedBonuses}</span> 
                </div> 
                <div className={styles.justifyBetween}> 
                  <span><b>
                    {/* Оплата сертификатом */}
                    {t('sale.payment.labels.certificatePay')}:</b></span> 
                  <span>{certificateAmount}</span> 
                </div> 
                <div className={styles.justifyBetween}> 
                  <span><b>
                    {/* Долг */}
                    {t('sale.payment.labels.debtAmount1')}:</b></span> 
                  <span>{confirmedDebt ? confirmedDebt.amount : 0}</span> 
                </div> 
                <div className={styles.justifyBetween}> 
                  <span><b>
                   {/*  Продавец консультант */}
                    {t('sale.payment.labels.consultant')}:</b></span> 
                  
                  <Select
  value={selectedConsultant?.id}
  onChange={(id) => {
    const user = role4Users?.find(u => u.id === id) || null;
    setSelectedConsultant(user);
  }}
  className={styles.mainContentArea}
  //placeholder="Выберите консультанта"
  placeholder={t('sale.payment.labels.selectConsultant')}
>
  {role4Users?.map(user => (
    <Option key={user.id} value={user.id}>
      {user.name}
    </Option>
  ))}
</Select>
                  </div> 
                  <div> 
                  <span><b>
                   {/*  Использовать бонусы */}
                    {t('sale.payment.labels.useBonuses')}:</b></span>
                 <Checkbox 
                 checked={useBonuses} 
                 onChange={(e) => setUseBonuses(e.target.checked)}>
                </Checkbox> 
                </div> 
                </div>

          {/* ------------------- ПРАВАЯ ПАНЕЛЬ (КНОПКИ ОПЛАТЫ) ------------------- */}
          <div
           className={styles.actionGrid}
          >
            <Button size="large" onClick={() => handleOpenAmountModal("cash")}>
              💵 
              {/* Наличными */}
              {t('sale.payment.buttons.cash')}
            </Button>
            <Button size="large" onClick={() => handleOpenAmountModal("card")}>
              💳 
              {/* Карта */}
              {t('sale.payment.buttons.card')}
            </Button>

            <Button size="large" onClick={() => handleOpenAmountModal("mixed")}>
              💰 
             {/*  Смешанная */}
             {t('sale.payment.buttons.mixed')}
            </Button>
            <Button size="large" onClick={() => handleOpenAmountModal("debit")}>
              🏦 
             {/*  Безналичный */}
              {t('sale.payment.buttons.debit')}
            </Button>

            <Button size="large" onClick={() => handleOpenDebt()}>
              📜 
               {/* долг */}
               {t('sale.payment.buttons.debt')}
            </Button>

            <Button size="large" onClick={handleOpenLegalModal}>
              🎟 
              {/* Юридическое лицо */}
              {t('sale.payment.buttons.legal')}
            </Button>

            <Button size="large" 
            //onClick={openDiscountModal}
            onClick={() => {
               
                if (!cashboxUser.discount) {
                  //message.warning("Выбранный пользователь кассы не может давать скидки!");
                  message.warning(t('sale.workspace.errors.noDiscountPermission'));
                  return;
                }
                openDiscountModal();
                
              }}
            
            >
              💸 
              {/* Скидка */}
              {t('sale.payment.buttons.discount')}
            </Button>

            {/* Вставляем компонент Kaspi */}
      {/* <KaspiPayment 
        payTotal={totalAmount - discount}
        terminalIp={posIp} 
        onSuccess={handleKaspiSuccess} 
      /> */}

      <KaspiPayment 
  // Мы подаем чистую сумму, которую клиент реально должен списать с карты/QR
  payTotal={totalAmount - discount} 
  
  // IP берем из конфига точки (point)
  //terminalIp={point.kaspiConfig?.ip || ""} 
  terminalIp={KaspiIp} 
  
  onSuccess={(transId) => {
    // 1. Когда Kaspi подтвердил успех, принудительно ставим суммы
    setCardAmount(totalAmount - discount);
    setCashAmount(0);
    setTransferAmount(0);
    
    // 2. Вызываем основную функцию оплаты, передавая тип "card"
    // transId можно сохранить в объект транзакции или в лог
    handlePayment("card", null,transId); 
  }}
/>

           {/*  <Button size="large" onClick={() => handleOpenAmountModal("certificate")}>
              🎟 Сертификат
            </Button> */}
          </div>
        </div>
      </Modal>

      {/* модал ввода сумм */}
      <Modal
        open={amountModalVisible}
        //title="Ввод сумм"
        title={t('sale.payment.modals.amounts.title')}
        zIndex={3501}
        onCancel={() => setAmountModalVisible(false)}
        footer={null}
      >
        {currentPaymentType === "cash" && (
          <>
            <label>
              {/* Сумма наличных: */}
              {t('sale.payment.labels.cashAmount')}
              </label>
            <Input
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(Number(e.target.value))}
             className={styles.mb10}
            />

            <p>
              {/* Сдача */}
              {t('sale.payment.labels.change')}
              : {change >= 0 ? change : 0}</p>
          </>
        )}

       {currentPaymentType === "mixed" && (
  <>
    <label>
      {/* Наличные */}
      {t('sale.payment.labels.cash')}:</label>
    <Input
      type="number"
      value={cashAmount}
      onChange={(e) => setCashAmount(Number(e.target.value))}
      className={styles.mb5}
    />

    <label>
     {/*  Карта  */}     
      {t('sale.payment.labels.card')}:</label>
    <Input
      type="number"
      value={cardAmount}
      onChange={(e) => setCardAmount(Number(e.target.value))}
      className={styles.mb5}
    />

    <label>
      {/* Перевод */}
      {t('sale.payment.labels.transfer')}:</label>
    <Input
      type="number"
      value={transferAmount}
      onChange={(e) => setTransferAmount(Number(e.target.value))}
      className={styles.mb5}
    />

    <p>
      {/* Остаток после долга к оплате */}
      {t('sale.payment.labels.remainingAfterDebt')}:{" "}
      {/* <b>{totalAmount - (confirmedDebt ? confirmedDebt.amount : 0)}</b> */}
      <b>{totalAmount- discount - (confirmedDebt ? confirmedDebt.amount : 0)}</b>
    </p>
  </>
)}

        <Button
          type="primary"
          block
          size="large"
          onClick={() => {
            if (!currentPaymentType) {
             // message.error("Тип оплаты не выбран");
             message.warning(t('sale.payment.errors.noTypeSelected'));
              return;
            }
            handlePayment(currentPaymentType);
          }}
        >
         {/*  Завершить оплату */}
         {t('sale.payment.buttons.complete')}
        </Button>
      </Modal>


      {/* ===== МОДАЛ: ПРОДАЖА В ДОЛГ ===== */}
<Modal
  open={debtModalVisible}
  //title="Продажа в долг"
  title={t('sale.payment.modals.debt.title')}
  onCancel={() => setDebtModalVisible(false)}
  zIndex={3501}
  footer={null}
>

  <div className={styles.mb10}>
    <b>
      {/* Номер телефона */}
      {t('sale.payment.labels.phone')}
      </b>
    <div className={styles.flexGap5}>
      <Input
        value={debtPhone}
        addonBefore="+7"
        onChange={(e) =>
          setDebtPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
        }
      />
      <Button icon={<SearchOutlined />} onClick={searchByPhone} disabled={!!selectedLegal}/>
    </div>
  </div>

  <div className={styles.mb10}>
    <b>
      {/* Имя */}
      {t('sale.payment.labels.firstname')}
      </b>
    <div className={styles.flexGap5}>
      <Input value={debtFirstname} onChange={(e) => setDebtFirstname(e.target.value)} />
      <Button icon={<SearchOutlined />} onClick={searchByFirstname} disabled={!!selectedLegal}/>
    </div>
  </div>

  <div className={styles.mb10}>
    <b>
      {/* Фамилия */}
      {t('sale.payment.labels.lastname')}
      </b>
    <div className={styles.flexGap5}>
      <Input value={debtLastname} onChange={(e) => setDebtLastname(e.target.value)} />
      <Button icon={<SearchOutlined />} onClick={searchByLastname} disabled={!!selectedLegal} />
    </div>
  </div>

  <div className={styles.mb10}>
    <b>
      {/* Текущий долг */}
      {t('sale.payment.labels.currentDebt')}
      :</b> {debtClient?.debt || 0}
  </div>

  <div className={styles.mb20}>
    <b>
      {/* Сумма (долг) */}
      {t('sale.payment.labels.debtAmount')}
      </b>
    <Input
      type="number"
      value={debtAmount}
      onChange={(e) => setDebtAmount(Number(e.target.value))}
    />
  </div>

  <div className={styles.justifyBetween1}>
    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
    <Button onClick={() => setDebtModalVisible(false)}>
      {/* Отмена */}
      {t('sale.payment.buttons.cancel')}
      </Button>
    <Button type="primary" onClick={confirmDebt}>
      {t('sale.payment.buttons.confirm')}
     {/*  Подтвердить */}
      </Button>
      </Space>
  </div>
</Modal>

<ClientSelectModal
  open={selectClientModalOpen}
  clients={foundClients}
  onSelect={handleClientSelect}
  onCancel={() => setSelectClientModalOpen(false)}
  
/>


<Modal
  open={legalModalVisible}
  zIndex={3501}
  //title="Юридическое лицо"
  title= {t('sale.payment.labels.legal')}
 
  onCancel={() => setLegalModalVisible(false)}
  footer={null}
>
  <div className={styles.mb10}>
    <b>
     {/*  БИН предприятия */}
      {t('sale.payment.messages.binLabel')}
      </b>
    <div className={styles.flexGap5}>
      <Input
        value={legalBIN}
        onChange={(e) => setLegalBIN(e.target.value.replace(/\D/g, ""))}
      />
      <Button icon={<SearchOutlined />} onClick={searchLegalByBIN} />
    </div>
  </div>

  <div className={styles.mb10}>
    <b>
      {/* Наименование предприятия */}
       {t('sale.payment.messages.nameLabel')}
      </b>
    <div className={styles.flexGap5}>
      <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
      <Button icon={<SearchOutlined />} onClick={searchLegalByName} />
    </div>
  </div>

  <div className={styles.justifyBetween1}>
    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
    <Button onClick={() => setLegalModalVisible(false)}>
      {/* Отмена */}
      {t('sale.payment.buttons.cancel')}
      </Button>
    <Button
      type="primary"
      onClick={() => {
        if (foundLegalClients.length === 1) {
          confirmLegalClient(foundLegalClients[0]);
        } else if (!legalBIN && !legalName) {
          message.error(
            /* "Введите БИН или наименование" */
          t('sale.payment.labels.placeholderSearch')
          );
        } else {
          message.info(
           /*  "Сначала найдите предприятие" */
          t('sale.payment.labels.placeholderSearch')
          );
        }
      }}
    >
      {/* Продолжить */}
      {t('sale.payment.buttons.continue')}
    </Button>
    </Space>
  </div>
</Modal>


{/* Модальное окно для скидки */}
      <Modal
        open={discountModalVisible}
        onCancel={() => setDiscountModalVisible(false)}
        zIndex={3501}
        onOk={applyDiscount}
        title=
        {t('sale.payment.discount.title')}
        /* "Скидка" */
        okText={t('sale.payment.discount.apply')}
        /* "Применить" */
        cancelText={t('sale.payment.buttons.cancel')}
        /* "Отмена" */
      >
        <Radio.Group
          onChange={(e) => setDiscountType(e.target.value)}
          value={discountType}
          className={styles.mb10}
        >
          <Radio value="sum">
            {/* Сумма */}
            {t('sale.payment.labels.sum')}
            </Radio>
          <Radio value="percent">
            {/* Процент */}
            {t('sale.payment.labels.percent')}
            </Radio>
        </Radio.Group>
        <Input
          type="number"
          value={discountValue}
          onChange={(e) => setDiscountValue(Number(e.target.value))}
          placeholder={discountType === "sum" ? 
            /* "Сумма скидки" */
            t('sale.payment.discount.enterSum') 
            : 
            /* "% скидки" */
            t('sale.payment.discount.enterPercent')
          
          }
        />
       
        {discountType === "percent" && (
  <div className={styles.secondaryText}>
    {/* Скидка составит */}
    {t('sale.payment.discount.calculatedAmount')}
    :{" "}
    {((originalTotal * discountValue) / 100).toFixed(2)}
  </div>
)}

<div className={styles.discountLimitHint}>
  {/* Максимальная скидка: {maxDiscountPercent}% */}
  {t('sale.payment.modals.discount.maxLimit', { percent: maxDiscountPercent })}
</div>
      </Modal>

    </>
  );
};

export default PaymentModal;
