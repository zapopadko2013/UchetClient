import React, { useState, useCallback, useMemo } from "react";
import { Table, Button, Typography, Space, Modal, message, notification, Empty } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import useApiRequest from "../../../../../hooks/useApiRequest";
import { useApiErrorHandler } from "../../../../handleApiError"; // Централизованный обработчик ошибок

// Дочерние компоненты
import ShowInactive from "../../InactiveList/ShowInactive";
import AddCashboxForm from "./AddCashBoxForm";
import Searching from "../../../../Searching";
import styles from '../../AddPointForm.module.css'; 

// --- ТИПЫ ДАННЫХ ---
interface CompanyOption { 
  value: string; // ID компании
  label: string; // Название компании (ДОЛЖНО быть string, не optional)
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

interface CashboxListProps {
  // 1. Пропсы роутера (были в ошибке)
  history: any;
  location: any;

  // 2. Данные и функции для списка
  cashboxes: CashboxItem[];
  isLoading: boolean;
  setCashboxes: (cashboxes: CashboxItem[]) => void;
  companySelect: CompanyOption;
  getCashboxes: (companyId: string) => void;
  
  // 3. Данные о точках (должны быть SelectOption[], как вы определили ранее)
  points: SelectOption[];
  
  // 4. Состояние редактирования
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}

// --- КОНСТАНТЫ И УТИЛИТЫ ---
const { Title, Text } = Typography;
const { confirm } = Modal;
const API_URL = import.meta.env.VITE_API_URL || '';

const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
});

// --- КОМПОНЕНТ ---

const CashboxList: React.FC<CashboxListProps> = ({
  cashboxes,
  setCashboxes,
  isLoading,
  getCashboxes,
  companySelect,
  points,
  isEditing,
  setIsEditing,
}) => {
  const { t } = useTranslation();
  const [cashboxData, setCashboxData] = useState<CashboxItem | null>(null);
  const { sendRequest } = useApiRequest();
  const handleError = useApiErrorHandler();

  // --- ЛОГИКА УДАЛЕНИЯ ---

  const Delete = useCallback(async (item: CashboxItem) => {
    try {
      await sendRequest(`${API_URL}/api/companysettings/cashbox/delete?id=${item.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      // Обновление локального списка
      const newCashboxesList = cashboxes.filter((c) => c.id !== item.id);
      setCashboxes(newCashboxesList);

      message.success(t('companysettings.cashbox.successDelete'));

    } catch (err: any) {
      console.error(err);
      handleError(err);
    }
  }, [cashboxes, setCashboxes, sendRequest, handleError, t]);

  const handleDelete = useCallback((item: CashboxItem) => {
    confirm({
      title: t('companysettings.closed.confirmTitle'),
      icon: <ExclamationCircleOutlined />,
      content: t('companysettings.cashbox.confirmDelete'),
      okText: t('companysettings.messages.sure'),
      cancelText: t('companysettings.closed.cancelBtnText'),
      okType: 'danger',
      onOk() {
        Delete(item);
      },
    });
  }, [Delete, t]);

  // --- ЛОГИКА РЕДАКТИРОВАНИЯ И ВОССТАНОВЛЕНИЯ ---

  const handleEdit = useCallback((data: CashboxItem) => {
    
    const formattedData: CashboxItem = {
        ...data,
        point: String(data.point), // Гарантируем, что ID точки — это строка
    };
    
    setCashboxData(formattedData);
    //setCashboxData(data);
    setIsEditing(true);
  }, [setIsEditing]);

  const handleRollback = useCallback(() => {
    // Вызывается после успешного восстановления в ClosedList
    getCashboxes(companySelect.value);
  }, [getCashboxes, companySelect.value]);


  // --- КОНФИГУРАЦИЯ ТАБЛИЦЫ ---

  const columns: ColumnsType<CashboxItem> = useMemo(() => [
    {
      title: t('companysettings.common.number'),
      key: 'number',
      render: (_, __, index) => index + 1,
      width: 50,
    },
    {
      title: t('companysettings.cashbox.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('companysettings.pointName'),
      dataIndex: 'point_name',
      key: 'point_name',
    },
    {
      title: '', // Столбец для кнопок действий
      key: 'actions',
      width: 150,
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            title={t('companysettings.common.title.edit')}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            title={t('companysettings.common.title.delete')}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ], [t, handleEdit, handleDelete]);

  // --- РЕНДЕРИНГ ---

  if (isEditing) {
    return (
      <AddCashboxForm
        cashboxData={cashboxData}
        company={companySelect}
        setEdit={setIsEditing}
        setCashboxData={setCashboxData}
        getCashboxes={getCashboxes}
        points={points}
      />
    );
  }

  return (
    <div className="cashbox-list">
      {/* 1. Заголовок и кнопка "Добавить" */}
      <Space align="center" className={styles.companySelectorContainer}>
        <Title level={4} className={styles.title}>
          {t('companysettings.cashbox.listTitle')}
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setCashboxData(null); // Сброс данных при переходе в режим добавления
            setIsEditing(true);
          }}
        >
          {t('companysettings.cashbox.addTitle')}
        </Button>
      </Space>

      {/* 2. Загрузка */}
      {isLoading && <Searching />}

      {/* 3. Список касс */}
      {!isLoading && (
        <>
          {cashboxes.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<Text type="secondary">{t('companysettings.cashbox.emptyList')}</Text>}
            />
          ) : (
            <Table
              dataSource={cashboxes}
              columns={columns}
              rowKey="id"
              pagination={false}
              bordered
              className={styles.mainTitle}
            />
          )}

          {/* 4. Неактивные элементы */}
          <ShowInactive 
            callback={handleRollback} 
            mode="cashbox" 
            companySelect={companySelect} 
          />
        </>
      )}
    </div>
  );
};

export default CashboxList;