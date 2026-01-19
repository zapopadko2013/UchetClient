/* import React, { useState } from 'react';
import { Select } from 'antd';
import Flag from 'react-flagkit';
import { useTranslation } from 'react-i18next';
import './LanguageSelector.css';

const { Option } = Select;


const LanguageSelector= ()  => {
    // Получаем i18n instance и функцию перевода.
    const { i18n } = useTranslation();
    
    // Используем useState для хранения текущего языка.
    // Явно указываем, что тип состояния - string.
    const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language);

   
    const handleLanguageChange = (lng: string) => {
        i18n.changeLanguage(lng);
        setCurrentLanguage(lng);
    };

    return (
        <Select
            className="language-selector"
            value={currentLanguage}
            onChange={handleLanguageChange}
        >
            <Option value="ru">
                <Flag country="RU" size={16} />
                <span className="language-text">Русский</span>
            </Option>
            <Option value="en">
                <Flag country="GB" size={16} />
                <span className="language-text">English</span>
            </Option>
            <Option value="kk">
                <Flag country="KZ" size={16} />
                <span className="language-text">Қазақша</span>
            </Option>
        </Select>
    );
};

export default LanguageSelector;
 */

import React, { useState } from 'react';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  const handleChange = (lng: string) => {
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
    localStorage.setItem('i18nextLng', lng); // сохраняем язык
  };

  return (
    <Select value={currentLanguage} onChange={handleChange} style={{ width: 120 }}>
      <Option value="ru">Русский</Option>
      <Option value="en">English</Option>
      <Option value="kk">Қазақша</Option>
    </Select>
  );
};

export default LanguageSelector;
