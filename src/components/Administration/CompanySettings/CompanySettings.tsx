import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Select, Spin, Button, Space, notification, Typography, message } from "antd";
import type { SelectProps } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from "../../../hooks/useApiRequest"; 

import PointPage from "./PointPage";
import Cashbox from "./Cashbox/Cashbox";
import CreatePrefix from "./CreatePrefix";
import styles from './AddPointForm.module.css';

// --- ТИПЫ ДАННЫХ ---

interface CompanyOption {
  value: string; // ID компании
  label: string; // Название компании
}

interface Point {
  id: string | number;
  name: string;
  address: string;
  is_minus: boolean;
  point_type: number;
  [key: string]: any;
}

interface CashboxItem {
  id: number;
  name: string;
  point: string | number;
  point_name: string;
  deleted: boolean;
  [key: string]: any;
}

interface User {
  partner_id: string;
  // ... другие поля пользователя
}

interface PageModeOption {
    id: number;
    route: 'point' | 'cashbox' | 'createprefix';
    // ⭐️ Удалена жестко заданная строка, остался только route ⭐️
}

interface CompanySettingsProps {
  history?: any; // Из React Router
  location?: any; // Из React Router
  user?: User | null; // Информация о пользователе
}

// ⭐️ ИСПРАВЛЕНО: Массив без жестко заданных строк (только маршруты) ⭐️
const COMPANY_SETTINGS_MODES: PageModeOption[] = [
    {
      "id": 0,
      "route": "point",
    },
    {
      "id": 1,
      "route": "cashbox",
    },
    {
        "id": 3,
        "route": "createprefix",
    }
];

const { Title } = Typography;
const API_URL = import.meta.env.VITE_API_URL || '';

// --- КОМПОНЕНТ ---

const CompanySettings: React.FC<CompanySettingsProps> = ({ history, location, user }) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  
  const [companySelect, setCompanySelect] = useState<CompanyOption | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [pageMode, setPageMode] = useState<'point' | 'cashbox' | 'createprefix'>('point');
  
  // Data states
  const [points, setPoints] = useState<Point[]>([]);
  const [cashboxes, setCashboxes] = useState<CashboxItem[]>([]);
  const [prefix, setPrefix] = useState<string | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  
  const [loadingData, setLoadingData] = useState(false);

  // --- ХЕЛПЕРЫ API ---

  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  }), []);


  // --- 1. ЗАГРУЗКА СПИСКА КОМПАНИЙ ---

  const getCompaniesInfo = useCallback(async () => {
    setLoadingCompany(true);
    const partnerId = user?.partner_id || "1";
    
    try {
      const list = await sendRequest(
        `${API_URL}/api/adminpage/companies?partner_id=${partnerId}`, 
        { method: 'GET', headers: getHeaders() }
      );
      
      const companiesList: CompanyOption[] = list.map((result: any) => ({
        label: result.name,
        value: result.id,
      }));
      
      setCompanies(companiesList);
      
    } catch (err) {
      console.error(err);
      notification.error({
        message: t('companysettings.messages.errorTitle'),
        description: t('companysettings.companies.loadError', { defaultValue: 'Не удалось загрузить список компаний.' }),
      });
    } finally {
      setLoadingCompany(false);
    }
  }, [user, sendRequest, getHeaders, t]);

  useEffect(() => {
    getCompaniesInfo();
  }, [getCompaniesInfo]);


  // --- 2. ЗАГРУЗКА ДАННЫХ КОМПАНИИ (Points, Cashboxes, Prefix) ---

  const getPoints = useCallback(async (id: string) => {
    try {
      const list = await sendRequest(
        `${API_URL}/api/companysettings/storepoint?company=${id}`,
        { method: 'GET', headers: getHeaders() }
      );
      setPoints(list as Point[]);
    } catch (err) {
      console.error(err);
      // ⭐️ Адаптация к языкам ⭐️
      message.error(t('companysettings.pointpage.loadError', { defaultValue: 'Ошибка загрузки точек.' }));
      setPoints([]);
    }
  }, [API_URL, getHeaders, sendRequest, t]);

  const getCashboxes = useCallback(async (id: string) => {
    setLoadingData(true);
    try {
      const list = await sendRequest(
        `${API_URL}/api/companysettings/cashbox?company=${id}`,
        { method: 'GET', headers: getHeaders() }
      );
      
      const newList = (list as CashboxItem[]).filter((cashbox) => cashbox.deleted === false);
      setCashboxes(newList);

    } catch (err) {
      console.error(err);
      // ⭐️ Адаптация к языкам ⭐️
      message.error(t('companysettings.cashboxpage.loadError', { defaultValue: 'Ошибка загрузки касс.' }));
      setCashboxes([]);
    } finally {
      setLoadingData(false);
    }
  }, [API_URL, getHeaders, sendRequest, t]);
  
  const getPrefix = useCallback(async (id: string) => {
    try {
      const data = await sendRequest(
        `${API_URL}/api/companysettings/prefix?company=${id}`,
        { method: 'GET', headers: getHeaders() }
      );
      setPrefix(data[0]?.productsweight_prefix || undefined);
    } catch (err) {
      console.log(err);
      setPrefix(undefined);
    }
  }, [API_URL, getHeaders, sendRequest]);


  // --- 3. ОБРАБОТЧИК ВЫБОРА КОМПАНИИ ---

  const onCompanyChange = useCallback((c: CompanyOption) => {
    setCompanySelect(c);
    setIsEditing(false);
    
    if (c.value) {
        getPoints(c.value);
        getCashboxes(c.value);
        getPrefix(c.value);
    } else {
        setPoints([]);
        setCashboxes([]);
        setPrefix(undefined);
    }
  }, [getPoints, getCashboxes, getPrefix]);

  const changePageMode = useCallback((route: 'point' | 'cashbox' | 'createprefix') => {
    setPageMode(route);
  }, []);

  // --- 4. КНОПКИ НАВИГАЦИИ (ТАБЫ) ---
  
  const modeButtons = useMemo(() => (
    COMPANY_SETTINGS_MODES.map((page) => {
      let captionKey: string;
      switch (page.route) {
        case 'point':
          captionKey = 'companysettings.pointName1'; // Используем ключ для "Торговая точка"
          break;
        case 'cashbox':
          captionKey = 'companysettings.cashbox.name1'; // Используем ключ для "Касса"
          break;
        case 'createprefix':
          captionKey = 'companysettings.prefix.label'; // Используем ключ для "Префикс"
          break;
        default:
          captionKey = '';
      }

      return (
        <Button
          key={page.route}
          name={page.route}
          type={pageMode === page.route ? "primary" : "default"}
          onClick={() => changePageMode(page.route)}
          className={styles.modeButtons1}
        >
          {/* ⭐️ Адаптация к языкам ⭐️ */}
          {t(captionKey, { defaultValue: page.route })}
        </Button>
      );
    })
  ), [pageMode, changePageMode, t]);

  // --- 5. РЕНДЕРИНГ ---

  return (
    <div className={styles.pageContainer}>
      <Title level={4}>{t('companysettings.pageTitle', { defaultValue: "Настройки компании" })}</Title>
      
      <Spin spinning={loadingCompany}>
        {/* Селект для выбора компании */}
        <Select<CompanyOption>
          value={companySelect}
          onChange={(_, option) => onCompanyChange(option as CompanyOption)}
          options={companies}
          placeholder={t('companysettings.selectCompanyPlaceholder', { defaultValue: "Выберите компанию" })}
          className={styles.companySelect}
          notFoundContent={t('companysettings.noCompanyFound', { defaultValue: "Компания не найдена" })}
          labelInValue
        />
      </Spin>

      {companySelect && (
        <div className={styles.contentWrapper1}>
          {/* Кнопки переключения режима */}
          <Space size="small" className={styles.modeButtons}>
            {modeButtons}
          </Space>
          
          {/* Контент страницы */}
          <div className={styles.contentBox}>
            {pageMode === "point" && (
              <PointPage
                points={points}
                isLoading={loadingData} 
                companySelect={companySelect}
                setPoints={setPoints}
                getPoints={getPoints} 
                isEditing={isEditing}
                setIsEditing={setIsEditing}
              />
            )}
            {pageMode === "cashbox" && (
              <Cashbox
              history={history}
                location={location}
                cashboxes={cashboxes}
                setCashboxes={setCashboxes}
                getCashboxes={getCashboxes} 
                isLoading={loadingData}
                companySelect={companySelect}
                points={points}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
              />
            )}
            {pageMode === "createprefix" && (
              <CreatePrefix
                companySelect={companySelect}
                prefix={prefix}
                setPrefix={setPrefix}
                getPrefix={getPrefix}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySettings;