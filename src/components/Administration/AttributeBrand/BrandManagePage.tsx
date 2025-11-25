import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Table,
  Space,
  message,
  Upload,
  Pagination,
} from 'antd';
import { UploadOutlined, SaveOutlined, InboxOutlined } from '@ant-design/icons';
import { read, utils } from 'xlsx';
import useApiRequest from '../../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next';
import styles from './Atributte.module.css';

interface Brand {
  id?: string;
  brand: string;
  manufacturer: string;
}

interface Props {
  initialBrand?: Brand | null;
  onSaved?: () => void;
}

const BrandManagePage: React.FC<Props> = ({ initialBrand, onSaved }) => {
  const { t } = useTranslation('');

  const [form] = Form.useForm();
  const { Dragger } = Upload;

  const [excelBrands, setExcelBrands] = useState<Brand[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL;

  const headers = {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json',
  };

  /** Инициализация формы при редактировании */
  useEffect(() => {
    if (initialBrand) {
      form.setFieldsValue(initialBrand);
    }
  }, [initialBrand]);

  /** Загрузка Excel */
  const handleExcelUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = utils.sheet_to_json<any>(ws);

      if (!json.length || !json[0].Brand || !json[0].Manufacturer) {
        return message.error(t('adminbrands.excelWrongFormat'));
      }

      const rows: Brand[] = json.map((row: any) => ({
        brand: row.Brand,
        manufacturer: row.Manufacturer,
      }));

      setExcelBrands(rows);
      message.success(t('adminbrands.excelImported', { count: rows.length }));
    } catch {
      message.error(t('adminbrands.excelReadError'));
    }

    return false;
  };

  /** Сохранение одного бренда */
  const saveSingleBrand = async () => {
    try {
      const values = await form.validateFields();

      const req = {
        brand: [
          {
            ...values,
            id: initialBrand?.id,
            deleted: false,
          },
        ],
      };

      await sendRequest(`${API_URL}/api/brand/manage`, {
        method: 'POST',
        headers,
        body: JSON.stringify(req),
      });

      message.success(t('adminbrands.saved'));
      onSaved?.();
    } catch {
      message.error(t('adminbrands.saveError'));
    }
  };

  /** Сохранение Excel списка */
  const saveExcelBrands = async () => {
    if (!excelBrands.length) return;

    const req = { brand: excelBrands.map(b => ({ ...b, deleted: false })) };

    try {
      await sendRequest(`${API_URL}/api/brand/manage`, {
        method: 'POST',
        headers,
        body: JSON.stringify(req),
      });

      message.success(t('adminbrands.listSaved'));
      onSaved?.();
    } catch {
      message.error(t('adminbrands.listSaveError'));
    }
  };

  /** Таблица — редактирование */
  const isEditing = (record: any) => record.key === editingKey;
  const editRow = (record: any) => setEditingKey(record.key);

  const saveRow = async (key: string) => {
    const row = (await form.validateFields()) as Brand;

    setExcelBrands(prev =>
      prev.map((item, index) =>
        index === Number(key) ? { ...item, ...row } : item
      )
    );
    setEditingKey(null);
  };

  const columns = [
    {
      title: t('adminbrands.name'),
      dataIndex: 'brand',
      editable: true,
    },
    {
      title: t('adminbrands.company'),
      dataIndex: 'manufacturer',
      editable: true,
    },
    {
      title: '',
      width: 150,
      render: (_: any, record: any) => {
        const editable = isEditing(record);

        return editable ? (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={() => saveRow(record.key)}
            >
              {t('adminbrands.save')}
            </Button>
            <Button size="small" onClick={() => setEditingKey(null)}>
              {t('adminbrands.cancel')}
            </Button>
          </Space>
        ) : (
          <Button size="small" onClick={() => editRow(record)}>
            {t('adminbrands.edit')}
          </Button>
        );
      },
    },
  ];

  const mergedColumns = columns.map(col =>
    col.editable
      ? {
          ...col,
          onCell: (record: any) => ({
            record,
            dataIndex: col.dataIndex,
            title: col.title,
            editing: isEditing(record),
            form,
            inputType: 'text',
          }),
        }
      : col
  );

  return (
    <div className={styles.manageContainer}>
      <h2>
        {initialBrand
          ? t('adminbrands.editBrand')
          : t('adminbrands.addBrand')}
      </h2>

      {/* Форма одного бренда */}
      {excelBrands.length === 0 && (
        <Form form={form} layout="vertical">
          <Form.Item
            name="brand"
            label={t('adminbrands.name')}
            rules={[{ required: true, message: t('adminbrands.enterName') }]}
          >
            <Input placeholder={t('adminbrands.enterName')} />
          </Form.Item>

          <Form.Item
            name="manufacturer"
            label={t('adminbrands.company')}
            rules={[{ required: true, message: t('adminbrands.enterCompany') }]}
          >
            <Input placeholder={t('adminbrands.enterCompany')} />
          </Form.Item>

          <Button type="primary" icon={<SaveOutlined />} onClick={saveSingleBrand}>
            {t('adminbrands.save')}
          </Button>
        </Form>
      )}

      <br />

      {/* Upload Excel */}
      <Dragger
        name="file"
        beforeUpload={handleExcelUpload}
        maxCount={1}
        showUploadList={false}
        className={styles.draggerBox}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined className={styles.iconLarge} />
        </p>
        <p className="ant-upload-text">
          {t('adminbrands.dragOrClick')}
        </p>
        <Button icon={<UploadOutlined />}>
          {t('adminbrands.selectFile')}
        </Button>
      </Dragger>

      <br />

      {/* Таблица Excel */}
      {excelBrands.length > 0 && (
        <>
          <Form form={form} component={false}>
            <Table
              dataSource={excelBrands.map((b, i) => ({ ...b, key: i }))}
              columns={mergedColumns as any}
              pagination={false}
              components={{
                body: {
                  cell: EditableCell,
                },
              }}
            />
          </Form>

          <Pagination
            current={page}
            total={excelBrands.length}
            pageSize={10}
            onChange={(p) => setPage(p)}
            className={styles.marginTop16}
          />

          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={saveExcelBrands}
            className={styles.marginTop16}
          >
            {t('adminbrands.saveAll')}
          </Button>
        </>
      )}
    </div>
  );
};

/** Редактируемая ячейка */
const EditableCell: React.FC<any> = ({
  editing,
  dataIndex,
  record,
  children,
  form,
  ...rest
}) => {
  return (
    <td {...rest}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          className={styles.formItemNoMargin}
          initialValue={record[dataIndex]}
          rules={[{ required: true, message: 'Required' }]}
        >
          <Input />
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

export default BrandManagePage;
