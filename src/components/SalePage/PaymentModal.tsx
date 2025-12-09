import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Select, Checkbox, message,Space } from "antd";
import styles from './Sale.module.css';

const { Option } = Select;

interface Props {
  open: boolean;
  totalAmount: number;
  saleProducts: any[];
  onClose: () => void;
  onCompletePayment: (data: any) => void;
  cashboxUser: any;
 role4Users?: User[];
}

interface User {
  id: number;
  name: string;
  role: string;
}

const PaymentModal: React.FC<Props> = ({ open, totalAmount, onClose,cashboxUser,role4Users,saleProducts }) => {
  const [paymentType, setPaymentType] = useState<"cash" | "card" | "mixed" | "debit" | "debt" | "certificate" | null>(null);
  const [amountModalVisible, setAmountModalVisible] = useState(false);

  const [cashAmount, setCashAmount] = useState<number>(totalAmount);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [change, setChange] = useState<number>(0);

  const [discount, setDiscount] = useState<number>(0);
  const [markup, setMarkup] = useState<number>(0);
  const [usedBonuses, setUsedBonuses] = useState<number>(0);
  const [accruedBonuses, setAccruedBonuses] = useState<number>(0);
  const [clientName, setClientName] = useState<string>("Физическое лицо");
  const [clientIIN, setClientIIN] = useState<string>("");
  const [certificateAmount, setCertificateAmount] = useState<number>(0);
  const [useBonuses, setUseBonuses] = useState<boolean>(true);
const [selectedConsultant, setSelectedConsultant] = useState<number | null>(
  role4Users && role4Users.length > 0 ? role4Users[0].id : null
);

  useEffect(() => {
    if (paymentType === "cash") setChange(cashAmount - totalAmount);
    if (paymentType === "mixed") setChange(cashAmount + cardAmount + transferAmount - totalAmount);
  }, [cashAmount, cardAmount, transferAmount, paymentType, totalAmount]);

 
  const handleOpenAmountModal = (type: typeof paymentType) => {
    setPaymentType(type);
    if (type === "cash" || type === "mixed") {
      setAmountModalVisible(true);
    } else if (type === "card" || type === "debit") {
      Modal.confirm({
        title: "Подтвердите оплату",
        content: `Вы подтверждаете оплату ${type === "card" ? "картой" : "безналичным переводом"} на сумму ${totalAmount}?`,
        onOk() {
          handlePayment();
        },
      });
    } else {
      handlePayment();
    }
  };

  /* const handlePayment = () => {
    if (paymentType === "cash" && cashAmount < totalAmount) {
      message.error("Сумма наличных меньше суммы к оплате");
      return;
    }
    if (paymentType === "mixed" && cashAmount + cardAmount + transferAmount < totalAmount) {
      message.error("Сумма оплаты меньше общей суммы");
      return;
    }

    onCompletePayment({
      paymentType,
      cashAmount,
      cardAmount,
      transferAmount,
      totalAmount,
      discount,
      markup,
      usedBonuses,
      accruedBonuses,
      clientName,
      clientIIN,
      certificateAmount,
      useBonuses,
      selectedConsultant,
    });

    setAmountModalVisible(false);
    onClose();
    message.success("Оплата проведена");
  }; */


  const sendTransferRequest = async (transaction: any) => {
  try {
    const token = localStorage.getItem("accessToken") || "";
    
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/external/api/invoice/transfertransactions`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactions: [transaction] }),
      }
    );

    const data = await response.json();
    console.log("Server response:", data);

    if (!response.ok) throw new Error(data.text || "Ошибка запроса");

    message.success("Транзакция успешно передана");

  } catch (err) {
    console.error(err);
    message.error("Ошибка передачи транзакции на сервер");
  }
};


  const handlePayment = async () => {
  if (paymentType === "cash" && cashAmount < totalAmount) {
    message.error("Сумма наличных меньше суммы к оплате");
    return;
  }
  if (paymentType === "mixed" && cashAmount + cardAmount + transferAmount < totalAmount) {
    message.error("Сумма оплаты меньше общей суммы");
    return;
  }

  if (!saleProducts.length) return null;

  const transactionDetails = saleProducts.map((p, index) => ({
    bonusadd: 0,
    //product: p.id,
    product: Number(p.id.split("_")[0]),
    excisestamp: [],
    price: p.price,
    line: index + 1,
    ticketdiscount: 0,
    //pieceunits: p.isWeight ? p.qty : 1,
    pieceunits: 0,
    discount: p.discount || 0,
    attributes: 0,
    units: p.qty,
    bonuspay: 0,
    cert: p.certificates || [], // если есть сертификаты
    bonusrate: 0,
    //nds: Math.round(p.price * 0.12 * 100) / 100, // пример НДС 12%
    nds: 0,
    coupon: p.coupons || [], // если есть купоны
    invoicenumber: p.invoiceNumber || "",
    promotions: p.promotions || [], // если есть акции
  }));

  const transaction = {
    date: new Date().toLocaleString("ru-RU"),
    bonusadd: accruedBonuses,
    cashpay: paymentType === "cash" ? cashAmount : cashAmount,
    discount: discount,
    cert:  [],
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
    cardpay: paymentType === "card" ? totalAmount : cardAmount,
    ticketid: 0,
    bonusid: 0,
    cashbox: cashboxUser.cashboxId,
    sellerid: selectedConsultant,
    customerid: 0,
    fizid: 0,
    debtpay: paymentType === "debt" ? totalAmount : 0,
    paymenttype: paymentType,
    hash: "",
    debitpay: transferAmount,
    detailsdiscount: 0,
    shiftnumber: 1,
    consignment: false,
    total: totalAmount,
    issalebypiece: false,
    promotions: [],
  };

  await sendTransferRequest(transaction);

  onClose();
  message.success("Оплата проведена");
};


  return (
    <>
      {/* Основной модал с информацией и кнопками выбора типа оплаты */}
      <Modal open={open} title="Оплата" onCancel={onClose} footer={null} width={800}>
        <div style={{ display: "flex" }}>
          {/* Левая панель */}
          <div style={{ flex: 1, paddingRight: 20 }}>
  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
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
    <span>0</span>
  </div>

  

  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
  <span><b>Продавец консультант:</b></span>
  <Select
  value={selectedConsultant}
  onChange={setSelectedConsultant}
  style={{ width: "60%" }}
  placeholder="Выберите консультанта"
>
  {role4Users && role4Users.length > 0 ? (
    role4Users.map((user) => (
      <Option key={user.id} value={user.id}>
        {user.name}
      </Option>
    ))
  ) : (
    <Option value={null}>Нет пользователей</Option>
  )}
</Select>
</div>

  <div>
    <span><b>Использовать бонусы:</b></span>
    <Checkbox checked={useBonuses} onChange={(e) => setUseBonuses(e.target.checked)}></Checkbox>
  </div>
</div>


        
    
          {/* Правая панель с кнопками оплаты */}
          <div style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr", // Гарантирует равную ширину
            columnGap: "8px", 
            rowGap: "0px", // Устраняет Grid-разрыв
            paddingLeft: 4
          }}>
            
            {/* 💡 Устанавливаем принудительно меньшую высоту (20px) и обнуляем вертикальный padding */}
            <Button size="small" 
                    style={{ height: '20px', padding: '0 7px' }} 
                    onClick={() => handleOpenAmountModal("cash")}>Наличными</Button>
            
            <Button size="small" 
                    style={{ height: '20px', padding: '0 7px' }} 
                    onClick={() => handleOpenAmountModal("card")}>Карта</Button>
            
            <Button size="small" 
                    style={{ height: '20px', padding: '0 7px' }} 
                    onClick={() => handleOpenAmountModal("mixed")}>Смешанная</Button>
            
            <Button size="small" 
                    style={{ height: '20px', padding: '0 7px' }} 
                    onClick={() => handleOpenAmountModal("debit")}>Безналичный</Button>
            
            <Button size="small" 
                    style={{ height: '20px', padding: '0 7px' }} 
                    onClick={() => handleOpenAmountModal("debt")}>Долг</Button>
            
            <Button size="small" 
                    style={{ height: '20px', padding: '0 7px' }}>Юр. лицо</Button>
            
            {/* Сертификат на всю ширину (gridColumn: 'span 2') */}
            <Button size="small" 
                    style={{ height: '20px', padding: '0 7px', gridColumn: 'span 2' }} 
                    onClick={() => handleOpenAmountModal("certificate")}>Сертификат</Button>
          </div>

        </div>
      </Modal>

      {/* Модал для ввода сумм наличных/смешанной оплаты */}
      <Modal open={amountModalVisible} title="Ввод сумм" onCancel={() => setAmountModalVisible(false)} footer={null}>
        {paymentType === "cash" && (
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
        {/* {paymentType === "mixed" && (
          <>
            <label>Наличными:</label>
            <Input type="number" value={cashAmount} onChange={(e) => setCashAmount(Number(e.target.value))} style={{ marginBottom: 5 }} />
            <label>Карта:</label>
            <Input type="number" value={cardAmount} onChange={(e) => setCardAmount(Number(e.target.value))} style={{ marginBottom: 5 }} />
            <label>Безналичный перевод:</label>
            <Input type="number" value={transferAmount} onChange={(e) => setTransferAmount(Number(e.target.value))} style={{ marginBottom: 5 }} />
            <p>Сдача: {change >= 0 ? change : 0}</p>
          </>
        )} */}
      {paymentType === "mixed" && (
  <>
    <label>Наличными:</label>
    <Input
      type="number"
      value={cashAmount}
      onChange={(e) => {
        const val = Number(e.target.value);
        const maxCash = totalAmount - cardAmount - transferAmount;
        setCashAmount(Math.max(0, Math.min(val, maxCash)));
      }}
      style={{ marginBottom: 5 }}
    />

    <label>Карта:</label>
    <Input
      type="number"
      value={cardAmount}
      onChange={(e) => {
        const val = Number(e.target.value);
        const maxCard = totalAmount - cashAmount - transferAmount;
        setCardAmount(Math.max(0, Math.min(val, maxCard)));
      }}
      style={{ marginBottom: 5 }}
    />

    <label>Безналичный перевод:</label>
    <Input
      type="number"
      value={transferAmount}
      onChange={(e) => {
        const val = Number(e.target.value);
        const maxTransfer = totalAmount - cashAmount - cardAmount;
        setTransferAmount(Math.max(0, Math.min(val, maxTransfer)));
      }}
      style={{ marginBottom: 5 }}
    />

    
  </>
)}

        <Button type="primary" onClick={handlePayment} style={{ marginTop: 10 }}>Завершить оплату</Button>
      </Modal>
    </>
  );
};

export default PaymentModal;
