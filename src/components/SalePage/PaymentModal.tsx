import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Select, Checkbox, message } from "antd";
import useApiRequest from "../../hooks/useApiRequest";
import ClientSelectModal from "./ClientSelectModal";
import { SearchOutlined } from "@ant-design/icons";
import ReceiptPrinter from "./ReceiptPrinter";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";



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

  displayFile?: string;
  onLogoLoaded?: () => void;
}

// -------------------- Функция печати --------------------
/* export const printReceipt = (props: ReceiptPrinterProps) => {
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
  //root.render(<ReceiptPrinter {...props} />);
  root.render(<BrowserRouter><ReceiptPrinter {...props} /></BrowserRouter>);

  // ждём рендер и печатаем
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // очистка
    root.unmount();
    document.body.removeChild(iframe);
  }, 100);
};  */


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

  /* const [selectedConsultant, setSelectedConsultant] = useState<number | null>(
    role4Users && role4Users.length > 0 ? role4Users[0].id : null
  );
 */

  const [selectedConsultant, setSelectedConsultant] = useState<User | null>(
  role4Users && role4Users.length > 0 ? role4Users[0] : null
);

  const [currentPaymentType, setCurrentPaymentType] =
    useState<"cash" | "card" | "mixed" | "debit" | "debt" | "certificate" | null>(
      null
    );

  const [selectClientModalOpen, setSelectClientModalOpen] = useState(false);
  const [foundClients, setFoundClients] = useState<any[]>([]);
   




    // --- Продажа в долг ---
  const [debtModalVisible, setDebtModalVisible] = useState(false);
const [debtClient, setDebtClient] = useState<any>(null); // хранит найденного клиента
const [debtPhone, setDebtPhone] = useState<string>("");
const [debtFirstname, setDebtFirstname] = useState<string>("");
const [debtLastname, setDebtLastname] = useState<string>("");
const [debtAmount, setDebtAmount] = useState<number>(0);  

const [confirmedDebt, setConfirmedDebt] = useState<{ client: any; amount: number } | null>(null);





  useEffect(() => {
    if (currentPaymentType === "cash") {
      setChange(cashAmount - totalAmount);
    }
    if (currentPaymentType === "mixed") {
      setChange(cashAmount + cardAmount + transferAmount - totalAmount);
    }
  }, [cashAmount, cardAmount, transferAmount, currentPaymentType, totalAmount]);

   const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });

// ======================= ПОИСК КЛИЕНТА ========================

const searchByPhone = async () => {
   //const phone = debtPhone.replace(/\D/g, "").slice(1); // убираем +7
   const phone = debtPhone;
  if (!phone) return message.error("Введите номер телефона");

  try {
    const data = await sendRequest(
      `${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfo?telephone=${phone}`
    ,{ headers: getHeaders() }
    );

    if (!data) return message.error("Клиент не найден");

    const client = Array.isArray(data) ? data[0] : data;

    setDebtClient(client);
    setDebtFirstname(client.firstname || "");
    setDebtLastname(client.lastname || "");
    setDebtPhone(debtPhone);

  } catch {
    message.error("Ошибка поиска клиента");
  }
};

const searchByFirstname = async () => {
  if (!debtFirstname) return message.error("Введите имя");

  try {
    const data = await sendRequest(
      `${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfobyname?name=${encodeURIComponent(debtFirstname)}`
    ,{ headers: getHeaders() }
    );

    if (!data) return message.error("Клиент не найден");

    /* const client = Array.isArray(data) ? data[0] : data;

    setDebtClient(client);
    setDebtFirstname(client.firstname || "");
    setDebtLastname(client.lastname || "");
    setDebtPhone(`${client.telephone}`); */

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
    message.error("Ошибка поиска клиента");
  }
};

const searchByLastname = async () => {
  if (!debtLastname) return message.error("Введите фамилию");

  try {
    const data = await sendRequest(
      `${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfobylastname?name=${encodeURIComponent(debtLastname)}`
    ,{ headers: getHeaders() }
    );

    if (!data) return message.error("Клиент не найден");

    /* const client = Array.isArray(data) ? data[0] : data;

    setDebtClient(client);
    setDebtFirstname(client.firstname || "");
    setDebtLastname(client.lastname || "");
    setDebtPhone(`${client.telephone}`); */

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
    message.error("Ошибка поиска клиента");
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
      title: "Удалить долг?",
      content: "Вы хотите удалить текущего должника?",
      okText: "Да",
      cancelText: "Нет",
      onOk: () => {
        setConfirmedDebt(null);
        setDebtClient(null);
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
  if (!debtClient) {
    message.error("Сначала найдите клиента");
    return;
  }

  if (debtAmount <= 0) {
    message.error("Введите сумму долга");
    return;
  }

  if (debtAmount > totalAmount) {
    message.error("Сумма долга не может превышать сумму оплаты");
    return;
  }

  // Сценарий: долг равен сумме чека
  if (debtAmount === totalAmount) {
    Modal.confirm({
      title: "Подтвердите оплату в долг",
      content: `Продать в долг ${debtAmount} клиенту ${debtClient.firstname} ${debtClient.lastname}?`,
      onOk: () => {
        setConfirmedDebt({ client: debtClient, amount: debtAmount });
        setDebtModalVisible(false);
        setCurrentPaymentType("debt");
        message.success("Оплата в долг подтверждена");
        handlePayment("debt"); // сразу запускаем оплату
      },
    });
    return;
  }

  // Сценарий: долг меньше суммы чека → смешанная оплата
  setConfirmedDebt({ client: debtClient, amount: debtAmount });
  setDebtModalVisible(false);
  setCurrentPaymentType("mixed");
  message.success("Долг установлен, будет смешанная оплата");
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



  // -----------------------------------------
  // Открытие модала оплаты
  // -----------------------------------------
  const handleOpenAmountModal = (
  type: "cash" | "card" | "mixed" | "debit" | "debt" | "certificate"
) => {


  // --- ЕСЛИ ДОЛГ УСТАНОВЛЕН И ОН < полной суммы ---
  if (confirmedDebt && confirmedDebt.amount < totalAmount) {
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
    title: "Подтвердите оплату",
    content:
      type === "card"
        ? `Подтверждаете оплату картой на сумму ${totalAmount}?`
        : `Подтверждаете оплату на сумму ${totalAmount}?`,
    onOk: () => handlePayment(type),
  });
};


  // -----------------------------------------
  // Основная логика оплаты
  // -----------------------------------------
  const handlePayment = async (
    forcedType?: "cash" | "card" | "mixed" | "debit" | "debt" | "certificate"
  ) => {
    const type = forcedType ?? currentPaymentType;

   

    if (!type) {
      message.error("Не выбран тип оплаты!");
      return;
    }

    if (type === "cash" && cashAmount < totalAmount) {
      message.error("Сумма наличных меньше суммы к оплате");
      return;
    }

  if (type === "mixed") {
  const debtPay = confirmedDebt ? confirmedDebt.amount : 0;
  const requiredMixedPay = totalAmount - debtPay;

  const realPay = cashAmount + cardAmount + transferAmount;

  if (realPay < requiredMixedPay) {
    message.error(`Недостаточно средств. Не хватает ${requiredMixedPay - realPay}`);
    return;
  }

  if (realPay > requiredMixedPay) {
    message.error("Сумма оплаты превышает остаток после учета долга");
    return;
  }
}

    if (!saleProducts.length) {
      message.error("Нет товаров в чеке");
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
      cashpay: Math.min(cashAmount, totalAmount),
      discount,
      cert: [],
      bonuspay: usedBonuses,
      debtorid: 0,
      parentid: 0,
      coupon: [],
      ofdurl: "",
      price: totalAmount,
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
      customerid: 0,
      //fizid: 0,
      //fizid: type === "debt" && debtClient ? debtClient.id : 0,
      //debtpay: type === "debt" ? totalAmount : 0,
      //debtpay: type === "debt" ? debtAmount : 0,
      fizid: confirmedDebt ? confirmedDebt.client.id : 0,
      debtpay: confirmedDebt ? confirmedDebt.amount : 0, paymenttype: type,
      hash: "",
      debitpay: transferAmount,
      detailsdiscount: 0,
      shiftnumber: 1,
      consignment: false,
      total: totalAmount,
      issalebypiece: false,
      promotions: [],
    };

    const getPaymentMethodText = () => {
  switch (currentPaymentType) {
    case "cash":
      return "Наличный расчет";
    case "card":
      return "Оплата картой (POS)";
    case "mixed":
      return "Смешанная оплата";
    case "debit":
      return "Безналичный перевод";
    case "debt":
      return "Продажа в долг";
    case "certificate":
      return "Оплата сертификатом";
    default:
      return "Не указан";
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
        message.success("Оплата проведена");

       

        setAmountModalVisible(false);
        onClose();
        onCompletePayment([]);

        // после успешной оплаты

        // Вставляем компонент печати
// Печать чека через iframe

 if (!cashboxUser) {
  message.error("Не указан пользователь кассы");
  return;
}

/* printReceipt({
    saleProducts,
    totalAmount,
    clientName: confirmedDebt ? confirmedDebt.client.firstname + " " + confirmedDebt.client.lastname : "Физическое лицо",
    confirmedDebtAmount: confirmedDebt?.amount,
    cashboxUser, // <--- передаем cashboxUser из PaymentModal
    selectedConsultant: selectedConsultant !== null ? selectedConsultant.toString() : undefined,
}); */


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

//console.log(saleProducts);

printReceipt({
  saleProducts,
  totalAmount,
  clientName: confirmedDebt
    ? `${confirmedDebt.client.firstname} ${confirmedDebt.client.lastname}`
    : "Физическое лицо",
  confirmedDebtAmount: confirmedDebt?.amount,
  cashboxUser,
  selectedConsultant: selectedConsultant ? selectedConsultant.name :"",

  // новые обязательные поля
  paymentMethodText: getPaymentMethodText(), 
  VAT:"0",
  ...receiptData,
  ...receiptFlags, 
 
});

      } else {
        message.error(data.text || "Ошибка сервера");
      }
    } catch (err) {
      console.error(err);
      message.error("Ошибка передачи транзакции на сервер");
    }
  };

  return (
    <>
      {/* главное модальное окно */}
      <Modal open={open} title="Оплата" onCancel={onClose} footer={null} width={1000}>
        <div style={{ display: "flex" }}>
          {/* ------------------- ЛЕВАЯ ПАНЕЛЬ ------------------- */}
          <div style={{ flex: 1, paddingRight: 20 }}> 
            <div style={{ display: "flex",              
              justifyContent: "space-between", marginBottom: 5 }}> 
              <span><b>Итого к оплате:</b></span>
               <span>{totalAmount}</span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
               <span><b>Сумма чека:</b></span> 
               <span>{totalAmount}</span> 
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span><b>Клиент:</b></span>
                <span>{clientName}</span> 
                <span>
   {confirmedDebt
     ? `${confirmedDebt.client.firstname} ${confirmedDebt.client.lastname}`
      : ""}
  </span>
                </div> 
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}> 
                  <span><b>ИИН клиента:</b></span> 
                  <Input value={clientIIN} onChange={(e) => setClientIIN(e.target.value)} style={{ width: "60%" }} /> 
                </div> 
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}> 
                  <span><b>Скидка на чек:</b></span> 
                  <span>{discount}</span> 
                </div> 
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}> 
                  <span><b>Наценка на чек:</b></span> 
                  <span>{markup}</span> 
                </div> 
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}> 
                  <span><b>Использовано бонусов:</b></span> 
                  <span>{usedBonuses}</span> 
                </div> 
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}> 
                  <span><b>Начислено бонусов:</b></span> 
                  <span>{accruedBonuses}</span> 
                </div> 
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}> 
                  <span><b>Оплата сертификатом:</b></span> 
                  <span>{certificateAmount}</span> 
                </div> 
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}> 
                  <span><b>Долг:</b></span> 
                  <span>{confirmedDebt ? confirmedDebt.amount : 0}</span> 
                </div> 
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}> 
                  <span><b>Продавец консультант:</b></span> 
                  {/* <Select 
                  value={selectedConsultant} 
                  onChange={setSelectedConsultant} 
                  style={{ width: "60%" }} 
                  placeholder="Выберите консультанта" >
                     {role4Users && role4Users.length > 0 ? 
                     ( role4Users.map((user) => ( <Option key={user.id} value={user.id}> 
                     {user.name} </Option> )) ) : ( <Option value={null}>Нет пользователей</Option> )} 
                  </Select>  */}
                  <Select
  value={selectedConsultant?.id}
  onChange={(id) => {
    const user = role4Users?.find(u => u.id === id) || null;
    setSelectedConsultant(user);
  }}
  style={{ width: "60%" }}
  placeholder="Выберите консультанта"
>
  {role4Users?.map(user => (
    <Option key={user.id} value={user.id}>
      {user.name}
    </Option>
  ))}
</Select>
                  </div> 
                  <div> 
                  <span><b>Использовать бонусы:</b></span>
                 <Checkbox 
                 checked={useBonuses} 
                 onChange={(e) => setUseBonuses(e.target.checked)}>
                </Checkbox> 
                </div> 
                </div>

          {/* ------------------- ПРАВАЯ ПАНЕЛЬ (КНОПКИ ОПЛАТЫ) ------------------- */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              paddingLeft: 20,
            }}
          >
            <Button size="large" onClick={() => handleOpenAmountModal("cash")}>
              💵 Наличными
            </Button>
            <Button size="large" onClick={() => handleOpenAmountModal("card")}>
              💳 Карта
            </Button>

            <Button size="large" onClick={() => handleOpenAmountModal("mixed")}>
              💰 Смешанная
            </Button>
            <Button size="large" onClick={() => handleOpenAmountModal("debit")}>
              🏦 Безналичный
            </Button>

            <Button size="large" onClick={() => handleOpenDebt()}>
              📜 В долг
            </Button>
            <Button size="large" onClick={() => handleOpenAmountModal("certificate")}>
              🎟 Сертификат
            </Button>
          </div>
        </div>
      </Modal>

      {/* модал ввода сумм */}
      <Modal
        open={amountModalVisible}
        title="Ввод сумм"
        onCancel={() => setAmountModalVisible(false)}
        footer={null}
      >
        {currentPaymentType === "cash" && (
          <>
            <label>Сумма наличных:</label>
            <Input
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(Number(e.target.value))}
              style={{ marginBottom: 10 }}
            />

            <p>Сдача: {change >= 0 ? change : 0}</p>
          </>
        )}

       {currentPaymentType === "mixed" && (
  <>
    <label>Наличные:</label>
    <Input
      type="number"
      value={cashAmount}
      onChange={(e) => setCashAmount(Number(e.target.value))}
      style={{ marginBottom: 5 }}
    />

    <label>Карта:</label>
    <Input
      type="number"
      value={cardAmount}
      onChange={(e) => setCardAmount(Number(e.target.value))}
      style={{ marginBottom: 5 }}
    />

    <label>Перевод:</label>
    <Input
      type="number"
      value={transferAmount}
      onChange={(e) => setTransferAmount(Number(e.target.value))}
      style={{ marginBottom: 5 }}
    />

    <p>
      Остаток после долга к оплате:{" "}
      <b>{totalAmount - (confirmedDebt ? confirmedDebt.amount : 0)}</b>
    </p>
  </>
)}

        <Button
          type="primary"
          block
          size="large"
          onClick={() => {
            if (!currentPaymentType) {
              message.error("Тип оплаты не выбран");
              return;
            }
            handlePayment(currentPaymentType);
          }}
        >
          Завершить оплату
        </Button>
      </Modal>


      {/* ===== МОДАЛ: ПРОДАЖА В ДОЛГ ===== */}
<Modal
  open={debtModalVisible}
  title="Продажа в долг"
  onCancel={() => setDebtModalVisible(false)}
  footer={null}
>

  <div style={{ marginBottom: 10 }}>
    <b>Номер телефона</b>
    <div style={{ display: "flex", gap: 5 }}>
      <Input
        value={debtPhone}
        addonBefore="+7"
        onChange={(e) =>
          setDebtPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
        }
      />
      <Button icon={<SearchOutlined />} onClick={searchByPhone} />
    </div>
  </div>

  <div style={{ marginBottom: 10 }}>
    <b>Имя</b>
    <div style={{ display: "flex", gap: 5 }}>
      <Input value={debtFirstname} onChange={(e) => setDebtFirstname(e.target.value)} />
      <Button icon={<SearchOutlined />} onClick={searchByFirstname} />
    </div>
  </div>

  <div style={{ marginBottom: 10 }}>
    <b>Фамилия</b>
    <div style={{ display: "flex", gap: 5 }}>
      <Input value={debtLastname} onChange={(e) => setDebtLastname(e.target.value)} />
      <Button icon={<SearchOutlined />} onClick={searchByLastname} />
    </div>
  </div>

  <div style={{ marginBottom: 10 }}>
    <b>Текущий долг:</b> {debtClient?.debt || 0}
  </div>

  <div style={{ marginBottom: 20 }}>
    <b>Сумма (долг)</b>
    <Input
      type="number"
      value={debtAmount}
      onChange={(e) => setDebtAmount(Number(e.target.value))}
    />
  </div>

  <div style={{ display: "flex", justifyContent: "space-between" }}>
    <Button onClick={() => setDebtModalVisible(false)}>Отмена</Button>
    <Button type="primary" onClick={confirmDebt}>Подтвердить</Button>
  </div>
</Modal>

<ClientSelectModal
  open={selectClientModalOpen}
  clients={foundClients}
  onSelect={handleClientSelect}
  onCancel={() => setSelectClientModalOpen(false)}
/>



    </>
  );
};

export default PaymentModal;
