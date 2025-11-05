import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  message,
  Select,
} from 'antd';
import { useTranslation } from 'react-i18next';  // добавлено
import useApiRequest from '../../hooks/useApiRequest';
import styles from './ScalesPage.module.css';

const { Option } = Select;

interface Warehouse {
  id: string;
  name: string;
  address: string;
  is_minus?: boolean;
  status: string;
  point_type: number;
  point_type_name: string;
  wholesale?: boolean;
}

interface Scale {
  id: string;
  name: string;
  deleted: boolean;
  point: string;
}

const ScalesPage: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  const [activeWarehouses, setActiveWarehouses] = useState<Warehouse[]>([]);
  const [inactiveWarehouses, setInactiveWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  const [scales, setScales] = useState<Scale[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [selectedScale, setSelectedScale] = useState<Scale | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit' | null>(null);
  const [form] = Form.useForm();

  // Загрузка складов
  const loadWarehouses = async () => {
    try {
      const [active, inactive] = await Promise.all([
        sendRequest(`${import.meta.env.VITE_API_URL}/api/stock`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
        sendRequest(`${import.meta.env.VITE_API_URL}/api/stock/inactive`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
      ]);
      setActiveWarehouses(active);
      setInactiveWarehouses(inactive);

      /*  if (active.length > 0) {
      setSelectedWarehouse(active[0]);
    } else if (inactive.length > 0) {
      setSelectedWarehouse(inactive[0]);
    } else {
      setSelectedWarehouse(null);
    }  */

      setSelectedWarehouse(null);
      setScales([]);
      setSelectedScale(null);
    } catch {
      message.error(t('scalesPage.messages.loadWarehousesError'));
    }
  };

  const loadScales = async (warehouseId: string) => {
    try {
      const data = await sendRequest(
        `${import.meta.env.VITE_API_URL}/api/productsweight/scales?point=${warehouseId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }
      );
      const scalesWithPoint = data.map((scale: any) => ({
        ...scale,
        point: warehouseId,
      }));
      setScales(scalesWithPoint);
      setSelectedScale(null);
    } catch {
      message.error(t('scalesPage.messages.loadScalesError'));
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

   useEffect(() => {
    if (selectedWarehouse) {
      loadScales(selectedWarehouse.id);
    } else {
      setScales([]);
      setSelectedScale(null);
    }
  }, [selectedWarehouse]); 

  const filteredScales = scales.filter((scale) =>
    activeTab === 'active' ? !scale.deleted : scale.deleted
  );

  const columns = [
    {
      title: t('scalesPage.fields.name'),
      dataIndex: 'name',
    },
    {
      title: t('scalesPage.fields.warehouse'),
      render: (_: any, record: Scale) => {
        const all = [...activeWarehouses, ...inactiveWarehouses];
        const warehouse = all.find((w) => w.id === record.point);
        return warehouse ? warehouse.name : '-';
      },
    },
    ...(activeTab === 'inactive'
      ? [
          {
            title: t('scalesPage.fields.status'),
            render: () => <span className={styles.deletedTag}>{t('scalesPage.misc.deleted')}</span>,
          },
        ]
      : []),
  ];

  const openModal = (mode: 'add' | 'edit') => {
    if (mode === 'edit' && !selectedScale) return;

    setEditMode(mode);
    form.resetFields();

    if (mode === 'edit' && selectedScale) {
      form.setFieldsValue({
        name: selectedScale.name,
        warehouseId: selectedScale.point || selectedWarehouse?.id,
      });
    } else if (selectedWarehouse) {
      form.setFieldsValue({ warehouseId: selectedWarehouse.id });
    }

    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const warehouseId = values.warehouseId;

      if (!warehouseId) {
        message.error(t('scalesPage.messages.selectWarehouse'));
        return;
      }

      const payload: any = {
        scale: {
          name: values.name,
          point: warehouseId,
          deleted: false,
        },
      };

      if (editMode === 'edit' && selectedScale) {
        payload.scale.id = selectedScale.id;
      }

      await sendRequest(`${import.meta.env.VITE_API_URL}/api/productsweight/update_scales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      message.success(
        editMode === 'add'
          ? t('scalesPage.messages.added')
          : t('scalesPage.messages.updated')
      );
      setModalVisible(false);
      setSelectedScale(null);

      const wh =
        [...activeWarehouses, ...inactiveWarehouses].find((w) => w.id === warehouseId) || null;
      setSelectedWarehouse(wh);
      if (warehouseId) loadScales(warehouseId);
    } catch {
      message.error(t('scalesPage.messages.saveError'));
    }
  };

  const handleDelete = async () => {
    if (!selectedScale || !selectedWarehouse) return;

    Modal.confirm({
      title: t('scalesPage.messages.confirmDeleteTitle'),
      content: t('scalesPage.messages.confirmDeleteContent', { name: selectedScale.name }),
      okType: 'danger',
      onOk: async () => {
        try {
          await sendRequest(`${import.meta.env.VITE_API_URL}/api/productsweight/update_scales`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
            },
            body: JSON.stringify({
              scale: {
                id: selectedScale.id,
                name: selectedScale.name,
                point: selectedWarehouse.id,
                deleted: true,
              },
            }),
          });
          message.success(t('scalesPage.messages.deleted'));
          setSelectedScale(null);
          loadScales(selectedWarehouse.id);
        } catch {
          message.error(t('scalesPage.messages.deleteError'));
        }
      },
    });
  };

  const handleActivate = async () => {
    if (!selectedScale || !selectedWarehouse) return;

    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/productsweight/update_scales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify({
          scale: {
            id: selectedScale.id,
            name: selectedScale.name,
            point: selectedWarehouse.id,
            deleted: false,
          },
        }),
      });
      message.success(t('scalesPage.messages.activated'));
      setSelectedScale(null);
      loadScales(selectedWarehouse.id);
    } catch {
      message.error(t('scalesPage.messages.activationError'));
    }
  };

  return (
    <div className={styles.container}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as 'active' | 'inactive');
          setSelectedScale(null);
        }}
        items={[
          { key: 'active', label: t('scalesPage.tabs.active') },
          { key: 'inactive', label: t('scalesPage.tabs.inactive') },
        ]}
      />

      <div className={styles.selectWrapper}>
        <Select
          placeholder={t('scalesPage.placeholders.selectWarehouse')}
          value={selectedWarehouse?.id || undefined}
          className={styles.selectInput}
          onChange={(value: string) => {
            const wh =
              [...activeWarehouses, ...inactiveWarehouses].find((w) => w.id === value) || null;
            setSelectedWarehouse(wh);
            setSelectedScale(null);
          }}
          allowClear
        >
          {[...activeWarehouses, ...inactiveWarehouses].map((wh) => (
            <Option key={wh.id} value={wh.id}>
              {wh.name}
            </Option>
          ))}
        </Select>
      </div>

      <Space className={styles.buttonBar}>
        {activeTab === 'active' && (
          <>
            <Button type="primary" onClick={() => openModal('add')}>
              {t('scalesPage.buttons.add')}
            </Button>
            {selectedScale && (
              <>
                <Button onClick={() => openModal('edit')}>
                  {t('scalesPage.buttons.edit')}
                </Button>
                <Button danger onClick={handleDelete}>
                  {t('scalesPage.buttons.delete')}
                </Button>
              </>
            )}
          </>
        )}
        {activeTab === 'inactive' && selectedScale && (
          <Button type="primary" onClick={handleActivate}>
            {t('scalesPage.buttons.activate')}
          </Button>
        )}
      </Space>

      <Table
        rowKey="id"
        dataSource={filteredScales}
        columns={columns}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedScale ? [selectedScale.id] : [],
          onChange: (_, [row]) => setSelectedScale(row),
        }}
        pagination={false}
      />

      <Modal
        title={
          editMode === 'add'
            ? t('scalesPage.modal.addTitle')
            : t('scalesPage.modal.editTitle')
        }
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        okText={t('scalesPage.buttons.save')}
        cancelText={t('scalesPage.buttons.cancel')}
      >
        <Form form={form} layout="vertical" name="scaleForm">
          <Form.Item
            name="name"
            label={t('scalesPage.fields.name')}
            rules={[{ required: true, message: t('scalesPage.misc.required') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="warehouseId"
            label={t('scalesPage.fields.warehouse')}
            rules={[{ required: true, message: t('scalesPage.misc.requiredWarehouse') }]}
          >
            <Select placeholder={t('scalesPage.placeholders.selectWarehouse')}>
              {[...activeWarehouses, ...inactiveWarehouses].map((wh) => (
                <Option key={wh.id} value={wh.id}>
                  {wh.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ScalesPage;
