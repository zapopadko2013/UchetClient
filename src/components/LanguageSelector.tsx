import React, { useState } from 'react';
import { Select } from 'antd';
import Flag from 'react-flagkit';
import { useTranslation } from 'react-i18next';
import './LanguageSelector.css';

const { Option } = Select;

/**
 * Компонент для выбора языка.
 * @component
 */
const LanguageSelector= ()  => {
    // Получаем i18n instance и функцию перевода.
    const { i18n } = useTranslation();
    
    // Используем useState для хранения текущего языка.
    // Явно указываем, что тип состояния - string.
    const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language);

    /**
     * Обрабатывает изменение языка в селекторе.
     * @param {string} lng - Новый выбранный язык.
     */
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
