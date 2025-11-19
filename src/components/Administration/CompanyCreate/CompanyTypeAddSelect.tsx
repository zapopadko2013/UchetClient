import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Select, Spin, notification } from "antd";
import type { SelectProps } from 'antd';
import { useTranslation } from 'react-i18next';
// Предполагаемый импорт хука для запросов
import useApiRequest from "../../../hooks/useApiRequest"; 

// --- ТИПЫ ДАННЫХ ---

interface CompanyTypeRaw {
  id: number;
  name: string;
  [key: string]: any; // Для других полей, если они есть
}

/**
 * Тип опции, адаптированный для Ant Design Select
 */
export interface CompanyTypeOption {
  value: number;
  label: string;
  id: number; // Сохраняем id для фильтрации
}

/**
 * Пропсы для компонента CompanyTypeAddSelect
 */
interface CompanyTypeAddSelectProps {
  // companyTypeAdd - это массив выбранных опций, так как mode="multiple"
  companyTypeAdd: CompanyTypeOption[]; 
  // onChange принимает массив выбранных опций
  onChange: (value: CompanyTypeOption[]) => void; 
  // companyType - главная выбранная опция, которую нужно исключить из списка
  companyType: { id: number | undefined; [key: string]: any }; 
}

const API_URL = import.meta.env.VITE_API_URL || '';

// --- КОМПОНЕНТ ---

const CompanyTypeAddSelect: React.FC<CompanyTypeAddSelectProps> = ({ companyTypeAdd, onChange, companyType }) => {
  const { t } = useTranslation();
  const [allCompanyTypes, setAllCompanyTypes] = useState<CompanyTypeOption[]>([]);
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
        value: option.id, // ID используется как value
        id: option.id,
      }));

      setAllCompanyTypes(options);
      
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
  
  // ⭐️ Фильтрация списка опций ⭐️
  const filteredCompanyTypes = useMemo(() => {
    const mainId = companyType.id;
    if (mainId === undefined) return allCompanyTypes;

    // Фильтруем, исключая главный тип компании
    return allCompanyTypes.filter(option => option.id !== mainId);
  }, [allCompanyTypes, companyType.id]);


  // ⭐️ Обработчик для Ant Design Select в режиме multiple ⭐️
  const handleAntdChange: SelectProps<number[], CompanyTypeOption>['onChange'] = useCallback(
    (_, options) => {
        // В режиме multiple 'options' - это массив выбранных объектов.
        // Мы уверены, что options имеет тип CompanyTypeOption[], благодаря дженерику.
        onChange(options as CompanyTypeOption[]); 
    },
    [onChange]
  );

  return (
    <Spin spinning={loading} size="small">
      {/* ⭐️ Используем дженерики <ValueType, OptionType> и mode="multiple" ⭐️ */}
      <Select<number[], CompanyTypeOption> 
        options={filteredCompanyTypes}
        
        // В режиме multiple value - это массив value-полей (id)
        value={companyTypeAdd.map(item => item.value)} 
        
        onChange={handleAntdChange}
        placeholder={t('companyType.placeholderAdd', { defaultValue: "Дополнительные типы компаний" })}
        mode="multiple"
        allowClear={true}
        style={{ width: '100%' }}
      />
    </Spin>
  );
};

export default CompanyTypeAddSelect;