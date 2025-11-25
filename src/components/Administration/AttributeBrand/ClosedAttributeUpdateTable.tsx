import React from 'react';
import { Table, Button, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UndoOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next'; // Импортируем useTranslation

export interface AttributeItem {
  id: number;
  values: string;
  format: string;
}

interface Props {
  result: AttributeItem[];
  handleRollbackFunction: (item: AttributeItem) => void;
}

const ClosedAttributeUpdateTable: React.FC<Props> = ({
  result,
  handleRollbackFunction,
}) => {
  const { t } = useTranslation(); // Инициализация хука перевода

  const columns: ColumnsType<AttributeItem> = [
    {
      // Перевод: №
      title: t('adminattributes.columns.number'),
      dataIndex: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      // Перевод: Наименование
      title: t('adminattributes.columns.name'),
      dataIndex: 'values',
    },
    {
      // Перевод: Компания (предполагаю, что это 'Тип' из предыдущих компонентов)
      title: t('adminattributes.columns.type'), 
      dataIndex: 'format',
    },
    {
      // Перевод: Статус
      title: t('adminattributes.columns.status'),
      dataIndex: 'status',
      width: 120,
      // Перевод: Удалён
      render: () => <Tag color="red">{t('adminattributes.status.deleted')}</Tag>,
    },
    {
      title: '',
      dataIndex: 'actions',
      width: 80,
      align: 'right',
      render: (_: any, record: AttributeItem) => (
        <Button
          type="default"
          icon={<UndoOutlined />}
          // У нас нет перевода для этой кнопки, но логика остаётся прежней
          onClick={() => handleRollbackFunction(record)}
        />
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={result}
      pagination={{ pageSize: 10 }}
    />
  );
};

export default ClosedAttributeUpdateTable;