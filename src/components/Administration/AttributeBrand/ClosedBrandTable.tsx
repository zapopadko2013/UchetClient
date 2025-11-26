import React from 'react';
import { Table, Button, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UndoOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

export interface BrandItem {
  id: number;
  brand: string;
  manufacturer: string;
}

interface Props {
  result: BrandItem[];
  handleRollbackFunction: (item: BrandItem) => void;
}

const ClosedBrandTable: React.FC<Props> = ({
  result,
  handleRollbackFunction,
}) => {
  const { t } = useTranslation('');

  const columns: ColumnsType<BrandItem> = [
    {
      title: t('adminbrands.index'),
      dataIndex: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: t('adminbrands.name'),
      dataIndex: 'brand',
    },
    {
      title: t('adminbrands.company'),
      dataIndex: 'manufacturer',
    },
    {
      title: t('adminbrands.status'),
      dataIndex: 'status',
      width: 120,
      render: () => (
        <Tag color="red">{t('adminbrands.deleted')}</Tag>
      ),
    },
    {
      title: '',
      dataIndex: 'actions',
      width: 80,
      align: 'right',
      render: (_: any, record: BrandItem) => (
        <Button
          type="default"
          icon={<UndoOutlined />}
          onClick={() => handleRollbackFunction(record)}
          title={t('adminbrands.restore')}
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

export default ClosedBrandTable;
