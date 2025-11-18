import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button, Typography, Collapse } from "antd"; // Добавлен тип CollapseProps
import { DownOutlined, UpOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import ClosedList from "./ClosedList";
import type { CollapseProps } from "antd";
import styles from '../AddPointForm.module.css'; 

// --- ТИПЫ ДАННЫХ ---
interface CompanyOption {
  value: string;
  label: string;
}

export interface Point { 
  id: string | number;
  name: string;
  address: string;
  is_minus: boolean; 
  point_type: number; 
  [key: string]: any; 
}

interface ShowInactiveProps {
  callback: (newPoint: Point) => void;
  mode: 'point' | 'cashbox';
  companySelect: CompanyOption;
}

const { Text } = Typography;

// --- КОМПОНЕНТ ---

const ShowInactive: React.FC<ShowInactiveProps> = ({ callback, mode, companySelect }) => {
  const { t } = useTranslation();
  const [isHidden, setHidden] = useState(true);
  
  // ИСПОЛЬЗУЕМ: Состояние для activeKey, чтобы управлять открытием/закрытием
  const activeKey = isHidden ? [] : ['list'];

  // --- ЛОКАЛИЗАЦИЯ ЗАГОЛОВКА ---

  const captionText = useMemo(() => {
    const keyBase = mode === 'point' ? 'inactive.points' : 'inactive.cashboxes';
    const key = isHidden ? 'showCaption' : 'hideCaption';
    
    return t(`companysettings.${keyBase}.${key}`);
  }, [mode, isHidden, t]);

  // --- ОБРАБОТЧИКИ ---

  const handleToggle = useCallback(() => {
    setHidden(prev => !prev);
  }, []);

  // ⭐️ НОВЫЙ МЕТОД: Создание массива items для Collapse ⭐️
  const collapseItems: CollapseProps['items'] = useMemo(() => ([
    {
      key: 'list',
      // В новом формате 'header' и 'showArrow' задаются в объекте
      label: null, // Устанавливаем label в null, чтобы не отображать стандартный заголовок
      showArrow: false, // Скрываем стрелку, так как у нас есть внешняя кнопка
      style: { padding: 0 },
      children: (
        // Контент панели
        <ClosedList 
          mode={mode} 
          handleRollback={callback} 
          isHidden={isHidden} 
          companySelect={companySelect}
        />
      ),
    },
  ]), [mode, callback, isHidden, companySelect]);

  // --- РЕНДЕРИНГ ---

  const icon = isHidden ? <DownOutlined /> : <UpOutlined />;

  return (
    <div className={styles.showInactiveContainer}>
      
      {/* 1. Кнопка/Заголовок для переключения */}
      <Button
        className={styles.toggleButton}
        type="link"
        onClick={handleToggle}
        icon={icon}
      >
        <Text strong type="secondary" className={styles.toggleText}>
            <DeleteOutlined className={styles.deleteIconMargin} />
            {captionText}
        </Text>
      </Button>

      {/* 2. Контент (Список удаленных) - Используем items */}
      <Collapse 
        // ⭐️ Используем activeKey для управления открытием/закрытием ⭐️
        activeKey={activeKey} 
        bordered={false} 
        className={styles.listCollapse}
        // ⭐️ ПЕРЕДАЕМ МАССИВ ITEMS ВМЕСТО CHILDREN ⭐️
        items={collapseItems} 
        // Добавляем обработчик, чтобы React не жаловался на отсутствие onClick при управлении activeKey
        onChange={() => {}} 
      />

    </div>
  );
};

export default ShowInactive;