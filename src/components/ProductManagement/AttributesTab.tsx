import React, { useEffect, useState } from 'react';
import {
  Collapse,
  Input,
  Button,
  Space,
  message,
  Modal,
  Table,
  Select,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import type { Attribute, AttributeValue } from './';
import styles from './Products.module.css';

const { Option } = Select;

const AttributesTab: React.FC = () => {
  const { t } = useTranslation(); // или useTranslation('common')
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [values, setValues] = useState<Record<string, AttributeValue[]>>({});
  const [loading, setLoading] = useState(false);
  const [activeKey, setActiveKey] = useState<string | undefined>(undefined);

  const [deletedModal, setDeletedModal] = useState(false);
  const [selectedAttrId, setSelectedAttrId] = useState<string | null>(null);
  const [deletedValues, setDeletedValues] = useState<AttributeValue[]>([]);
  const [selectedDeletedValue, setSelectedDeletedValue] = useState<AttributeValue | null>(null);

  const [newValues, setNewValues] = useState<Record<string, string>>({});

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  // === Загрузка списка атрибутов ===
  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const data: Attribute[] = await sendRequest(`${API_URL}/api/attributes/getspr`, {
        headers: getHeaders(),
      });
      setAttributes(data);

      /* if (data.length > 0) {
        setActiveKey(data[0].id.toString());
        await fetchValues(data[0].id.toString());
      } */
    } catch (err) {
      console.error(err);
      message.error(t('attributes.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  // === Загрузка значений для конкретного атрибута ===
  const fetchValues = async (attrId: string, force = false) => {
    try {
      if (values[attrId] && !force) return;
      const data: AttributeValue[] = await sendRequest(
        `${API_URL}/api/attributes/getsprattr?sprid=${attrId}`,
        { headers: getHeaders() }
      );
      setValues((prev) => ({
        ...prev,
        [attrId]: data.filter((v) => !v.deleted),
      }));
    } catch (err) {
      console.error(err);
      message.error(t('attributes.loadValuesError'));
    }
  };

  // === Сохранить значение ===
  const handleSave = async (attrId: string, valueId: string, value: string) => {
    try {
      await sendRequest(`${API_URL}/api/attributes/updatespr`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          attributespr: [{ attribute: attrId, value, rowid: valueId, deleted: false }],
        }),
      });
      message.success(t('attributes.saveSuccess'));
      await fetchValues(attrId, true);
    } catch (err) {
      console.error(err);
      message.error(t('attributes.saveError'));
    }
  };

  // === Добавить новое значение ===
  const handleAdd = async (attrId: string) => {
    const newValue = newValues[attrId]?.trim();
    if (!newValue) return;

    try {
      await sendRequest(`${API_URL}/api/attributes/updatespr`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          attributespr: [{ attribute: attrId, value: newValue, deleted: false }],
        }),
      });
      message.success(t('attributes.addSuccess'));
      setNewValues((prev) => ({ ...prev, [attrId]: '' }));
      await fetchValues(attrId, true);
    } catch (err) {
      console.error(err);
      message.error(t('attributes.addError'));
    }
  };

  // === Удалить значение ===
  const handleDelete = async (attrId: string, val: AttributeValue) => {
    try {
      await sendRequest(`${API_URL}/api/attributes/updatespr`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          attributespr: [
            {
              attribute: attrId,
              value: val.value,
              rowid: val.id,
              deleted: true,
            },
          ],
        }),
      });
      message.success(t('attributes.deleteSuccess'));
      await fetchValues(attrId, true);
    } catch (err) {
      console.error(err);
      message.error(t('attributes.deleteError'));
    }
  };

  // === Открыть модалку удалённых атрибутов ===
  const openDeletedModal = () => {
    setDeletedModal(true);
    setSelectedAttrId(null);
    setDeletedValues([]);
    setSelectedDeletedValue(null);
  };

  // === Загрузка удалённых значений ===
  const fetchDeletedValues = async (attrId: string) => {
    if (!attrId || attrId === 'undefined') return;
    try {
      const data: AttributeValue[] = await sendRequest(
        `${API_URL}/api/attributes/getsprattr?sprid=${attrId}`,
        { headers: getHeaders() }
      );
      setDeletedValues(data.filter((v) => v.deleted));
      setSelectedAttrId(attrId);
      setSelectedDeletedValue(null);
    } catch (err) {
      console.error(err);
      message.error(t('attributes.loadDeletedError'));
    }
  };

  // === Восстановить значение ===
  const handleRestore = async () => {
    if (!selectedAttrId || !selectedDeletedValue) return;

    try {
      await sendRequest(`${API_URL}/api/attributes/updatespr`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          attributespr: [
            {
              attribute: selectedAttrId,
              value: selectedDeletedValue.value,
              rowid: selectedDeletedValue.id,
              deleted: false,
            },
          ],
        }),
      });
      message.success(t('attributes.restoreSuccess'));
      setDeletedModal(false);
      setActiveKey(undefined);
      await fetchValues(selectedAttrId, true);
    } catch (err) {
      console.error(err);
      message.error(t('attributes.restoreError'));
    }
  };

  const deletedColumns: ColumnsType<AttributeValue> = [
    {
      title: t('attributes.deletedName'),
      dataIndex: 'value',
      sorter: (a, b) => a.value.localeCompare(b.value),
    },
  ];

  // === Формирование панелей Collapse ===
  const collapseItems = attributes.map((attr) => ({
    key: attr.id.toString(),
    label: attr.values, // возможно тут надо attr.name? или attr.label? проверь
    children: (
      <div className={styles.spaceMarginBottom}>
        {values[attr.id]?.map((val) => (
          <Space key={val.id} className={styles.flexRow}>
            <Input
              value={val.value}
              onChange={(e) => {
                const newValue = e.target.value;
                setValues((prev) => ({
                  ...prev,
                  [attr.id]: prev[attr.id]?.map((v) =>
                    v.id === val.id ? { ...v, value: newValue } : v
                  ),
                }));
              }}
              className={styles.fixedWidth200}
            />
            <Button
              type="primary"
              onClick={() => handleSave(attr.id, val.id, val.value)}
            >
              {t('attributes.save')}
            </Button>
            <Button danger onClick={() => handleDelete(attr.id, val)}>
              {t('attributes.delete')}
            </Button>
          </Space>
        ))}

        <Space>
          <Input
            placeholder={t('attributes.newValuePlaceholder')}
            value={newValues[attr.id] || ''}
            onChange={(e) =>
              setNewValues((prev) => ({
                ...prev,
                [attr.id]: e.target.value,
              }))
            }
            onPressEnter={() => handleAdd(attr.id)}
          />
          <Button type="primary" onClick={() => handleAdd(attr.id)}>
            {t('attributes.add')}
          </Button>
        </Space>
      </div>
    ),
  }));

  return (
    <>
      <Space className={styles.buttonGroup}>
        <Button onClick={openDeletedModal}>{t('attributes.deletedAttributes')}</Button>
      </Space>

      <Collapse
        accordion
        activeKey={activeKey}
        onChange={async (key) => {
          const newKey = Array.isArray(key) ? key[0] : key;
          if (!newKey) {
            setActiveKey(undefined);
            return;
          }
          setActiveKey(newKey);
          await fetchValues(newKey);
        }}
        items={collapseItems}
      />

      <Modal
        open={deletedModal}
        title={t('attributes.deletedAttributes')}
        onCancel={() => setDeletedModal(false)}
        width={600}
        footer={[
          <Button key="close" onClick={() => setDeletedModal(false)}>
            {t('attributes.close')}
          </Button>,
          selectedDeletedValue && (
            <Button key="restore" type="primary" onClick={handleRestore}>
              {t('attributes.restore')}
            </Button>
          ),
        ]}
      >
        <p>{t('attributes.selectAttribute')}</p>
        <Select
          placeholder={t('attributes.selectAttributePlaceholder')}
          className={styles.selectFullWidth}
          value={selectedAttrId || undefined}
          onChange={(id) => fetchDeletedValues(id)}
          allowClear
        >
          {attributes.map((attr) => (
            <Option key={attr.id} value={attr.id}>
              {attr.values}
            </Option>
          ))}
        </Select>

        {selectedAttrId && (
          <Table<AttributeValue>
            rowKey="id"
            columns={deletedColumns}
            dataSource={deletedValues}
            size="small"
            rowSelection={{
              type: 'radio',
              onChange: (_, rows) => setSelectedDeletedValue(rows[0]),
            }}
            
          />
        )}
      </Modal>
    </>
  );
};

export default AttributesTab;
