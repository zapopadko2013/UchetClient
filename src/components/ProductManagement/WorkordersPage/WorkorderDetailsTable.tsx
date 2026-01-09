import React, { useEffect, useState } from 'react';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Space ,Table, Tag, Typography, message, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import AddDetailModal from './AddDetailModal'; 

const { Text } = Typography;

interface Props {
  workorderId: string;
  point: string;
  counterparty: string;
}

interface Attribute {
  id: number;
  name: string; // Название атрибута (например, "Размер")
  value: string; // Значение (например, "XL")
  format: string;
}

interface WorkorderDetail {
  product: string;
  code: string;
  name: string;
  purchaseprice: number;
  price: number;
  units: number;
  accepted_units: number;
  status: string;
  counterparty: string;
  counterpartiesname: string;
  sendwhatsapp: string;
  attr_json: Attribute[] | null;
}

const WorkorderDetailsTable: React.FC<Props> = ({ workorderId,point,counterparty }) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const [details, setDetails] = useState<WorkorderDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '';


  const fetchDetails = async () => {
    setLoading(true);
    try {
      const data = await sendRequest(`${API_URL}/api/workorder/details?workorderId=${workorderId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setDetails(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDetail = (productId: string) => {
    Modal.confirm({
      title: t('workorder.delete'),
      content: t('workorder.deleteDetailConfirm'),
      okText: t('workorder.common.yes'),
      okType: 'danger',
      cancelText: t('workorder.common.no'),
      onOk: async () => {
        try {
          await sendRequest(`${API_URL}/api/workorder/details/delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify({ 
                product: productId, 
                workorder_id: workorderId 
            }),
          });
          message.success(t('workorder.deleteDetailSuccess'));
          fetchDetails(); // Обновляем список после удаления
        } catch (err) {
          console.error(err);
          message.error(t('workorder.deleteDetailError'));
        }
      },
    });
  };

  useEffect(() => {
    if (workorderId) fetchDetails();
  }, [workorderId]);

  const columns = [
    { title: t('workorder.product.code'), dataIndex: 'code', key: 'code', width: 100 },
    { 
        title: t('workorder.product.name'), 
        dataIndex: 'name', 
        key: 'name',
        render: (text: string, record: WorkorderDetail) => (
          <div>
            <Text strong>{text}</Text>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {/* Рендерим атрибуты (Цвет, Размер и т.д.) */}
              {record.attr_json?.map(attr => (
                <span key={attr.id} style={{ marginRight: 8 }}>
                  {attr.name}: {attr.value}
                </span>
              ))}
            </div>
          </div>
        )
    },
    { title: t('workorder.counterpartiesname'), dataIndex: 'counterpartiesname', key: 'counterpartiesname'},
   { title: t('workorder.sendwhatsapp'), dataIndex: 'sendwhatsapp', key: 'sendwhatsapp'},
   
    { title: t('workorder.qty'), dataIndex: 'units', key: 'units', align: 'right' as const },
     { 
        title: t('workorder.price'), 
        dataIndex: 'purchaseprice', 
        key: 'purchaseprice',
        render: (val: number) => val?.toLocaleString() 
    },
    { 
        title: t('workorder.total'), 
        key: 'total',
        align: 'right' as const,
        render: (_, record: WorkorderDetail) => (record.units * record.purchaseprice).toLocaleString()
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record: WorkorderDetail) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => handleDeleteDetail(record.product)}
        />
      ),
    },
  ];

  return (
    <>
    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          type="primary" 
          size="small" 
          icon={<PlusOutlined />} 
          onClick={() => setIsAddModalVisible(true)}
        >
          {t('workorder.common.add')}
        </Button>
      </div>
    <Table
      columns={columns}
      dataSource={details}
      rowKey={(record) => `${record.product}-${record.code}`}
      pagination={false}
      loading={loading}
      size="small"
      style={{ backgroundColor: '#fafafa', padding: '8px' }}
    />
    <AddDetailModal 
        visible={isAddModalVisible}
        workorderId={workorderId}
        point={point}
        counterparty={counterparty}
        onCancel={() => setIsAddModalVisible(false)}
        onSuccess={() => {
          setIsAddModalVisible(false);
          fetchDetails(); // Обновляем таблицу после добавления
        }}
      />
    </>
  );
};

export default WorkorderDetailsTable;