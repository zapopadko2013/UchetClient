import React, { useEffect, useState } from 'react';
import {
  Button,
  Table,
  Modal,
  Typography,
  message,
  Select,
  Checkbox,
  Space,
  TreeSelect,
} from 'antd';
import dayjs from 'dayjs';

import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import RevisionDetailsContent from './RevisionDetailsContent';
import styles from './RevisionPage.module.css';

const { Title } = Typography;
const { Option } = Select;

// --- ИНТЕРФЕЙСЫ (Без изменений) ---

interface Revision {
  revisionnumber: string;
  point: string;
  pointid: string;
  company: string;
  createdate: string;
  status: string;
  admin: string;
  point_name: string;
  type: number;
  type_name: string;
  no_attr: boolean;
  hide_units: boolean;
}

interface RevisionItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  quantity: number;
}

interface Brand {
  id: string;
  brand: string;
}

interface Category {
  value: string;
  label: string;
}

interface Supplier {
  id: string;
  name: string;
}

// --- КОМПОНЕНТ ---

const RevisionPage: React.FC = () => {
   const { t } = useTranslation(); 

  // --- СОСТОЯНИЯ (Без изменений) ---
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [points, setPoints] = useState<{ id: string; stockid: string; name: string }[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string>();
  const [revisionType, setRevisionType] = useState<number>(0);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [checkActiveModal, setCheckActiveModal] = useState(false);
  const [activeRevision, setActiveRevision] = useState<Revision | null>(null);

  const [selectedBrand, setSelectedBrand] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedSupplier, setSelectedSupplier] = useState<string | undefined>();

  const [noAttributes, setNoAttributes] = useState(false);
  const [showStock, setShowStock] = useState(true);
  const [zeroUnits, setZeroUnits] = useState(revisionType !== 0);

  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [revisionToDelete, setRevisionToDelete] = useState<Revision | null>(null);

  const [selectedCategoryPath, setSelectedCategoryPath] = useState<string[]>([]);

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const headers = {
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  };

  useEffect(() => {
    loadRevisions();
    loadPoints();
  }, []);


  // --- ФУНКЦИИ ЗАГРУЗКИ ---

  const loadRevisions = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/revision/listactive`, { headers });
      setRevisions(data || []);
    } catch {
    
      message.error(t('revisionPage.loadRevisionsError'));
    }
  };

  const loadPoints = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/revision/points`, { headers });
      setPoints(data || []);
    } catch {
      
      message.error(t('revisionPage.loadPointsError'));
    }
  };

  const handleStartRevision = () => {
    setSelectedPoint(undefined);
    setRevisionType(0);
    setBrands([]);
    setCategories([]);
    setSuppliers([]);
    setSelectedBrand(undefined);
    setSelectedCategory(undefined);
    setSelectedSupplier(undefined);
    setActiveRevision(null);
    setCheckActiveModal(false);
    setNoAttributes(false);
    setShowStock(true);
    setZeroUnits(false);
    setIsModalVisible(true);
  };

  const handleBack = () => {
    setSelectedRevision(null);
    setViewMode('list'); // Возвращаемся к списку
    loadRevisions();
  };

  const handlePointChange = async (pointId: string) => {
    setSelectedPoint(pointId);
    try {
      const active: Revision[] = await sendRequest(`${API_URL}/api/revision/checkactive?point=${pointId}`, { headers });
      if (active.length > 0) {
        setActiveRevision(active[0]);
        setCheckActiveModal(true);
      }
    } catch {
      
      message.error(t('revisionPage.checkActiveRevisionError'));
    }
  };

  const handleTypeChange = async (type: number) => {
    setRevisionType(type);
    setSelectedBrand(undefined);
    setSelectedCategory(undefined);
    setSelectedSupplier(undefined);

    try {
      if (type === 2) {
        const data: Brand[] = await sendRequest(`${API_URL}/api/brand/margin`, { headers });
        setBrands(data || []);
      } else if (type === 3) {
        const data: Category[] = await sendRequest(`${API_URL}/api/categories/get_categories?category=`, { headers });
        setCategories(data || []);
      } else if (type === 4) {
        const data: Supplier[] = await sendRequest(`${API_URL}/api/counterparties/search`, { headers });
        setSuppliers(data || []);
      }
    } catch {
    
      message.error(t('revisionPage.loadRevisionTypeError'));
    }
  };

  const handleDeleteSuccess = () => {
    loadRevisions(); // Перезагружаем список
    setSelectedRevision(null); // Сбрасываем выбранную ревизию
    setViewMode('list'); // Переключаемся обратно в список
    
    message.success(t('revisionPage.revisionDeletedSuccess'));
  };

  
  const deleteRevision = async (revisionToDelete: Revision | null) => {
    if (!revisionToDelete) return;

    try {
      const body = { revisionnumber: revisionToDelete.revisionnumber };
      const res: any = await sendRequest(`${API_URL}/api/revision/revisionlist/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (res?.revisionlist_delete?.code === 'success') {
       
        message.success(t('revisionPage.revisionDeleted', { number: revisionToDelete.revisionnumber }));
        setSelectedRevision(null);
        setDeleteConfirmVisible(false);
        loadRevisions();
      } else {
       
        message.error(t('revisionPage.failedToDeleteRevision'));
      }
    } catch {
      
      message.error(t('revisionPage.deleteRevisionError'));
    }
  };


  const handleDeleteRevision = async (revisionNumber: string) => {
    try {
      const body = { revisionnumber: revisionNumber };
      const res: any = await sendRequest(`${API_URL}/api/revision/revisionlist/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (res?.revisionlist_delete?.code === 'success') {
       
        message.success(t('revisionPage.revisionDeleted', { number: revisionNumber }));
        loadRevisions();
        setSelectedRevision(null);
        setCheckActiveModal(false);
      } else {
       
        message.error(t('revisionPage.failedToDeleteRevision'));
      }
    } catch {
     
      message.error(t('revisionPage.deleteRevisionError'));
    }
  };

  const handleAddRevision = async () => {
    if (!selectedPoint) {
    
      message.error(t('revisionPage.selectPointRequired'));
      return;
    }

    try {
      const body: any = {
        point: selectedPoint,
        type: revisionType,
        noAttributes,
        hideUnits: !showStock,
        zeroUnits,
      };

      if (revisionType === 2) body.object = selectedBrand;
      if (revisionType === 3) body.object = selectedCategory;
      if (revisionType === 4) body.object = selectedSupplier;

      const res: any = await sendRequest(`${API_URL}/api/revision/revisionlist/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (res[0]?.revisionlist_add?.code === 'success') {
        
        message.success(t('revisionPage.revisionCreated'));
        setIsModalVisible(false);
        loadRevisions();
      } else {
       
        message.error(t('revisionPage.createRevisionError'));
      }
    } catch {
     
      message.error(t('revisionPage.createRevisionError'));
    }
  };

  const openActiveRevision = () => {
    if (activeRevision) {
      setSelectedRevision(activeRevision);
      setCheckActiveModal(false);
      setIsModalVisible(false);
      setIsDetailModalVisible(true);
      setViewMode('detail');
    }
  };

  const handleOpenDetail = (revision: Revision) => {
    setSelectedRevision(revision);
    setIsDetailModalVisible(true);
    setViewMode('detail');
  };

  
  const columns = [
    { title: t('revisionPage.table.number'), dataIndex: 'revisionnumber', key: 'revisionnumber' },
    { title: t('revisionPage.table.point'), dataIndex: 'point_name', key: 'point_name' },
    {
      title: t('revisionPage.table.startDate'),
      dataIndex: 'createdate',
      key: 'createdate',
      render: (val: string) => dayjs(val).format('DD.MM.YYYY HH:mm'),
    },
    { title: t('revisionPage.table.administrator'), dataIndex: 'name', key: 'name' },
    {
      title: t('revisionPage.table.action'),
      key: 'action',
      render: (_: any, record: Revision) => (
        <Button onClick={() => handleOpenDetail(record)}>&gt;</Button>
      ),
    },
  ];

  // --- JSX РЕНДЕР ---
  return (
    <div>

      {viewMode === 'detail' && selectedRevision ? (
        <>
          <RevisionDetailsContent 
            revision={selectedRevision} 
            onBack={handleBack} 
            onDeleteSuccess={handleDeleteSuccess}
          />
        </>
      ) : (
        <>
         
          <Title level={3}>{t('revisionPage.title')}</Title>
          <Space className={styles.mb16}>
         
            <Button type="primary" onClick={handleStartRevision}>{t('revisionPage.startRevisionButton')}</Button>
            {selectedRevision && <Button danger  
              onClick={() => {
                setRevisionToDelete(selectedRevision);
                setDeleteConfirmVisible(true);
              }}
            >
            
              {t('revisionPage.deleteButton')}
            </Button>}
          </Space>

         
          <Title level={4}>{t('revisionPage.unfinishedRevisionsTitle')}</Title>
          <Table
            rowKey="revisionnumber"
            columns={columns}
            dataSource={revisions}
            rowSelection={{
              type: 'radio' as const,
              selectedRowKeys: selectedRevision ? [selectedRevision.revisionnumber] : [],
              onChange: (_, selectedRows) => setSelectedRevision(selectedRows[0] || null),
            }}
          />

        </>
      )}

      {/* Модальное создания ревизии */}
      <Modal
        
        title={t('revisionPage.createModal.title')}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleAddRevision}
      >
        <Select
          className={styles.fullWidthMb16}
          
          placeholder={t('revisionPage.createModal.selectPointPlaceholder')}
          value={selectedPoint}
          onChange={handlePointChange}
        >
          {points.map(p => <Option key={p.stockid} value={p.stockid}>{p.name}</Option>)}
        </Select>

        <Select
          className={styles.fullWidthMb16}
          value={revisionType}
          onChange={handleTypeChange}
        >
         
          <Option value={0}>{t('revisionPage.revisionTypes.selective')}</Option>
          <Option value={1}>{t('revisionPage.revisionTypes.allProducts')}</Option>
          <Option value={2}>{t('revisionPage.revisionTypes.byBrand')}</Option>
          <Option value={3}>{t('revisionPage.revisionTypes.byCategory')}</Option>
          <Option value={4}>{t('revisionPage.revisionTypes.bySupplier')}</Option>
        </Select>

             {revisionType === 2 && (
          <Select
            className={styles.fullWidthMb16}
           
            placeholder={t('revisionPage.createModal.selectBrandPlaceholder')}
            value={selectedBrand}
            onChange={setSelectedBrand}
          >
            {brands.map(b => <Option key={b.id} value={b.id}>{b.brand}</Option>)}
          </Select>
        )}
        {revisionType === 3 && (
          <TreeSelect
            className={styles.fullWidthMb16}
            
            placeholder={t('revisionPage.createModal.selectCategoryPlaceholder')}
            value={selectedCategory}
            treeData={categories}
            allowClear
            showSearch
            onChange={(value) => setSelectedCategory(value)}
            styles={{
              popup: {
                root: {           
                  maxHeight: 400,
                  overflow: 'auto',
                },
              },
            }}
          />
        )}
        {revisionType === 4 && (
          <Select
            className={styles.fullWidthMb16}
            
            placeholder={t('revisionPage.createModal.selectSupplierPlaceholder')}
            value={selectedSupplier}
            onChange={setSelectedSupplier}
          >
            {suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
          </Select>
        )}

        
        <Checkbox checked={showStock} onChange={e => setShowStock(e.target.checked)}>{t('revisionPage.createModal.showStock')}</Checkbox>
        <Checkbox checked={zeroUnits} onChange={e => setZeroUnits(e.target.checked)} disabled={revisionType === 0}>{t('revisionPage.createModal.includeZeroStock')}</Checkbox>

   
      </Modal>

      {/* Модальное предупреждение о незавершённой ревизии */}
      <Modal
       
        title={t('revisionPage.activeModal.title')}
        open={checkActiveModal}
        onCancel={openActiveRevision}
        footer={[
          
          <Button key="no" onClick={() => activeRevision && handleDeleteRevision(activeRevision.revisionnumber)}>{t('revisionPage.activeModal.deleteButton')}</Button>,
          <Button key="yes" type="primary" onClick={openActiveRevision}>{t('revisionPage.activeModal.continueButton')}</Button>,
        ]}
      >
       
        {t('revisionPage.activeModal.warningText')}
      </Modal>

      {/* Модальное подтверждение удаления */}
      <Modal
        
        title={t('revisionPage.confirmDelete.title')}
        open={deleteConfirmVisible}
        onCancel={() => setDeleteConfirmVisible(false)}
        onOk={() => deleteRevision(revisionToDelete)}
      >
        
        {t('revisionPage.confirmDelete.text', { number: selectedRevision?.revisionnumber })}
      </Modal>
    </div>
  );
};

export default RevisionPage;