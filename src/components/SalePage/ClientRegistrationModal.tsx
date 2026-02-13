import React, { useState } from 'react';
import { Modal, Button, Input, Space, Divider, message, Typography,Form } from 'antd';
import { SearchOutlined, LeftOutlined, KeyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useApiRequest from "../../hooks/useApiRequest";
import styles from "./Sale.module.css";

const { Title, Text } = Typography;

interface ClientRegistrationModalProps {
  open: boolean;
  onClose: () => void;
}

const ClientRegistrationModal: React.FC<ClientRegistrationModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

 
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });

  const clearFields = () => {
    setPhone("");
    setFirstName("");
    setLastName("");
  };

  const handleCancel = () => {
    clearFields();
    onClose();
  };

  // Метод поиска (аналог onAction="#Search")
  const handleSearch = async () => {
    if (!phone) return message.error(t('sale.payment.errors.enterPhone'));
    setLoading(true);
    try {
      // Путь взят из вашего предыдущего лога Java
      const data = await sendRequest(
        `${import.meta.env.VITE_API_URL}/external/api/customers/getfizinfo?telephone=${phone}`, 
        { headers: getHeaders() }
      );

      if (!data || Object.keys(data).length === 0 || (data.code === "error")) {
        // Если клиент не найден, мы НЕ заполняем поля, а даем пользователю ввести их вручную
        message.warning(t('sale.payment.errors.clientNotFound'));
        setFirstName("");
        setLastName("");
        return;
      }
      
      if (data) {
        setFirstName(data.firstname || "");
        setLastName(data.lastname || "");
        message.success(t('sale.payment.messages.clientFound'));
      }
    } catch (err) {
      message.error(t('sale.payment.errors.searchError'));
    } finally {
      setLoading(false);
    }
  };

  // Метод сохранения (аналог onAction="#Save")
  const handleSave = async () => {
    if (!phone || !firstName) return message.error(t('sale.payment.errors.fillRequiredFields'));
    
    const payload = {
      fiz_customers: {
      telephone: `${phone}`,
      firstname: firstName,
      lastname: lastName,
    }
      // Здесь можно добавить другие поля, которые ожидает ваш FizClientController
    };

    try {
      const response =await sendRequest(`${import.meta.env.VITE_API_URL}/external/api/customers/fizadd`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (response && response.code === "error") {
      // Выводим именно тот текст, который прислал сервер
      return message.error(response.text || t('sale.payment.errors.serverError'));
    }

    // Если код не error, значит всё прошло успешно
    
      message.success(t('sale.payment.messages.saveSuccess'));
      onClose();
    } catch (err) {
      message.error(t('sale.payment.errors.saveError'));
    }
  };

  return (
    /* <Modal
      open={open}
      onCancel={handleCancel}
      footer={null}
      zIndex={3504}
      closable={false}
      width={500}
      //bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
       
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button 
            icon={<LeftOutlined />} 
            onClick={handleCancel} 
            style={{ width: '50px', height: '50px' }}
          />
          <Title level={4} style={{ margin: 0 }}>{t('sale.payment.labels.clientRegistration')}</Title>
          <div style={{ width: '50px' }} /> 
        </div>

        <Divider style={{ margin: '5px 0' }} />

        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Text strong style={{ width: '150px', textAlign: 'right' }}>{t('sale.payment.labels.phone')} :</Text>
          <Input
            prefix="+7"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ flex: 1, height: '45px', fontSize: '18px' }}
            
          />
          <Button 
            type="primary" 
            icon={<SearchOutlined />} 
            onClick={handleSearch}
            loading={loading}
            style={{ height: '45px', width: '50px' }}
          />
        </div>

        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Text strong style={{ width: '150px', textAlign: 'right' }}>{t('sale.payment.labels.firstname')} :</Text>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={{ flex: 1, height: '45px' }}
           
          />
        </div>

      
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Text strong style={{ width: '150px', textAlign: 'right' }}>{t('sale.payment.labels.lastname')} :</Text>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={{ flex: 1, height: '45px' }}
            
          />
        </div>

        <Divider style={{ margin: '5px 0' }} />

       
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button 
            type="primary" 
            size="large"
            onClick={handleSave}
            style={{ width: '200px', height: '50px', borderRadius: '4px' }}
          >
            {t('sale.payment.buttons.confirm')}
          </Button>
        </div>
      </div>
    </Modal> */

    <Modal
  open={open}
  onCancel={handleCancel}
  footer={null}
  zIndex={3504}
  closable={true}
  width={500}
>
  {/* Заголовок с кнопкой назад */}
  <div className={styles.regModalContent}>
    {/* <Button 
      icon={<LeftOutlined />} 
      onClick={handleCancel} 
      type="text" 
      size="large" 
    /> */}
    <Title level={4} className={styles.regTitle}>
      {t('sale.payment.labels.clientRegistration')}
    </Title>
  </div>

  <Form
    layout="horizontal"
    labelCol={{ span: 8 }} // Фиксированная ширина для меток (вместо width: 150px)
    wrapperCol={{ span: 16 }}
    colon={false}
  >
   <Form.Item label={<b>{t('sale.payment.labels.phone')} :</b>}>
  <Space.Compact className={styles.fullWidthFlex}>
    <Input
      prefix="+7"
      value={phone}
      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
      className={styles.flexFill}
      // size="large" <- CSS теперь сам контролирует высоту 52px
    />
    <Button 
      type="primary" 
      icon={<SearchOutlined />} 
      onClick={handleSearch} 
      loading={loading} 
      className={styles.searchButtonFixed}
    />
  </Space.Compact>
</Form.Item>

    <Form.Item label={<b>{t('sale.payment.labels.firstname')} :</b>}>
      <Input 
        value={firstName} 
        onChange={(e) => setFirstName(e.target.value)} 
        size="large" 
      />
    </Form.Item>

    <Form.Item label={<b>{t('sale.payment.labels.lastname')} :</b>}>
      <Input 
        value={lastName} 
        onChange={(e) => setLastName(e.target.value)} 
        size="large" 
      />
    </Form.Item>

    <Divider />

<div className={styles.regFooter}>
      <Space size="middle" className={styles.fullWidthFlex} style={{ justifyContent: 'center' }}>
        <Button size="large" onClick={handleCancel} >
          {t('sale.payment.buttons.cancel') || 'Отмена'}
        </Button>
        <Button 
          type="primary" 
          size="large" 
          onClick={handleSave}
         
        >
          {t('sale.payment.buttons.confirm')}
        </Button>
      </Space>
    </div>

    {/* <div className={styles.regFooter}>
      <Button 
        type="primary" 
        size="large" 
        onClick={handleSave}
        
      >
        {t('sale.payment.buttons.confirm')}
      </Button>
    </div> */}
  </Form>
</Modal>
  );
};

export default ClientRegistrationModal;