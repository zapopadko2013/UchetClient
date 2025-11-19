import React, { useEffect, useState, useCallback } from "react";
import { Select, Spin, notification } from "antd";
import type { SelectProps } from 'antd'; // Импортируем тип SelectProps
import { useTranslation } from 'react-i18next';
// Предполагаемый импорт хука для запросов
import useApiRequest from "../../../hooks/useApiRequest"; 
import styles from './RegisterPage.module.css';

// --- ТИПЫ ДАННЫХ ---

interface CountryOption {
  value: string; // Код страны (например, "KZ")
  label: string; // Название страны с флагом
}

interface CountrySelectProps {
  selectedCountry: CountryOption;
  onChange: (value: CountryOption) => void; 
}

// Внешний публичный API
const API_URL = "https://valid.layercode.workers.dev/list/countries?format=select&flags=true&value=code";

// ⭐️ Создаем тип функции без 'undefined' для использования в useCallback ⭐️
type OnChangeFunction = NonNullable<SelectProps<string, CountryOption>['onChange']>;

// --- КОМПОНЕНТ ---

const CountrySelect: React.FC<CountrySelectProps> = ({ selectedCountry, onChange }) => {
  const { t } = useTranslation();
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const { sendRequest } = useApiRequest();

  // ⭐️ Функция загрузки данных с API ⭐️
  const fetchCountries = useCallback(async () => {
    setLoading(true);
    try {
      // Используем sendRequest для консистентности
      const data = await sendRequest(API_URL, { 
        method: 'GET',
       // headers: { 'Content-Type': 'application/json' }
      });
     
      
      // Предполагаем, что data.countries - это массив CountryOption
      setCountries((data.countries as CountryOption[]) || []); 
      
    } catch (error) {
      console.error("Failed to fetch countries:", error);
      notification.error({
        message: t('countrySelect.loadErrorTitle', { defaultValue: "Ошибка загрузки" }),
        description: t('countrySelect.loadErrorDesc', { defaultValue: "Не удалось загрузить список стран." }),
      });
      setCountries([]);
    } finally {
      setLoading(false);
    }
  }, [sendRequest, t]);

  // Загрузка данных при монтировании
  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  // ⭐️ Обработчик для Ant Design Select с исправленной типизацией ⭐️
  const handleAntdChange: OnChangeFunction = useCallback(
    (value, option) => {
      // Проверяем, что опция существует и не является массивом.
      // option имеет тип CountryOption | undefined (если выбрана одна опция)
      if (option && !Array.isArray(option)) {
          // Тип опции гарантированно соответствует CountryOption
          onChange(option as CountryOption); 
      }
      
      // Логика для очистки (если в Select добавлено allowClear)
      if (!value && onChange) {
        // Передаем пустой/дефолтный объект, который ожидает onChange
        onChange({ value: '', label: t('countrySelect.placeholder', { defaultValue: "Выберите страну" }) });
      }

    },
    [onChange, t]
  );

  return (
    <Spin spinning={loading} size="small">
      {/* ⭐️ Используем дженерики <ValueType, OptionType> для корректного типирования ⭐️ */}
      <Select<string, CountryOption> 
        showSearch
        placeholder={t('countrySelect.placeholder', { defaultValue: "Выберите страну" })}
        optionFilterProp="children" // Фильтрация по содержимому лейбла (text of the option)
        
        value={selectedCountry?.value}
        onChange={handleAntdChange}
        
        options={countries}
        
        notFoundContent={t('countrySelect.notFound', { defaultValue: "Страна не найдена" })}
        
        className={styles.fullWidth}
        // Если вам нужна возможность сброса выбранного значения:
        // allowClear={true} 
      />
    </Spin>
  );
};

export default CountrySelect;