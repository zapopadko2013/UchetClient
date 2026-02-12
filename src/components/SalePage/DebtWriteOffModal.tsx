import React, { useState } from 'react';
import { Modal, Space, Button, Input, message } from 'antd';
import { SearchOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import ClientSelectModal from './ClientSelectModal'; // Убедитесь, что путь верный
import useApiRequest from "../../hooks/useApiRequest";
import styles from "./Sale.module.css";

interface DebtWriteOffModalProps {
  open: boolean;
  onClose: () => void;
  
  
}

const DebtWriteOffModal: React.FC<DebtWriteOffModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();

  // Основные состояния
  const [debtorType, setDebtorType] = useState<0 | 1>(0);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [writeOffAmount, setWriteOffAmount] = useState<string>("");

  const { sendRequest } = useApiRequest();

  // Состояния для поиска
  const [debtPhone, setDebtPhone] = useState("");
  const [debtFirstname, setDebtFirstname] = useState("");
  const [debtLastname, setDebtLastname] = useState("");
  const [legalBIN, setLegalBIN] = useState("");
  const [legalName, setLegalName] = useState("");

  // Состояния для списка найденных
  const [foundClients, setFoundClients] = useState<any[]>([]);
  const [isClientListModalOpen, setIsClientListModalOpen] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });

  const clearFields = () => {
    setSelectedClient(null);
    setWriteOffAmount("");
    setDebtPhone("");
    setDebtFirstname("");
    setDebtLastname("");
    setLegalBIN("");
    setLegalName("");
    setFoundClients([]);
  };

  const handleCancel = () => {
    clearFields();
    onClose();
  };

  const fillClientData = (client: any) => {
    setSelectedClient(client);
    if (debtorType === 0) {
      setDebtFirstname(client.firstname || "");
      setDebtLastname(client.lastname || "");
      if (client.telephone) setDebtPhone(client.telephone || "");
    } else {
      setLegalBIN(client.bin || "");
      setLegalName(client.name || "");
    }
  };

  const handleSearchResult = (data: any) => {
    const clientsArray = Array.isArray(data) ? data : (data?.rows || data?.data || [data]);
    if (!clientsArray || clientsArray.length === 0) {
      return message.error(t('sale.payment.errors.clientNotFound'));
    }
    if (clientsArray.length === 1) {
      fillClientData(clientsArray[0]);
    } else {
      setFoundClients(clientsArray);
      setIsClientListModalOpen(true);
    }
  };

  // --- Функции Поиска ---
  const searchByPhone = async () => {
    if (!debtPhone) return message.error(t('sale.payment.errors.enterPhone'));
    try {
      const data = await sendRequest(`${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfo?telephone=${debtPhone}`, { headers: getHeaders() });
      handleSearchResult(data);
    } catch { message.error(t('sale.payment.errors.searchError')); }
  };

  const searchByFirstname = async () => {
    if (!debtFirstname) return message.error(t('sale.payment.errors.enterFirstname'));
    try {
      const data = await sendRequest(`${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfobyname?name=${encodeURIComponent(debtFirstname)}`, { headers: getHeaders() });
      handleSearchResult(data);
    } catch { message.error(t('sale.payment.errors.searchError')); }
  };

  const searchByLastname = async () => {
    if (!debtLastname) return message.error(t('sale.payment.errors.enterLastname'));
    try {
      const data = await sendRequest(`${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfobylastname?name=${encodeURIComponent(debtLastname)}`, { headers: getHeaders() });
      handleSearchResult(data);
    } catch { message.error(t('sale.payment.errors.searchError')); }
  };

  const searchLegalByBIN = async () => {
    if (!legalBIN) return message.error(t('sale.payment.messages.searchByBin'));
    try {
      const data = await sendRequest(`${import.meta.env.VITE_API_URL}/external/api/customers?bin=${legalBIN}`, { headers: getHeaders() });
      handleSearchResult(data);
    } catch { message.error(t('sale.payment.messages.searchError')); }
  };

  const searchLegalByName = async () => {
    if (!legalName) return message.error(t('sale.payment.messages.searchByName'));
    try {
      const data = await sendRequest(`${import.meta.env.VITE_API_URL}/external/api/customers?name=${encodeURIComponent(legalName)}`, { headers: getHeaders() });
      handleSearchResult(data);
    } catch { message.error(t('sale.payment.messages.searchError')); }
  };

  const handleRepay = async () => {
    if (!selectedClient) return message.warning(t('Выберите клиента'));
    if (!writeOffAmount || Number(writeOffAmount) <= 0) return message.warning(t('Введите корректную сумму'));

    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/report/fizcustomers/writeoff_debt`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          writeoff_debt_customers: {
            id: selectedClient.id,
            debt: Number(writeOffAmount),
            user: localStorage.getItem('userId') || "2",
            clientType: debtorType
          }
        })
      });
      message.success(t('report.debt.repaySuccess') || "Долг успешно списан");
      handleCancel();
    } catch (err) {
      message.error(t('report.debt.repayError') || "Ошибка при списании");
    }
  };

  return (
    <>
      <Modal
        title={<b>{t('report.debt.modalRepayTitle') || "Списание долга"}</b>}
        open={open}
        onCancel={handleCancel}
        onOk={handleRepay}
        okText={t('sale.payment.buttons.confirm')}
        cancelText={t('sale.payment.buttons.cancel')}
        destroyOnHidden
      >
        <Space direction="vertical" className={styles.container} size="middle">
          <div className={styles.flexGap5}>
            <Button 
              className={styles.fullWidth}
              style={{ backgroundColor: debtorType === 0 ? '#52c41a' : '', color: debtorType === 0 ? 'white' : '' }}
               onClick={() => { setDebtorType(0); setSelectedClient(null); }}
            >{t('sale.payment.labels.individual') || "Физ. лицо"}</Button>
            <Button 
              className={styles.fullWidth}
              style={{ backgroundColor: debtorType === 1 ? '#52c41a' : '', color: debtorType === 1 ? 'white' : '' }}
              onClick={() => { setDebtorType(1); setSelectedClient(null); }}
            >{t('sale.payment.labels.legal') || "Юр. лицо"}</Button>
          </div>

          {debtorType === 0 ? (
            <>
              <div>
                <b>{t('sale.payment.labels.phone')}</b>
                <Space.Compact className={styles.fullWidthFlex}>
                  <Input className={`${styles.phonePrefix} ${styles.noShrink}`} value="+7" disabled />
                  <Input placeholder="7071234567" value={debtPhone} onChange={e => setDebtPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className={styles.flexFill} />
                  <Button icon={<SearchOutlined />} onClick={searchByPhone} className={styles.searchButtonFixed} />
                </Space.Compact>
              </div>
              <div>
                <b>{t('sale.payment.labels.firstname')}</b>
                <Space.Compact className={styles.fullWidthFlex}>
                  <Input value={debtFirstname} onChange={e => setDebtFirstname(e.target.value)} className={styles.flexFill} />
                  <Button icon={<SearchOutlined />} onClick={searchByFirstname} className={styles.searchButtonFixed} />
                </Space.Compact>
              </div>
              <div>
                <b>{t('sale.payment.labels.lastname')}</b>
                <Space.Compact className={styles.fullWidthFlex}>
                  <Input value={debtLastname} onChange={e => setDebtLastname(e.target.value)} className={styles.flexFill} />
                  <Button icon={<SearchOutlined />} onClick={searchByLastname} className={styles.searchButtonFixed} />
                </Space.Compact>
              </div>
            </>
          ) : (
            <>
              <div>
                <b>{t('sale.payment.messages.binLabel')}</b>
                <Space.Compact className={styles.fullWidthFlex}>
                  <Input placeholder={t('sale.payment.messages.binLabel')} value={legalBIN} onChange={e => setLegalBIN(e.target.value.replace(/\D/g, ""))} className={styles.flexFill} />
                  <Button icon={<SearchOutlined />} onClick={searchLegalByBIN} className={styles.searchButtonFixed} />
                </Space.Compact>
              </div>
              <div>
                <b>{t('sale.payment.messages.nameLabel')}</b>
                <Space.Compact className={styles.fullWidthFlex}>
                  <Input placeholder={t('sale.payment.messages.nameLabel')} value={legalName} onChange={e => setLegalName(e.target.value)} className={styles.flexFill} />
                  <Button icon={<SearchOutlined />} onClick={searchLegalByName} className={styles.searchButtonFixed} />
                </Space.Compact>
              </div>
            </>
          )}

          <div className={styles.debtInfoBox}>
            <span>{t('sale.payment.labels.currentDebt')}: <b className={styles.debtAmountText}>{selectedClient?.debt || 0} </b></span>
            <ArrowDownOutlined className={styles.copyIcon} onClick={() => setWriteOffAmount(String(selectedClient?.debt || 0))} />
          </div>

          <div>
            <b>{t('sale.payment.labels.debtAmount') || "Сумма списания"}</b>
            <Input type="number" size="large" placeholder="0.00" value={writeOffAmount} onChange={e => setWriteOffAmount(e.target.value)} />
          </div>
        </Space>
      </Modal>

      <ClientSelectModal
        open={isClientListModalOpen}
        clients={foundClients}
        onCancel={() => setIsClientListModalOpen(false)}
        onSelect={(client) => { fillClientData(client); setIsClientListModalOpen(false); }}
      />
    </>
  );
};

export default DebtWriteOffModal;