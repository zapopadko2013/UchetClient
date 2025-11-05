import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Button,
  Table,
  Modal,
  message,
  Form,
  Input,
  Select,
  Space,
} from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import styles from './CashDesksPage.module.css';
import CheckEditor from './CheckEditor';

const { Option } = Select;

interface Cashbox {
  id: string;
  name: string;
  point: string;
  point_name: string;
}

interface TradePoint {
  id: string;
  name: string;
}

const CashDesksPage: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  const [activeCashboxes, setActiveCashboxes] = useState<Cashbox[]>([]);
  const [inactiveCashboxes, setInactiveCashboxes] = useState<Cashbox[]>([]);
  const [selectedCashbox, setSelectedCashbox] = useState<Cashbox | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit' | null>(null);
  const [tradePoints, setTradePoints] = useState<TradePoint[]>([]);
  const [form] = Form.useForm();
  const [checkEditorVisible, setCheckEditorVisible] = useState(false);

  const loadData = async () => {
    try {
      const [active, inactive] = await Promise.all([
        sendRequest(`${import.meta.env.VITE_API_URL}/api/cashbox`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
        sendRequest(`${import.meta.env.VITE_API_URL}/api/cashbox/inactive`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
      ]);
      setActiveCashboxes(active);
      setInactiveCashboxes(inactive);
      setSelectedCashbox(null);
    } catch {
      message.error(t('cashDesksPage.messages.loadError'));
    }
  };

  const loadTradePoints = async () => {
    try {
      const points = await sendRequest(`${import.meta.env.VITE_API_URL}/api/point?pointtype=2`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
      });
      setTradePoints(points);
    } catch {
      message.error(t('cashDesksPage.messages.pointLoadError'));
    }
  };

  useEffect(() => {
    loadData();
    loadTradePoints();
  }, []);

  const handleAdd = () => {
    setEditMode('add');
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = () => {
    if (!selectedCashbox) return;
    setEditMode('edit');
    form.setFieldsValue({
      name: selectedCashbox.name,
      point: selectedCashbox.point,
    });
    setModalVisible(true);
  };

  const handleDelete = async () => {
  if (!selectedCashbox) return;

  Modal.confirm({
    title: t('cashDesksPage.messages.confirmDeleteTitle') || 'Удалить кассу?',
    content: t('cashDesksPage.messages.confirmDeleteContent', { name: selectedCashbox.name }) || `Вы уверены, что хотите удалить кассу "${selectedCashbox.name}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        /* const payload = {
          cashbox: [
            {
              id: selectedCashbox.id,
              name: selectedCashbox.name,
              point: selectedCashbox.point,
              point_name: selectedCashbox.point_name,
              deleted: 1
            }
          ],
          toggle: true
        }; */

        const payload = {
          cashbox: 
            {
              id: selectedCashbox.id,
              name: selectedCashbox.name,
              point: selectedCashbox.point,
              point_name: selectedCashbox.point_name,
              deleted: 1
            }
          ,
          toggle: true
        };

        await sendRequest(`${import.meta.env.VITE_API_URL}/api/cashbox/manage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
          },
          body: JSON.stringify(payload)
        });

        message.success(t('cashDesksPage.messages.deleted'));
        setSelectedCashbox(null);
        loadData(); 
      } catch (error) {
        console.error(error);
        message.error(t('cashDesksPage.messages.deleteError'));
      }
    }
  });
};

  const handleActivate = async () => {
    if (!selectedCashbox) return;
    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/cashbox/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify({
          cashbox: {
            id: selectedCashbox.id,
            name: selectedCashbox.name,
            point: selectedCashbox.point,
            point_name: selectedCashbox.point_name,
            deleted: 0,
          },
          toggle: true,
        }),
      });
      message.success(t('cashDesksPage.messages.activated'));
      loadData();
    } catch {
      message.error(t('cashDesksPage.messages.activateError'));
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        cashbox: {
          name: values.name,
          point: values.point,
        },
      };

      if (editMode === 'edit' && selectedCashbox) {
        Object.assign(payload.cashbox, {
          id: selectedCashbox.id,
          point_name: selectedCashbox.point_name,
        });
      }

      await sendRequest(`${import.meta.env.VITE_API_URL}/api/cashbox/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      message.success(
        editMode === 'add'
          ? t('cashDesksPage.messages.added')
          : t('cashDesksPage.messages.updated')
      );
      setModalVisible(false);
      loadData();
    } catch {
      message.error(t('cashDesksPage.messages.saveError'));
    }
  };

  const columns = [
    {
      title: t('cashDesksPage.fields.name'),
      dataIndex: 'name',
    },
    {
      title: t('cashDesksPage.fields.point'),
      dataIndex: 'point_name',
    },
    ...(activeTab === 'inactive'
      ? [
          {
            title: t('cashDesksPage.fields.status'),
            render: () => <span className={styles.deletedTag}>{t('cashDesksPage.misc.deleted')}</span>,
          },
        ]
      : []),
  ];

  return (
    <div className={styles.container}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as 'active' | 'inactive');
          setSelectedCashbox(null);
        }}
        items={[
          { key: 'active', label: t('cashDesksPage.tabs.active') },
          { key: 'inactive', label: t('cashDesksPage.tabs.inactive') },
        ]}
      />

      <Space className={styles.buttonBar}>

        {activeTab === 'active' && (
          <>

            <Button onClick={() => setCheckEditorVisible(true)}>
               {t('cashDesksPage.buttons.editCheck')}
            </Button>

            <Button type="primary" onClick={handleAdd}>{t('cashDesksPage.buttons.add')}</Button>
            {selectedCashbox && (
              <>
                <Button onClick={handleEdit}>{t('cashDesksPage.buttons.edit')}</Button>
                <Button danger onClick={handleDelete}>{t('cashDesksPage.buttons.delete')}</Button>
              </>
            )}
          </>
        )}
        {activeTab === 'inactive' && selectedCashbox && (
          <Button type="primary" onClick={handleActivate}>
            {t('cashDesksPage.buttons.activate')}
          </Button>
        )}
      </Space>

      <Table
        rowKey="id"
        dataSource={activeTab === 'active' ? activeCashboxes : inactiveCashboxes}
        columns={columns}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedCashbox ? [selectedCashbox.id] : [],
          onChange: (_, [row]) => setSelectedCashbox(row),
        }}
        pagination={false}
      />

      <Modal
        title={
          editMode === 'add'
            ? t('cashDesksPage.modal.addTitle')
            : t('cashDesksPage.modal.editTitle')
        }
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        okText={t('cashDesksPage.buttons.save')}
        cancelText={t('cashDesksPage.buttons.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('cashDesksPage.fields.name')}
            rules={[{ required: true, message: t('cashDesksPage.messages.nameRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="point"
            label={t('cashDesksPage.fields.point')}
            rules={[{ required: true, message: t('cashDesksPage.messages.pointRequired') }]}
          >
            <Select placeholder={t('cashDesksPage.placeholders.selectPoint')}>
              {tradePoints.map((point) => (
                <Option key={point.id} value={point.id}>
                  {point.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <CheckEditor
  visible={checkEditorVisible}
  onClose={() => setCheckEditorVisible(false)}
   t={t}
/>
    </div>
  );
};

export default CashDesksPage;
