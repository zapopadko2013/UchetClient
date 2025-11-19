import React, { useEffect, useState, useCallback } from "react";
import { Select, Spin, notification } from "antd";
import type { SelectProps } from 'antd';
import { useTranslation } from 'react-i18next';
// Предполагаемый импорт хука для запросов
import useApiRequest from "../../../hooks/useApiRequest"; 

// --- ТИПЫ ДАННЫХ ---

interface CompanyTypeRaw {
  id: number;
  name: string;
  [key: string]: any; 
}

/**
 * Тип опции, адаптированный для Ant Design Select
 */
interface CompanyTypeOption {
    value: number; // Теперь number (ID)
    id: number;    // Теперь number (ID)
    label: string;
}

/**
 * Пропсы для компонента CompanyTypeSelect
 */
interface CompanyTypeSelectProps {
  // companyType - это выбранная опция (одиночный выбор)
  companyType: CompanyTypeOption; 
  // onChange принимает выбранную опцию
  onChange: (value: CompanyTypeOption) => void; 
}

const API_URL = import.meta.env.VITE_API_URL || '';

// ⭐️ Определяем тип функции OnChange для одиночного выбора ⭐️
type OnChangeFunction = NonNullable<SelectProps<number, CompanyTypeOption>['onChange']>;

// --- КОМПОНЕНТ ---

const CompanyTypeSelect: React.FC<CompanyTypeSelectProps> = ({ companyType, onChange }) => {
  const { t } = useTranslation();
  const [companyTypes, setCompanyTypes] = useState<CompanyTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const { sendRequest } = useApiRequest();

  const getHeaders = useCallback(() => ({
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'Content-Type': 'application/json',
      }), []);

  // ⭐️ Функция загрузки типов компаний ⭐️
  const getCompanyTypes = useCallback(async () => {
    setLoading(true);
    try {
      // Используем sendRequest
      const rawData = await sendRequest(`${API_URL}/api/adminpage/companytypes`, { 
        method: 'GET',
         headers: getHeaders()
      });
      
      const options: CompanyTypeOption[] = (rawData as CompanyTypeRaw[]).map((option) => ({
        ...option,
        label: option.name,
        value: option.id, 
        id: option.id,
      }));

      setCompanyTypes(options);
      
    } catch (error) {
      console.error("Failed to fetch company types:", error);
      notification.error({
        message: t('companyType.loadErrorTitle', { defaultValue: "Ошибка загрузки" }),
        description: t('companyType.loadErrorDesc', { defaultValue: "Не удалось загрузить типы компаний." }),
      });
    } finally {
      setLoading(false);
    }
  }, [sendRequest, t]);

  // Загрузка данных при монтировании
  useEffect(() => {
    getCompanyTypes();
  }, [getCompanyTypes]);
  
  // ⭐️ Обработчик для Ant Design Select (одиночный выбор) ⭐️
  const handleAntdChange: OnChangeFunction = useCallback(
    (value, option) => {
        // В режиме одиночного выбора 'option' - это либо объект, либо undefined.
        if (option && !Array.isArray(option)) {
            // Тип опции гарантированно соответствует CompanyTypeOption
            onChange(option as CompanyTypeOption); 
        }
        
        // Логика для очистки (если в Select добавлено allowClear)
        if (!value && onChange) {
            // Передаем пустой/дефолтный объект, если значение сброшено
            onChange({ value: undefined as unknown as number, label: '', id: undefined as unknown as number });
        }
    },
    [onChange]
  );

  return (
    <Spin spinning={loading} size="small">
      {/* ⭐️ Используем дженерики <ValueType, OptionType> ⭐️ */}
      <Select<number, CompanyTypeOption> 
        options={companyTypes}
        
        // В одиночном режиме value - это value-поле (id)
        value={companyType?.value} 
        
        onChange={handleAntdChange}
        placeholder={t('companyType.placeholder', { defaultValue: "Выберите тип компании" })}
        allowClear={true} // Добавляем возможность очистки
        style={{ width: '100%' }}
      />
    </Spin>
  );
};

export default CompanyTypeSelect;