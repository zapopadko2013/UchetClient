import React, { useEffect, useState } from 'react';
import { Table, Tabs, Button, message, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import SalesPlanForm from './SalesPlanForm';
import useApiRequest from '../../hooks/useApiRequest';
import styles from './SalesPlan.module.css';

interface PlanData {
  id: string;
  name: string;
  pointName?: string;
  daily: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  drate: number;
  mrate: number;
  qrate: number;
  yrate: number;
  type: number;
}

const SalesPlan: React.FC = () => {
  const { t } = useTranslation();
  const [individualPlans, setIndividualPlans] = useState<PlanData[]>([]);
  const [teamPlans, setTeamPlans] = useState<PlanData[]>([]);
  const [selectedRow, setSelectedRow] = useState<PlanData | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'team'>('individual');
  const [formVisible, setFormVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);

  const { sendRequest: fetchIndividualPlans } = useApiRequest<PlanData[]>();
  const { sendRequest: fetchTeamPlans } = useApiRequest<PlanData[]>();
  const { sendRequest: sendActionRequest } = useApiRequest();

  const loadData = async () => {
    try {
      const [indRes, teamRes] = await Promise.all([
        fetchIndividualPlans(`${import.meta.env.VITE_API_URL}/api/salesplan/cashboxuser`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
        fetchTeamPlans(`${import.meta.env.VITE_API_URL}/api/salesplan/point`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
      ]);
      setIndividualPlans(indRes);
      setTeamPlans(teamRes);
      setSelectedRow(null);
    } catch (error) {
      console.error(error);
      message.error(t('salesPlan.loadError'));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!selectedRow) return;
    try {
      const body = {
        plan: {
          object: selectedRow.id,
        },
      };

      await sendActionRequest(`${import.meta.env.VITE_API_URL}/api/salesplan/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(body),
      });

      message.success(t('salesPlan.planDeleted'));
      loadData();
    } catch (err) {
      message.error(t('salesPlan.deleteError'));
    }
  };

  const format = (value: number, rate: number) => {
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₸ | ${rate}%`;
  };

  const getColumns = (): ColumnsType<PlanData> => {
    const common = [
      {
        title: t('salesPlan.daily'),
        render: (_: any, r: PlanData) => format(r.daily, r.drate),
      },
      {
        title: t('salesPlan.monthly'),
        render: (_: any, r: PlanData) => format(r.monthly, r.mrate),
      },
      {
        title: t('salesPlan.quarterly'),
        render: (_: any, r: PlanData) => format(r.quarterly, r.qrate),
      },
    ];

    if (activeTab === 'individual') {
      return [
        { title: t('salesPlan.cashierName'), dataIndex: 'name', key: 'name' },
        { title: t('salesPlan.pointName'), dataIndex: 'pointName', key: 'pointName' },
        ...common,
      ];
    } else {
      return [
        { title: t('salesPlan.pointTitle'), dataIndex: 'name', key: 'name' },
        ...common,
      ];
    }
  };

  const getDataSource = () => (activeTab === 'individual' ? individualPlans : teamPlans);

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'individual' | 'team');
    setSelectedRow(null);
  };

  return (
    <>
      {/* Панель вкладок с новым API */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          { key: 'individual', label: t('salesPlan.individualPlans') },
          { key: 'team', label: t('salesPlan.teamPlans') },
        ]}
      />

      {/* Кнопки под вкладками */}
      <Space className={styles['action-buttons']}>
        <Button
          type="primary"
          onClick={() => {
            setEditingPlan(null);
            setFormVisible(true);
          }}
        >
          {t('salesPlan.add')}
        </Button>

        {selectedRow && (
          <>
            <Button
              onClick={() => {
                setEditingPlan(selectedRow);
                setFormVisible(true);
              }}
            >
              {t('salesPlan.edit')}
            </Button>
            <Button danger onClick={handleDelete}>
              {t('salesPlan.delete')}
            </Button>
          </>
        )}
      </Space>

      {/* Таблица */}
      <Table
        rowKey="id"
        columns={getColumns()}
        dataSource={getDataSource()}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedRow ? [selectedRow.id] : [],
          onChange: (_, [row]) => setSelectedRow(row),
        }}
        pagination={false}
      />

      {/* Модальная форма */}
      <SalesPlanForm
        visible={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setEditingPlan(null);
        }}
        onSuccess={() => {
          setFormVisible(false);
          setEditingPlan(null);
          loadData();
        }}
        initialValues={editingPlan}
        type={activeTab}
      />
    </>
  );
};

export default SalesPlan;
