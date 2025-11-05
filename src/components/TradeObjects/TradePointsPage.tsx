import React, { useEffect, useState } from 'react';
import { Tabs, Button, Table, Modal, message, Form, Input, Switch, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './WarehousePage.module.css';

import useApiRequest from '../../hooks/useApiRequest';

interface TradePoint {
  id?: string;
  name: string;
  address: string;
  is_minus: boolean | string;
  point_type: number;
  point_type_name?: string;
  status?: string;
}

const TradePointsPage: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  const [activePoints, setActivePoints] = useState<TradePoint[]>([]);
  const [inactivePoints, setInactivePoints] = useState<TradePoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<TradePoint | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    try {
      const [active, inactive] = await Promise.all([
        sendRequest(`${import.meta.env.VITE_API_URL}/api/point`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
        sendRequest(`${import.meta.env.VITE_API_URL}/api/point/inactive`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
      ]);
      setActivePoints(active);
      setInactivePoints(inactive);
      setSelectedPoint(null);
    } catch {
      message.error(t('tradePoint.messages.loadingError'));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

 const handleAdd = () => {
  form.resetFields();
  setSelectedPoint(null);  // обязательно сбрасываем, чтобы не воспринималось как редактирование
  setModalVisible(true);
};

  const handleEdit = () => {
    if (!selectedPoint) return;
    form.setFieldsValue({
      ...selectedPoint,
      is_minus: Boolean(selectedPoint.is_minus),
    });
    setModalVisible(true);
  };

const handleModalOk = async () => {
  try {
    const values = await form.validateFields();

    const payload: TradePoint = {
      ...values,
      is_minus: values.is_minus ? '1' : '0',
      point_type: 2,
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    };

    if (selectedPoint) {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/point/change`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          point: {
            ...payload,
            id: selectedPoint.id,
            point_type_name: 'Торговая точка',
            status: 'ACTIVE',
          },
        }),
      });
      message.success(t('tradePoint.messages.updated'));
    } else {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/point/manage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ point: payload }),
      });
      message.success(t('tradePoint.messages.added'));
    }

    setModalVisible(false);
    setSelectedPoint(null);
    loadData();
  } catch {
    message.error(t('tradePoint.messages.saveError'));
  }
};


  const handleActivate = async () => {
  if (!selectedPoint) return;

  try {
    await sendRequest(`${import.meta.env.VITE_API_URL}/api/point/change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // ВАЖНО!!!
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
      body: JSON.stringify({
        point: {
          ...selectedPoint,
          status: 'ACTIVE',
          point_type_name: 'Торговая точка',
        },
      }),
    });

    message.success(t('tradePoint.messages.activated'));
    setSelectedPoint(null);
    loadData();
  } catch {
    message.error(t('tradePoint.messages.activationError'));
  }
};

  const dataToRender = activeTab === 'active' ? activePoints : inactivePoints;

  const columns = [
    {
      title: t('tradePoint.fields.name'),
      dataIndex: 'name',
    },
    {
      title: t('tradePoint.fields.address'),
      dataIndex: 'address',
    },
    {
      title: t('tradePoint.fields.minusAccounting'),
      dataIndex: 'is_minus',
      render: (value: boolean | string) =>
        value === true || value === '1' ? t('tradePoint.misc.yes') : t('tradePoint.misc.no'),
    },
    ...(activeTab === 'inactive'
    ? [
        {
          title: t('tradePoint.fields.status'),
          dataIndex: 'status',
          render: (value: string) =>
            value === 'CLOSE' || value === 'INACTIVE' ? (
              <span className={styles.statusDeleted}>{t('tradePoint.misc.deleted')}</span>
            ) : (
              value
            ),
        },
      ]
    : []),
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as 'active' | 'inactive');
          setSelectedPoint(null);
        }}
        items={[
          { key: 'active', label: t('tradePoint.tabs.active') },
          { key: 'inactive', label: t('tradePoint.tabs.inactive') },
        ]}
      />

      <Space className={styles.buttonBar}>
        {activeTab === 'active' && (
          <>
            <Button type="primary" onClick={handleAdd}>
              {t('tradePoint.buttons.add')}
            </Button>
            {selectedPoint && (
              <Button onClick={handleEdit}>
                {t('tradePoint.buttons.edit')}
              </Button>
            )}
          </>
        )}
        {activeTab === 'inactive' && selectedPoint && (
          <Button type="primary" onClick={handleActivate}>
            {t('tradePoint.buttons.activate')}
          </Button>
        )}
      </Space>

      <Table
        rowKey="id"
        dataSource={dataToRender}
        columns={columns}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedPoint ? [selectedPoint.id!] : [],
          onChange: (_, [row]) => setSelectedPoint(row),
        }}
        pagination={false}
      />

      <Modal
        open={modalVisible}
        title={selectedPoint ? t('tradePoint.modal.editTitle') : t('tradePoint.modal.addTitle')}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        okText={t('tradePoint.buttons.save')}
        cancelText={t('tradePoint.buttons.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={t('tradePoint.fields.name')}
            name="name"
            rules={[{ required: true, message: t('tradePoint.misc.required') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t('tradePoint.fields.address')}
            name="address"
            rules={[{ required: true, message: t('tradePoint.misc.required') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t('tradePoint.fields.minusAccounting')}
            name="is_minus"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TradePointsPage;
