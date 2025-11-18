import React, { useState, useEffect, useCallback } from "react";
import { Form, Input, Select, Button, Typography, Space, message, notification } from "antd";
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import useApiRequest from "../../../../../hooks/useApiRequest"; // Убедитесь, что путь правильный
import { useApiErrorHandler } from "../../../../handleApiError"; // Путь к вашему хуку-обработчику ошибок
import styles from '../../AddPointForm.module.css'; 

// --- ТИПЫ ДАННЫХ ---
interface SelectOption {
  value: string | number; // ID торговой точки
  label: string; // Название торговой точки
}

interface CashboxData {
  id: number;
  name: string;
  point: string | number; // ID торговой точки
  point_name: string; // Название торговой точки
  deleted: boolean;
}

interface CompanyOption {
  value: string; // ID компании
  label: string; // Название компании
}

interface AddCashBoxFormProps {
  cashboxData: CashboxData | null;
  setEdit: (isEditing: boolean) => void;
  setCashboxData: (data: CashboxData | null) => void;
  getCashboxes: (companyId: string) => void;
  company: CompanyOption;
  points: SelectOption[]; // Список доступных торговых точек
}

// --- КОНСТАНТЫ И УТИЛИТЫ ---
const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL || '';

// Валидация
const requiredRule = { required: true, message: 'Это поле обязательно для заполнения' };

const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
});

// --- КОМПОНЕНТ ---

const AddCashBoxForm: React.FC<AddCashBoxFormProps> = ({
  cashboxData,
  setEdit,
  setCashboxData,
  getCashboxes,
  company,
  points,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [isSubmiting, setSubmitting] = useState(false);
  
  const { sendRequest } = useApiRequest();
  const handleError = useApiErrorHandler(); // Хук для централизованной обработки ошибок

  // --- ИНИЦИАЛИЗАЦИЯ ФОРМЫ (Замена initialize/useEffect) ---

  /* useEffect(() => {
    if (cashboxData) {
      // Подготовка данных для Ant Design Form
      const initialValues = {
        id: cashboxData.id,
        name: cashboxData.name,
        // AntD Select требует value/label, но если point уже ID, 
        // его нужно преобразовать в объект SelectField, 
        // как это делал modifyToSelect
        point: cashboxData.point, 
      };
      form.setFieldsValue(initialValues);
    } else {
        form.resetFields();
    }
    // Здесь мы сбрасываем состояние isSubmiting, если компонент переключается
    setSubmitting(false); 
  }, [cashboxData, form]); */

  useEffect(() => {
    // Убедимся, что мы в режиме редактирования и массив точек загружен
    if (cashboxData && cashboxData.id && points.length > 0) {
        
        // 1. Извлекаем наименование точки из данных кассы
        const pointNameFromCashbox = cashboxData.point_name; 
        let pointIdToSet = '';
        
        // 2. Ищем объект точки в массиве 'points' по наименованию
        if (pointNameFromCashbox) {
            const foundPoint = points.find(pointItem => 
                pointItem.label === pointNameFromCashbox
            );
            
            // 3. Если точка найдена, используем ее ID
            if (foundPoint) {
                // ID точки (foundPoint.id) — это то, что ожидает поле формы 'point'
                pointIdToSet = String(foundPoint.value); 
            }
        }

        /* // --- Ваша обновленная логика логирования ---
        console.log(`ID точки из данных кассы (искали по имени): ${pointIdToSet}`);
        console.log(`Преобразованное значение: ${pointIdToSet}`);
        console.log(`Найден ли этот ID в массиве points? ${!!pointIdToSet}`);
        // ----------------------------------------
       */  
        // 4. Устанавливаем значения полей формы
        const initialValues = {
            ...cashboxData, // Копируем все остальные поля
            point: pointIdToSet, // Устанавливаем найденный ID
        };

        form.setFieldsValue(initialValues);
    } 
    // ... остальная часть useEffect
}, [cashboxData, form, points]);

  // --- ЛОГИКА ОТПРАВКИ (Замена handleSubmitFunction/submit) ---

 /*  const submit = useCallback(async (values: any) => {
    setSubmitting(true);
    
    // Подготовка данных для API
    const reqdata = { 
        id: values.id, 
        name: values.name,
        // AntD Form возвращает только value (ID точки)
        point: values.point, 
    };
    
    try {
        if (cashboxData) {
            // Редактирование (PUT)
            await sendRequest(`${API_URL}/api/companysettings/cashbox/edit`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(reqdata),
            });
            // Используем локализацию из companysettings.messages
            message.success(t('companysettings.messages.successEdit')); 
        } else {
            // Создание (POST)
            await sendRequest(`${API_URL}/api/companysettings/cashbox/create`, {
                method: 'POST',
                headers: getHeaders(),
                // В оригинале вы не передавали point_name при создании
                body: JSON.stringify({ name: reqdata.name, point: reqdata.point }), 
            });
            message.success(t('companysettings.cashbox.successCreate')); 
            form.resetFields();
        }

        // Общее действие после успеха
        setEdit(false);
        getCashboxes(company.value);
        setCashboxData(null);

    } catch (err: any) {
        console.error(err);
        // Используем централизованный обработчик ошибок
        handleError(err);
    } finally {
        setSubmitting(false);
    }
  }, [cashboxData, sendRequest, company.value, setEdit, getCashboxes, setCashboxData, form, t, handleError]);
 */

  const submit = useCallback(async (values: any) => {
    setSubmitting(true);
    
    // Базовые данные для запроса
    let reqdata: any = { 
        name: values.name,
        point: values.point, 
    };
    
    try {
        if (cashboxData) {
            // ⭐️ 1. НАЙТИ НАЗВАНИЕ ТОЧКИ (point_name) ⭐️
            const selectedPointObject = points.find(p => p.value === values.point);
            const pointNameForRequest = selectedPointObject ? selectedPointObject.label : '';
            
            // 2. ДОБАВИТЬ ID И НОВОЕ ПОЛЕ point_name
            reqdata.id = values.id;
            reqdata.point_name = pointNameForRequest; // <<<--- ДОБАВЛЕНО
            
            // Редактирование (PUT)
            await sendRequest(`${API_URL}/api/companysettings/cashbox/edit`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(reqdata),
            });
            
            message.success(t('companysettings.messages.successEdit')); 
        } else {
            // Создание (POST) - здесь point_name не требуется
            await sendRequest(`${API_URL}/api/companysettings/cashbox/create`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(reqdata), 
            });
            message.success(t('companysettings.cashbox.successCreate')); 
            form.resetFields();
        }

        // Общее действие после успеха
        setEdit(false);
        getCashboxes(company.value);
        setCashboxData(null);

    } catch (err: any) {
        console.error(err);
        handleError(err);
    } finally {
        setSubmitting(false);
    }
  }, [
    cashboxData, 
    sendRequest, 
    company.value, 
    setEdit, 
    getCashboxes, 
    setCashboxData, 
    form, 
    t, 
    handleError, 
    points 
  ]);
  
  
  const handleBack = useCallback(() => {
    setEdit(false);
    setCashboxData(null);
  }, [setEdit, setCashboxData]);
  
  const titleText = cashboxData
    ? t('companysettings.cashbox.editTitle')
    : t('companysettings.cashbox.addTitle');

  return (
    <div className={styles.addCashBoxContainer}>
      <Space className={styles.headerSpace} align="center">
        <Title level={4} className={styles.title}>
          {titleText}
        </Title>
        <Button
          type="link"
          onClick={handleBack}
          icon={<ArrowLeftOutlined />}
        >
          {t('companysettings.cashbox.backToList')}
        </Button>
      </Space>

      <div className={styles.emptySpace}></div>

      <Form
        form={form}
        onFinish={submit}
        layout="vertical"
        initialValues={{}}
      >
        {/* Скрытое поле ID для редактирования */}
        {cashboxData && <Form.Item name="id" hidden><Input /></Form.Item>}

        {/* Наименование кассы */}
        <Form.Item
          label={t('companysettings.cashbox.name')}
          name="name"
          rules={[requiredRule]}
        >
          <Input 
            placeholder={t('companysettings.cashbox.namePlaceholder')}
          />
        </Form.Item>

        {/* Наименование торговой точки */}
        <Form.Item
          label={t('companysettings.pointName')}
          name="point"
          rules={[requiredRule]}
        >
          <Select 
            placeholder={t('companysettings.pointPlaceholder')}
            // Ant Design Select принимает массив { value, label }
            options={points} 
            // Убеждаемся, что значение, которое мы ищем (ID), является строкой/числом
            fieldNames={{ label: 'label', value: 'value' }} 
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmiting}
              icon={cashboxData ? <SaveOutlined /> : <PlusOutlined />}
            >
              {cashboxData
                ? t('companysettings.saveChanges')
                : t('companysettings.addButton')}
            </Button>
            
            {!cashboxData && (
              <Button
                type="default"
                onClick={() => form.resetFields()}
                disabled={isSubmiting}
                icon={<DeleteOutlined />}
              >
                {t('companysettings.clearButton')}
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default AddCashBoxForm;