import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import useApiRequest from '../../../hooks/useApiRequest';
import ShowInactive from './ShowInactive';
import AddAttributeForm from './AddAttributeForm';
import styles from './Atributte.module.css';


interface Attribute {
  id: number;
  values: string;
  format: string;
  deleted: boolean;
}

interface AttributeData {
  id?: number;
  values: string;
  format: string | { label: string; value: string };
  deleted?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || '';

const UpdateAttributePage: React.FC = () => {
  const { t } = useTranslation();
  
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<AttributeData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [inactiveKey, setInactiveKey] = useState(0);

  const { sendRequest } = useApiRequest();

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  /** Load active attributes */
  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const data = await sendRequest(`${API_URL}/api/attributes?deleted=false`, {
        headers: headers(),
      });
      setAttributes(data);
    } catch (err) {
      // Ключ: t('adminattributes.error.load')
      message.error(t('adminattributes.error.load')); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  /** Delete attribute */
  const deleteAttribute = (item: Attribute) => {
    Modal.confirm({
      // Ключ: t('adminattributes.common.confirm.areYouSure')
      title: t('adminattributes.common.confirm.areYouSure'), 
      content: t('adminattributes.confirm.delete'), 
      // Ключ: t('adminattributes.common.confirm.deleteYes')
      okText: t('adminattributes.common.confirm.deleteYes'), 
      // Ключ: t('adminattributes.common.confirm.cancel')
      cancelText: t('adminattributes.common.confirm.cancel'), 
      onOk: async () => {
        try {
          const payload = {
            attributes: {
              id: item.id,
              name: item.values,
              deleted: true,
              format: item.format,
            },
          };

          await sendRequest(`${API_URL}/api/adminpage/updateattributeslist`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(payload),
          });

          setAttributes((prev) => prev.filter((a) => a.id !== item.id));
          setInactiveKey((k) => k + 1); // обновляем неактивные
          // Ключ: t('adminattributes.success.deleted')
          message.success(t('adminattributes.success.deleted')); 
        } catch {
          // Ключ: t('adminattributes.error.delete')
          message.error(t('adminattributes.error.delete')); 
        }
      },
    });
  };

  /** Open modal form for adding or editing */
  const openForm = (attr?: Attribute) => {
    if (attr) {
      setEditingAttribute(attr);
    } else {
      setEditingAttribute(null);
    }
    setModalVisible(true);
  };

  /** Handle save from form */
  const handleSave = async () => {
  try {
    // Перезагружаем актуальные атрибуты с сервера
    fetchAttributes();

    setModalVisible(false);
  } catch (err) {
    console.error(err);
    // Ключ: t('adminattributes.error.save')
    message.error(t('adminattributes.error.save')); 
  }
};

  /** Rollback from inactive list */
  const handleRollback = (item: Attribute) => {
    setAttributes((prev) => [...prev, item]);
  };

  /** Table columns */
  const columns: ColumnsType<Attribute> = [
    // Ключ: t('adminattributes.columns.number')
    { title: t('adminattributes.columns.number'), width: 50, render: (_, __, idx) => idx + 1 }, 
    { title: t('adminattributes.columns.name'), dataIndex: 'values', sorter: (a, b) => a.values.localeCompare(b.values) },
    { title: t('adminattributes.columns.type'), dataIndex: 'format' },
    {
      title: '',
      width: 130,
      render: (record) => (
        <Space>
          <Button size="small" onClick={() => openForm(record)}>
            ✏️
          </Button>
          <Button danger size="small" onClick={() => deleteAttribute(record)}>
            🗑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space className={styles.headerSpace}>
        {/* Ключ: t('adminattributes.title.activeList') */}
        <h3>{t('adminattributes.title.activeList')}</h3> 
        <Button type="primary" onClick={() => openForm()}>
          {/* Ключ: t('adminattributes.buttons.addNew') */}
          {t('adminattributes.buttons.addNew')} 
        </Button>
      </Space>

      <Table
        className={styles.attributesTable}
        rowKey="id"
        dataSource={attributes}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <ShowInactive key={inactiveKey} callback={handleRollback} mode="attributeupdate" />

      {/* Модальное окно с формой */}
      <Modal
        // Ключ: t('adminattributes.title.edit')
        title={editingAttribute ? t('adminattributes.title.edit') : t('adminattributes.title.add')} 
        open={modalVisible}
        footer={null}
        onCancel={() => setModalVisible(false)}
        destroyOnHidden
      >
        <AddAttributeForm
          attributeData={editingAttribute ?? undefined}
          onSave={handleSave}
          onCancel={() => setModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default UpdateAttributePage;