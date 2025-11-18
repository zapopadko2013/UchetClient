import React, { useMemo } from "react";
import { Table, Button, Tag, Typography } from "antd";
import type { ColumnsType } from 'antd/es/table';
import { RollbackOutlined } from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import styles from '../../AddPointForm.module.css';  

// --- ТИПЫ ДАННЫХ ---
interface ClosedCashboxItem {
  id: number;
  name: string;      // Наименование
  point_name: string; // Торговая точка
  [key: string]: any;
}

interface ClosedCashboxTableProps {
  result: ClosedCashboxItem[];
  handleRollbackFunction: (item: ClosedCashboxItem) => void;
}

const { Text } = Typography;

// --- КОМПОНЕНТ ---

const ClosedCashboxTable: React.FC<ClosedCashboxTableProps> = ({ result, handleRollbackFunction }) => {
  const { t } = useTranslation();

  // --- КОНФИГУРАЦИЯ КОЛОНОК ---
  const columns: ColumnsType<ClosedCashboxItem> = useMemo(() => [
    {
      title: t('companysettings.common.number'), // №
      key: 'number',
      render: (_, __, index) => index + 1,
      width: 50,
    },
    {
      title: t('companysettings.cashbox.closed.name'), // Наименование
      dataIndex: 'name',
      key: 'name',
      // Сортировка или фильтрация может быть добавлена здесь
    },
    {
      title: t('companysettings.cashbox.closed.point'), // Торговая точка
      dataIndex: 'point_name',
      key: 'point_name',
    },
    {
      title: t('companysettings.cashbox.closed.status'), // Статус
      key: 'status',
      width: 100,
      render: () => (
        // Используем Ant Design Tag для отображения статуса "Удалён"
        <Tag color="error"> 
          {t('companysettings.cashbox.closed.statusDeleted')} 
        </Tag>
      ),
    },
    {
      title: '', // Пустой заголовок для кнопки
      key: 'action',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Button
          type="default"
          danger // Используем danger, чтобы выделить действие отмены/возврата
          icon={<RollbackOutlined />}
          title={t('companysettings.cashbox.closed.rollbackTitle')}
          onClick={() => handleRollbackFunction(record)}
        >
          {t('companysettings.cashbox.closed.rollbackButton')}
        </Button>
      ),
    },
  ], [t, handleRollbackFunction]);

  return (
    <div className={styles.tableContainer}>
      <Table
        dataSource={result}
        columns={columns}
        rowKey="id"
        pagination={false} // Отключаем пагинацию, если она не нужна
        locale={{ 
          emptyText: <Text type="secondary">{t('companysettings.cashbox.closed.emptyList')}</Text> 
        }}
        // Стилизация для отображения границ (аналог bordered)
        bordered 
      />
    </div>
  );
};

export default ClosedCashboxTable;