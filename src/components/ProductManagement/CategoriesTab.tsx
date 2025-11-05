import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  message,
  Popconfirm,Select,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import type { Category } from './';
import styles from './Products.module.css';

interface CategoryNode extends Category {
  children?: CategoryNode[];
  expanded?: boolean;
  tempSubName?: string;
}

const CategoriesTab: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [deletedCategories, setDeletedCategories] = useState<CategoryNode[]>([]);
  const [selectedDeleted, setSelectedDeleted] = useState<CategoryNode | null>(null);

  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const [modalAdd, setModalAdd] = useState(false);
  const [modalDeleted, setModalDeleted] = useState(false);
  const [editModal, setEditModal] = useState(false);

  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const handleTableChange = (page, pageSize) => {
    setPagination({ current: page, pageSize });
  };

  // Вычисляем данные для текущей страницы
  const paginatedData = categories.slice(
    (pagination.current - 1) * pagination.pageSize,
    pagination.current * pagination.pageSize
  );
  const CustomPageSizeSelect = ({ value, onChange }) => {
  const totalItems = categories.length;
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

  // === Загрузка категорий ===
  const fetchRoot = useCallback(async () => {
    setLoading(true);
    try {
      const data: CategoryNode[] = await sendRequest(
        `${API_URL}/api/categories/getcategories`,
        { headers: getHeaders() }
      );
      const roots = data
        .filter((c) => !c.deleted && (!c.parentid || c.parentid === '0'))
        .map((c) => ({ ...c, expanded: false, children: undefined }));
      setCategories(roots);
    } catch {
      message.error(t('categories.loadError'));
    } finally {
      setLoading(false);
    }
  }, [API_URL, sendRequest, t]);

  const fetchDeleted = useCallback(async () => {
    try {
      const data: CategoryNode[] = await sendRequest(
        `${API_URL}/api/categories/getcategories`,
        { headers: getHeaders() }
      );
      const deleted = data.filter((c) => c.deleted);
      setDeletedCategories(deleted);
    } catch {
      message.error(t('categories.deletedLoadError'));
    }
  }, [API_URL, sendRequest, t]);

  useEffect(() => {
    fetchRoot();
  }, [fetchRoot]);

  // === Дерево ===
  const updateTreeNode = useCallback(
    (nodes: CategoryNode[], id: string, updater: (n: CategoryNode) => CategoryNode): CategoryNode[] =>
      nodes.map((n) => {
        if (String(n.id) === String(id)) return updater(n);
        if (n.children) return { ...n, children: updateTreeNode(n.children, id, updater) };
        return n;
      }),
    []
  );

  const loadChildren = useCallback(
    async (parent: CategoryNode) => {
      try {
        const data: CategoryNode[] = await sendRequest(
          `${API_URL}/api/categories/getcategories?parentid=${parent.id}`,
          { headers: getHeaders() }
        );
        const children = data
          .filter((c) => !c.deleted)
          .map((c) => ({ ...c, expanded: false, children: undefined }));

        setCategories((prev) =>
          updateTreeNode(prev, parent.id, (n) => ({
            ...n,
            expanded: true,
            children,
          }))
        );
      } catch {
        message.error(t('categories.loadSubError'));
      }
    },
    [API_URL, sendRequest, t, updateTreeNode]
  );

  const collapseNode = useCallback(
    (parent: CategoryNode) => {
      setCategories((prev) =>
        updateTreeNode(prev, parent.id, (n) => ({
          ...n,
          expanded: false,
          children: undefined,
        }))
      );
    },
    [updateTreeNode]
  );

  // === CRUD ===
  const handleAddMain = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      await sendRequest(`${API_URL}/api/categories/updatecategories`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          category: { name: newName.trim(), deleted: false, parent_id: 0 },
        }),
      });
      message.success(t('categories.added'));
      setModalAdd(false);
      setNewName('');
      fetchRoot();
    } catch {
      message.error(t('categories.addError'));
    }
  }, [API_URL, newName, sendRequest, t, fetchRoot]);

  const handleAddSub = useCallback(
    async (parent: CategoryNode) => {
      if (!parent.tempSubName?.trim()) return;
      try {
        await sendRequest(`${API_URL}/api/categories/updatecategories`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            category: {
              name: parent.tempSubName.trim(),
              deleted: false,
              parent_id: parent.id,
            },
          }),
        });
        message.success(t('categories.subAdded'));
        await loadChildren(parent);
        setCategories((prev) =>
          updateTreeNode(prev, parent.id, (n) => ({ ...n, tempSubName: '' }))
        );
      } catch {
        message.error(t('categories.subAddError'));
      }
    },
    [API_URL, sendRequest, t, loadChildren, updateTreeNode]
  );

  const handleEdit = useCallback(async () => {
    if (!selectedCategory || !editName.trim()) return;
    try {
      await sendRequest(`${API_URL}/api/categories/updatecategories`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          category: {
            name: editName.trim(),
            deleted: false,
            id: selectedCategory.id,
            parent_id: selectedCategory.parentid ?? '0',
          },
        }),
      });
      message.success(t('categories.updated'));
      setEditModal(false);
      fetchRoot();
    } catch {
      message.error(t('categories.updateError'));
    }
  }, [API_URL, selectedCategory, editName, sendRequest, t, fetchRoot]);

  const handleDelete = useCallback(
    async (cat: CategoryNode) => {
      try {
        await sendRequest(`${API_URL}/api/categories/updatecategories`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            category: { ...cat, deleted: true },
          }),
        });
        message.success(t('categories.deleted'));
        fetchRoot();
      } catch {
        message.error(t('categories.deleteError'));
      }
    },
    [API_URL, sendRequest, t, fetchRoot]
  );

  const handleRestore = useCallback(async () => {
    if (!selectedDeleted) return;
    try {
      await sendRequest(`${API_URL}/api/categories/updatecategories`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          category: { ...selectedDeleted, deleted: false },
        }),
      });
      message.success(t('categories.restored'));
      setModalDeleted(false);
      fetchRoot();
    } catch {
      message.error(t('categories.restoreError'));
    }
  }, [API_URL, selectedDeleted, sendRequest, t, fetchRoot]);

  // === Таблица ===
  /* const renderNodes = useCallback(
    (nodes: CategoryNode[], path: string[] = []): any[] =>
      nodes.flatMap((node, index) => {
        if (!node.name.toLowerCase().includes(filter.toLowerCase())) return [];

        const num = [...path, `${index + 1}`].join('.');
        const row = {
          //key: `${node.id}-${num}`,
          key: `${node.id}-${path.join('-')}-${index}`,
          num,
          name: (
            <Input
              value={node.name}
              onChange={(e) =>
                setCategories((prev) =>
                  updateTreeNode(prev, node.id, (n) => ({
                    ...n,
                    name: e.target.value,
                  }))
                )
              }
            />
          ),
          actions: (
            <Space>
              <Button
                type="link"
                icon={node.expanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => (node.expanded ? collapseNode(node) : loadChildren(node))}
              />
              <Button type="link" onClick={() => handleEdit()}>
                {t('categories.save')}
              </Button>
              <Popconfirm
                title={t('categories.deleteConfirm')}
                onConfirm={() => handleDelete(node)}
                okText={t('categories.yes')}
                cancelText={t('categories.no')}
              >
                <Button type="link" danger>
                  {t('categories.delete')}
                </Button>
              </Popconfirm>
            </Space>
          ),
          __node: node,
        };

        const childrenRows =
          node.expanded && node.children
            ? [
                ...renderNodes(node.children, [...path, `${index + 1}`]),
                {
                  //key: `${node.id}-add-${num}`,
                  key: `${node.id}-${path.join('-')}-${index}`,
                  num: `${num}.0`,
                  name: (
                    <Space>
                      <Input
                        placeholder={t('categories.newSub')}
                        value={node.tempSubName || ''}
                        onChange={(e) =>
                          setCategories((prev) =>
                            updateTreeNode(prev, node.id, (n) => ({
                              ...n,
                              tempSubName: e.target.value,
                            }))
                          )
                        }
                      />
                      <Button
                        type="primary"
                        onClick={() => handleAddSub(node)}
                        disabled={!node.tempSubName?.trim()}
                      >
                        {t('categories.add')}
                      </Button>
                    </Space>
                  ),
                  actions: null,
                },
              ]
            : [];

        return [row, ...childrenRows];
      }),
    [filter, loadChildren, collapseNode, handleEdit, handleDelete, t, handleAddSub, updateTreeNode]
  ); */

 const renderNodes = useCallback(
  (nodes: CategoryNode[], path: string[] = []): any[] =>
    nodes.flatMap((node, index) => {
      if (!node.name.toLowerCase().includes(filter.toLowerCase())) return [];

      // создаем уникальную базу ключа
      const keyBase = `${node.id ?? 'temp'}-${path.join('-')}-${index}`;

      const num = [...path, `${index + 1}`].join('.');
      const row = {
        key: `row-${keyBase}`, // ✅ префикс row
        num,
        name: (
          <Input
            value={node.name}
            onChange={(e) =>
              setCategories((prev) =>
                updateTreeNode(prev, node.id, (n) => ({
                  ...n,
                  name: e.target.value,
                }))
              )
            }
          />
        ),
        actions: (
          <Space>
            <Button
              type="link"
              icon={node.expanded ? <UpOutlined /> : <DownOutlined />}
              onClick={() =>
                node.expanded ? collapseNode(node) : loadChildren(node)
              }
            />
            <Button type="link" onClick={() => handleEdit()}>
              {t('categories.save')}
            </Button>
            <Popconfirm
              title={t('categories.deleteConfirm')}
              onConfirm={() => handleDelete(node)}
              okText={t('categories.yes')}
              cancelText={t('categories.no')}
            >
              <Button type="link" danger>
                {t('categories.delete')}
              </Button>
            </Popconfirm>
          </Space>
        ),
        __node: node,
      };

      const childrenRows =
        node.expanded && node.children
          ? [
              ...renderNodes(node.children, [...path, `${index + 1}`]),
              {
                key: `add-${keyBase}`, // ✅ другой префикс
                num: `${num}.0`,
                name: (
                  <Space>
                    <Input
                      placeholder={t('categories.newSub')}
                      value={node.tempSubName || ''}
                      onChange={(e) =>
                        setCategories((prev) =>
                          updateTreeNode(prev, node.id, (n) => ({
                            ...n,
                            tempSubName: e.target.value,
                          }))
                        )
                      }
                    />
                    <Button
                      type="primary"
                      onClick={() => handleAddSub(node)}
                      disabled={!node.tempSubName?.trim()}
                    >
                      {t('categories.add')}
                    </Button>
                  </Space>
                ),
                actions: null,
              },
            ]
          : [];

      return [row, ...childrenRows];
    }),
  [
    filter,
    loadChildren,
    collapseNode,
    handleEdit,
    handleDelete,
    t,
    handleAddSub,
    updateTreeNode,
  ]
);



  const data = useMemo(() => renderNodes(categories), [categories, renderNodes]);

  const columns: ColumnsType<any> = useMemo(
    () => [
      { title: '№', dataIndex: 'num', width: 80 },
      { title: t('categories.name'), dataIndex: 'name' },
      { title: t('categories.actions'), dataIndex: 'actions', width: 200 },
    ],
    [t]
  );

  const deletedColumns: ColumnsType<CategoryNode> = useMemo(
    () => [
      { title: t('categories.id'), dataIndex: 'id', width: 120 },
      { title: t('categories.name'), dataIndex: 'name' },
    ],
    [t]
  );

  return (
    <>
      <Space className={styles.buttonGroup}>
        <Button type="primary" onClick={() => setModalAdd(true)}>
          {t('categories.add')}
        </Button>
        <Button onClick={() => { fetchDeleted(); setModalDeleted(true); }}>
          {t('categories.deletedList')}
        </Button>
        <Input
          placeholder={t('categories.search')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.searchInput}
          allowClear
        />
      </Space>

      <Table
  columns={columns}
  dataSource={data.slice(
    (pagination.current - 1) * pagination.pageSize,
    pagination.current * pagination.pageSize
  )}
  loading={loading}
  size="small"
  rowSelection={{
    type: 'radio',
    onChange: (_, rows) => setSelectedCategory(rows[0]?.__node || null),
  }}
 /*  pagination={{
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: data.length,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100],
    showTotal: (total, range) =>
      `${range[0]}-${range[1]} ${t('categories.common.of')} ${total}`,
    onChange: (page, pageSize) => {
      setPagination({ current: page, pageSize });
    },
  }} */

 pagination={{
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: data.length,
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
/>

      {/* Добавить категорию */}
      <Modal
  open={modalAdd}
  title={t('categories.add')}
  onCancel={() => setModalAdd(false)}
  onOk={handleAddMain}
  okText={t('categories.save')}
  cancelText={t('categories.cancel')} 
>
  <Input
    placeholder={t('categories.namePlaceholder')}
    value={newName}
    onChange={(e) => setNewName(e.target.value)}
  />
</Modal>

      {/* Удалённые категории */}
      <Modal
        open={modalDeleted}
        title={t('categories.deletedList')}
        onCancel={() => setModalDeleted(false)}
        width={600}
        footer={[
          <Button key="back" onClick={() => setModalDeleted(false)}>
            {t('categories.back')}
          </Button>,
          selectedDeleted && (
            <Button key="restore" type="primary" onClick={handleRestore}>
              {t('categories.restore')}
            </Button>
          ),
        ]}
      >
        <Table<CategoryNode>
          rowKey="id"
          columns={deletedColumns}
          dataSource={deletedCategories}
          size="small"
          rowSelection={{
            type: 'radio',
            onChange: (_, rows) => setSelectedDeleted(rows[0]),
          }}
          pagination={false}
        />
      </Modal>
    </>
  );
};

export default CategoriesTab;
