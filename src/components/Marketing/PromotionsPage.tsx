import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Modal,
  Space,
  message,
  Tooltip,
  Typography,
  Spin,
} from 'antd';
import { InfoCircleOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import PromotionAddModal from './PromotionAddModal';
import styles from './PromotionsPage.module.css';

const { Text, Title } = Typography;

interface PromotionPoint {
  id: number;
  name: string;
  bdate: string;
  edate: string;
  priority: number;
  isactive: boolean;
}

interface PromotionGroup {
  point: string;
  pointname: string;
  points: PromotionPoint[];
}

interface PromotionDetailValue {
  id: number;
  name: string;
  value: number;
}

interface PromotionDetailsSection {
  id: number;
  values: PromotionDetailValue[];
}

interface PromotionDetailsResponse {
  if: PromotionDetailsSection;
  then: PromotionDetailsSection;
}

interface Point {
  id: string;
  name: string;
  address: string;
  point_type: number;
  point_type_name: string;
  is_minus: boolean;
  status: string;
}

interface OldPromotion {
  key: number;
  id: number;
  name: string;
  pointname: string;
  bdate: string;
  edate: string;
  priority: number;
}

const API_URL = import.meta.env.VITE_API_URL || '';

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
  'Content-Type': 'application/json',
});

const PromotionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  const [activePromotions, setActivePromotions] = useState<PromotionGroup[]>([]);
  const [oldPromotions, setOldPromotions] = useState<PromotionGroup[]>([]);
  const [points, setPoints] = useState<Point[]>([]);

  const [selectedActiveId, setSelectedActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [activeLoaded, setActiveLoaded] = useState(false);
  const [oldLoaded, setOldLoaded] = useState(false);
  const [pointsLoaded, setPointsLoaded] = useState(false);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [promotionDetails, setPromotionDetails] = useState<PromotionDetailsResponse | null>(null);
  const [detailPointName, setDetailPointName] = useState<string>('');
  const [detailPromotionName, setDetailPromotionName] = useState<string>('');

  const [open, setOpen] = useState(false);

  const fetchActivePromotions = async () => {
    setLoading(true);
    try {
      const data: PromotionGroup[] = await sendRequest(`${API_URL}/api/promotions?active=1`, { headers: getHeaders() });
      setActivePromotions(data);
      setActiveLoaded(true);
    } catch {
      message.error(t('promotions.errorLoadingActive'));
    } finally {
      setLoading(false);
    }
  };

  const fetchOldPromotions = async () => {
    setLoading(true);
    try {
      const data: PromotionGroup[] = await sendRequest(`${API_URL}/api/promotions?active=0`, { headers: getHeaders() });
      setOldPromotions(data);
      setOldLoaded(true);
    } catch {
      message.error(t('promotions.errorLoadingOld'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPoints = async () => {
    try {
      const data: Point[] = await sendRequest(`${API_URL}/api/point`, { headers: getHeaders() });
      setPoints(data);
      setPointsLoaded(true);
    } catch {
      message.error(t('promotions.errorLoadingPoints'));
    }
  };

  useEffect(() => {
    fetchActivePromotions();
  }, []);

  const handleTabChange = (key: string) => {
    if (key === 'active') {
      setSelectedActiveId(null);
      if (!activeLoaded) fetchActivePromotions();
    } else if (key === 'old') {
      if (!oldLoaded) fetchOldPromotions();
      if (!pointsLoaded) fetchPoints();
    }
  };

  const openDetailModal = async (id: number, pointName: string, promotionName: string) => {
    setDetailModalVisible(true);
    setDetailLoading(true);
    setPromotionDetails(null);
    setDetailPointName(pointName);
    setDetailPromotionName(promotionName);

    try {
      const details: PromotionDetailsResponse = await sendRequest(`${API_URL}/api/promotions/details?id=${id}`, { headers: getHeaders() });
      setPromotionDetails(details);
    } catch {
      message.error(t('promotions.errorLoadingDetails'));
      setDetailModalVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const deletePromotion = async () => {
    if (!selectedActiveId) return;
    try {
      const res = await sendRequest(`${API_URL}/api/promotions/del`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ id: selectedActiveId }),
      });
      if (res.code === 'success') {
        message.success(t('promotions.successDeleted'));
        setSelectedActiveId(null);
        setActiveLoaded(false);
        fetchActivePromotions();
        fetchOldPromotions();
      } else {
        message.error(t('promotions.errorDeleting'));
      }
    } catch {
      message.error(t('promotions.errorDeleting'));
    }
  };

  const renderActiveTable = () => {
    const dataSource: any[] = [];

    activePromotions.forEach(group => {
      dataSource.push({
        key: `group-${group.point}`,
        isGroup: true,
        pointname: group.pointname || t('promotions.noName'),
      });
      group.points.forEach(point => {
        dataSource.push({
          key: point.id,
          ...point,
          groupPointname: group.pointname || t('promotions.noName'),
        });
      });
    });

    const columns = [
      {
        title: t('promotions.priority'),
        dataIndex: 'priority',
        width: 100,
        render: (value: number, record: any) => (record.isGroup ? null : value),
      },
      {
        title: t('promotions.name'),
        dataIndex: 'name',
        render: (text: string, record: any) =>
          record.isGroup ? <Text strong>{record.pointname}</Text> : text,
      },
      {
        title: t('promotions.validityPeriod'),
        dataIndex: 'bdate',
        width: 200,
        render: (_, record: any) =>
          record.isGroup
            ? null
            : `${dayjs(record.bdate).format('DD.MM.YYYY')} — ${dayjs(record.edate).format('DD.MM.YYYY')}`,
      },
      {
        title: t('promotions.details'),
        dataIndex: 'details',
        width: 100,
        render: (_: any, record: any) =>
          record.isGroup ? null : (
            <Tooltip title={t('promotions.details')}>
              <Button
                type="link"
                icon={<InfoCircleOutlined />}
                onClick={() => openDetailModal(record.id, record.groupPointname, record.name)}
              />
            </Tooltip>
          ),
      },
    ];

    return (
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        rowClassName={(record: any) => (record.isGroup ? 'group-row' : '')}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedActiveId ? [selectedActiveId] : [],
          onChange: (keys) => setSelectedActiveId(keys.length > 0 ? Number(keys[0]) : null),
          getCheckboxProps: (record: any) => ({
            disabled: record.isGroup,
          }),
        }}
      />
    );
  };

  const oldDataSource: OldPromotion[] = [];
  oldPromotions.forEach(group => {
    group.points.forEach(point => {
      oldDataSource.push({
        key: point.id,
        id: point.id,
        name: point.name,
        pointname: group.pointname || '',
        bdate: point.bdate,
        edate: point.edate,
        priority: point.priority,
      });
    });
  });

  const oldColumns: ColumnsType<OldPromotion> = [
    {
      title: t('promotions.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('promotions.point'),
      dataIndex: 'pointname',
      key: 'pointname',
      filters: points.map(p => ({ text: p.name, value: p.name })),
      onFilter: (value, record) => record.pointname === value,
    },
    {
      title: t('promotions.validityPeriod'),
      dataIndex: 'bdate',
      key: 'bdate',
      render: (_, record) =>
        `${dayjs(record.bdate).format('DD.MM.YYYY')} — ${dayjs(record.edate).format('DD.MM.YYYY')}`,
    },
    {
      title: t('promotions.priority'),
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
    },
    {
      title: t('promotions.details'),
      key: 'details',
      width: 100,
      render: (_, record) => (
        <Tooltip title={t('promotions.details')}>
          <Button
            type="link"
            icon={<InfoCircleOutlined />}
            onClick={() => openDetailModal(record.id, record.pointname, record.name)}
          />
        </Tooltip>
      ),
    },
  ];

  const renderIfSection = () => {
    if (!promotionDetails) return null;

    const { if: ifSection } = promotionDetails;

    if (ifSection.id === 1 || ifSection.id === 3) {
      return (
        <Table
          size="small"
          dataSource={ifSection.values}
          rowKey="id"
          pagination={false}
          columns={[
            { title: t('promotions.productName'), dataIndex: 'name', key: 'name' },
            { title: t('promotions.quantity'), dataIndex: 'value', key: 'value' },
          ]}
        />
      );
    } else if (ifSection.id === 2) {
      const sum = ifSection.values.length > 0 ? ifSection.values[0].value.toFixed(2) : '0.00';
      return <Text>{t('promotions.requiredSum', { sum })}</Text>;
    }

    return null;
  };

  const renderThenSection = () => {
    if (!promotionDetails) return null;

    const { then: thenSection } = promotionDetails;

    if (thenSection.id === 1 || thenSection.id === 3) {
      return (
        <Table
          size="small"
          dataSource={thenSection.values}
          rowKey="id"
          pagination={false}
          columns={[
            { title: t('promotions.productName'), dataIndex: 'name', key: 'name' },
            { title: t('promotions.discount'), dataIndex: 'value', key: 'value' },
          ]}
        />
      );
    } else if (thenSection.id === 2) {
      const discount = thenSection.values.length > 0 ? thenSection.values[0].value.toFixed(2) : '0.00';
      return <Text>{t('promotions.discountSum', { discount })}</Text>;
    }

    return null;
  };

  const items = [
    {
      key: 'active',
      label: t('promotions.active'),
      children: (
        <>
          <Space className={styles.someSpaceClass}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              {t('promotions.add')}
            </Button>
            {selectedActiveId && (
              <Button danger icon={<DeleteOutlined />} onClick={deletePromotion}>
                {t('promotions.delete')}
              </Button>
            )}
          </Space>
          {loading ? <Spin /> : renderActiveTable()}
        </>
      ),
    },
    {
      key: 'old',
      label: t('promotions.old'),
      children: loading ? <Spin /> : <Table dataSource={oldDataSource} columns={oldColumns} pagination={{ pageSize: 10 }} />,
    },
  ];

  return (
    <div>
      <Tabs defaultActiveKey="active" items={items} onChange={handleTabChange} />

      <PromotionAddModal
        open={open}
        onClose={() => {
          setOpen(false);
          fetchActivePromotions();
        }}
        parentPromotions={activePromotions}
      />

      <Modal
        open={detailModalVisible}
        title={
          <>
            <Text strong>{t('promotions.promotion')}</Text> <Text>{detailPromotionName}</Text> — <Text strong>{detailPointName}</Text>
          </>
        }
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            {t('promotions.close')}
          </Button>,
        ]}
        onCancel={() => setDetailModalVisible(false)}
        width={700}
      >
        {detailLoading ? (
          <Spin />
        ) : (
          <>
            <Title level={5}>{t('promotions.condition')}</Title>
            {renderIfSection()}
            <div className={styles['margin-vertical-16']} />
            <Title level={5}>{t('promotions.promoProducts')}</Title>
            {renderThenSection()}
          </>
        )}
      </Modal>
    </div>
  );
};

export default PromotionsPage;
