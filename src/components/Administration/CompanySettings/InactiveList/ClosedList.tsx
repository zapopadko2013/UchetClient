import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Modal, notification, message, Typography, Empty, Space } from "antd";
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useApiRequest from "../../../../hooks/useApiRequest"; 
import { useApiErrorHandler } from "../../../handleApiError"; // Путь к вашему хуку-обработчику ошибок
import styles from '../AddPointForm.module.css';  

// Компоненты, которые вы переводили ранее:
import Searching from "../../../Searching"; 
import ClosedPointTable from "./ClosedTables/ClosedPointTable";
import ClosedCashboxTable from "./ClosedTables/ClosedCashboxTable";

// --- ТИПЫ ДАННЫХ ---
interface ClosedItem {
  id: number;
  name: string;
  [key: string]: any;
}

interface ClosedPointItem extends ClosedItem {
  address: string;    
  is_minus: boolean;
}

interface ClosedCashboxItem extends ClosedItem {
  point_name: string; 
}

interface CompanyOption {
  value: string; // ID компании
}

export interface Point { 
  id: string | number;
  name: string;
  address: string;
  
  // ⭐️ ЭТИ ПОЛЯ ДОЛЖНЫ ПРИСУТСТВОВАТЬ ВЕЗДЕ
  is_minus: boolean; 
  point_type: number; 
  
  [key: string]: any; 
}

interface ClosedListProps {
  mode: 'point' | 'cashbox';
  isHidden: boolean;
  handleRollback: (newPoint: Point) => void;
  companySelect: CompanyOption;
}

// --- КОНСТАНТЫ И УТИЛИТЫ ---
const { confirm } = Modal;
const { Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL || '';

const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
});

// --- КОМПОНЕНТ ---

const ClosedList: React.FC<ClosedListProps> = ({ mode, isHidden, handleRollback, companySelect }) => {
  const { t } = useTranslation();
  
  // Вызов хуков
  const handleError = useApiErrorHandler();
  const { sendRequest } = useApiRequest();
  
  const [result, setResult] = useState<ClosedItem[]>([]);
  const [isLoading, setLoading] = useState(false);

  // --- 1. ОПРЕДЕЛЕНИЕ API ENDPOINTS ---

  const apiEndpoints = useMemo(() => {
    const companyId = companySelect?.value;
    if (!companyId) return null;

    const base = '/api/companysettings';
    
    if (mode === 'point') {
        return {
            inactive: `${base}/storepoint/inactive?company=${companyId}`,
            activeBase: `${base}/storepoint/active?id=`
        };
    }
    if (mode === 'cashbox') {
        return {
            inactive: `${base}/cashbox/inactive?company=${companyId}`,
            activeBase: `${base}/cashbox/active?id=`
        };
    }
    return null;
  }, [mode, companySelect]);

  // --- 2. ЗАГРУЗКА ЗАКРЫТЫХ ЭЛЕМЕНТОВ ---

  const getClosedInfo = useCallback(async () => {
    if (!apiEndpoints?.inactive) return;

    setLoading(true);
    
    try {
      const res = await sendRequest(API_URL + apiEndpoints.inactive, {
        method: 'GET',
        headers: getHeaders(),
      });
      setResult(res || []);
    } catch (err) {
      console.error(err);
      notification.error({
        message: t('companysettings.messages.errorTitle'),
        description: t('companysettings.messages.loadClosedError'),
      });
      setResult([]);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoints, sendRequest, t]);

  useEffect(() => {
    if (!isHidden && companySelect.value) {
      getClosedInfo();
    } else {
      setResult([]);
    }
  }, [isHidden, companySelect.value, getClosedInfo]);

  // --- 3. ЛОГИКА ВОССТАНОВЛЕНИЯ (ROLLBACK) ---

  // --- 3. ЛОГИКА ВОССТАНОВЛЕНИЯ (ROLLBACK) ---

  const rollback = useCallback(async (item: ClosedItem) => {
    if (!apiEndpoints) {
      console.error("API Endpoints not available.");
      return;
    }
    
    const api = apiEndpoints.activeBase + item.id;

    try {
      // ⭐️ ИСПРАВЛЕНИЕ: Ожидаем, что API вернет восстановленный объект (Point или CashboxItem)
      const restoredItem = await sendRequest(API_URL + api, {
        method: 'PUT',
        headers: getHeaders(),
      });
      
      const newResultsList = result.filter((res) => res.id !== item.id);
      setResult(newResultsList);
      
      // ⭐️ ИСПРАВЛЕНИЕ 1: Вызов колбэка
      // Мы вызываем handleRollback, который, согласно родительскому коду, 
      // выполняет повторную загрузку списка точек/касс.
      // 
      // Если mode === 'point', restoredItem должен быть типа Point. 
      // Если mode === 'cashbox', restoredItem должен быть типа CashboxItem.
      // 
      // Так как handleRollback ожидает Point (согласно ClosedListProps), 
      // мы должны передать Point.
      // 
      // ВНИМАНИЕ: Если mode === 'cashbox', вы получите ошибку, 
      // поскольку handleRollback ожидает Point, а не CashboxItem. 
      // Лучше, чтобы handleRollback вызывал fetchPoints(companyId), 
      // как мы делали в PointPage, вместо передачи объекта.
      
      // Если handleRollback используется просто для триггера перезагрузки:
      handleRollback(restoredItem as Point); // Приведение типа для устранения ошибки TS

      message.success(t('companysettings.closed.successRollback'));
      
    } catch (err: any) {
      console.error(err);
      handleError(err); // Используем централизованный обработчик
    }
  }, [result, apiEndpoints, handleRollback, sendRequest, t, handleError]);
  // --- 4. МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ (АНАЛОГ SWEETALERT) ---
  // Так как ClosedItem является общим родительским типом,
  // эту функцию можно использовать для обоих типов таблиц.
  const handleRollbackFunction = useCallback((item: ClosedItem) => {
    confirm({
      title: t('companysettings.closed.confirmTitle'),
      icon: <ExclamationCircleOutlined />,
      content: t('companysettings.closed.confirmContent'),
      okText: t('companysettings.closed.confirmBtnText'),
      cancelText: t('companysettings.closed.cancelBtnText'),
      okType: 'danger', 
      onOk() {
        rollback(item);
      },
    });
  }, [rollback, t]);


  // --- 5. РЕНДЕРИНГ ---

  let content;

  if (isLoading) {
    content = <Searching />;
  } else if (result.length === 0) {
    content = (
        <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<Text type="secondary">{t('companysettings.closed.emptyList')}</Text>} 
        />
    );
  } else {
    // ⭐️ ИСПРАВЛЕНИЕ: Условный рендеринг для сужения типов ⭐️
    content = (
      <div className={styles.tableWrapper}>
        
        {mode === "point" && (
          <ClosedPointTable
            // Утверждаем, что result содержит нужные поля для ClosedPointTable
            result={result as ClosedPointItem[]} 
            handleRollbackFunction={handleRollbackFunction as (item: ClosedPointItem) => void}
          />
        )}
        
        {mode === "cashbox" && (
          <ClosedCashboxTable
            // Утверждаем, что result содержит нужные поля для ClosedCashboxTable
            result={result as ClosedCashboxItem[]}
            handleRollbackFunction={handleRollbackFunction as (item: ClosedCashboxItem) => void}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.closedListContainer}> 
      {content}
    </div>
  );
};

export default ClosedList;