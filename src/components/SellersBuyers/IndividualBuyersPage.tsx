import React, { useEffect, useState } from 'react';
import { Tabs, Button, Table, Space, Modal, message, Input, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import useApiRequest from '../../hooks/useApiRequest';
import IndividualBuyerFormModal from './IndividualBuyerFormModal';
import styles from './LegalBuyersPage.module.css';

interface Buyer {
  id?: string;
  telephone: string;
  lastname: string;
  firstname: string;
  deleted: boolean;
  company?: string;
  debt?: number;
}


const IndividualBuyersPage: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  const [activeBuyers, setActiveBuyers] = useState<Buyer[]>([]);
  const [inactiveBuyers, setInactiveBuyers] = useState<Buyer[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit' | null>(null);
  const [search, setSearch] = useState('');

  const loadBuyers = async () => {
    try {
      const [active, inactive] = await Promise.all([
        sendRequest(`${import.meta.env.VITE_API_URL}/api/buyers/fizcustomers`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
        sendRequest(`${import.meta.env.VITE_API_URL}/api/buyers/fizcustomers/inactive`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
      ]);
      setActiveBuyers(active);
      setInactiveBuyers(inactive);
      setSelectedBuyer(null);
    } catch (err) {
      message.error(t('individualBuyers.loadingError'));
    }
  };

  useEffect(() => {
    loadBuyers();
  }, []);

  const handleDelete = async () => {
    if (!selectedBuyer) return;

    Modal.confirm({
      title: t('individualBuyers.confirmDeleteTitle'),
      content: t('individualBuyers.confirmDeleteContent'),
      okType: 'danger',
      onOk: async () => {
        try {
          const payload = {
            customers: {
              ...selectedBuyer,
              deleted: true,
            },
          };
          await sendRequest(`${import.meta.env.VITE_API_URL}/api/buyers/fizcustomers/manage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
            },
            body: JSON.stringify(payload),
          });
          message.success(t('individualBuyers.buyerDeleted'));
          loadBuyers();
        } catch (err) {
          message.error(t('individualBuyers.deleteError'));
        }
      },
    });
  };

  const handleActivate = async () => {
    if (!selectedBuyer) return;

    const payload = {
      customers: {
        ...selectedBuyer,
        deleted: false,
      },
    };

    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/buyers/fizcustomers/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      message.success(t('individualBuyers.activateSuccess'));
      loadBuyers();
    } catch (err) {
      message.error(t('individualBuyers.activateError'));
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value.toLowerCase());
  };

  const filteredData = (activeTab === 'active' ? activeBuyers : inactiveBuyers).filter(
    buyer =>
      buyer.lastname.toLowerCase().includes(search) || buyer.firstname.includes(search) || buyer.telephone.includes(search)
  );

  const columns = [
    {
      title: t('individualBuyers.firstname'),
      dataIndex: 'firstname',
    },
    {
      title: t('individualBuyers.lastname'),
      dataIndex: 'lastname',
    },
    {
      title: t('individualBuyers.telephone'),
      dataIndex: 'telephone',
    },
    ...(activeTab === 'inactive'
      ? [
          {
            title: t('individualBuyers.status'),
            render: () => <Tag color="red">{t('individualBuyers.deleted')}</Tag>,
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
          setSelectedBuyer(null);
          setSearch('');
        }}
        items={[
          { key: 'active', label: t('individualBuyers.activeBuyers') },
          { key: 'inactive', label: t('individualBuyers.inactiveBuyers') },
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
              {t('individualBuyers.add')}
            </Button>
            {selectedBuyer && (
              <>
                <Button
                  onClick={() => {
                    setEditMode('edit');
                    setModalVisible(true);
                  }}
                >
                  {t('individualBuyers.edit')}
                </Button>
                <Button danger onClick={handleDelete}>
                  {t('individualBuyers.delete')}
                </Button>
              </>
            )}
          </>
        )}

        {activeTab === 'inactive' && selectedBuyer && (
          <Button type="primary" onClick={handleActivate}>
            {t('individualBuyers.activate')}
          </Button>
        )}
      </Space>

      <Input.Search
        placeholder={t('individualBuyers.searchPlaceholder')}
        onChange={handleSearchChange}
        value={search}
        allowClear
        className={styles.searchInput}
      />

      <Table
        rowKey="id"
        dataSource={filteredData}
        columns={columns}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedBuyer ? [selectedBuyer.id!] : [],
          onChange: (_, [row]) => setSelectedBuyer(row),
        }}
        pagination={false}
      />

      {modalVisible && (
        <IndividualBuyerFormModal
          visible={modalVisible}
          mode={editMode!}
          buyer={editMode === 'edit' ? selectedBuyer : null}
          onCancel={() => {
            setModalVisible(false);
            setEditMode(null);
          }}
          onSuccess={() => {
            setModalVisible(false);
            setEditMode(null);
            loadBuyers();
          }}
        />
      )}
    </div>
  );
};

export default IndividualBuyersPage;
