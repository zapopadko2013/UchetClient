import React, { useEffect, useState } from 'react';
import { Tabs, Button, Table, Space, message, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import styles from './UserProgram.module.css';
import UserFormModal from './UserFormModal';
import UserAccessEditor from './UserAccessEditor';

interface Role {
  id: string;
  name: string;
}

interface Access {
  id: number;
  code: string;
  name: string;
}

interface User {
  id?: string;
  login: string;
  iin: string;
  name: string;
  status: string;
  accesses: Access[];
  roles: Role[] | string; // Может быть строкой (JSON) или объектом
}

const UserProgram: React.FC = () => {
  const { t } = useTranslation();
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit' | null>(null);
  const [viewAccessesUser, setViewAccessesUser] = useState<User | null>(null);
  const [accessEditorVisible, setAccessEditorVisible] = useState(false);
  const [justCreatedUserData, setJustCreatedUserData] = useState<User | null>(null);
  const [isNewUserPendingAccessSetup, setIsNewUserPendingAccessSetup] = useState(false);

  const { sendRequest } = useApiRequest();

  const loadData = async () => {
    try {
      const [active, inactive] = await Promise.all([
        sendRequest(`${import.meta.env.VITE_API_URL}/api/erpuser`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
        sendRequest(`${import.meta.env.VITE_API_URL}/api/erpuser/inactive`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
      ]);
      setActiveUsers(active);
      setInactiveUsers(inactive);
      setSelectedUser(null);
    } catch (error) {
      message.error(t('userProgram.loadError'));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Открываем редактор доступов после добавления пользователя
  useEffect(() => {
    if (justCreatedUserData) {
      setSelectedUser(justCreatedUserData);
      setAccessEditorVisible(true);
      setJustCreatedUserData(null);
    }
  }, [justCreatedUserData]);

  const handleDelete = async () => {
    if (!selectedUser) return;

    Modal.confirm({
      title: t('userProgram.confirmDelete'),
      content: t('userProgram.confirmDeleteText'),
      okText: t('userProgram.confirm'),
      cancelText: t('userProgram.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          await sendRequest(`${import.meta.env.VITE_API_URL}/api/erpuser/new-manage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
            },
            body: JSON.stringify({
              erpusr: {
                id: selectedUser.id,
                name: selectedUser.name,
                iin: selectedUser.iin,
                login: selectedUser.login,
                status: 'DISMISS',
                roles: [],
                accesses: selectedUser.accesses || [],
              },
            }),
          });

          message.success(t('userProgram.deleteSuccess'));
          loadData();
        } catch (err) {
          console.error(err);
          message.error(t('userProgram.deleteError'));
        }
      },
    });
  };

  const handleActivate = async () => {
    if (!selectedUser) return;
    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/erpuser/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify({
          erpusr: {
            id: selectedUser.id,
            login: selectedUser.login,
            name: selectedUser.name,
            iin: selectedUser.iin,
            status: 'ACTIVE',
            roles: [],
          },
        }),
      });
      message.success(t('userProgram.userActivated'));
      loadData();
    } catch (err) {
      message.error(t('userProgram.activateError'));
    }
  };

  const columns = [
    {
      title: t('userProgram.fullName'),
      dataIndex: 'name',
    },
    {
      title: t('userProgram.iin'),
      dataIndex: 'iin',
    },
    {
      title: t('userProgram.login'),
      dataIndex: 'login',
    },
    {
      title: t('userProgram.accesses'),
      render: (_: any, record: User) => {
        const namedAccesses = (record.accesses || []).filter(a => a.name?.trim());

        if (namedAccesses.length === 0) {
          return <span>{t('userProgram.noAccesses')}</span>;
        }

        const visibleAccesses = namedAccesses.slice(0, 2).map(a => a.name);
        const hasMore = namedAccesses.length > 2;

        return (
          <div>
            <div>{visibleAccesses.join(', ')}</div>
            {hasMore && (
              <a onClick={() => setViewAccessesUser(record)}>
                {t('userProgram.viewAllAccesses')}
              </a>
            )}
          </div>
        );
      },
    },
    ...(activeTab === 'inactive'
      ? [
          {
            title: t('userProgram.status'),
            dataIndex: 'status',
            render: () => t('userProgram.deleted'),
          },
        ]
      : []),
  ];

  const getData = () => (activeTab === 'active' ? activeUsers : inactiveUsers);

  return (
    <div className={styles.container}>
      <Tabs
        activeKey={activeTab}
        onChange={key => {
          setActiveTab(key as 'active' | 'inactive');
          setSelectedUser(null);
        }}
        items={[
          { key: 'active', label: t('userProgram.activeUsers') },
          { key: 'inactive', label: t('userProgram.inactiveUsers') },
        ]}
      />

      <Space className={styles.buttonBar}>
        {activeTab === 'active' && (
          <>
            <Button
              type="primary"
              onClick={() => {
                setEditMode('add');
                setModalVisible(true);
              }}
            >
              {t('userProgram.add')}
            </Button>
            {selectedUser && (
              <>
                <Button
                  onClick={() => {
                    setEditMode('edit');
                    setModalVisible(true);
                  }}
                >
                  {t('userProgram.edit')}
                </Button>
                <Button onClick={() => setAccessEditorVisible(true)}>
                  {t('userProgram.editAccesses')}
                </Button>
                <Button danger onClick={handleDelete}>
                  {t('userProgram.delete')}
                </Button>
              </>
            )}
          </>
        )}
        {activeTab === 'inactive' && selectedUser && (
          <Button type="primary" onClick={handleActivate}>
            {t('userProgram.activate')}
          </Button>
        )}
      </Space>

      <Table
        rowKey="id"
        dataSource={getData()}
        columns={columns}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedUser ? [selectedUser.id!] : [],
          onChange: (_, [row]) => setSelectedUser(row),
        }}
        pagination={false}
      />

      {modalVisible && (
        <UserFormModal
          visible={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            setEditMode(null);
            setSelectedUser(null);
          }}
         /*  onSuccess={(result) => {
            setModalVisible(false);
            setEditMode(null);
            if (editMode === 'add') {
              setJustCreatedUserData(result); // открываем редактор доступов после добавления
               setIsNewUserPendingAccessSetup(true);
            } else {
              loadData(); // при редактировании просто обновляем
              setSelectedUser(null);
            }
          }} */
         
         onSuccess={(result) => {
         setModalVisible(false);
         if (editMode === 'add') {
           setJustCreatedUserData(result);
           setIsNewUserPendingAccessSetup(true); // 💡 сохраняем флаг
         } else {
           loadData();
           setSelectedUser(null);
         }
         setEditMode(null);
         }}
            user={editMode === 'edit' ? selectedUser : null}
        />
      )}

      {selectedUser && accessEditorVisible && (
        <UserAccessEditor
          user={{
            id: selectedUser.id || '',
            name: selectedUser.name || '',
            iin: selectedUser.iin || '',
            login: selectedUser.login || '',
            status: selectedUser.status || '',
            roles:
              typeof selectedUser.roles === 'string'
                ? selectedUser.roles
                : JSON.stringify(selectedUser.roles || []),
          }}
          visible={true}
          /* onClose={() => setAccessEditorVisible(false)}
          onSuccess={() => {
            setAccessEditorVisible(false);
            loadData();
            setSelectedUser(null);
          }} */
         onClose={() => {
      setAccessEditorVisible(false);
      setIsNewUserPendingAccessSetup(false); // сбрасываем
    }}
    onSuccess={() => {
      setAccessEditorVisible(false);
      setIsNewUserPendingAccessSetup(false); // сбрасываем
      loadData();
      setSelectedUser(null);
    }}
          isNew={isNewUserPendingAccessSetup}// флаг для нового пользователя
        />
      )}

      <Modal
        open={!!viewAccessesUser}
        onCancel={() => setViewAccessesUser(null)}
        footer={null}
        title={t('userProgram.fullAccesses')}
      >
        <ul>
          {viewAccessesUser?.accesses.map(a => (
            <li key={a.id}>{a.name}</li>
          ))}
        </ul>
      </Modal>
    </div>
  );
};

export default UserProgram;
