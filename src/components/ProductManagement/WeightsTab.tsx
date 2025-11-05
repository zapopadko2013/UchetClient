import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Input,
  Select,
  message,
  Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import type { Tax, Barcode, WeightProduct } from './index';
import styles from './Products.module.css';

const { Search } = Input;

interface WeightsTabProps {
  taxes: Tax[];
  barcodes: Barcode[];
}

const WeightsTab: React.FC<WeightsTabProps> = ({ taxes, barcodes: initialBarcodes }) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [weights, setWeights] = useState<WeightProduct[]>([]);
  const [filteredWeights, setFilteredWeights] = useState<WeightProduct[]>([]);
  const [barcodes, setBarcodes] = useState<Barcode[]>(initialBarcodes);
  const [selectedRow, setSelectedRow] = useState<WeightProduct | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', tax: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [pagination, setPagination] = useState({
  current: 1,
  pageSize: 10,
});

const handleTableChange = (page, pageSize) => {
  setPagination({ current: page, pageSize });
};


const paginatedWeights = filteredWeights.slice(
  (pagination.current - 1) * pagination.pageSize,
  pagination.current * pagination.pageSize
);

const CustomPageSizeSelect = ({ value, onChange }) => {
  const totalItems = filteredWeights.length;
  const pageSizeOptions = [10, 20, 50, 100];

  return (
    <Select
      value={value}
      onChange={onChange}
      style={{ width: 120 }}
    >
      {pageSizeOptions.map((size) => (
        <Select.Option key={size} value={size}>
          {`${size}/${totalItems}`}
        </Select.Option>
      ))}
    </Select>
  );
};


  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  // === Загрузка весовых товаров ===
  const fetchWeights = async () => {
    setLoading(true);
    try {
      const data: WeightProduct[] = await sendRequest(
        `${API_URL}/api/nomenclature/invoice/weight`,
        { headers: getHeaders() }
      );
      setWeights(data);
      setFilteredWeights(data);
    } catch (err) {
      console.error(err);
      message.error(t('weights.error.loadWeights'));
    } finally {
      setLoading(false);
    }
  };

  // === Загрузка свободных штрих-кодов ===
  const fetchUnusedBarcodes = async () => {
    try {
      const data: Barcode[] = await sendRequest(
        `${API_URL}/api/pluproducts/barcode_unused`,
        { headers: getHeaders() }
      );
      setBarcodes(data);
    } catch (err) {
      console.error(err);
      message.error(t('weights.error.loadBarcodes'));
    }
  };

  useEffect(() => {
    fetchWeights();
    fetchUnusedBarcodes();
  }, []);

  // === Поиск ===
  const handleSearch = (value: string) => {
    setSearchText(value);
    const filtered = weights.filter((item) =>
      item.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredWeights(filtered);
  };

  // === Добавить ===
  const handleAdd = () => {
    setIsEditing(false);
    setForm({
      id: '',
      name: '',
      tax: taxes[0]?.id || '',
      code: barcodes[0]?.code || '',
    });
    setModalVisible(true);
  };

  // === Редактировать ===
  const handleEdit = async () => {
    if (!selectedRow) return;

    setIsEditing(true);
    setLoading(true);

    try {
      const data = await sendRequest(
        `${API_URL}/api/pluproducts/details?id=${selectedRow.id}`,
        { headers: getHeaders() }
      );

      setForm({
        id: data.id || '',
        name: data.name || '',
        tax: data.tax || taxes[0]?.id || '',
        code: data.code || '',
      });

      setModalVisible(true);
    } catch (err) {
      console.error(err);
      message.error(t('weights.error.loadDetails'));
    } finally {
      setLoading(false);
    }
  };

  // === Сохранить ===
  const handleSave = async () => {
    try {
      if (isEditing) {
        await sendRequest(`${API_URL}/api/pluproducts/update`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            id: form.id,
            name: form.name,
            tax: form.tax,
          }),
        });
        message.success(t('weights.messages.updated'));
        await fetchWeights();
      } else {
        await sendRequest(`${API_URL}/api/pluproducts/create`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            name: form.name,
            tax: form.tax,
            code: form.code,
          }),
        });
        message.success(t('weights.messages.created'));
        await Promise.all([fetchWeights(), fetchUnusedBarcodes()]);
      }

      setModalVisible(false);
      setSelectedRow(null);
    } catch (err) {
      console.error(err);
      message.error(t('weights.error.save'));
    }
  };

  // === Удалить ===
  const handleDelete = () => {
    if (!selectedRow) return;
    Modal.confirm({
      title: t('weights.confirm.title'),
      content: t('weights.confirm.text'),
      onOk: async () => {
        try {
          await sendRequest(`${API_URL}/api/productsweight/del`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ product: selectedRow.id }),
          });
          message.success(t('weights.messages.deleted'));
          setSelectedRow(null);
          await Promise.all([fetchWeights(), fetchUnusedBarcodes()]);
        } catch (err) {
          console.error(err);
          message.error(t('weights.error.delete'));
        }
      },
    });
  };

  const columns: ColumnsType<WeightProduct> = [
    { title: t('weights.columns.name'), dataIndex: 'name' },
    { title: t('weights.columns.tax'), dataIndex: 'category' },
  ];

  return (
    <>
      <Space className={styles.buttonGroup}>
        <Button type="primary" onClick={handleAdd}>
          {t('weights.buttons.add')}
        </Button>

        {selectedRow && (
          <>
            <Button onClick={handleEdit}>{t('weights.buttons.edit')}</Button>
            <Button danger onClick={handleDelete}>
              {t('weights.buttons.delete')}
            </Button>
          </>
        )}

        <Search
          placeholder={t('weights.common.searchPlaceholder')}
          allowClear
          onSearch={handleSearch}
          onChange={(e) => handleSearch(e.target.value)}
          value={searchText}
          className={styles.searchInput}
        />
      </Space>

      <Table<WeightProduct>
  rowKey="id"
  columns={columns}
  dataSource={paginatedWeights}
  loading={loading}
  /* pagination={{
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: filteredWeights.length,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100],
    showTotal: (total, range) =>
      `${range[0]}-${range[1]} ${t('weights.common.of')} ${total}`,
    onChange: handleTableChange,
  }} */
  pagination={{
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: filteredWeights.length,
    showSizeChanger: true,
    pageSizeOptions: [], // Пустой массив, так как опции задаются в CustomPageSizeSelect
    selectComponentClass: CustomPageSizeSelect, // Кастомный селектор
    showTotal: (total, range) => {
      const totalPages = Math.ceil(total / pagination.pageSize);
      return `${range[0]}-${range[1]} ${t('weights.common.of')} ${totalPages} `;
    },
    onChange: handleTableChange,
    onShowSizeChange: (_, size) => {
      setPagination({ current: 1, pageSize: size });
    },
  }}
  
    rowSelection={{
    type: 'radio',
    selectedRowKeys: selectedRow ? [selectedRow.id] : [],
    onChange: (_, rows) => setSelectedRow(rows[0] || null),
  }}
/>

      <Modal
        open={modalVisible}
        title={isEditing ? t('weights.modal.editTitle') : t('weights.modal.addTitle')}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button
            key="reset"
            onClick={() =>
              setForm({
                id: form.id,
                name: '',
                tax: taxes[0]?.id || '',
                code: barcodes[0]?.code || '',
              })
            }
          >
            {t('weights.buttons.reset')}
          </Button>,
          <Button key="save" type="primary" onClick={handleSave}>
            {t('weights.buttons.save')}
          </Button>,
        ]}
      >
        <div className={styles.modalInputWrapper}>
          <label>{t('weights.fields.name')}:</label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className={styles.modalInputWrapper}>
          <label>{t('weights.fields.tax')}:</label>
          <Select
            className={styles.fullWidth}
            value={form.tax}
            onChange={(v) => setForm({ ...form, tax: v })}
          >
            {taxes.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                {t.name}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div>
          <label>{t('weights.fields.unit')}:</label>
          <Input value={t('weights.common.kg')} disabled />
        </div>
      </Modal>
    </>
  );
};

export default WeightsTab;
