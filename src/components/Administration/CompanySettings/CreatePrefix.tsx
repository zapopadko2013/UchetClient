import React, { useState, useCallback } from "react";
import { Input, Button, Space, Typography, message, notification } from "antd";
import { PlusCircleOutlined, EditOutlined, SearchOutlined } from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import type { Dispatch, SetStateAction } from 'react'; 
import styles from './AddPointForm.module.css'; 

// --- ТИПЫ ДАННЫХ ---
interface CompanyOption {
  value: string;
  label: string;
}

interface CreatePrefixProps {
  companySelect: CompanyOption;
  prefix: number | string | undefined;
  // ⭐️ ИСПРАВЛЕНИЕ 1: Используем стандартный тип Dispatch
  setPrefix: Dispatch<SetStateAction<string | undefined>>;
  
  // ⭐️ ИСПРАВЛЕНИЕ 2: Обновите тип, который ожидает ваша функция getPrefix,
  // если он возвращает Promise<void>
  getPrefix: (id: string) => Promise<void>;
}

// --- КОНСТАНТЫ И УТИЛИТЫ ---
const { Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL || '';

const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
});

// --- КОМПОНЕНТ ---
const CreatePrefix: React.FC<CreatePrefixProps> = ({
  companySelect,
  prefix,
  setPrefix,
  getPrefix,
}) => {
  const { t } = useTranslation();
  const [newPrefix, setNewPrefix] = useState<number | string>(0);
  const [isCreating, setIsCreating] = useState(false);
  const { sendRequest } = useApiRequest();

  // --- ОБРАБОТЧИКИ СОСТОЯНИЯ ---

  const onPrefixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Оставляем только цифры
    const p = value.replace(/[^0-9]/g, '');
    
    if (p.length > 2) return;
    
    // Преобразуем в число, если возможно, иначе оставляем строку
    setNewPrefix(p === '' ? '' : parseInt(p, 10));
  }, []);

  // --- ЛОГИКА СОЗДАНИЯ/ИЗМЕНЕНИЯ ПРЕФИКСА ---

  const handleCreatePrefix = useCallback(async () => {
    if (typeof newPrefix !== 'number' || newPrefix < 0) {
        message.warning(t('companysettings.prefix.invalidValue'));
        return;
    }
      
    setIsCreating(true);

    try {
        await sendRequest(`${API_URL}/api/companysettings/create_prefix?company=${companySelect.value}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ prefix: newPrefix }),
        });
        
        message.success(t('companysettings.prefix.successCreate'));
        getPrefix(companySelect.value);
        setNewPrefix(0); // Сброс поля после успеха
        
    } catch (err: any) {
        console.error(err);
        const errorText = err.response?.data?.text || t('companysettings.messages.defaultApiError');
        notification.error({
            message: t('companysettings.messages.errorTitle'),
            description: errorText,
            placement: 'topRight',
        });
    } finally {
        setIsCreating(false);
    }
  }, [newPrefix, companySelect.value, getPrefix, sendRequest, t]);

  // --- РЕНДЕРИНГ: СОЗДАНИЕ ПРЕФИКСА ---

  if (prefix === undefined || prefix === null) {
    return (
      <div className={styles.createPrefixContainer}>
        <Space direction="horizontal" align="end" size="large">
            
            <div className={styles.inputGroup}>
                <Text type="secondary">{t('companysettings.prefix.label')}:</Text>
                <Input
                    className={styles.prefixInput}
                    value={newPrefix}
                    placeholder={t('companysettings.prefix.placeholder')}
                    name="prefix"
                    onChange={onPrefixChange}
                    maxLength={2}
                    size="large"
                />
            </div>
            
            <Button
                type="primary"
                icon={<PlusCircleOutlined />}
                onClick={handleCreatePrefix}
                loading={isCreating}
                disabled={newPrefix === 0 || newPrefix === ''}
            >
                {t('companysettings.prefix.createButton')}
            </Button>
        </Space>
      </div>
    );
  }

  // --- РЕНДЕРИНГ: ПРЕФИКС СУЩЕСТВУЕТ (ПРОСМОТР И ИЗМЕНЕНИЕ) ---
  return (
    <div className={styles.prefixExistsContainer}>
      <div className={styles.prefixViewRow}>
          <Text strong className={styles.prefixText}>
              {t('companysettings.prefix.currentLabel')}: **{prefix}**
          </Text>
          <Button
              className={styles.changeButton}
              type="link"
              onClick={() => {
                setPrefix(undefined);
                setNewPrefix(prefix || 0); // Установка текущего значения для редактирования
              }}
              icon={<EditOutlined />}
          >
              {t('companysettings.prefix.changeButton')}
          </Button>
      </div>
    </div>
  );
};

export default CreatePrefix;