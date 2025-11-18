import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Input, Select, Button, Typography, Space, message, notification } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest'; 
import styles from './AddPointForm.module.css'; 

// --- ТИПЫ ДАННЫХ ---
interface PointData {
  id: string | number | undefined;
  address: string;
  name: string;
  is_minus: '0' | '1'; 
  point_type?: number;
  point_type_name?: string;
}

interface CompanyOption {
  value: string;
  label: string;
}

interface AddPointFormProps {
  pointData: PointData | null;
  company: CompanyOption;
  setEdit: (isEditing: boolean) => void;
  setPointData: (data: PointData | null) => void;
  getPoints: (companyId: string) => void;
}

interface SelectOption {
  value: string;
  label: string;
}

// --- КОНСТАНТЫ И УТИЛИТЫ ---
const { Title } = Typography;
const API_URL = import.meta.env.VITE_API_URL || '';

const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
});

// --- КОМПОНЕНТ ---

const AddPointForm: React.FC<AddPointFormProps> = ({
  pointData,
  company,
  setEdit,
  setPointData,
  getPoints,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [isSubmiting, setSubmitting] = useState(false);
  const { sendRequest } = useApiRequest();

  // ⭐️ АДАПТИРОВАННАЯ ВАЛИДАЦИЯ (Локализовано) ⭐️
  const requiredRule = useMemo(() => ({
    required: true,
    message: t('companysettings.common.requiredFieldMessage', { defaultValue: 'Это поле обязательно для заполнения' }), 
  }), [t]);

  // ⭐️ АДАПТИРОВАННЫЕ ОПЦИИ ДЛЯ SELECT (Локализовано) ⭐️
  const logisticOptions: SelectOption[] = useMemo(() => ([
    { 
      value: '1', 
      label: t('companysettings.common.yes', { defaultValue: 'Да' })
    },
    { 
      value: '0', 
      label: t('companysettings.common.no', { defaultValue: 'Нет' })
    },
  ]), [t]);

  // --- ИНИЦИАЛИЗАЦИЯ ФОРМЫ ---
  useEffect(() => {
    if (pointData) {
      const initialValues = {
        id: pointData.id,
        address: pointData.address,
        name: pointData.name,
        is_minus: pointData.is_minus, 
      };
      form.setFieldsValue(initialValues);
    } else {
        form.resetFields();
        form.setFieldsValue({ is_minus: '0' });
    }
  }, [pointData, form]);

  // --- ЛОГИКА ОТПРАВКИ ---

  const submit = useCallback(async (values: any) => {
    setSubmitting(true);
    
    const reqdata = { 
        id: values.id, 
        address: values.address, 
        is_minus: values.is_minus, 
        name: values.name 
    };
    
    try {
        if (pointData) {
            // Редактирование
            await sendRequest(`${API_URL}/api/companysettings/storepoint/edit`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(reqdata),
            });
            message.success(t('companysettings.messages.successEdit', { defaultValue: 'Изменения сохранены.' })); 
        } else {
            // Создание
            await sendRequest(`${API_URL}/api/companysettings/storepoint/create`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({...reqdata, company: company.value }),
            });
            message.success(t('companysettings.messages.successCreatePoint', { defaultValue: 'Торговая точка успешно создана.' }));
            form.resetFields();
        }

        setEdit(false);
        setPointData(null); // Добавлено сброс данных после успеха
        getPoints(company.value);

    } catch (err: any) {
        console.error(err);
        const defaultErrorKey = 'companysettings.messages.defaultApiError';
        const errorText = err.response?.data?.text || t(defaultErrorKey, { defaultValue: 'Произошла ошибка при выполнении операции.' });
        
        notification.error({
            message: t('companysettings.messages.errorTitle', { defaultValue: 'Ошибка' }),
            description: errorText,
            placement: 'topRight',
        });
    } finally {
        setSubmitting(false);
    }
  }, [pointData, sendRequest, company.value, setEdit, setPointData, getPoints, form, t]);

  const handleBack = useCallback(() => {
    setEdit(false);
    setPointData(null);
  }, [setEdit, setPointData]);

  const showIsMinusField = useMemo(() => {
    // is_minus скрывается, если point_type === 0.
    return !pointData || (pointData && pointData.point_type !== 0);
  }, [pointData]);

  const titleText = pointData
    ? t('companysettings.editPointTitle', { defaultValue: 'Редактирование точки' })
    : t('companysettings.addPointTitle', { defaultValue: 'Добавление точки' });

  return (
    <div className={styles.addPointContainer}>
      <Space className={styles.headerSpace} align="center">
        <Title level={4} className={styles.title}>
          {titleText}
        </Title>
        <Button
          type="link"
          onClick={handleBack}
          icon={<ArrowLeftOutlined />}
        >
          {t('companysettings.backToList', { defaultValue: 'Назад к списку' })}
        </Button>
      </Space>

      <div className={styles.emptySpace}></div>

      <Form
        form={form}
        onFinish={submit}
        layout="vertical"
        initialValues={{ is_minus: '0' }}
      >
        {pointData && <Form.Item name="id" hidden><Input /></Form.Item>}

        <Form.Item
          label={t('companysettings.pointName', { defaultValue: 'Наименование точки' })}
          name="name"
          rules={[requiredRule]}
        >
          <Input 
            placeholder={t('companysettings.pointNamePlaceholder', { defaultValue: 'Введите наименование' })}
          />
        </Form.Item>

        <Form.Item
          label={t('companysettings.pointAddress', { defaultValue: 'Адрес точки' })}
          name="address"
          rules={[requiredRule]}
        >
          <Input 
            placeholder={t('companysettings.pointAddressPlaceholder', { defaultValue: 'Введите адрес' })}
          />
        </Form.Item>

        {showIsMinusField && (
          <Form.Item
            label={t('companysettings.negativeAccounting', { defaultValue: 'Отрицательный учет' })}
            name="is_minus"
            rules={[requiredRule]}
          >
            <Select 
                placeholder={t('companysettings.negativeAccountingPlaceholder', { defaultValue: 'Выберите опцию' })}
                options={logisticOptions}
            />
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmiting}
              icon={pointData ? <SaveOutlined /> : <PlusOutlined />}
            >
              {pointData
                ? t('companysettings.saveChanges', { defaultValue: 'Сохранить изменения' })
                : t('companysettings.addButton', { defaultValue: 'Добавить' })}
            </Button>
            
            {!pointData && (
              <Button
                type="default"
                onClick={() => form.resetFields()}
                disabled={isSubmiting}
                icon={<DeleteOutlined />}
              >
                {t('companysettings.clearButton', { defaultValue: 'Очистить' })}
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default AddPointForm;