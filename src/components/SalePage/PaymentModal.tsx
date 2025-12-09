import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Select, Checkbox, message } from "antd";
import useApiRequest from "../../hooks/useApiRequest";

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

const PaymentModal: React.FC<Props> = ({
  open,
  totalAmount,
  onClose,
  cashboxUser,
  role4Users,
  saleProducts,
  onCompletePayment,
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

  const [selectedConsultant, setSelectedConsultant] = useState<number | null>(
    role4Users && role4Users.length > 0 ? role4Users[0].id : null
  );

  const [currentPaymentType, setCurrentPaymentType] =
    useState<"cash" | "card" | "mixed" | "debit" | "debt" | "certificate" | null>(
      null
    );

  useEffect(() => {
    if (currentPaymentType === "cash") {
      setChange(cashAmount - totalAmount);
    }
    if (currentPaymentType === "mixed") {
      setChange(cashAmount + cardAmount + transferAmount - totalAmount);
    }
  }, [cashAmount, cardAmount, transferAmount, currentPaymentType, totalAmount]);

  // -----------------------------------------
  // Открытие модала оплаты
  // -----------------------------------------
  const handleOpenAmountModal = (
    type: "cash" | "card" | "mixed" | "debit" | "debt" | "certificate"
  ) => {
    setCurrentPaymentType(type);

    if (type === "cash" || type === "mixed") {
      setAmountModalVisible(true);
      return;
    }

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

    if (type === "mixed" && cashAmount + cardAmount + transferAmount < totalAmount) {
      message.error("Недостаточно средств для оплаты");
      return;
    }

    if (!saleProducts.length) {
      message.error("Нет товаров в чеке");
      return;
    }

    const transactionDetails = saleProducts.map((p, index) => ({
      bonusadd: 0,
      product: Number(p.id.split("_")[0]),
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
      cashpay: type === "cash" ? cashAmount : cashAmount,
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
      cardpay: type === "card" ? totalAmount : cardAmount,
      ticketid: 0,
      bonusid: 0,
      cashbox: cashboxUser.cashboxId,
      sellerid: selectedConsultant,
      customerid: 0,
      fizid: 0,
      debtpay: type === "debt" ? totalAmount : 0,
      paymenttype: type,
      hash: "",
      debitpay: transferAmount,
      detailsdiscount: 0,
      shiftnumber: 1,
      consignment: false,
      total: totalAmount,
      issalebypiece: false,
      promotions: [],
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
                  placeholder="Выберите консультанта" >
                     {role4Users && role4Users.length > 0 ? 
                     ( role4Users.map((user) => ( <Option key={user.id} value={user.id}> 
                     {user.name} </Option> )) ) : ( <Option value={null}>Нет пользователей</Option> )} 
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

            <Button size="large" onClick={() => handleOpenAmountModal("debt")}>
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
    </>
  );
};

export default PaymentModal;
