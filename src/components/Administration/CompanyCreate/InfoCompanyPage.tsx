import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  message,
  Descriptions,
  Spin,
  Alert,
} from "antd";
import type { FormProps } from 'antd';
import { EditOutlined, SaveOutlined, RollbackOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import useApiRequest from "../../../hooks/useApiRequest";

import styles from './RegisterPage.module.css';

const { Title } = Typography;
const API_URL = import.meta.env.VITE_API_URL || '';

// --- ТИПЫ ДАННЫХ ---

interface CompanyData {
  id: number;
  bin: string;
  name: string;
  address: string;
  head: string;
  headIin: string;
  accountant: string;
  accountantIin: string;
  certificateSeries: string;
  certificateNum: string;
  certificateDate: string;
}

// Поля, которые могут быть изменены и отправлены через форму
interface FormFields {
  id: number;
  bin: string;
}

// --- КОМПОНЕНТ ---

const InfoCompanyPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm<FormFields>();
  const { sendRequest } = useApiRequest();

  // Получение начальных данных и флага из состояния маршрутизатора
  const initialData: CompanyData | null = location.state?.companyData || null;
  const initialChangePass: boolean = location.state?.changepass || false;

  const [companyData, setCompanyData] = useState<CompanyData | null>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEdited, setIsEdited] = useState(false); // Для отслеживания необходимости повторной загрузки
  
  // Имитация user.partner_id из старого Redux (для условного отображения поля BIN)
  // В реальном приложении это должно приходить из контекста или Redux store.
  const [user, setUser] = useState<{ partner_id: string }>({ partner_id: '1' }); 
  
  // Локаль для валидации
  const userLocales = JSON.parse(sessionStorage.getItem("user-locales") || "{}");
  const isKZTLocale = userLocales.LC_MONETARY === "KZT";

  // --- API HEADERS ---
  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  }), []);

  // --- DATA FETCHING ---
  const fetchCompanyData = useCallback(async (id: number | undefined) => {
    if (!id && !companyData?.id) {
        setIsLoading(false);
        return;
    }

    const companyId = id || companyData?.id;
    if (!companyId) return;

    setIsLoading(true);
    try {
      // Использование нового URL из старого кода: /login/api/adminpage/company/info
      /* const url = new URL(`${API_URL}/api/adminpage/company/info`);
      url.searchParams.append('id', companyId.toString());
 */

      const params = new URLSearchParams({ id: companyId.toString() });

// Собираем итоговый URL
const url = `${API_URL}/api/adminpage/company/info?${params.toString()}`;

      const data: CompanyData = await sendRequest(url.toString(), { 
        method: 'GET',
        headers: getHeaders()
      }); 
      
      /* const data: CompanyData = await sendRequest(`${API_URL}/api/adminpage/company/info`, { 
        method: 'GET',
        params: { id: companyId },
        headers: getHeaders() 
      }); */

      setCompanyData(data);
      form.setFieldsValue({ id: data.id, bin: data.bin });
      sessionStorage.setItem("isme-company-data", JSON.stringify(data));
      
    } catch (err) {
      console.error("Error fetching company data:", err);
      message.error(t('companyInfo.general.raiseError'));
      setCompanyData(null);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, sendRequest, getHeaders, form, t, companyData?.id]);


  useEffect(() => {
    // 1. Уведомление об успешной смене пароля
    if (initialChangePass) {
      message.success(t('companyInfo.successChangePass'), 2);
    }

    // 2. Инициализация данных
    if (initialData) {
        setCompanyData(initialData);
        form.setFieldsValue({ id: initialData.id, bin: initialData.bin });
        setIsLoading(false);
    } else if (companyData?.id) {
      // Если есть ID, но нет полных данных (например, после обновления), загружаем
      fetchCompanyData(companyData.id);
    } else {
        // Если вообще нет данных, пытаемся загрузить без ID (пользовательскую инфу)
        // В реальном приложении, если partner_id !== '1', этот компонент не должен быть доступен
        fetchCompanyData(undefined);
    }
  }, [initialData, initialChangePass, fetchCompanyData, t, form, companyData?.id]);

  // Эффект для повторной загрузки данных после успешного редактирования
  useEffect(() => {
    if (isEdited && companyData?.id) {
        fetchCompanyData(companyData.id);
        setIsEdited(false); // Сброс флага
    }
  }, [isEdited, companyData, fetchCompanyData]);

  // --- HANDLERS ---

  // Обработка отправки формы (сохранение BIN)
  const onFinish: FormProps<FormFields>['onFinish'] = useCallback(async (values) => {
    setIsLoading(true);
    const reqdata = { company: { id: values.id, bin: values.bin } };

    try {
      // API call to managebin
      await sendRequest(`${API_URL}/api/company/managebin`, {
        method: 'POST',
        body: JSON.stringify(reqdata),
        headers: getHeaders(),
      });

      message.success(t('companyInfo.successEdit'), 2);
      
      // Обновление и триггер повторной загрузки
      setIsEdited(true);
      setIsEditing(false);

    } catch (err: any) {
      console.error("Error managing BIN:", err);
      const errorMessage = err.response?.data?.text || t('companyInfo.general.raiseError');
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, sendRequest, getHeaders, t]);

  const handleBack = useCallback(() => {
    // Возвращение на страницу компаний, как в оригинале
    navigate("../admincompanylist", { state: { companyData } });
  }, [navigate, companyData]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    // Инициализация формы текущими данными (хотя это уже сделано в useEffect, это гарантирует)
    if (companyData) {
      form.setFieldsValue({ id: companyData.id, bin: companyData.bin });
    }
  }, [form, companyData]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    // Отмена: сброс формы к последним загруженным данным
    if (companyData) {
      form.setFieldsValue({ id: companyData.id, bin: companyData.bin });
    }
  }, [companyData, form]);

  // --- VALIDATION ---
  
  // Замена BinValidation из старого кода. AntD автоматически ограничивает ввод, если type="number",
  // но для BIN/IIN лучше использовать type="text" и проверять паттерн.
  const handleBinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // Разрешаем только цифры
    if (value && !/^\d*$/.test(value)) {
      e.preventDefault();
    }
  };

  const validateBin = useCallback(async (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error(t('companyInfo.general.validation.required')));
    }
    
    // Валидация IDN/BIN: 12 цифр
    if (isKZTLocale) { 
      if (!/^\d{12}$/.test(value)) {
        return Promise.reject(new Error(t('companyInfo.general.validation.invalidIinBin')));
      }
    }
    
    return Promise.resolve();
  }, [isKZTLocale, t]);


  // --- RENDER ---
  
  if (isLoading || !companyData) {
    return (
        <Card className={styles.card}>
            <Title level={4}>{t('companyInfo.title')}</Title>
            <Spin 
            //tip={t('companyInfo.general.loading')} 
            size="large" className={styles.spinner} />
        </Card>
    );
  }

  // Определяем, можно ли редактировать BIN (только для partner_id === '1')
  const canEditBin = user.partner_id === '1';

  const descriptionsItems = [
    {
      key: 'bin',
      label: t('companyInfo.companyBin'),
      children: canEditBin && isEditing ? (
        <Form.Item
          name="bin"
          noStyle
          rules={[{ validator: validateBin }]}
        >
          <Input 
            type="text"
            maxLength={12}
            onChange={handleBinInput}
            className={styles.binInput}
          />
        </Form.Item>
      ) : (
        <span className={styles.boldText}>{companyData.bin}</span>
      ),
      span: 3,
    },
    { key: 'name', label: t('companyInfo.companyName'), children: companyData.name, span: 3 },
    { key: 'address', label: t('companyInfo.companyAddress'), children: companyData.address, span: 3 },
    { key: 'head', label: t('companyInfo.companyHead'), children: companyData.head, span: 3 },
    { key: 'headIin', label: t('companyInfo.companyHeadIDN'), children: companyData.headIin, span: 3 },
    { key: 'accountant', label: t('companyInfo.companyAccountant'), children: companyData.accountant, span: 3 },
    { key: 'accountantIin', label: t('companyInfo.companyAccountantIDN'), children: companyData.accountantIin, span: 3 },
    { key: 'certificateSeries', label: t('companyInfo.certificateSeries'), children: companyData.certificateSeries, span: 3 },
    { key: 'certificateNum', label: t('companyInfo.certificateNum'), children: companyData.certificateNum, span: 3 },
    { key: 'certificateDate', label: t('companyInfo.certificateDate'), children: companyData.certificateDate, span: 3 },
  ].filter(item => item.children); // Фильтруем пустые поля

  return (
    <Card className={styles.card} title={<Title level={4} className={styles.title}>{t('companyInfo.title')} {companyData.name}</Title>}>
      <Form
        form={form}
        name="infocompanypage_form"
        onFinish={onFinish}
        layout="vertical"
        initialValues={companyData}
      >
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>
        
        <Descriptions 
          column={{ xs: 1, sm: 2, md: 3 }} 
          bordered 
          layout="vertical"
          items={descriptionsItems}
        />

        <div className={styles.actions}>
          {canEditBin && !isEditing && (
            <Button type="primary" onClick={handleEdit} icon={<EditOutlined />} className={styles.editButton}>
              {t('companyInfo.edit')}
            </Button>
          )}

          {isEditing && (
            <>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={isLoading}>
                {t('companyInfo.save')}
              </Button>
              <Button onClick={handleCancel} icon={<RollbackOutlined />} className={styles.cancelButton}>
                {t('companyInfo.cancel')}
              </Button>
            </>
          )}

          {!isEditing && (
            <Button onClick={handleBack} icon={<ArrowLeftOutlined />} className={styles.backButton}>
              {t('companyInfo.back')}
            </Button>
          )}
        </div>
      </Form>
    </Card>
  );
};

export default InfoCompanyPage;