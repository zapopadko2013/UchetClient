import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Modal,
  Space,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import FilterModal from './FilterModal';
import InvoiceEditModal from './InvoiceEditModal';
import { useNavigate } from 'react-router-dom';
import styles from './CreateInvoice.module.css';

const { confirm } = Modal;

interface Invoice {
  invoicenumber: string;
  altnumber: string;
  invoicedate: string;
  name: string;
  stockto: string;
  counterparty: string;
  status: string;
  counterpartyid: string;
  invoicetypeid: string;
}

interface Counterparty {
  id: string;
  name: string;
  bin: string;
}

const HistoryTab: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<Invoice[]>([]);
  const [selectedRow, setSelectedRow] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(1, 'month'),
    dayjs(),
  ]);
  const [counterparty, setCounterparty] = useState('0');
  const [counterpartyName, setCounterpartyName] = useState<string>(t('goodsReceipt.history.allSuppliers'));

  const navigate = useNavigate();
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loadingCounterparties, setLoadingCounterparties] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '';
  const { sendRequest } = useApiRequest();

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  // === 1. Загрузка поставщиков ===
  const fetchCounterparties = async () => {
    setLoadingCounterparties(true);
    try {
      const response = await sendRequest(`${API_URL}/api/counterparties`, {
        headers: getHeaders(),
      });
      setCounterparties(response);
    } catch (err) {
      message.error(t('goodsReceipt.history.loadSuppliersError'));
    } finally {
      setLoadingCounterparties(false);
    }
  };

  // === 2. Загрузка накладных ===
  const fetchData = async (): Promise<Invoice[]> => {
    setLoading(true);
    try {
      const from = dateRange[0].format('YYYY-MM-DD');
      const to = dateRange[1].format('YYYY-MM-DD');

      const response = await sendRequest(
        `${API_URL}/api/report/history/invoices?dateFrom=${from}&dateTo=${to}&invoicetype=2&counterpartie=${counterparty}`,
        {
          headers: getHeaders(),
        }
      );
      setData(response);
      return response;
    } catch (err) {
      message.error(t('goodsReceipt.history.loadError'));
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounterparties();
  }, []);

  useEffect(() => {
    fetchData();
  }, [dateRange, counterparty]);

  const showDeleteConfirm = () => {
    if (!selectedRow) return;

    confirm({
      title: t('goodsReceipt.history.deleteConfirmTitle'),
      icon: <ExclamationCircleOutlined />,
      content: t('goodsReceipt.history.deleteConfirmContent'),
      okText: t('goodsReceipt.history.yes'),
      cancelText: t('goodsReceipt.history.no'),
      onOk() {
        sendRequest(`${API_URL}/api/invoice/delete/many`, {
          method: 'DELETE',
          headers: getHeaders(),
          body: JSON.stringify({
            invoices: [{ id: selectedRow.invoicenumber }],
          }),
        })
          .then(() => {
            message.success(t('goodsReceipt.history.deleted'));
            setSelectedRow(null);
            fetchData();
          })
          .catch(() => {
            message.error(t('goodsReceipt.history.deleteError'));
          });
      },
    });
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: t('goodsReceipt.history.columns.invoiceNumber'),
      dataIndex: 'invoicenumber',
      render: (_, record) => (
        <span>
          {record.altnumber ? `${record.altnumber} - ` : ''}
          {dayjs(record.invoicedate).format('DD.MM.YYYY')}
        </span>
      ),
    },
    {
      title: t('goodsReceipt.history.columns.name'),
      dataIndex: 'name',
    },
    {
      title: t('goodsReceipt.history.columns.stock'),
      dataIndex: 'stockto',
    },
    {
      title: t('goodsReceipt.history.columns.supplier'),
      dataIndex: 'counterparty',
    },
    {
      title: t('goodsReceipt.history.columns.status'),
      dataIndex: 'status',
      render: (status: string) => {
        let tagClass = '';
        switch (status) {
          case 'Ожидает обработки от кассы':
          case 'Awaiting processing from cash register':
          case 'Кассадан өңдеуді күтуде':
            tagClass = styles.statusOrange;
            break;
          case 'Формирование':
          case 'Draft':
          case 'Қалыптастыру':
            tagClass = styles.statusBlue;
            break;
          case 'Принят на кассе':
          case 'Accepted at cash desk':
          case 'Кассадан қабылданды':
            tagClass = styles.statusGreen;
            break;
        }
        return <Tag className={`${styles.statusTag} ${tagClass}`}>{status}</Tag>;
      },
    },
    {
      title: '',
      key: 'actions',
      render: (_, record) => (
        <div className={styles.flexEnd}>
          <Button
            type="link"
            icon={<span className={styles.arrowIcon}>{'>'}</span>}
            onClick={() => {
              navigate(`/invoices/${record.invoicenumber}`, {
                state: {
                  counterparty: record.counterparty,
                  stockfrom: record.stockto,
                  status: record.status,
                  invoicedate: record.invoicedate,
                },
              });
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Space className={styles.section}>
        <Button onClick={() => setFilterVisible(true)} loading={loadingCounterparties}>
          {t('goodsReceipt.history.filter')}
        </Button>
        <Tag>
          {`${dateRange[0].format('DD.MM.YYYY')} - ${dateRange[1].format('DD.MM.YYYY')}`}
        </Tag>
        <Tag>{`${t('goodsReceipt.history.supplier')}: ${counterpartyName}`}</Tag>
      </Space>

      {selectedRow && (
        <div className={styles.section}>
          <Space>
            {selectedRow.status === 'Формирование' && (
              <Button danger onClick={showDeleteConfirm}>
                {t('goodsReceipt.history.delete')}
              </Button>
            )}
            <Button onClick={() => setEditVisible(true)}>
              {t('goodsReceipt.history.edit')}
            </Button>
          </Space>
        </div>
      )}

      <Table
        rowKey="invoicenumber"
        loading={loading}
        dataSource={data}
        columns={columns}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedRow ? [selectedRow.invoicenumber] : [],
          onChange: (_, selectedRows) => setSelectedRow(selectedRows[0]),
        }}
      />

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        counterparties={counterparties}
        onApply={(dateRange, counterparty) => {
          setDateRange(dateRange);
          setCounterparty(counterparty.id);
          setCounterpartyName(counterparty.name);
          setFilterVisible(false);
        }}
      />

      {selectedRow && (
        <InvoiceEditModal
          visible={editVisible}
          onClose={() => setEditVisible(false)}
          invoiceNumber={selectedRow.invoicenumber}
          altnumberInitial={selectedRow.altnumber}
          invoicedateInitial={selectedRow.invoicedate}
          counterpartyId={selectedRow.counterpartyid}
          counterparties={counterparties}
          onSaveSuccess={async () => {
            const all = await fetchData();
            const updated = all.find(
              (item) => item.invoicenumber === selectedRow.invoicenumber
            );
            if (updated) setSelectedRow(updated);
            setEditVisible(false);
          }}
        />
      )}
    </div>
  );
};

export default HistoryTab;
