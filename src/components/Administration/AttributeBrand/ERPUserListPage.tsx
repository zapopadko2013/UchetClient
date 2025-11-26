import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Space, Tag, message } from 'antd';
import { ExclamationCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import type { ColumnsType } from 'antd/es/table';
import AddErpUserForm from './AddErpUserForm';
import ShowInactive from './ShowInactive';
import styles from './Atributte.module.css';

interface ErpUser {
  id: string | null;
  name: string;
  login: string | null;
  iin: string | null;
  company: string;
  accesses: { code: string | null; name: string }[];
  self?: boolean;
  _key?: string; // стабильный ключ
}

const ERPUserListPage: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const headers = {
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json'
  };

  const [erpUsers, setErpUsers] = useState<ErpUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<ErpUser | null>(null);
  const [reloadInactive, setReloadInactive] = useState(0);

  /** ---- Загрузка ERP пользователей ---- */
  const fetchErpUsers = async () => {
    setLoading(true);
    try {
      const data = await sendRequest(`${API_URL}/api/erpuser/all`, { headers });

      // Добавляем стабильный ключ
      const prepared = data.map((u: ErpUser) => ({
        ...u,
        _key: u.id || u.iin || u.login || crypto.randomUUID()
      }));

      setErpUsers(prepared);
    } catch (err) {
      console.error(err);
      message.error(t('erpusers.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErpUsers();
  }, []);

  /** ---- Удаление ---- */
  const handleDelete = (user: ErpUser) => {
    Modal.confirm({
      title: t('erpusers.confirmDelete'),
      icon: <ExclamationCircleOutlined />,
      okText: t('erpusers.common.yes'),
      cancelText: t('erpusers.common.cancel'),
      onOk: async () => {
        try {
          const req = {
            zapros: 'udalm_dan',
            type: 'erpuser',
            erpuser: [{ id: user.id, status: 'DISMISS' }]
          };

          await sendRequest(`${API_URL}/api/erpuser/toggle_erpusers`, {
            method: 'POST',
            headers,
            body: JSON.stringify(req)
          });

          setErpUsers(prev => prev.filter(u => u._key !== user._key));
          message.success(t('erpusers.deleted'));
          setReloadInactive(prev => prev + 1);
        } catch (err: any) {
          message.error(err?.response?.data?.text || t('erpusers.common.error'));
        }
      }
    });
  };

  /** ---- Открыть модальное ---- */
  const handleEdit = (user?: ErpUser) => {
    setEditingUser(user || null);
    setModalVisible(true);
  };

  /** ---- Закрыть ---- */
  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    fetchErpUsers();
  };

  /** ---- Таблица ---- */
  const columns: ColumnsType<ErpUser> = [
    { title: '№', render: (_: any, __: any, index: number) => index + 1 },

    { title: t('erpusers.userIDN'), dataIndex: 'iin' },
    { title: t('erpusers.userName'), dataIndex: 'name' },

    { title: t('erpusers.login'), dataIndex: 'login', render: v => v?.toUpperCase() },

    { title: t('erpusers.company'), dataIndex: 'company' },

    {
      title: t('erpusers.accessName'),
      dataIndex: 'accesses',
      render: (acc: any[]) =>
    acc?.length ? (
      <div className={styles.accessList}>
        {acc.map((a, i) => (
          /* <Tag key={`${a.code || 'acc'}-${i}`}>{a.name}</Tag> */
          <Tag key={`${a.code || 'acc'}_${i}`}>{a.name}</Tag>
        ))}
      </div>
    ) : (
      <i>{t('erpusers.noAccesses')}</i>
    )
    },

    {
      title: '',
      align: 'right',
      render: (_: any, record: ErpUser) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          {!record.self && (
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          )}
        </Space>
      )
    }
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3>{t('erpusers.list')}</h3>

        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleEdit()}>
          {t('erpusers.add')}
        </Button>
      </div>

      <Table
        loading={loading}
        columns={columns}
        dataSource={erpUsers}
        rowKey="_key"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1100 }}
      />

      <ShowInactive
        key={reloadInactive}
        mode="erpuser"
        callback={user => setErpUsers(prev => [...prev, user])}
      />

      <Modal
        open={modalVisible}
        title={editingUser ? t('erpusers.editUser') : t('erpusers.addUser')}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <AddErpUserForm
          location={{ state: { userData: editingUser } }}
          history={{ push: handleCloseModal }}
        />
      </Modal>
    </div>
  );
};

export default ERPUserListPage;
