import React, { useEffect, useState } from 'react';
import { Tabs, Button, Table, Space, Modal, message, Input, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import useApiRequest from '../../hooks/useApiRequest';
import LegalBuyerFormModal from './LegalBuyerFormModal';
import styles from './LegalBuyersPage.module.css';

interface Buyer {
  id?: string;
  name: string;
  bin: string;
  address: string;
  deleted: boolean;
  company?: string;
  debt?: number;
}

const LegalBuyersPage: React.FC = () => {
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
        sendRequest(`${import.meta.env.VITE_API_URL}/api/buyers`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
        sendRequest(`${import.meta.env.VITE_API_URL}/api/buyers/inactive`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
      ]);
      setActiveBuyers(active);
      setInactiveBuyers(inactive);
      setSelectedBuyer(null);
    } catch (err) {
      message.error(t('legalBuyers.loadingError'));
    }
  };

  useEffect(() => {
    loadBuyers();
  }, []);

  const handleDelete = async () => {
    if (!selectedBuyer) return;

    Modal.confirm({
      title: t('legalBuyers.confirmDeleteTitle'),
      content: t('legalBuyers.confirmDeleteContent'),
      okType: 'danger',
      onOk: async () => {
        try {
          const payload = {
            customers: {
              ...selectedBuyer,
              deleted: true,
            },
          };
          await sendRequest(`${import.meta.env.VITE_API_URL}/api/buyers/manage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
            },
            body: JSON.stringify(payload),
          });
          message.success(t('legalBuyers.buyerDeleted'));
          loadBuyers();
        } catch (err) {
          message.error(t('legalBuyers.deleteError'));
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
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/buyers/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      message.success(t('legalBuyers.activateSuccess'));
      loadBuyers();
    } catch (err) {
      message.error(t('legalBuyers.activateError'));
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value.toLowerCase());
  };

  const filteredData = (activeTab === 'active' ? activeBuyers : inactiveBuyers).filter(
    buyer =>
      buyer.name.toLowerCase().includes(search) || buyer.bin.includes(search)
  );

  const columns = [
    {
      title: t('legalBuyers.name'),
      dataIndex: 'name',
    },
    {
      title: t('legalBuyers.bin'),
      dataIndex: 'bin',
    },
    {
      title: t('legalBuyers.address'),
      dataIndex: 'address',
    },
    ...(activeTab === 'inactive'
      ? [
          {
            title: t('legalBuyers.status'),
            render: () => <Tag color="red">{t('legalBuyers.deleted')}</Tag>,
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
          { key: 'active', label: t('legalBuyers.activeBuyers') },
          { key: 'inactive', label: t('legalBuyers.inactiveBuyers') },
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
              {t('legalBuyers.add')}
            </Button>
            {selectedBuyer && (
              <>
                <Button
                  onClick={() => {
                    setEditMode('edit');
                    setModalVisible(true);
                  }}
                >
                  {t('legalBuyers.edit')}
                </Button>
                <Button danger onClick={handleDelete}>
                  {t('legalBuyers.delete')}
                </Button>
              </>
            )}
          </>
        )}

        {activeTab === 'inactive' && selectedBuyer && (
          <Button type="primary" onClick={handleActivate}>
            {t('legalBuyers.activate')}
          </Button>
        )}
      </Space>

      <Input.Search
        placeholder={t('legalBuyers.searchPlaceholder')}
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
        <LegalBuyerFormModal
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

export default LegalBuyersPage;
