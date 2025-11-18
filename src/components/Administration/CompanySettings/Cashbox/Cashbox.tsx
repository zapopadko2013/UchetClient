import React, { useState, useCallback, useMemo } from "react";
import { Button, Space, Typography } from "antd";
import { useTranslation } from 'react-i18next';
// Убедитесь, что пути импорта CashboxList и EditCashbox верны
import CashboxList from "./CashboxListPage/CashboxList"; 
import EditCashbox from "./EditCashbox/EditCashbox"; 
import styles from '../AddPointForm.module.css'; 

 

// --- ТИПЫ ДАННЫХ ---
interface Point {
  id: string | number;
  name: string;
  address: string;
}

interface CashboxMode {
  id: number;
  type: string; 
  /** Маршрут или имя компонента, который должен быть отображен. */
  route: 'CashboxListPage' | 'EditCashbox';
  /** Текст кнопки (локализованный). */
  caption: string;
}

interface SelectOption {
    value: string | number;
    label: string;
}

interface CashboxItem {
  id: number;
  name: string;
  point: string | number;
  point_name: string;
  [key: string]: any; 
  deleted: boolean;
}

interface CompanyOption {
  value: string; // ID компании
  label: string; // Название компании
}

interface CashboxProps {
  // Пропсы роутера
  history: any; 
  location: any;

  // Данные для CashboxList
  cashboxes: CashboxItem[];
  isLoading: boolean;
  setCashboxes: (cashboxes: CashboxItem[]) => void;
  getCashboxes: (companyId: string) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;

  // Общие данные
  companySelect: CompanyOption;
  points: Point[]; // Список всех доступных точек продаж
}

const { Title } = Typography;

// --- КОМПОНЕНТ ---

const Cashbox: React.FC<CashboxProps> = (props) => {
  const { t } = useTranslation();

  // ⭐️ ИСПРАВЛЕНИЕ: Локализация массива CASHBOX_MODES ⭐️
  const CASHBOX_MODES: CashboxMode[] = useMemo(() => ([
    {
      "id": 0,
      "type": "report",
      "route": "CashboxListPage",
      // Используем ключ локализации (например, 'cashbox.manage')
      "caption": t('companysettings.cashbox.manage', { defaultValue: 'Управление кассой' }) 
    },
    {
      "id": 1,
      "type": "report",
      "route": "EditCashbox",
      // Используем ключ локализации (например, 'cashbox.editChecks')
      "caption": t('companysettings.cashbox.editChecks', { defaultValue: 'Изменение чеков' })
    }
  ]), [t]); // Зависимость от t обеспечивает обновление при смене языка
  
  const [cashboxMode, setCashboxMode] = useState<'CashboxListPage' | 'EditCashbox'>("CashboxListPage");

  // Обработчик переключения режимов
  const changeCashboxMode = useCallback((route: 'CashboxListPage' | 'EditCashbox') => {
    setCashboxMode(route);
  }, []);

  // Создаем кнопки навигации
  const modeButtons = useMemo(() => (
    <Space size="small" className={styles.mainTitle}>
      {CASHBOX_MODES.map((mode) => (
        <Button
          key={mode.id}
          type={cashboxMode === mode.route ? "primary" : "default"}
          onClick={() => changeCashboxMode(mode.route)}
        >
          {mode.caption} {/* Локализованный текст */}
        </Button>
      ))}
    </Space>
  ), [cashboxMode, changeCashboxMode, CASHBOX_MODES]);

  // Преобразование списка точек в формат SelectOption
  const selectPoints: SelectOption[] = useMemo(() => {
    return props.points.map(point => ({
      value: point.id, 
      label: point.name,
    }));
  }, [props.points]);


  return (
    <div className="cashbox-page">
      {/* 1. Навигация (Кнопки) */}
      {modeButtons}

      {/* 2. Контент */}
      {cashboxMode && (
        <div className="cashbox-content">
            {/* Рендеринг CashboxList */}
            {cashboxMode === "CashboxListPage" && (
                <CashboxList
                    history={props.history}
                    location={props.location}
                    cashboxes={props.cashboxes}
                    isLoading={props.isLoading}
                    setCashboxes={props.setCashboxes}
                    companySelect={props.companySelect}
                    getCashboxes={props.getCashboxes}
                    points={selectPoints}
                    isEditing={props.isEditing}
                    setIsEditing={props.setIsEditing}
                />
            )}

            {/* Рендеринг EditCashbox */}
            {cashboxMode === "EditCashbox" && (
                <EditCashbox
                    history={props.history}
                    location={props.location}
                    points={props.points}
                />
            )}
        </div>
      )}
    </div>
  );
};

export default Cashbox;