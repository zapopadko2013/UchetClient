import React, { useMemo } from "react";
import { Table, Button, Tag, Typography } from "antd";
import type { ColumnsType } from 'antd/es/table';
import { RollbackOutlined } from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import styles from '../../AddPointForm.module.css';  

// --- ТИПЫ ДАННЫХ ---
interface ClosedPointItem {
  id: number;
  name: string;      // Наименование
  address: string;   // Адрес
  is_minus: boolean; // Отрицательный учёт (true/false)
  [key: string]: any;
}

interface ClosedPointTableProps {
  result: ClosedPointItem[];
  handleRollbackFunction: (item: ClosedPointItem) => void;
}

const { Text } = Typography;

// --- КОМПОНЕНТ ---

const ClosedPointTable: React.FC<ClosedPointTableProps> = ({ result, handleRollbackFunction }) => {
  const { t } = useTranslation();

  // --- КОНФИГУРАЦИЯ КОЛОНОК ---
  const columns: ColumnsType<ClosedPointItem> = useMemo(() => [
    {
      title: t('companysettings.common.number'), // №
      key: 'number',
      render: (_, __, index) => index + 1,
      width: 50,
    },
    {
      title: t('companysettings.pointName'), // Наименование
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('companysettings.pointAddress'), // Адрес
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: t('companysettings.negativeAccounting'), // Отрицательный учёт
      dataIndex: 'is_minus',
      key: 'is_minus',
      render: (isMinus: boolean) => (
        <Tag color={isMinus ? 'success' : 'default'}>
          {isMinus ? t('companysettings.common.yes') : t('companysettings.common.no')}
        </Tag>
      ),
    },
    {
      title: t('companysettings.cashbox.closed.status'), // Статус
      key: 'status',
      width: 100,
      render: () => (
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
          danger
          icon={<RollbackOutlined />}
          title={t('companysettings.cashbox.closed.rollbackTitle')}
          onClick={() => handleRollbackFunction(record)}
        >
          {t('companysettings.common.rollback')}
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
        pagination={false}
        locale={{ 
          emptyText: <Text type="secondary">{t('companysettings.closed.emptyList')}</Text> 
        }}
        bordered 
      />
    </div>
  );
};

export default ClosedPointTable;