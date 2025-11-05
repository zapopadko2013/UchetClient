import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Tag,
  message,
  Space,
  Alert,
  Tooltip,
  Select,Modal,  InputNumber, Form,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { InfoCircleOutlined } from '@ant-design/icons';
import styles from './DiscountsPage.module.css';
import useApiRequest from '../../hooks/useApiRequest';
import ProductBarcodeSearch from '../ProductBarcodeSearch';
import DiscountAddModal from './DiscountAddModal';


const { TabPane } = Tabs;
const { Option } = Select;

interface Discount {
  id: number;
  object: string | null;
  discount: number | null;
  expirationdate: string | null;
  startdate: string | null;
  discountsum: boolean | null;
  pointid: string | null;
  pointname: string | null;
  name: string | null;
  discountid: string;
}

interface ExceptionProduct {
  id: string;
  name: string;
  code: string;
}

interface ExpdateDiscount {
  id: string;
  from: number;
  to: number;
  type: number;
  discount: number;
  deleted: boolean;
}

const DiscountsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'common' | 'expdate' | 'exceptions' | 'inactive'>('common');

  const [activeDiscounts, setActiveDiscounts] = useState<Discount[]>([]);
  const [inactiveDiscounts, setInactiveDiscounts] = useState<Discount[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionProduct[]>([]);
  const [expdateDiscounts, setExpdateDiscounts] = useState<ExpdateDiscount[]>([]);
  const [selectedRow, setSelectedRow] = useState<Discount | ExceptionProduct | ExpdateDiscount | null>(null);
  const [selectedCommonType, setSelectedCommonType] = useState<number>(1);

  // Флаги, чтобы не загружать данные повторно
  const [hasLoadedActive, setHasLoadedActive] = useState(false);
  const [hasLoadedInactive, setHasLoadedInactive] = useState(false);
  const [hasLoadedExceptions, setHasLoadedExceptions] = useState(false);
  const [hasLoadedExpdate, setHasLoadedExpdate] = useState(false);
  const { sendRequest } = useApiRequest();

  const [showAddExceptionForm, setShowAddExceptionForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
  
  const [resetTrigger, setResetTrigger] = useState(0);

  const [showExpdateModal, setShowExpdateModal] = useState(false);
  const [expType, setExpType] = useState<number | null>(null);
  const [expFrom, setExpFrom] = useState<number | null>(null);
  const [expTo, setExpTo] = useState<number | null>(null);
  const [expDiscount, setExpDiscount] = useState<number | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || '';

  const [modalVisible, setModalVisible] = useState(false);

  // Функция открытия модального окна
  const openModal = () => setModalVisible(true);

  // Функция закрытия модального окна
  const closeModal = () => setModalVisible(false);

  const handleSaveSuccess = () => {
    setModalVisible(false);
    fetchActiveDiscounts();
  };

  const { Option } = Select;

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    setSelectedRow(null);
    if (activeTab === 'common' && !hasLoadedActive) fetchActiveDiscounts();
    if (activeTab === 'inactive' && !hasLoadedInactive) fetchInactiveDiscounts();
    if (activeTab === 'exceptions' && !hasLoadedExceptions) fetchExceptions();
    if (activeTab === 'expdate' && !hasLoadedExpdate) fetchExpirationDiscounts();
  }, [activeTab]);

  const fetchActiveDiscounts = () => {
    sendRequest(`${API_URL}/api/discount?active=1`, { headers: getHeaders() })
      
      .then(data => {
        setActiveDiscounts(data);
        setHasLoadedActive(true);
      })
      .catch(() => message.error(t('discounts.loadError')));
  };

  const fetchInactiveDiscounts = () => {
    sendRequest(`${API_URL}/api/discount?active=0`, { headers: getHeaders() })
      
      .then(data => {
        setInactiveDiscounts(data);
        setHasLoadedInactive(true);
      })
      .catch(() => message.error(t('discounts.loadError')));
  };

  const fetchExceptions = () => {
    sendRequest(`${API_URL}/api/discount/prodwithoutdis`, { headers: getHeaders() })
     
      .then(data => {
        setExceptions(data);
        setHasLoadedExceptions(true);
      })
      .catch(() => message.error(t('discounts.loadError')));
  };

  const fetchExpirationDiscounts = () => {
    sendRequest(`${API_URL}/api/expdatediscount`, { headers: getHeaders() })
      
      .then(data => {
        setExpdateDiscounts(data);
        setHasLoadedExpdate(true);
      })
      .catch(() => message.error(t('discounts.loadError')));
  };

  const clearExpForm = () => {
  setExpType(null);
  setExpFrom(null);
  setExpTo(null);
  setExpDiscount(null);
};

const cancelExpModal = () => {
  clearExpForm();
  setShowExpdateModal(false);
};

const saveExpDiscount = async () => {
  if (expType === null || expFrom === null || expTo === null || expDiscount === null) {
    message.warning(t('discounts.validationError'));
    return;
  }

  try {
    await sendRequest(`${API_URL}/api/expdatediscount/manage`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        expdatediscount: [
          {
            displayID: 1,
            from: expFrom,
            to: expTo,
            type: expType,
            discount: expDiscount,
          },
        ],
      }),
    });

    message.success(t('discounts.saved'));
    clearExpForm();
    setShowExpdateModal(false);
    setHasLoadedExpdate(false);
    fetchExpirationDiscounts();
  } catch {
    message.error(t('discounts.saveError'));
  }
};

  const addException = () => {
  if (!selectedProductId) return;

  sendRequest(`${API_URL}/api/discount/changeflag`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      discountFlag: {
        discount: false,
        prod: [parseInt(selectedProductId)],
      },
    }),
  })
    .then(() => {
      message.success(t('discounts.saved'));
      setSelectedRow(null);
      setShowAddExceptionForm(false);
      handleClear();
      setHasLoadedExceptions(false);
      fetchExceptions();
    })
    .catch(() => message.error(t('discounts.saveError')));
  };

  const handleClear = () => {
  setSelectedProductId(null);
  setSelectedBarcode(null);
  setResetTrigger((prev) => prev + 1);
  };

  const handleCancel = () => {
  handleClear();
  setShowAddExceptionForm(false);
  };


  const deleteDiscount = () => {
    if (!selectedRow || !('discountid' in selectedRow)) return;
    sendRequest(`${API_URL}/api/discount/del`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id: selectedRow.discountid }),
    })
     
      .then(() => {
        message.success(t('discounts.deleted'));
        setSelectedRow(null);
        setHasLoadedActive(false);
        fetchActiveDiscounts();
      })
      .catch(() => message.error(t('discounts.deleteError')));
  };

  const cancelExpdateDiscount = () => {
    if (!selectedRow) return;
    const payload = [{ ...selectedRow, deleted: true }];
    sendRequest(`${API_URL}/api/expdatediscount/manage`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ expdatediscount: payload }),
    })
      
      .then(() => {
        message.success(t('discounts.deleted'));
        setSelectedRow(null);
        setHasLoadedExpdate(false);
        fetchExpirationDiscounts();
      })
      .catch(() => message.error(t('discounts.deleteError')));
  };

const removeException = () => {
  if (!selectedRow) return;
  
  // Проверяем, что selectedRow — ExceptionProduct (или тип с id строкой)
  if (!('id' in selectedRow) || typeof selectedRow.id !== 'string') return;

  sendRequest(`${API_URL}/api/discount/changeflag`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      discountFlag: {
        discount: true,
        prod: [parseInt(selectedRow.id)],
      },
    }),
  })
    .then(() => {
      message.success(t('discounts.deleted'));
      setSelectedRow(null);
      setHasLoadedExceptions(false);
      fetchExceptions();
    })
    .catch(() => message.error(t('discounts.deleteError')));
};

  const commonColumnsBase = [
    {
      title: t('discounts.discount'),
      dataIndex: 'discount',
      key: 'discount',
      render: (value: number | null) => (value !== null ? `${value}%` : ''),
    },
    {
      title: (
        <span>
          {t('discounts.summarize')}{' '}
          <Tooltip title={t('discounts.tooltip')}>
            <InfoCircleOutlined />
          </Tooltip>
        </span>
      ),
      dataIndex: 'discountsum',
      key: 'discountsum',
      render: (val: boolean | null) => (val ? t('discounts.common.yes') : t('discounts.common.no')),
    },
    {
      title: t('discounts.period'),
      key: 'period',
      render: (_: any, record: Discount) =>
        record.startdate && record.expirationdate
          ? `${dayjs(record.startdate).format('DD.MM.YYYY')} - ${dayjs(record.expirationdate).format('DD.MM.YYYY')}`
          : '',
    },
  ];

  const getColumnsByType = (type: number): ColumnsType<Discount> => {
    switch (type) {
      case 1:
        return [{ title: t('discounts.point'), dataIndex: 'pointname', key: 'pointname' }, ...commonColumnsBase];
      case 2:
        return [
          { title: t('discounts.category'), dataIndex: 'name', key: 'name' },
          { title: t('discounts.point'), dataIndex: 'pointname', key: 'pointname' },
          ...commonColumnsBase,
        ];
      case 4:
        return [
          { title: t('discounts.product'), dataIndex: 'name', key: 'name' },
          { title: t('discounts.point'), dataIndex: 'pointname', key: 'pointname' },
          ...commonColumnsBase,
        ];
      default:
        return [];
    }
  };

  const filteredCommonDiscounts = activeDiscounts.filter(
    (d) => d.id === selectedCommonType && d.object !== null
  );

  const renderCommonTab = () => (
    <>
      <Alert message={t('discounts.commonInfo')} type="info" showIcon className={styles.marginBottom16} />
      <Space className={`${styles.marginBottom16} ${styles.alignCenter}`}>
        <span>{t('discounts.common.discountBy')}:</span>
        <Select
          value={selectedCommonType}
          onChange={(val) => {
            setSelectedCommonType(val);
            setSelectedRow(null);
          }}
          className={styles.selectWidth180}
        >
          <Option value={1}>{t('discounts.common.byPoints')}</Option>
          <Option value={2}>{t('discounts.common.byCategories')}</Option>
          <Option value={4}>{t('discounts.common.byProducts')}</Option>
        </Select>
        <Button type="primary" onClick={openModal}>{t('discounts.common.add')}</Button>

        <DiscountAddModal
        visible={modalVisible}
        onCancel={closeModal}
        onSaveSuccess={handleSaveSuccess}
        
      />
         {selectedRow && (
        <Button danger onClick={deleteDiscount}>
          {t('discounts.common.cancelDiscount')}
        </Button>
      )}
      </Space>
      <Table
        rowKey="discountid"
        dataSource={filteredCommonDiscounts}
        columns={getColumnsByType(selectedCommonType)}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedRow && 'discountid' in selectedRow ? [selectedRow.discountid] : [],
          onChange: (_, [row]) => setSelectedRow(row),
        }}
      />
     
    </>
  );

  const renderInactiveTab = () => {
    const filtered = inactiveDiscounts.filter(d => d.object !== null);
    const inactiveColumns: ColumnsType<Discount> = [
     {
  title: t('discounts.name'),
  key: 'name',
  render: (_: any, record: Discount) => {
    switch (record.id) {
      case 4:
        return `${t('discounts.product')}: ${record.name || ''}`;
      case 2:
        return `${t('discounts.category')}: ${record.name || ''}`;
      case 1:
        return t('discounts.point');
      default:
        return '';
    }
  },
},
  {
    title: t('discounts.point'),
    dataIndex: 'pointname',
    key: 'pointname',
  },
      {
        title: t('discounts.discount'),
        dataIndex: 'discount',
        key: 'discount',
        render: (value: number | null) => (value !== null ? `${value}%` : ''),
      },
      {
        title: (
          <span>
            {t('discounts.summarize')}{' '}
            <Tooltip title={t('discounts.tooltip')}>
              <InfoCircleOutlined />
            </Tooltip>
          </span>
        ),
        dataIndex: 'discountsum',
        key: 'discountsum',
        render: (val: boolean | null) => (val ? t('discounts.common.yes') : t('discounts.common.no')),
      },
      {
        title: t('discounts.period'),
        key: 'period',
        render: (_, record) =>
          record.startdate && record.expirationdate
            ? `${dayjs(record.startdate).format('DD.MM.YYYY')} - ${dayjs(record.expirationdate).format('DD.MM.YYYY')}`
            : '',
      },
      {
  title: t('discounts.status'),
  key: 'status',
  render: (_: any, record: Discount) => {
    const now = dayjs();
    const expiration = dayjs(record.expirationdate);

    const notExpired = expiration.isValid() && now.isBefore(expiration);

    return notExpired ? (
      <Tag color="green" className={styles.tagGreen}>
        {t('discounts.active')} {/* "Не истёк" */}
      </Tag>
    ) : (
      <Tag color="red" className={styles.tagRed}>
        {t('discounts.expired')} {/* "Истёк" */}
      </Tag>
    );
  },
}
    ];

    return <Table rowKey="discountid" dataSource={filtered} columns={inactiveColumns} pagination={{ pageSize: 10 }} />;
  };

  const renderExceptionsTab = () => {
    const exceptionColumns: ColumnsType<ExceptionProduct> = [
      { title: t('discounts.productName'), dataIndex: 'name', key: 'name' },
      { title: t('discounts.barcode'), dataIndex: 'code', key: 'code' },
    ];

    return (
      <>
        <Space className={styles.marginBottom16}>
          <Button type="primary" onClick={() => setShowAddExceptionForm(true)}>{t('discounts.common.add')}</Button>
          {selectedRow && (
          <Button danger onClick={removeException}>
            {t('discounts.common.removeException')}
          </Button>
        )}
       
        </Space>

        <Modal
        title={t('discounts.common.add')}
        open={showAddExceptionForm}
        onCancel={handleCancel}
        onOk={addException}
        okText={t('discounts.common.save')}
        cancelText={t('discounts.common.cancel')}
        okButtonProps={{ disabled: !selectedProductId }}
        footer={[
          <Button key="reset" onClick={handleClear}>
            {t('discounts.common.clear')}
          </Button>,
          <Button key="cancel" onClick={handleCancel}>
            {t('discounts.common.cancel')}
          </Button>,
          <Button key="submit" type="primary" onClick={addException} disabled={!selectedProductId}>
            {t('discounts.common.save')}
          </Button>,
        ]}
      >
      <ProductBarcodeSearch
          onProductSelect={(id, barcode) => {
          setSelectedProductId(id);
          setSelectedBarcode(barcode);
          }}
          onClear={handleClear}
          resetTrigger={resetTrigger}
      />
      </Modal>
        <Table
          rowKey="id"
          dataSource={exceptions}
          columns={exceptionColumns}
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selectedRow ? [selectedRow.id] : [],
            onChange: (_, [row]) => setSelectedRow(row),
          }}
        />
        
      </>
    );
  };

  const renderExpdateTab = () => {
    const columns: ColumnsType<ExpdateDiscount> = [
      {
        title: t('discounts.range'),
        render: (_, record) => `От ${record.from} | До ${record.to}`,
      },
      {
        title: t('discounts.type'),
        dataIndex: 'type',
        render: (val: number) => (val === 1 ? t('discounts.day') : t('discounts.month')),
      },
      {
        title: t('discounts.discount'),
        dataIndex: 'discount',
        render: (val: number) => `${val}%`,
      },
    ];

    return (
      <>
        <Alert
          message={t('discounts.expdateInfo')}
          type="info"
          showIcon
          className={styles.marginBottom16}
        />
        <Space className={styles.marginBottom16}>
          <Button type="primary" onClick={() => setShowExpdateModal(true)}>{t('discounts.common.add')}</Button>
          {selectedRow && (
          <Button danger onClick={cancelExpdateDiscount}>
            {t('discounts.common.cancelDiscount')}
          </Button>
        )}
        
        </Space>
     


<Modal
  title={t('discounts.common.add')}
  open={showExpdateModal}
  onCancel={cancelExpModal}
  footer={[
    <Button key="reset" onClick={clearExpForm}>
      {t('discounts.common.clear')}
    </Button>,
    <Button key="cancel" onClick={cancelExpModal}>
      {t('discounts.common.cancel')}
    </Button>,
    <Button
      key="submit"
      type="primary"
      onClick={saveExpDiscount}
      disabled={
        expType === null || expFrom === null || expTo === null || expDiscount === null
      }
    >
      {t('discounts.common.save')}
    </Button>,
  ]}
>
  <Form layout="vertical">
    <Form.Item label={t('discounts.type')}>
      <Select
        value={expType}
        onChange={setExpType}
        placeholder={t('discounts.selectType')}
        className={styles.fullWidth}
      >
        <Option value={1}>{t('discounts.day')}</Option>
        <Option value={2}>{t('discounts.month')}</Option>
      </Select>
    </Form.Item>

    <Form.Item label={t('discounts.range')}>
      <Space>
        <Select
          value={expFrom}
          onChange={setExpFrom}
          placeholder={t('discounts.from')}
          className={styles.width120}
        >
          {[...Array(32).keys()].map((num) => (
            <Option key={`from-${num}`} value={num}>
              {num}
            </Option>
          ))}
        </Select>
        <Select
          value={expTo}
          onChange={setExpTo}
          placeholder={t('discounts.to')}
          className={styles.width120}
        >
          {[...Array(32).keys()].map((num) => (
            <Option key={`to-${num}`} value={num}>
              {num}
            </Option>
          ))}
        </Select>
      </Space>
    </Form.Item>

    <Form.Item label={`${t('discounts.discount')} (%)`}>
  <InputNumber
    min={0}
    max={100}
    value={expDiscount ?? undefined}
    onChange={(value) => setExpDiscount(value)}
    className={styles.width120}
    placeholder="0 - 100"
    formatter={(value) => {
      const num = parseInt(String(value || '0') , 10);
      return Math.min(100, Math.max(0, num)).toString();
    }}
    parser={(value) => {
      const num = parseInt(value || '0', 10);
      return Math.min(100, Math.max(0, num));
    }}
    onKeyPress={(e) => {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    }}
    onPaste={(e) => {
      const paste = e.clipboardData.getData('text');
      if (!/^\d+$/.test(paste)) {
        e.preventDefault();
      }
    }}
  />
</Form.Item>
  </Form>
</Modal>


        <Table
          rowKey="id"
          dataSource={expdateDiscounts}
          columns={columns}
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selectedRow ? [selectedRow.id] : [],
            onChange: (_, [row]) => setSelectedRow(row),
          }}
        />
        
      </>
    );
  };

  return (
    <div className={styles.container}>
      <Tabs
  activeKey={activeTab}
  onChange={(key) => {
    setActiveTab(key as any);
    setSelectedRow(null);
  }}
  items={[
    {
      key: 'common',
      label: t('discounts.tabs.common'),
      children: renderCommonTab(),
    },
    {
      key: 'expdate',
      label: t('discounts.tabs.expdate'),
      children: renderExpdateTab(),
    },
    {
      key: 'exceptions',
      label: t('discounts.tabs.exceptions'),
      children: renderExceptionsTab(),
    },
    {
      key: 'inactive',
      label: t('discounts.tabs.inactive'),
      children: renderInactiveTab(),
    },
  ]}
/>

    </div>
  );
};

export default DiscountsPage;
