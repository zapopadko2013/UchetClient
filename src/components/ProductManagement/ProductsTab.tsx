import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  message,
  Popconfirm,
  Modal,
  Form,
  Row,
  Col,
  TreeSelect,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import type { Product } from './';
import ProductFormModal from './ProductFormModal';
import styles from './Products.module.css';

const { Option } = Select;

const collectChildIds = (node: any): string[] => {
  if (!node.children || node.children.length === 0) return [node.value];
  return [node.value, ...node.children.flatMap((child: any) => collectChildIds(child))];
};

const getAllChildrenValues = (treeData: any[], selectedValues: string[]): string[] => {
  const selectedWithChildren: string[] = [];
  const traverse = (nodes: any[]) => {
    for (const node of nodes) {
      if (selectedValues.includes(node.value)) {
        selectedWithChildren.push(...collectChildIds(node));
      } else if (node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(treeData);
  return Array.from(new Set(selectedWithChildren));
};

const ProductsTab: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedRows, setSelectedRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pagination, setPagination] = useState({
  current: 1,
  pageSize: 10,
  total: 0,
});


const CustomPageSizeSelect = ({ value, onChange }) => {
    const totalItems = pagination.total; // Используем total из pagination
    const pageSizeOptions = [10, 20, 50, 100];

    return (
      <Select
        value={value}
        onChange={onChange}
        style={{ width: 120 }}
        disabled={totalItems === 0} // Отключаем, если нет данных
      >
        {pageSizeOptions.map((size) => (
          <Select.Option key={size} value={size}>
            {`${size}/${totalItems}`}
          </Select.Option>
        ))}
      </Select>
    );
  };


  const [filters, setFilters] = useState({
    name: '',
    barcode: '',
    brand: '',
    category: [] as string[],
    hasAttribute: '',
  });
  const [localFilters, setLocalFilters] = useState(filters);

  const [brands, setBrands] = useState<{ id: string; brand: string }[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  /* const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('itemsPerPage', '10');
      params.append('pageNumber', '1');
      if (filters.name) params.append('name', filters.name);
      if (filters.barcode) params.append('barcode', filters.barcode);
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.category.length > 0) {
        filters.category.forEach((c) => params.append('category[]', c));
      }

      const url = `${API_URL}/api/nomenclature/invoice?${params.toString()}`;
      const data: Product[] = await sendRequest(url, { headers: getHeaders() });

      let filtered = [...data];
      if (filters.hasAttribute === 'true') {
        filtered = filtered.filter((p) => p.attributescaption?.trim() !== '');
      } else if (filters.hasAttribute === 'false') {
        filtered = filtered.filter((p) => !p.attributescaption?.trim());
      }

      setProducts(filtered);
    } catch (err) {
      console.error(err);
      message.error(t('products.error.load'));
    } finally {
      setLoading(false);
    }
  }; */

const fetchProducts = async (page = 1, pageSize = 10) => {
  setLoading(true);
  try {
    const params = new URLSearchParams();
    params.append('itemsPerPage', String(pageSize));
    params.append('pageNumber', String(page));

    if (filters.name) params.append('name', filters.name);
    if (filters.barcode) params.append('barcode', filters.barcode);
    if (filters.brand) params.append('brand', filters.brand);
    if (filters.category.length > 0) {
      filters.category.forEach((c) => params.append('category[]', c));
    }

    const url = `${API_URL}/api/nomenclature/invoice?${params.toString()}`;
    const data: any[] = await sendRequest(url, { headers: getHeaders() });

    let filtered = [...data];
    if (filters.hasAttribute === 'true') {
      filtered = filtered.filter((p) => p.attributescaption?.trim() !== '');
    } else if (filters.hasAttribute === 'false') {
      filtered = filtered.filter((p) => !p.attributescaption?.trim());
    }

    // Берём totalcount из первого элемента
    const total = data.length > 0 ? Number(data[0].totalcount) || 0 : 0;

    setProducts(filtered);
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
      total,
    }));
  } catch (err) {
    console.error(err);
    message.error(t('products.error.load'));
  } finally {
    setLoading(false);
  }
};


  const fetchBrands = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/brand/search`, { headers: getHeaders() });
      setBrands(data || []);
    } catch {
      message.error(t('products.error.loadBrands'));
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/categories/get_categories`, { headers: getHeaders() });
      setCategories(data || []);
    } catch {
      message.error(t('products.error.loadCategories'));
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  useEffect(() => {
  setLocalFilters(filters);
}, [filters]);

  const handleDelete = async () => {
    if (selectedRows.length === 0) return;
    try {
      await sendRequest(`${API_URL}/api/nomenclature/multiple/delete`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ products: selectedRows.map((r) => ({ id: r.id })) }),
      });
      message.success(t('products.messages.deleted'));
      setSelectedRows([]);
      fetchProducts();
    } catch {
      message.error(t('products.error.delete'));
    }
  };

  // Сброс фильтров
  const resetFilters = () => {
    const reset = {
      name: '',
      barcode: '',
      brand: '',
      category: [],
      hasAttribute: '',
    };
    setFilters(reset);
    setLocalFilters(reset);
  };

  // Удаление одного фильтра
  const removeSingleFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === 'category' ? [] : '',
    }));
  };

  // Отображение активных фильтров
  const renderActiveFilters = () => {
    const tags: JSX.Element[] = [];

    if (filters.name)
      tags.push(
        <Tag key="name" closable onClose={() => removeSingleFilter('name')}>
          {t('products.columns.name')}: {filters.name}
        </Tag>
      );

    if (filters.barcode)
      tags.push(
        <Tag key="barcode" closable onClose={() => removeSingleFilter('barcode')}>
          {t('products.columns.barcode')}: {filters.barcode}
        </Tag>
      );

    if (filters.brand) {
      const brandName = brands.find((b) => b.id === filters.brand)?.brand || filters.brand;
      tags.push(
        <Tag key="brand" closable onClose={() => removeSingleFilter('brand')}>
          {t('products.columns.brand')}: {brandName}
        </Tag>
      );
    }

    if (filters.category.length > 0) {
      const categoryNames: string[] = [];
      const findLabels = (nodes: any[]) => {
        for (const node of nodes) {
          if (filters.category.includes(node.value)) {
            categoryNames.push(node.label);
          }
          if (node.children) findLabels(node.children);
        }
      };
      findLabels(categories);
      tags.push(
        <Tag key="category" closable onClose={() => removeSingleFilter('category')}>
          {t('products.columns.category')}: {categoryNames.join(', ')}
        </Tag>
      );
    }

    if (filters.hasAttribute)
      tags.push(
        <Tag key="hasAttribute" closable onClose={() => removeSingleFilter('hasAttribute')}>
          {t('products.columns.attributes')}: {filters.hasAttribute === 'true' ? t('products.common.yes') : t('products.common.no')}
        </Tag>
      );

    if (tags.length === 0) return null;
    return (
      <div className={styles.spaceMarginBottom}>
        <strong>{t('products.common.filters')}:</strong> <Space wrap>{tags}</Space>
      </div>
    );
  };

  const columns: ColumnsType<Product> = [
    { title: '№', dataIndex: 'index', 
      render: (_, __, i) =>
    (pagination.current - 1) * pagination.pageSize + i + 1,
       width: 60 },
    { title: t('products.columns.name'), dataIndex: 'name' },
    { title: t('products.columns.barcode'), dataIndex: 'code' },
    { title: t('products.columns.brand'), dataIndex: 'brand' },
    { title: t('products.columns.category'), dataIndex: 'category' },
    {
      title: t('products.columns.attributes'),
      dataIndex: 'attributescaption',
      render: (text) => text || '-',
    },
  ];

  return (
    <>
      <Space className={styles.spaceMarginBottom}>
        <Button type="primary" onClick={() => setOpen(true)}>
          {t('products.buttons.add')}
        </Button>
        <ProductFormModal visible={open} onClose={() => setOpen(false)} onSuccess={fetchProducts} />

        {editingProduct && (
          <ProductFormModal
            visible={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setEditingProduct(null);
            }}
            onSuccess={fetchProducts}
            isEdit
            barcode={editingProduct.code}
            name={editingProduct.name}
            productId={editingProduct.id}
          />
        )}

        <Button onClick={() => setIsFilterModalOpen(true)}>{t('products.buttons.filter')}</Button>

        {selectedRows.length === 1 && (
          <Button
            onClick={() => {
              setEditingProduct(selectedRows[0]);
              setEditModalOpen(true);
            }}
          >
            {t('products.buttons.edit')}
          </Button>
        )}

        {selectedRows.length >= 1 && (
          <Popconfirm title={t('products.confirm.delete')} onConfirm={handleDelete}>
            <Button danger>{t('products.buttons.delete')}</Button>
          </Popconfirm>
        )}
      </Space>

      {renderActiveFilters()}

      {/* Модалка фильтров */}
      <Modal
        title={t('products.buttons.filter')}
        open={isFilterModalOpen}
        onCancel={() => setIsFilterModalOpen(false)}
        footer={[
          <Button key="reset" onClick={resetFilters}>
            {t('products.common.reset')}
          </Button>,
          <Button key="cancel" onClick={() => setIsFilterModalOpen(false)}>
            {t('products.common.cancel')}
          </Button>,
          <Button
            key="apply"
            type="primary"
            onClick={() => {
              setFilters(localFilters);
              setIsFilterModalOpen(false);
            }}
          >
            {t('products.common.apply')}
          </Button>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item label={t('products.columns.name')}>
            <Input
              value={localFilters.name}
              onChange={(e) => setLocalFilters({ ...localFilters, name: e.target.value })}
              allowClear
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label={t('products.columns.barcode')}>
                <Input
                  value={localFilters.barcode}
                  onChange={(e) => setLocalFilters({ ...localFilters, barcode: e.target.value })}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('products.columns.brand')}>
                <Select
                  showSearch
                  placeholder={t('products.common.selectBrand')}
                  value={localFilters.brand || undefined}
                  onChange={(value) => setLocalFilters({ ...localFilters, brand: value || '' })}
                  allowClear
                >
                  {brands.map((b) => (
                    <Option key={b.id} value={b.id}>
                      {b.brand}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label={t('products.columns.category')}>
                <TreeSelect
                  treeData={categories}
                  value={localFilters.category}
                  onChange={(v) => {
                    const expanded = getAllChildrenValues(categories, v as string[]);
                    setLocalFilters({ ...localFilters, category: expanded });
                  }}
                  treeCheckable
                  showCheckedStrategy={TreeSelect.SHOW_PARENT}
                  placeholder={t('products.common.selectCategory')}
                  className={styles.fullWidth}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('products.columns.attributes')}>
                <Select
                  placeholder={t('products.common.select')}
                  value={localFilters.hasAttribute || undefined}
                  onChange={(v) => setLocalFilters({ ...localFilters, hasAttribute: v })}
                  allowClear
                >
                  <Option value="true">{t('products.common.yes')}</Option>
                  <Option value="false">{t('products.common.no')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Table<Product>
        rowKey="id"
        columns={columns}
        dataSource={products}
        loading={loading}
        rowSelection={{
          type: 'checkbox',
          onChange: (_, rows) => setSelectedRows(rows),
        }}
  /*       pagination={{
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total, range) =>
    `${range[0]}-${range[1]} ${t('products.common.of')} ${total}`,
  onChange: (page, pageSize) => fetchProducts(page, pageSize),
}} */

  pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        pageSizeOptions: [], // Пустой массив, так как опции задаются в CustomPageSizeSelect
        selectComponentClass: CustomPageSizeSelect, // Кастомный селектор
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} ${t('products.common.of')} ${total}`,
        onChange: (page, pageSize) => fetchProducts(page, pageSize),
        onShowSizeChange: (_, size) => {
          fetchProducts(1, size); // Сбрасываем на первую страницу при изменении размера
        },
      }}
      />
    </>
  );
};

export default ProductsTab;
