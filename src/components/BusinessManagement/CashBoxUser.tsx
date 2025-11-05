import React, { useEffect, useState } from 'react';
import { Button, Tabs, Table, message, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import CashBoxUserAddForm from './CashBoxUserAddForm';
import useApiRequest from '../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next';
import styles from './CashBoxUser.module.css';

interface CashBoxUserTableData {
  id: number;
  name: string;
  iin: string;
  role: number;
  point: number;
  discount?: boolean;
  discountperc?: number;
  roleName: string;
  pointName: string;
  deleted?: boolean;
}

type TabKey = 'active' | 'inactive';

const CashBoxUser: React.FC = () => {
  const [addVisible, setAddVisible] = useState<boolean>(false);
  const [activeUsers, setActiveUsers] = useState<CashBoxUserTableData[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<CashBoxUserTableData[]>([]);
  const [selectedRow, setSelectedRow] = useState<CashBoxUserTableData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [editUser, setEditUser] = useState<CashBoxUserTableData | null>(null);

  const { t } = useTranslation();
  const { loading: activeLoading, sendRequest: sendActiveUsersRequest } = useApiRequest<CashBoxUserTableData[]>();
  const { loading: inactiveLoading, sendRequest: sendInactiveUsersRequest } = useApiRequest<CashBoxUserTableData[]>();
  const { sendRequest: sendActionRequest } = useApiRequest();

  const baseColumns: ColumnsType<CashBoxUserTableData> = [
    {
      title: t('cashBoxUser.columns.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('cashBoxUser.columns.iin'),
      dataIndex: 'iin',
      key: 'iin',
    },
    {
      title: t('cashBoxUser.columns.role'),
      dataIndex: 'roleName',
      key: 'roleName',
    },
    {
      title: t('cashBoxUser.columns.point'),
      dataIndex: 'pointName',
      key: 'pointName',
    },
  ];

  const inactiveColumns: ColumnsType<CashBoxUserTableData> = [
    ...baseColumns,
    {
      title: t('cashBoxUser.columns.status'),
      dataIndex: 'deleted',
      key: 'deleted',
      render: (value: boolean) => (value ? t('cashBoxUser.status.deleted') : t('cashBoxUser.status.active')),
    },
  ];

  const fetchUsers = async () => {
    try {
      const [active, inactive] = await Promise.all([
        sendActiveUsersRequest(`${import.meta.env.VITE_API_URL}/api/cashboxuser`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
        sendInactiveUsersRequest(`${import.meta.env.VITE_API_URL}/api/cashboxuser/inactive`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
      ]);

      setActiveUsers(active);
      setInactiveUsers(inactive.map(user => ({ ...user, deleted: true })));
      setSelectedRow(null);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      message.error(t('cashBoxUser.notifications.apiError'));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async () => {
    if (!selectedRow) return;
    try {
      await sendActionRequest(`${import.meta.env.VITE_API_URL}/api/cashboxuser/manage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cashboxusr: { ...selectedRow, deleted: 1 } }),
      });
      message.success(t('cashBoxUser.notifications.userDeleted'));
      fetchUsers();
    } catch (err) {
      console.error(err);
      message.error(t('cashBoxUser.notifications.deleteError'));
    }
  };

  const handleActivate = async () => {
    if (!selectedRow) return;
    try {
      await sendActionRequest(`${import.meta.env.VITE_API_URL}/api/cashboxuser/manage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cashboxusr: selectedRow }),
      });
      message.success(t('cashBoxUser.notifications.userActivated'));
      fetchUsers();
    } catch (err) {
      console.error(err);
      message.error(t('cashBoxUser.notifications.activateError'));
    }
  };

  const handleEdit = () => {
    if (selectedRow) {
      setEditUser(selectedRow);
      setAddVisible(true);
    }
  };

  const renderActions = () => {
    if (!selectedRow) return null;

    return activeTab === 'active' ? (
      <>
        <Button onClick={handleEdit}>{t('cashBoxUser.buttons.edit')}</Button>
        <Button danger onClick={handleDelete}>{t('cashBoxUser.buttons.delete')}</Button>
      </>
    ) : (
      <Button type="primary" onClick={handleActivate}>
        {t('cashBoxUser.buttons.activate')}
      </Button>
    );
  };

  const getColumns = () => (activeTab === 'active' ? baseColumns : inactiveColumns);
  const getDataSource = () => (activeTab === 'active' ? activeUsers : inactiveUsers);
  const getLoading = () => (activeTab === 'active' ? activeLoading : inactiveLoading);

  const tabItems = [
    {
      key: 'active',
      label: t('cashBoxUser.tabs.active'),
      children: (
        <>
          <div className={styles.buttonsPanel}>
            <Space>
              <Button type="primary" onClick={() => setAddVisible(true)}>
                {t('cashBoxUser.buttons.add')}
              </Button>
              {selectedRow && renderActions()}
            </Space>
          </div>

          <Table
            rowKey="id"
            columns={getColumns()}
            dataSource={getDataSource()}
            loading={getLoading()}
            rowSelection={{
              type: 'radio',
              selectedRowKeys: selectedRow ? [selectedRow.id] : [],
              onChange: (_, selectedRows) => setSelectedRow(selectedRows[0]),
            }}
          />
        </>
      ),
    },
    {
      key: 'inactive',
      label: t('cashBoxUser.tabs.inactive'),
      children: (
        <>
          <div className={styles.buttonsPanel}>
            <Space>
              <Button type="primary" onClick={() => setAddVisible(true)}>
                {t('cashBoxUser.buttons.add')}
              </Button>
              {selectedRow && renderActions()}
            </Space>
          </div>

          <Table
            rowKey="id"
            columns={getColumns()}
            dataSource={getDataSource()}
            loading={getLoading()}
            rowSelection={{
              type: 'radio',
              selectedRowKeys: selectedRow ? [selectedRow.id] : [],
              onChange: (_, selectedRows) => setSelectedRow(selectedRows[0]),
            }}
          />
        </>
      ),
    },
  ];

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as TabKey);
          setSelectedRow(null);
        }}
        items={tabItems}
      />

      <CashBoxUserAddForm
        visible={addVisible}
        onCancel={() => {
          setAddVisible(false);
          setEditUser(null);
        }}
        onSuccess={() => {
          setAddVisible(false);
          setEditUser(null);
          fetchUsers();
        }}
        initialValues={
          editUser
            ? {
                id: editUser.id,
                name: editUser.name,
                iin: editUser.iin,
                role: editUser.role,
                point: editUser.point,
                discount: editUser.discount,
                discountperc: editUser.discountperc,
                allowDiscountManual: false,
                deleted: editUser.deleted,
              }
            : null
        }
      />
    </>
  );
};

export default CashBoxUser;
