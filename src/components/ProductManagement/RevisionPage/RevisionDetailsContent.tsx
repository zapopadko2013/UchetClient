import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Button,
  Typography,
  Space,
  Card,
  Table,
  Input,
  message,
  Modal,
  InputNumber,
  Select,
} from 'antd';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import useApiRequest from '../../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next'; 
import styles from './RevisionPage.module.css';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

// ----------------------------------------------------
// ИНТЕРФЕЙСЫ
// ----------------------------------------------------

interface Revision {
  revisionnumber: string;
  point_name: string;
  createdate: string;
  point: string; // point id for API
  pointid: string; // stockid in API
  type: number;
  no_attr: boolean;
}

interface RevisionItem {
  id: string; // rtId
  name: string;
  code: string;
  units: number; // Фактическое количество (Actual count)
  unitswas: number; // Количество в системе на момент начала ревизии
  current_stock?: number; 
  attributes: string;
  current_units?: number; 
  units_diff?: number; 
  comment?: string | null;
  product?: string | null;
  attributescaption?: string | null;
}

interface ComparisonData {
  passed: RevisionItem[];
  failed: RevisionItem[];
  itemCount: number;
  itemPassCount: number;
  itemFailCount: number;
}

interface ProductStockItem {
  name: string;
  prodid: string; // product ID
  id: string;
  units: string; // stock units
  code: string; // barcode
  attributes: string;
  attributescaption?: string; 
}

interface ProductUnits {
    product: string;
    name: string;
    code: string;
    attributes: string;
    units: string; // Stock quantity as string
    attrvalue: string;
    no_attr: boolean | null;
}

type RevisionMode = 'edit' | 'compare';
type ComparisonFilter = 'all' | 'passed' | 'failed';

const API_URL = import.meta.env.VITE_API_URL || '';

// ----------------------------------------------------
// КОМПОНЕНТ РЕДАКТИРОВАНИЯ КОЛИЧЕСТВА В ТАБЛИЦЕ
// ----------------------------------------------------

const QuantityEditor: React.FC<{
  record: RevisionItem;
  revision: Revision;
  onUpdate: (rtId: string, newUnits: number) => void;
}> = ({ record, onUpdate }) => {
  const [value, setValue] = useState(record.units);
  const [displayValue, setDisplayValue] = useState(record.units);

  useEffect(() => {
    setValue(record.units);
    setDisplayValue(record.units);
  }, [record.units]);


  const handleUpdate = (newValue: number) => {
    const finalValue = Math.floor(newValue); 
    if (isNaN(finalValue) || finalValue < 0) {
        setDisplayValue(value);
        return;
    }
    
    setValue(finalValue);
    setDisplayValue(finalValue);
    onUpdate(record.id, finalValue);
  };

  const handleButtonClick = (adjustment: number) => {
      const newValue = Math.max(0, value + adjustment);
      handleUpdate(newValue);
  };

  const handleInputConfirm = () => {
      handleUpdate(Math.floor(displayValue)); 
  };
  
  const handleInputChange = (val: number | null) => {
      let numericValue = val === null || isNaN(val) ? 0 : Math.floor(val); 
      setDisplayValue(numericValue);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Backspace', 'Tab', 'Enter', 'Escape', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }
    
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
    
    if (e.key === '.' || e.key === ',') {
        e.preventDefault();
    }
  };


  return (
    <Space>
      <Button
        icon={<MinusOutlined />}
        onClick={() => handleButtonClick(-1)}
        size="small"
      />
      <InputNumber
        min={0}
        onKeyDown={handleKeyDown} 
        
        value={displayValue} 
        onChange={handleInputChange} 
        onBlur={handleInputConfirm}
        onPressEnter={handleInputConfirm}
        className={styles.quantityInput}
        controls={false}
        
        parser={(value) => {
            if (!value) return 0;
            const cleanedValue = String(value).replace(/[^\d]/g, ''); 
            return Number(cleanedValue); 
        }}
        
        formatter={(value) => {
            if (!value) return '';
            return String(value).replace(/[^\d]/g, ''); 
        }}
      />
      <Button
        icon={<PlusOutlined />}
        onClick={() => handleButtonClick(1)}
        size="small"
      />
    </Space>
  );
};


// ----------------------------------------------------
// ОСНОВНОЙ КОМПОНЕНТ ДЕТАЛЕЙ
// ----------------------------------------------------

const RevisionDetailsContent: React.FC<{ revision: Revision; onBack: () => void; onDeleteSuccess: () => void }> = ({
  revision,
  onBack,
  onDeleteSuccess,
}) => {
 
  const { t } = useTranslation(); 
  
  const { sendRequest } = useApiRequest();
  const headers = useMemo(() => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  }), []);

  // Состояния для управления данными и интерфейсом
  const [revisionItems, setRevisionItems] = useState<RevisionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<RevisionMode>('edit');
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [comparisonFilter, setComparisonFilter] = useState<ComparisonFilter>('all');
  const [nameFilter, setNameFilter] = useState('');
  const [barcodeFilter, setBarcodeFilter] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isConfirmFinishVisible, setIsConfirmFinishVisible] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false); 
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false); 
  const [availableProducts, setAvailableProducts] = useState<ProductStockItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductStockItem | undefined>(undefined);
  const [manualQuantity, setManualQuantity] = useState<number>(0);
  const [manualLoading, setManualLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // ----------------------------------------------------
  // API: ЗАГРУЗКА И ОБНОВЛЕНИЕ ТОВАРОВ РЕВИЗИИ
  // ----------------------------------------------------

  const fetchItems = useCallback(async (prodName = '', prodCode = '') => {
    setIsLoading(true);
    try {
      const url =
        `${API_URL}/api/revision/revisiontemp/list` +
        `?revisionnumber=${revision.revisionnumber}` +
        `&point=${revision.point}` +
        `&itemsPerPage=1000&pageNumber=1` + 
        (prodName ? `&prodName=${prodName}` : '') +
        (prodCode ? `&prodCode=${prodCode}` : '');

      const rawResponse = await sendRequest(url, { headers });
    
      let newItems: any[] = [];
      
      if (Array.isArray(rawResponse)) {
          newItems = rawResponse;
      } else if (rawResponse && (rawResponse as { data: any[] }).data) {
          newItems = (rawResponse as { data: any[] }).data;
      }

      const mappedItems = newItems.map(item => ({
        ...item,
        id: item.id || item.stockid, 
        unitswas: parseFloat(item.unitswas) || 0,
      })) as RevisionItem[];
      
      
      if (!prodName && !prodCode) {
        setRevisionItems(mappedItems);
      } else if (mappedItems.length > 0) {
        const foundItem = mappedItems[0];
        
        setRevisionItems(prevItems => {
            if (prevItems.some(item => item.id === foundItem.id)) {
                
                message.info(t('revisionPageDetail.itemAlreadyInList', { name: foundItem.name }));
                return prevItems; 
            } else {
                
                message.success(t('revisionPageDetail.itemAddedToList', { name: foundItem.name }));
                return [foundItem, ...prevItems.filter(item => item.id !== foundItem.id)];
            }
        });
        
      } else {
        
        message.warning(t('revisionPageDetail.itemNotFound'));
      }
      
    } catch (e) {
      console.error(e);
      
      message.error(t('revisionPageDetail.errorLoadingOrSearchingItems'));
    } finally {
      setIsLoading(false);
    }
  }, [revision.revisionnumber, revision.point, headers, sendRequest, t]);

  useEffect(() => {
    if (mode === 'edit') {
      fetchItems();
    }
  }, [fetchItems, mode]);
  
  const handleSearch = (prodName: string, prodCode: string) => {
    if (prodName || prodCode) {
        fetchItems(prodName, prodCode);
        setNameFilter('');
        setBarcodeFilter('');
    } else {
        
        message.warning(t('revisionPageDetail.enterNameOrBarcodeForSearch'));
    }
  };


  const handleUpdateQuantity = async (rtId: string, newUnits: number) => {
    setRevisionItems(prev =>
      prev.map(item => (item.id === rtId ? { ...item, units: newUnits } : item))
    );
    try {
      const body = {
        revnumber: revision.revisionnumber,
        units: newUnits,
        rtId: rtId,
      };
      await sendRequest(`${API_URL}/api/revision/revisiontempn/edit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      // message.success('Количество обновлено');
    } catch {
      
      message.error(t('revisionPageDetail.errorSavingQuantity'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Backspace', 'Tab', 'Enter', 'Escape', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }
    
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
    
    if (e.key === '.' || e.key === ',') {
        e.preventDefault();
    }
};

  // ----------------------------------------------------
  // API: УПРАВЛЯЮЩИЕ ДЕЙСТВИЯ (УДАЛИТЬ, ЗАВЕРШИТЬ)
  // ----------------------------------------------------

  const handleDeleteRevision = async () => {
    try {
      const body = { revisionnumber: revision.revisionnumber };
      const res: any = await sendRequest(`${API_URL}/api/revision/revisionlist/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (res?.revisionlist_delete?.code === 'success') {
        
        message.success(t('revisionPageDetail.revisionDeleted', { number: revision.revisionnumber }));
        setIsDeleteConfirmVisible(false);
        onDeleteSuccess(); 
      } else {
        
        message.error(t('revisionPageDetail.failedToDeleteRevision'));
      }
    } catch {
      
      message.error(t('revisionPageDetail.deleteRevisionError'));
    }
  };
  

const handleFinishAddingItems = async () => {
    setIsLoading(true);
    const previousItemsSnapshot = revisionItems; 

    try {
      const url = 
        `${API_URL}/api/revision/comparetemprevisionn?revisionnum=${revision.revisionnumber}` +
        `&noAttributes=false&get=all&itemsPerPage=1000&pageNumber=1` +
        `&point=${revision.point}`; 
      
      const rawResponse: ComparisonData | RevisionItem[] | any = await sendRequest(url, { headers });
      
      let itemsToProcess: any[] = [];
      let comparisonStats: ComparisonData | null = null;
      let transitionToCompare = false;

      if (rawResponse && (rawResponse.passed || rawResponse.failed)) {
          comparisonStats = rawResponse as ComparisonData;
          itemsToProcess = [...(comparisonStats.passed || []), ...(comparisonStats.failed || [])];
          transitionToCompare = true;

      } else if (Array.isArray(rawResponse)) {
          itemsToProcess = rawResponse;
          transitionToCompare = true;
      }
      
      const itemsFromCompareAPI: RevisionItem[] = itemsToProcess.map((item: any) => {
          
          const systemStock = parseFloat(item.units) || 0; 
          const unitswas = systemStock; 
          const units = systemStock; 
          
          const units_diff = item.units_diff !== undefined 
                            ? parseFloat(item.units_diff) 
                            : units - unitswas;
                            
          return {
              ...item,
              id: String(item.id || item.rtId || item.product), 
              units: units,
              unitswas: unitswas,
              units_diff: units_diff,
          };
      });
      
      let finalItemsToDisplay = itemsFromCompareAPI;
      const comparedItemIds = new Set(itemsFromCompareAPI.map(item => item.id));
      const missingOldItems = previousItemsSnapshot.filter(item => !comparedItemIds.has(String(item.id)));
      
      if (missingOldItems.length > 0) {
          const normalizedMissingItems = missingOldItems.map(item => ({
              ...item,
              units_diff: (item.units || 0) - (item.unitswas || 0), 
          }));
          
          finalItemsToDisplay = [...itemsFromCompareAPI, ...normalizedMissingItems];
      }

      if (transitionToCompare && finalItemsToDisplay.length > 0) {
          const passedItems = finalItemsToDisplay.filter(item => (item.units_diff || 0) === 0);
          const failedItems = finalItemsToDisplay.filter(item => (item.units_diff || 0) !== 0);

          comparisonStats = {
              passed: passedItems,
              failed: failedItems,
              itemCount: finalItemsToDisplay.length,
              itemPassCount: passedItems.length,
              itemFailCount: failedItems.length,
          };
          
          setComparisonData(comparisonStats);
          setRevisionItems(finalItemsToDisplay); 
          setMode('compare');
          
          message.success(t('revisionPageDetail.comparisonComplete'));
      } else {
          
          message.error(t('revisionPageDetail.comparisonEmptyError'));
          transitionToCompare = false; 
      }

    } catch {
      
      message.error(t('revisionPageDetail.errorComparingItems'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBackToEdit = () => {
    setMode('edit'); 
    setComparisonData(null); 
    fetchItems();
    
    message.info(t('revisionPageDetail.editModeSwitched'));
};


   const handleFinishRevision = async () => {
    try {
      const body = {
        point: revision.point,
        revnumber: revision.revisionnumber,
      };
      
      const response = await fetch(`${API_URL}/api/revision/revisiondiary/add`, {
        method: 'POST',
        headers: headers, 
        body: JSON.stringify(body),
      });

      if (response.ok) {
        
        message.success(t('revisionPageDetail.finishSuccess'));
        setIsConfirmFinishVisible(false);
        setIsReportModalVisible(true); 
      } else {
        const errorText = await response.text();
        
        message.error(t('revisionPageDetail.errorFinishingRevision', { status: response.status }));
      }
      
    } catch (e) {
      console.error('Сетевая ошибка или ошибка в sendRequest:', e);
      
      message.error(t('revisionPageDetail.networkErrorFinishing'));
    }
  };

  const handleExportExcel = async () => {
    const itemsToExport = comparisonData ? [...comparisonData.passed, ...comparisonData.failed] : revisionItems;

    if (!itemsToExport.length) {
      
      message.warning(t('revisionPageDetail.noDataToExport'));
      return;
    }

    try {
        const revisionProducts = itemsToExport.map(item => ({
            id: item.id,
            createdate: dayjs().toISOString(), 
            editdate: dayjs().toISOString(),
            units: item.units,
            point: revision.point,
            user: '2', 
            company: '2', 
            product: item.product, 
            attributes: item.attributes,
            unitswas: item.unitswas,
            revisionnumber: revision.revisionnumber,
            outofrevision: 2, 
            code: item.code,
            name: item.name,
            current_stock: item.unitswas, 
            attributescaption: item.attributescaption || '', 
            attributesmobile: '', 
            isChanging: false 
        }));

        const body = { revisionProducts };

        const response = await fetch(`${API_URL}/api/revision/inrevisiontoexcel`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            
            a.download = `${t('revisionPageDetail.excelFileName', { number: revision.revisionnumber, date: dayjs().format('YYYYMMDD') })}`; 
            
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            window.URL.revokeObjectURL(url); 
            
            
            message.success(t('revisionPageDetail.excelDownloadSuccess'));
        } else {
            
            message.error(t('revisionPageDetail.excelServerError'));
        }

    } catch (e) {
        
        message.error(t('revisionPageDetail.excelExportError'));
    }
};

const handleDeleteItems = async () => {
    if (selectedRowKeys.length === 0) {
        
        message.warning(t('revisionPageDetail.selectItemsForDeletion'));
        return;
    }

    const selectedId = selectedRowKeys[0];
    const selectedItem = revisionItems.find(item => item.id === selectedId);

    setIsLoading(true);
    try {
        const body = {
            product: selectedItem?.product, 
            revisionnumber: revision.revisionnumber,
        };

        await sendRequest(`${API_URL}/api/revision/revisiontemp/deleten`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        
        message.success(t('revisionPageDetail.itemsDeleted', { count: selectedRowKeys.length }));
        
        setSelectedRowKeys([]); 
        fetchItems(); 

    } catch (e) {
        
        message.error(t('revisionPageDetail.errorDeletingItems'));
    } finally {
        setIsLoading(false);
    }
};

  const handleAddComment = async (target: 'selected' | 'allFail') => {
      if (!commentText) {
          
          message.error(t('revisionPageDetail.enterCommentText'));
          return;
      }

      const isAllFail = target === 'allFail';
      const rtIdList = isAllFail ? false : selectedRowKeys;

      if (!isAllFail && selectedRowKeys.length === 0) {
          
          message.error(t('revisionPageDetail.selectItemForComment'));
          return;
      }
      
      try {
          const body = {
              rtId: rtIdList,
              allFail: isAllFail,
              revnumber: revision.revisionnumber,
              comment: commentText,
          };

          await sendRequest(`${API_URL}/api/revision/revisiontemp/add_comment`, {
              method: 'POST',
              headers,
              body: JSON.stringify(body),
          });

          
          message.success(t('revisionPageDetail.commentAdded'));
          setIsCommentModalVisible(false);
          setCommentText('');
          setSelectedRowKeys([]); 
          handleFinishAddingItems(); 

      } catch (e) {
          
          message.error(t('revisionPageDetail.errorAddingComment'));
      }
  };


  // ----------------------------------------------------
  // API: ЛОГИКА РУЧНОГО ДОБАВЛЕНИЯ
  // ----------------------------------------------------

  const fetchAvailableProducts = useCallback(async () => {
    setManualLoading(true);
    try {
      const data: ProductStockItem[] = await sendRequest(
        `${API_URL}/api/products/stockcurrent/stock?stockid=${revision.point}`,
        { headers }
      );
      setAvailableProducts(data || []);
    } catch {
      
      message.error(t('revisionPageDetail.errorLoadingAvailableItems'));
    } finally {
      setManualLoading(false);
    }
  }, [revision.point, headers, sendRequest, t]);

  const handleProductSelect = async (id: string) => {
    const selected = availableProducts.find(p => p.id === id);
    setSelectedProduct(selected);
    setManualQuantity(0);

    if (selected) {
        setManualLoading(true);
        try {
            const barcode = selected.code; 
            const url = `${API_URL}/api/revision/unitsbybarcode?barcode=${barcode}&point=${revision.point}&noAttributes=false`;
            const data: ProductUnits[] = await sendRequest(url, { headers });

            if (data && data.length > 0) {
                setManualQuantity(Math.floor(parseFloat(data[0].units))); 
            } else {
                 setManualQuantity(0);
            }
        } catch {
             
             message.warning(t('revisionPageDetail.errorGettingStock'));
             setManualQuantity(0);
        } finally {
            setManualLoading(false);
        }
    }
  };

  const handleManualAdd = async () => {
    if (!selectedProduct || manualQuantity < 0) {
      
      message.error(t('revisionPageDetail.selectItemAndQuantity'));
      return;
    }

    try {
        const body = {
            product: selectedProduct.prodid,
            name: selectedProduct.name,
            code: selectedProduct.code,
            attributes: selectedProduct.attributes,
            units: manualQuantity.toString(), 
            attrvalue: selectedProduct.attributescaption || '', 
            no_attr: null,
            unitswas: parseFloat(selectedProduct.units || '0'), 
            revnumber: revision.revisionnumber,
            point: revision.point,
            overrideCheck: true, 
            noAttributes: false
        };
        
        await sendRequest(`${API_URL}/api/revision/revisiontemp/insert`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        
        message.success(t('revisionPageDetail.itemAddedManualSuccess', { name: selectedProduct.name }));
        
        await fetchItems(); 

        setSelectedProduct(undefined);
        setManualQuantity(0);
        
        setIsAddModalVisible(false);

    } catch (e) {
      
      message.error(t('revisionPageDetail.errorAddingItemManual'));
    }
  };


  // ----------------------------------------------------
  // ТАБЛИЦА: КОЛОНКИ
  // ----------------------------------------------------
  
  const displayedItems = useMemo(() => {
    let items: RevisionItem[] = [];

    if (mode === 'edit') {
        items = revisionItems.filter(item =>
            item.name.toLowerCase().includes(nameFilter.toLowerCase())
        );
    } else if (mode === 'compare' && comparisonData) {
        if (comparisonFilter === 'passed') items = comparisonData.passed;
        else if (comparisonFilter === 'failed') items = comparisonData.failed;
        else items = [...comparisonData.passed, ...comparisonData.failed];
    }
    
    return items;
  }, [revisionItems, nameFilter, mode, comparisonData, comparisonFilter]);
  
  // Карта типов ревизии с локализацией (используется старый префикс, так как это данные не для текущей страницы, а общая информация)
  const revisionTypeMap: { [key: number]: string } = {
    0: t('revisionPage.revisionTypes.selective'),
    1: t('revisionPage.revisionTypes.allProducts'),
    2: t('revisionPage.revisionTypes.byBrand'),
    3: t('revisionPage.revisionTypes.byCategory'),
    4: t('revisionPage.revisionTypes.bySupplier'),
  };

  // Локализованные базовые колонки
  const baseColumns: ColumnsType<RevisionItem> = [
    { 
        
        title: t('revisionPageDetail.table.item'), 
        dataIndex: 'name', 
        key: 'name', 
        sorter: (a, b) => a.name.localeCompare(b.name),
        defaultSortOrder: 'ascend' as const 
    },
    {
        
        title: t('revisionPageDetail.table.actualQuantity'),
        dataIndex: 'units',
        key: 'units',
        width: 150,
        render: (_, record) => (
          <QuantityEditor
            record={record}
            revision={revision}
            onUpdate={handleUpdateQuantity}
          />
        ),
        sorter: (a, b) => a.units - b.units,
    },
    { 
        
        title: t('revisionPageDetail.table.systemQuantity'), 
        dataIndex: 'unitswas', 
        key: 'unitswas', 
        sorter: (a, b) => (a.unitswas || 0) - (b.unitswas || 0),
        width: 150,
    },
  ];

  // Локализованные дополнительные колонки
  const compareColumns: ColumnsType<RevisionItem> = [
    ...baseColumns.map(col => {
        if (col.key === 'units') {
            return {
                ...col,
                render: (units: number) => <Text>{units}</Text>,
            };
        }
        return col;
    }),
    {
      
      title: t('revisionPageDetail.table.changeDuringRevision'),
      dataIndex: 'units_diff',
      key: 'units_diff',
      sorter: (a, b) => (a.units_diff || 0) - (b.units_diff || 0),
      render: (diff: number) => {
        /* const color = diff < 0 ? 'red' : diff > 0 ? 'green' : 'inherit';
        return <Text style={{ color }}>{diff > 0 ? `+${diff}` : diff}</Text>;
     */ 
      const diffClass = diff < 0 ? styles.diffRed : diff > 0 ? styles.diffGreen : '';
        return <Text className={diffClass}>{diff > 0 ? `+${diff}` : diff}</Text>;
      },
      width: 150,
    },
    {
      
      title: t('revisionPageDetail.table.status'),
      key: 'status',
      render: (_, record) => {
        const isFailed = (record.units_diff !== undefined) && record.units_diff !== 0;
        /* return (
          <Text strong style={{ color: isFailed ? 'red' : 'green' }}>
          */  
        const statusClass = isFailed ? styles.statusTextRed : styles.statusTextGreen;
        return (
          <Text strong className={statusClass}> 

            {isFailed ? t('revisionPageDetail.status.discrepancyFound') : t('revisionPageDetail.status.noDiscrepancy')}
          </Text>
        );
      },
      width: 150,
    },
  ];

  const columns = mode === 'edit' ? baseColumns : compareColumns;

  const rowSelection = mode === 'edit' ? {
    selectedRowKeys,
    type: 'radio' as const,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys);
    },
  } : undefined;


  // ----------------------------------------------------
  // РЕНДЕР: ДЕТАЛИ И КНОПКИ
  // ----------------------------------------------------
  
  const renderTopActions = () => (
    <Space className={styles.topActionsSpace}>
      
      <Title level={3} className={styles.titleNoMargin}>
        
        {t('revisionPageDetail.title')} №{revision.revisionnumber}
      </Title>
    </Space>
  );

  const renderComparisonStatusBox = () => {
      if (!comparisonData) return null;

      const hasFailures = comparisonData.itemFailCount > 0;
      /* const bgColor = hasFailures ? '#ffe9e9' : '#e9ffe9'; 
      const borderColor = hasFailures ? 'red' : 'green';
      const textColor = hasFailures ? 'red' : 'green';

      return (
        <Card style={{ marginBottom: 20, border: `1px solid ${borderColor}`, backgroundColor: bgColor }} variant="borderless">
            <Title level={5} style={{ color: textColor, margin: 0 }}>
          */ 
      
      const cardClass = hasFailures ? styles.comparisonStatusBoxFailure : styles.comparisonStatusBoxSuccess;
      const titleClass = hasFailures ? styles.statusTextRed : styles.statusTextGreen;

      return (
        <Card className={`${styles.comparisonStatusBox} ${cardClass}`} variant="borderless">
            <Title level={5} className={`${styles.comparisonStatusTitle} ${titleClass}`}>
            
                {hasFailures ? t('revisionPageDetail.status.discrepancyFound') : t('revisionPageDetail.status.noDiscrepancy')}
            </Title>
        </Card>
      );
  };

  // Вспомогательная функция для определения класса цвета текста кнопки
  const getButtonTextColorClass = (isSelected: boolean, btnColor: string) => {
      if (isSelected) {
          return styles.colorWhite;
      }
      if (btnColor === 'red') return styles.colorRed;
      if (btnColor === 'green') return styles.colorGreen;
      return styles.colorBlue;
  };
  
  const renderComparisonControls = () => {
    if (mode !== 'compare' || !comparisonData) return null;
    
    return (
      <Card className={styles.compareControlsCard} variant="borderless">
        <Space direction="vertical" className={styles.fullWidth}>
            <Card className={styles.blueInfoCardBase} variant="borderless">
                <Paragraph className={styles.blueInfoCardParagraph}>
                    
                    **{t('revisionPageDetail.compareControls.important')}** {t('revisionPageDetail.compareControls.warningText')}
                    <ol>
                        <li>{t('revisionPageDetail.compareControls.step1')}</li>
                        <li>{t('revisionPageDetail.compareControls.step2')}</li>
                    </ol>
                </Paragraph>
            </Card>

            <Space size="large" className={styles.compareControlsInnerSpace}>
                {[
                    { key: 'all' as ComparisonFilter, label: t('revisionPageDetail.compareControls.all'), count: comparisonData.itemCount, color: 'blue' },
                    { key: 'failed' as ComparisonFilter, label: t('revisionPageDetail.compareControls.discrepancies'), count: comparisonData.itemFailCount, color: 'red' },
                    { key: 'passed' as ComparisonFilter, label: t('revisionPageDetail.compareControls.noDiscrepancies'), count: comparisonData.itemPassCount, color: 'green' },
                ].map(btn => {
                  const isSelected = comparisonFilter === btn.key;
                  return (
                    <Button
                        key={btn.key}
                        onClick={() => setComparisonFilter(btn.key)}
                        type={comparisonFilter === btn.key ? 'primary' : 'default'}
                        className={styles.compareButton}
                        style={{ borderColor: btn.color }}
                    >
                        <Space direction="vertical" className={styles.compareButtonContainer}>
                            <Text strong className={`${styles.compareButtonTextSmall} ${getButtonTextColorClass(isSelected, btn.color)}`}> 
                                {btn.label}
                            </Text>
                            <Text strong className={`${styles.compareButtonTextLarge} ${getButtonTextColorClass(isSelected, btn.color)}`}> 
                                {btn.count}
                            </Text>
                        </Space>
                    </Button>
                )})}
                
                {/* Кнопка "Добавить комментарий" в режиме сравнения */}
                {/* <Button 
                    onClick={() => setIsCommentModalVisible(true)} 
                    disabled={comparisonData.itemFailCount === 0}
                    style={{ height: 70, width: 140 }}
                >
                    
                    {t('revisionPageDetail.addCommentButton')}
                </Button> */}
            </Space>
        </Space>
      </Card>
    );
  };

  return (
    <Card variant="borderless">
      
      {renderTopActions()}
      
      <Space direction="vertical" className={styles.fullWidthMb20}>
        <Text>
          
          <Text strong>{t('revisionPageDetail.point')}:</Text> {revision.point_name}
        </Text>
        <Text className={styles.mb10}> 
          
          <Text strong>{t('revisionPageDetail.type')}:</Text> {revisionTypeMap[revision.type] || t('revisionPageDetail.typeUnknown')}
        </Text>
        
        {/* НОВОЕ МЕСТО ДЛЯ ОСНОВНЫХ КНОПОК ДЕЙСТВИЙ */}
        <Space className={styles.mb10}> 
            {mode === 'edit' ? (
                <>
                
                <Button onClick={onBack}>← {t('revisionPageDetail.backToList')}</Button>
                <Button 
                    onClick={() => setIsDeleteConfirmVisible(true)} 
                    danger
                >
                    
                    {t('revisionPageDetail.deleteRevisionButton')}
                </Button>

                {selectedRowKeys.length > 0 && (
                    <Button 
                        onClick={handleDeleteItems} 
                        danger 
                    >
                        
                        {t('revisionPageDetail.deleteItemButton', { count: selectedRowKeys.length })}
                    </Button>
                )}

                <Button
                    type="primary"
                    onClick={handleFinishAddingItems}
                    disabled={revisionItems.length === 0 || isLoading}
                    loading={isLoading}
                >
                    
                    {t('revisionPageDetail.finishAddingItemsButton')}
                </Button>
                </>
            ) : (
                <>
                     <Button onClick={handleGoBackToEdit}>
                         
                        ← {t('revisionPageDetail.backToEditButton')}
                    </Button>
                    
                    <Button onClick={handleExportExcel}>
                        
                        {t('revisionPageDetail.exportExcelButton')}
                    </Button>
                   
                    <Button
                        type="primary"
                        onClick={() => setIsConfirmFinishVisible(true)}
                        danger={!!comparisonData?.itemFailCount}
                    >
                        
                        {t('revisionPageDetail.finishRevisionButton')}
                    </Button>
                </>
            )}
        </Space>

        {/* Голубая рамка с предупреждением (только в режиме редактирования) */}
        {mode === 'edit' && (
          <Card className={styles.editWarningCard} variant="borderless">
            <Paragraph className={styles.blueInfoCardParagraph}>
              
              {t('revisionPageDetail.editWarning')}
            </Paragraph>
          </Card>
        )}
      </Space>

      {/* Управление товарами в режиме редактирования */}
      {mode === 'edit' && (
        <Space className={styles.searchActionsSpace}>
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => {
              fetchAvailableProducts();
              setIsAddModalVisible(true);
          }}>
            
            {t('revisionPageDetail.addItemButton')}
          </Button>
          <Space>
            <Search
                
                placeholder={t('revisionPageDetail.searchBarcodePlaceholder')}
                value={barcodeFilter}
                onChange={(e) => setBarcodeFilter(e.target.value)}
                onSearch={() => handleSearch(nameFilter, barcodeFilter)}
                enterButton={<SearchOutlined />}
                className={styles.searchBarcodeInput}
            />
            <Search
              
              placeholder={t('revisionPageDetail.searchNamePlaceholder')}
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              onSearch={() => handleSearch(nameFilter, barcodeFilter)}
              enterButton={<SearchOutlined />}
               className={styles.searchNameInput}
            />
          </Space>
        </Space>
      )}

      {/* Секция сравнения */}
      {mode === 'compare' && renderComparisonStatusBox()}
      {mode === 'compare' && renderComparisonControls()}

      {/* Таблица товаров ревизии */}
      {displayedItems.length > 0 ? (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={displayedItems}
          loading={isLoading}
          pagination={false}
          scroll={{ y: 500 }}
          rowSelection={rowSelection}
        />
      ) : (
        <Card className={styles.noItemsCard} variant="outlined">
            
            <Text type="secondary">{t('revisionPageDetail.noItemsInRevision')}</Text>
        </Card>
      )}

      {/* ---------------------------------------------------- */}
      {/* МОДАЛЬНЫЕ ОКНА */}
      {/* ---------------------------------------------------- */}

      {/* 1. Модальное окно ручного добавления товара */}
      <Modal
        
        title={t('revisionPageDetail.manualAddModal.title')}
        open={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onOk={handleManualAdd}
        
        okText={t('revisionPageDetail.manualAddModal.addButton')}
        cancelText={t('revisionPageDetail.manualAddModal.cancelButton')}
        confirmLoading={manualLoading}
      >
        <Space direction="vertical" className={styles.fullWidth}>
            
            <Text strong>{t('revisionPageDetail.manualAddModal.barcode')}</Text>
            <Select
              className={styles.fullWidth}
              showSearch
              
              placeholder={t('revisionPageDetail.manualAddModal.selectBarcodePlaceholder')}
              loading={manualLoading}
              value={selectedProduct?.code}
              onChange={(code) => {
                  const selected = availableProducts.find(p => p.code === code);
                  handleProductSelect(selected?.id || '' );
              }}
              filterOption={(input, option) =>
                  (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableProducts.map(p => (
                <Option key={p.id} value={p.code}>
                  {p.code}
                </Option>
              ))}
            </Select>
            
            
            <Text strong>{t('revisionPageDetail.manualAddModal.itemName')}</Text>
            <Select
              className={styles.fullWidth}
              showSearch
              
              placeholder={t('revisionPageDetail.manualAddModal.selectNamePlaceholder')}
              loading={manualLoading}
              value={selectedProduct?.name}
              onChange={(name) => {
                  const selected = availableProducts.find(p => p.name === name);
                  handleProductSelect(selected?.id || '');
              }}
              filterOption={(input, option) =>
                  (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableProducts.map(p => (
                <Option key={p.id} value={p.name}>
                  {p.name}
                </Option>
              ))}
            </Select>

            
            <Text strong>{t('revisionPageDetail.manualAddModal.quantity')}</Text>
           
            <InputNumber
                min={0}
                value={manualQuantity}
                onChange={(val) => setManualQuantity(val || 0)}
                className={styles.fullWidth}
                onKeyDown={handleKeyDown} 
                parser={(value) => {
                    if (!value) return 0;
                    const cleanedValue = String(value).replace(/[^\d]/g, ''); 
                    return Number(cleanedValue); 
                }}
                formatter={(value) => {
                    if (!value) return '';
                    return String(value).replace(/[^\d]/g, ''); 
                }}
            />
        </Space>
      </Modal>
      
      {/* 2. Модальное окно подтверждения удаления */}
      <Modal
        
        title={t('revisionPageDetail.confirmDelete.title')}
        open={isDeleteConfirmVisible}
        onCancel={() => setIsDeleteConfirmVisible(false)}
        onOk={handleDeleteRevision}
        okButtonProps={{ danger: true }}
      >
        
        {t('revisionPageDetail.confirmDelete.text', { number: revision.revisionnumber })}
      </Modal>

      {/* 3. Модальное окно подтверждения завершения ревизии */}
      <Modal
        
        title={t('revisionPageDetail.confirmFinishModal.title')}
        open={isConfirmFinishVisible}
        onCancel={() => setIsConfirmFinishVisible(false)}
        onOk={handleFinishRevision}
        okButtonProps={{ danger: true }}
        
        okText={t('revisionPageDetail.confirmFinishModal.finishButton')}
        cancelText={t('revisionPageDetail.confirmFinishModal.cancelButton')}
      >
        <Paragraph>
            
            {t('revisionPageDetail.confirmFinishModal.warning1')}
        </Paragraph>
        <Paragraph>
            
            {t('revisionPageDetail.confirmFinishModal.warning2')}
        </Paragraph>
      </Modal>

      {/* 4. Модальное окно успешного завершения (с кнопками отчета) */}
      <Modal
          
          title={t('revisionPageDetail.finishSuccessModal.title')}
          open={isReportModalVisible}
          onCancel={() => setIsReportModalVisible(false)}
          footer={[
              <Button key="startNew" onClick={() => {
                  setIsReportModalVisible(false);
                  onBack(); 
              }}>
                  
                  {t('revisionPageDetail.finishSuccessModal.startNewButton')}
              </Button>,
              <Button key="viewReport" type="primary" onClick={() => {
                  setIsReportModalVisible(false);
                  onBack();
              }}>
                  
                  {t('revisionPageDetail.finishSuccessModal.viewReportButton')}
              </Button>,
          ]}
      >
          
          {t('revisionPageDetail.finishSuccessModal.text', { number: revision.revisionnumber })}
      </Modal>
      
      {/* 5. Модальное окно добавления комментария */}
      <Modal
          
          title={t('revisionPageDetail.commentModal.title')}
          open={isCommentModalVisible}
          onCancel={() => setIsCommentModalVisible(false)}
          footer={[
              <Button key="back" onClick={() => setIsCommentModalVisible(false)}>{t('revisionPageDetail.commentModal.cancelButton')}</Button>,
              <Button 
                  key="all" 
                  onClick={() => handleAddComment('allFail')} 
                  disabled={!commentText}
              >
                  {t('revisionPageDetail.commentModal.allFailButton')}
              </Button>,
              <Button 
                  key="selected" 
                  type="primary" 
                  onClick={() => handleAddComment('selected')}
                  disabled={!commentText || selectedRowKeys.length === 0}
              >
                  {t('revisionPageDetail.commentModal.selectedButton', { count: selectedRowKeys.length })}
              </Button>,
          ]}
      >
          <Input.TextArea
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('revisionPageDetail.commentModal.placeholder')}
              className={styles.commentTextArea}
          />
          <Card className={styles.blueInfoCardBase} variant="borderless">
            <Paragraph className={styles.blueInfoCardParagraph}>
              {t('revisionPageDetail.commentModal.warning')}
            </Paragraph>
          </Card>
      </Modal>
    </Card>
  );
};

export default RevisionDetailsContent;