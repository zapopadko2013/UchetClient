import React, { useEffect, useState } from 'react';
import { Tabs, Button, Table, Space, Modal, message, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import SupplierFormModal from './SupplierFormModal'; 
import styles from './SuppliersPage.module.css';

interface Supplier {
  id?: string;
  name: string;
  bin: string;
  email?: string | null;
  deleted: boolean;
  company?: string;
  address?: string | null;
  bank?: string | null;
  bik?: string | null;
  certificatenum?: string | null;
  certificateseries?: string | null;
  iik?: string | null;
  kbe?: string | null;
  country?: string;
}

const SuppliersPage: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  const [activeSuppliers, setActiveSuppliers] = useState<Supplier[]>([]);
  const [inactiveSuppliers, setInactiveSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit' | null>(null);

  const [search, setSearch] = useState('');

  const loadSuppliers = async () => {
    try {
      const [active, inactive] = await Promise.all([
        sendRequest(`${import.meta.env.VITE_API_URL}/api/counterparties`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
        sendRequest(`${import.meta.env.VITE_API_URL}/api/counterparties/inactive`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
      ]);
      setActiveSuppliers(active);
      setInactiveSuppliers(inactive);
      setSelectedSupplier(null);
    } catch (err) {
      message.error(t('suppliers.messages.loadError'));
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleDelete = async () => {
    if (!selectedSupplier) return;

    Modal.confirm({
      title: t('suppliers.buttons.delete'),
      content: t('suppliers.messages.confirmDeleteText') || 'Вы действительно хотите удалить поставщика?',
      okText: t('suppliers.buttons.delete'),
      cancelText: t('suppliers.buttons.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          const payload = {
            counterparties: {
              ...selectedSupplier,
              deleted: true,
            },
          };
          await sendRequest(`${import.meta.env.VITE_API_URL}/api/counterparties/manage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
            },
            body: JSON.stringify(payload),
          });
          message.success(t('suppliers.messages.deleteSuccess'));
          loadSuppliers();
        } catch (err) {
          message.error(t('suppliers.messages.deleteError') || 'Ошибка при удалении');
        }
      },
    });
  };

  const handleActivate = async () => {
    if (!selectedSupplier) return;

    const payload = {
      counterparties: {
        ...selectedSupplier,
        deleted: false,
      },
    };

    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/counterparties/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      message.success(t('suppliers.messages.activateSuccess'));
      loadSuppliers();
    } catch (err) {
      message.error(t('suppliers.messages.activateError') || 'Ошибка при активации');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value.toLowerCase());
  };

  const filteredData = (activeTab === 'active' ? activeSuppliers : inactiveSuppliers).filter(
    s =>
      s.name.toLowerCase().includes(search) ||
      s.bin.includes(search)
  );

  const baseColumns = [
    {
      title: t('suppliers.table.name'),
      dataIndex: 'name',
    },
    {
      title: t('suppliers.table.bin'),
      dataIndex: 'bin',
    },
    {
      title: t('suppliers.table.email'),
      dataIndex: 'email',
      render: (value: string) => value || '-',
    },
  ];

  const inactiveColumns = [
    ...baseColumns,
    {
      title: t('suppliers.table.status') || 'Статус',
      dataIndex: 'deleted',
      render: (deleted: boolean) =>
        deleted ? (
          <span className={styles.statusDeleted}>
            {t('suppliers.status.deleted') || 'Удалён'}
          </span>
        ) : (
          ''
        ),
    },
  ];

  return (
    <div className={styles.container}>
      <Tabs
        activeKey={activeTab}
        onChange={key => {
          setActiveTab(key as 'active' | 'inactive');
          setSelectedSupplier(null);
          setSearch('');
        }}
        items={[
          { key: 'active', label: t('suppliers.tabs.active') },
          { key: 'inactive', label: t('suppliers.tabs.inactive') },
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
              {t('suppliers.buttons.add')}
            </Button>
            {selectedSupplier && (
              <>
                <Button
                  onClick={() => {
                    setEditMode('edit');
                    setModalVisible(true);
                  }}
                >
                  {t('suppliers.buttons.edit')}
                </Button>
                <Button danger onClick={handleDelete}>
                  {t('suppliers.buttons.delete')}
                </Button>
              </>
            )}
          </>
        )}

        {activeTab === 'inactive' && selectedSupplier && (
          <Button type="primary" onClick={handleActivate}>
            {t('suppliers.buttons.activate')}
          </Button>
        )}
      </Space>

      <div className={styles.searchBar}>
        <Input.Search
          placeholder={t('suppliers.search.placeholder')}
          onChange={handleSearchChange}
          allowClear
          value={search}
        />
      </div>

      <Table
        rowKey="id"
        dataSource={filteredData}
        columns={activeTab === 'active' ? baseColumns : inactiveColumns}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedSupplier ? [selectedSupplier.id!] : [],
          onChange: (_, [row]) => setSelectedSupplier(row),
        }}
        pagination={false}
      />

      {modalVisible && (
        <SupplierFormModal
          visible={modalVisible}
          mode={editMode!}
          supplier={editMode === 'edit' ? selectedSupplier : null}
          onCancel={() => {
            setModalVisible(false);
            setEditMode(null);
          }}
          onSuccess={() => {
            setModalVisible(false);
            setEditMode(null);
            loadSuppliers();
          }}
        />
      )}
    </div>
  );
};

export default SuppliersPage;
