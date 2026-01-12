import React, { useEffect, useState } from 'react';
import { PlusOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Space ,Table, Tag, Typography, message, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import AddDetailModal from './AddDetailModal'; 
import styles from './WorkordersPage.module.css';

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

interface CheaperItem {
  product_name: string;
  counterparty_name: string;
  address: string;
  invoicedate: string;
  my_order_price: number;
  cheaper_price: number;
  price_difference: number;
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

  const [cheaperItems, setCheaperItems] = useState<CheaperItem[]>([]);
  const [isCheaperModalVisible, setIsCheaperModalVisible] = useState(false);
  const [cheaperLoading, setCheaperLoading] = useState(false);

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

  //////
  const handleFindBetterPrices = async () => {
    setCheaperLoading(true);
    setIsCheaperModalVisible(true);
    try {
      const data = await sendRequest(`${API_URL}/api/workorder/check-better-prices?id=${workorderId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setCheaperItems(data || []);
    } catch (err) {
      console.error(err);
      message.error(t('workorder.analysis.error'));
    } finally {
      setCheaperLoading(false);
    }
  };

  const cheaperColumns = [
    { title: t('workorder.product.name'), dataIndex: 'product_name', key: 'product_name' },
    { 
      title: t('workorder.analysis.counterparty'), 
      dataIndex: 'counterparty_name', 
      key: 'counterparty_name',
      render: (text: string, record: CheaperItem) => (
        <span>{text} <br/><small className={styles.addressText}>{record.address}</small></span>
      )
    },
    { 
      title: t('workorder.analysis.docDate'), 
      dataIndex: 'invoicedate', 
      key: 'invoicedate',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    { 
      title: t('workorder.analysis.myPrice'), 
      dataIndex: 'my_order_price', 
      render: (v: number) => v.toLocaleString() 
    },
    { 
      title: t('workorder.analysis.cheaperPrice'), 
      dataIndex: 'cheaper_price', 
      render: (v: number) => <Text type="success" strong>{v.toLocaleString()}</Text> 
    },
    { 
      title: t('workorder.analysis.benefit'), 
      dataIndex: 'price_difference', 
      render: (v: number) => <Tag color="green">-{v.toLocaleString()}</Tag> 
    },
  ];

  /////

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
            <div className={styles.attributes}>
              {/* Рендерим атрибуты (Цвет, Размер и т.д.) */}
              {record.attr_json?.map(attr => (
                <span key={attr.id} className={styles.attributeItem}>
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
        title: t('workorder.price1'), 
        dataIndex: 'price', 
        key: 'price',
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
    <div className={styles.detailsToolbar}>
      <Space>
        <Button 
          type="primary" 
          size="small" 
          icon={<PlusOutlined />} 
          onClick={() => setIsAddModalVisible(true)}
        >
          {t('workorder.common.add')}
        </Button>

        <Button 
            size="small" 
            icon={<SearchOutlined />} 
            onClick={handleFindBetterPrices}
            className={styles.btnAnalysis}
          >
            {t('workorder.analysis.findCheaper')}
          </Button>
          </Space>
      </div>
    <Table
      columns={columns}
      dataSource={details}
      rowKey={(record) => `${record.product}-${record.code}`}
      pagination={false}
      loading={loading}
      size="small"
      className={styles.detailsTable}
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

      <Modal
        title={t('workorder.analysis.modalTitle')}
        open={isCheaperModalVisible}
        onCancel={() => setIsCheaperModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setIsCheaperModalVisible(false)}>
            {t('workorder.common.close')}
          </Button>
        ]}
      >
        <Table
          dataSource={cheaperItems}
          columns={cheaperColumns}
          loading={cheaperLoading}
          rowKey={(record) => `${record.product_name}-${record.cheaper_price}`}
          size="middle"
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </>
  );
};

export default WorkorderDetailsTable;