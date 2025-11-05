import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Tooltip,
  Collapse,
  InputNumber,
  message,
  TreeSelect,
  Row,
  Col,
  Tag,
} from 'antd';
import {
  SearchOutlined,
  QuestionCircleOutlined,  
} from '@ant-design/icons';
import useApiRequest from '../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next'; 
import styles from './Products.module.css';

interface Unit {
  id: string;
  name: string;
  shortname: string;
  fps: number;
}
interface Category {
  value: string;
  label: string;
  children?: Category[];
}
interface Brand {
  id: string;
  brand: string;
}
interface Attribute {
  id: string;
  values: string;
  format: 'TEXT' | 'DATE' | 'SPR';
  sprvalues: string[];
}
interface Tax {
  id: string;
  name: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;

  onBarcodeGenerated?: (barcode: string) => void;

  productId?: string;
  barcode?: string;
  name?: string;
  isEdit?: boolean;
}

const ProductFormModal: React.FC<Props> = ({ visible, onClose, onSuccess ,onBarcodeGenerated, productId, barcode, name, isEdit}) => {
  const [form] = Form.useForm();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const { t } = useTranslation();

  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(false);
  const [piece, setPiece] = useState<boolean>(false);

  const [barcodes, setBarcodes] = useState<string[]>([]);

  const [barcodeInput, setBarcodeInput] = useState('');

  // --- постоянные ---
  const [detailsListCode, setDetailsListCode] = useState<string | null>(null);
  const [detailsValue, setDetailsValue] = useState<
    { code: string; name: string; value: string }[]
  >([]);
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);
  const [selectedDetailValue, setSelectedDetailValue] = useState<string>('');

  // --- партионные ---
  const [attributesListCode, setAttributesListCode] = useState<string | null>(null);
  const [attributesValue, setAttributesValue] = useState<
    { code: string; name: string; value: string }[]
  >([]);
  const [selectedAttr, setSelectedAttr] = useState<string | null>(null);
  const [selectedAttrValue, setSelectedAttrValue] = useState<string>('');

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  
//  Загружаем справочники
useEffect(() => {
  if (!visible) return;

  const loadDictionaries = async () => {
    try {
      const [u, c, b, a, t] = await Promise.all([
        sendRequest(`${API_URL}/api/products/unitspr`, { headers: getHeaders() }),
        sendRequest(`${API_URL}/api/categories/margin_plan`, { headers: getHeaders() }),
        sendRequest(`${API_URL}/api/brand/margin`, { headers: getHeaders() }),
        sendRequest(`${API_URL}/api/attributes?deleted=false`, { headers: getHeaders() }),
        sendRequest(`${API_URL}/api/taxes`, { headers: getHeaders() }),
      ]);

      setUnits(u);
      setCategories(c);
      setBrands(b);
      setAttributes(a);
      setTaxes(t);

      if (isEdit && (productId || barcode)) {
        // загрузка товара и установка полей ...
      } else {
        // Новая запись — устанавливаем дефолтный налог (например '1')
        form.setFieldsValue({
          taxid: '1', // или другой id, который хочешь по умолчанию
        });
      }
    } catch {
      message.error(t('productForm.loadDictionariesError'));
    }
  };

  loadDictionaries();
}, [visible]);

// Загружаем данные товара (когда всё готово)
useEffect(() => {
  if (!visible || !isEdit || taxes.length === 0) return;

  
  const loadProduct = async () => {
    const params = new URLSearchParams();
    if (productId) params.append('id', productId);
    if (barcode) params.append('barcode', barcode);
    if (name) params.append('name', name);

    const data = await sendRequest(`${API_URL}/api/nomenclature?${params.toString()}`, {
      headers: getHeaders(),
    });    

    form.setFieldsValue({
      name: data.name,
      code: data.code,
      category: data.categoryid !== '0' ? data.categoryid : undefined,
      brand: data.brandid !== '0' ? data.brandid : undefined,
      taxid: data.taxid !== undefined && data.taxid !== null ? String(data.taxid) : undefined,
      unit: data.unitsprid,
      piece: data.piece,
      pieceinpack: data.pieceinpack || undefined,
      tnved: data.cnofeacode || undefined,      
    });

     setPiece(Boolean(data.piece));

    setAttributesValue(
  (data.attributescaption || []).map((item: any) => ({
    code: String(item.attribute_id),
    name: item.attribute_name,
    value: item.attribute_value || '',
  }))
);

setDetailsValue(
  (data.detailscaption || []).map((item: any) => ({
    code: String(item.attribute_id),
    name: item.attribute_name,
    value: item.attribute_value || '',
  }))
);

  setAttributesListCode(data.attributes);

  setDetailsListCode(data.details);



    setBarcodes(data.bar || []);
    
    
  };



  loadProduct();
}, [visible, isEdit, taxes]);

  // === Генерация штрих-кода ===
  const handleGenerateBarcode = async () => {
    try {
      const code = await sendRequest(`${API_URL}/api/invoice/newbarcode`, { headers: getHeaders() });
      const full = `20000${String(code).padStart(7, '0')}`;
      form.setFieldValue('code', full);

      if (onBarcodeGenerated) {
      onBarcodeGenerated(full);
    }

    } catch {
      message.error(t('productForm.barcodeGenerationError'));
    }
  };

  // === Проверка наименования ===
  const handleSearchName = async () => {
    const name = form.getFieldValue('name');
    if (!name) return;
    try {
      const res = await sendRequest(
        `${API_URL}/api/products/searchbyname?productName=${encodeURIComponent(name)}`,
        { headers: getHeaders() }
      );
      if (Array.isArray(res) && res.length > 0) {
         message.warning(t('productForm.nameExistsWarning'));
      } else {
        message.info(t('productForm.nameAvailableInfo'));
      }
    } catch {
      message.error(t('productForm.nameCheckError'));
    }
  };

  // === Продажа поштучно ===
  const handlePieceChange = (checked: boolean) => {
  setPiece(checked);

  if (checked) {
    // Ищем unit по id (например, id = 2)
    const packUnit = units.find((u) => u.id === "2");

    if (packUnit) {
      form.setFieldValue('unit', packUnit.id);
    } else {
       message.warning(t('productForm.unitNotFoundWarning'));
    }

    form.setFieldValue('pieceinpack', 2);
  } else {
    form.setFieldValue('unit', undefined);
    form.setFieldValue('pieceinpack', undefined);
  }
};

  // === Добавление постоянной характеристики ===
  
  const handleAddDetail = async () => {
  if (!selectedDetail || !selectedDetailValue) return;

  //  Проверка на дубликаты
  if (detailsValue.some((d) => d.code === selectedDetail)) {
     message.warning(t('productForm.duplicateAttributeWarning'));
    return;
  }

  //  Формируем тело запроса
  const body: any = {
    attribcode: selectedDetail,
    value: selectedDetailValue,
  };

  //  Добавляем listcode только если он уже есть и не равен "0"
  if (detailsListCode && detailsListCode !== '0') {
    body.listcode = detailsListCode;
  }

  try {
    const res = await sendRequest(`${API_URL}/api/attributes/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (res.code === 'success') {
      //  Обновляем listcode, если сервер вернул реальный идентификатор
      if (res.text && res.text !== '0') {
        setDetailsListCode(res.text);
      }

      //  Добавляем новую характеристику в список
      const attr = attributes.find((a) => a.id === selectedDetail);
      setDetailsValue((prev) => [
        ...prev,
        {
          code: selectedDetail,
          name: attr?.values || '',
          value: selectedDetailValue,
        },
      ]);

      //  Сброс локальных полей
      setSelectedDetail(null);
      setSelectedDetailValue('');
     message.success(t('productForm.attributeAdded'));
    }
  } catch {
    message.error(t('productForm.attributeAddError'));
  }
};


  // === Удаление постоянной характеристики ===
  const handleDeleteDetail = async (code: string) => {
    if (!detailsListCode) return;
    try {
      await sendRequest(`${API_URL}/api/attributes/delete`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ listcode: detailsListCode, attribcode: code }),
      });
      setDetailsValue((prev) => prev.filter((d) => d.code !== code));
      message.success(t('productForm.deleted'));
    } catch {
      message.error(t('productForm.deleteError'));
    }
  };

  // === Добавление партийного атрибута ===

const handleAddAttr = async () => {
  if (!selectedAttr) return;
  if (attributesValue.some((d) => d.code === selectedAttr)) {
    message.warning(t('productForm.attributeAlreadyAdded'));
    return;
  }

  const attr = attributes.find((a) => a.id === selectedAttr);
  const currentDate = attr?.format === 'DATE'
    ? new Date().toISOString().split('T')[0]
    : '';

  //  Формируем тело запроса
  const body: any = {
    attribcode: selectedAttr,
    value: currentDate,
  };

  //  Добавляем listcode ТОЛЬКО если он существует и не равен "0"
  if (attributesListCode && attributesListCode !== '0') {
    body.listcode = attributesListCode;
  }

  try {
    const res = await sendRequest(`${API_URL}/api/attributes/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (res.code === 'success') {
      // если с сервера пришёл listcode, и он не "0" — сохраняем
      if (res.text && res.text !== '0') {
        setAttributesListCode(res.text);
      }

      setAttributesValue((prev) => [
        ...prev,
        { code: selectedAttr, name: attr?.values || '', value: currentDate },
      ]);
      setSelectedAttr(null);
      setSelectedAttrValue('');
      message.success(t('productForm.added1'));
    }
  } catch {
     message.error(t('productForm.addError'));
  }
};


  // === Удаление партийного атрибута ===
  const handleDeleteAttr = async (code: string) => {
    if (!attributesListCode) return;
    try {
      await sendRequest(`${API_URL}/api/attributes/delete`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ listcode: attributesListCode, attribcode: code }),
      });
      setAttributesValue((prev) => prev.filter((d) => d.code !== code));
     message.success(t('productForm.deleted'));
    } catch {
       message.error(t('productForm.deleteError'));
    }
  };

  // === Сохранение товара ===
  
  const handleSubmit = async () => {
  try {
    const values = await form.validateFields();
    setLoading(true);

    const body = {
      product: {
        id: productId || '',
        code: values.code,
        name: values.name,
        category: values.category || '0',
        brand: values.brand || '0',
        taxid: values.taxid || '0',
        unitsprid: values.unit,
        piece,
        pieceinpack: values.pieceinpack || 0,
        details: detailsListCode,
        attributes: attributesListCode,
        attributesValue,
        detailsValue,
        cnofeacode: values.tnved || null,
      },
    };

    const endpoint = isEdit
      ? `${API_URL}/api/products/update` 
      : `${API_URL}/api/products/create`;

    await sendRequest(endpoint, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    message.success(isEdit ? t('productForm.updated') : t('productForm.added'));
    onSuccess?.();
    form.resetFields();
    setPiece(false);
    onClose();
  } catch (e) {
    console.error(e);
    message.error(t('productForm.saveError'));
  } finally {
    setLoading(false);
  }
};


  // === Отображение поля значения ===
  const renderValueInput = (
    selectedId: string | null,
    value: string,
    onChange: (v: string) => void
  ) => {
    const attr = attributes.find((a) => a.id === selectedId);
    if (!attr) return <Input placeholder={t('productForm.enterValue')} value={value} onChange={(e) => onChange(e.target.value)} />;
    if (attr.format === 'SPR')
      return (
        <Select
          placeholder={t('productForm.selectValue')}
          value={value || undefined}
          options={(attr.sprvalues || []).map((v) => ({ label: v, value: v }))}
          onChange={onChange}
          allowClear
        />
      );
    if (attr.format === 'DATE')
      return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />;
    return <Input placeholder={t('productForm.enterValue')} value={value} onChange={(e) => onChange(e.target.value)} />;
  };

  const handleAddBarcode = async () => {
    const trimmed = barcodeInput.trim();
    const mainCode = form.getFieldValue('code');
    if (!trimmed) return;

    if (trimmed === mainCode) {
      message.warning(t('productForm.sameBarcode'));
      return;
    }
    if (barcodes.includes(trimmed)) {
      message.warning(t('productForm.duplicateBarcode'));
      return;
    }

    try {
      const res = await sendRequest(`${API_URL}/api/products/add_products_barcode`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          product: productId,
          barcode: trimmed,
          delete: false,
        }),
      });

      if (res.code === 'success') {
        setBarcodes((prev) => [...prev, trimmed]);
        message.success(t('productForm.barcodeAdded'));
        setBarcodeInput('');
      }
    } catch {
      message.error(t('productForm.barcodeAddError'));
    }
  };

  return (
    <Modal
      title={isEdit ? t('productForm.editTitle') : t('productForm.addTitle')}
      open={visible}
      onCancel={() => {
        form.resetFields();
        setPiece(false);
        setDetailsValue([]);
        setAttributesValue([]);
        onClose();
      }}
      width={700}
      footer={null}
      destroyOnHidden
    >
      <Form layout="vertical" form={form}>
        {/* === Наименование === */}
        <Form.Item
          label={t('productForm.name')}
          name="name"
          rules={[{ required: true, message: t('productForm.enterNameMessage') }]}
         className={styles.formItemName}
        >
          <Input
            placeholder={t('productForm.enterName')}
            addonAfter={<SearchOutlined onClick={handleSearchName} />}
          />
        </Form.Item>

        {/* === Штрих-код + Налоговая категория === */}
        <Row gutter={12} align="bottom">
          <Col flex="360px">
            <Form.Item
              label={t('productForm.barcode')}
              name="code"
              rules={[{ required: true, message: t('productForm.enterBarcodeMessage') }]}
              className={styles.barcodeInput}
            >
              <Input
                disabled={isEdit}
                placeholder={t('productForm.enterBarcode')}
                addonAfter={
                  !isEdit && (
                    <Button onClick={handleGenerateBarcode}>
                      {t('productForm.generate')}
                    </Button>
                  )
                }
              />
            </Form.Item>
          </Col>
          <Col flex="160px">
            <Form.Item
              label={t('productForm.taxCategory')}
              name="taxid"
              rules={[{ required: true, message: t('productForm.selectTaxCategory') }]}
              className={styles.barcodeInput}
            >
              <Select
                placeholder={t('productForm.selectCategory')}
                options={taxes.map((t) => ({ label: t.name, value: t.id }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* === Единица измерения + Продажа поштучно === */}
        <Row gutter={12} align="middle" className={styles.rowMarginTop}>
          <Col flex="200px">
            <Form.Item
              label={t('productForm.unit')}
              name="unit"
              className={styles.barcodeInput}
              rules={[{ required: true, message: t('productForm.selectUnitMessage') }]}
            >
              <Select
                placeholder={t('productForm.selectUnit')}
                allowClear
                options={units.map((u) => ({ label: u.name, value: u.id }))}
                disabled={piece}
              />
            </Form.Item>
          </Col>

          <Col flex="0 0 auto" className={styles.checkboxWrapper}>
            <Form.Item name="piece" valuePropName="checked"
             className={styles.barcodeInput}>
              <Checkbox onChange={(e) => handlePieceChange(e.target.checked)}>
                {t('productForm.pieceSale')}{' '}
                <Tooltip title={t('productForm.pieceTooltip')}>
                  <QuestionCircleOutlined />
                </Tooltip>
              </Checkbox>
            </Form.Item>
          </Col>
        </Row>

        {/* === Количество в упаковке === */}
        {piece && (
          <Form.Item
            label={t('productForm.qtyInPack')}
            name="pieceinpack"
            rules={[
              { required: true, type: 'number', min: 2, message: t('productForm.min2InPackMessage') },
            ]}
            className={styles.fixedWidth200}
          >
            <InputNumber
              min={2}
              className={styles.fullWidth}
              onKeyPress={(e) => {
                if (!/[0-9]/.test(e.key)) e.preventDefault();
              }}
              onPaste={(e) => {
                const paste = e.clipboardData.getData('Text');
                if (!/^\d+$/.test(paste)) e.preventDefault();
              }}
            />
          </Form.Item>
        )}

        {/* === Дополнительные штрих-коды (если редактирование) === */}
       {isEdit && (
  <Collapse
    size="small"
    className={styles.collapseWrapper}
    items={[
      {
        key: 'barcodes',
        label: t('productForm.additionalBarcodes'),
        children: (() => {
          const handleAddBarcode = async () => {
            const trimmed = barcodeInput.trim();
            const mainCode = form.getFieldValue('code');
            if (!trimmed) return;

            // Проверки
            if (trimmed === mainCode) {
              message.warning(t('productForm.sameBarcode'));
              return;
            }
            if (barcodes.includes(trimmed)) {
              message.warning(t('productForm.duplicateBarcode'));
              return;
            }

            try {
              const res = await sendRequest(`${API_URL}/api/products/add_products_barcode`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                  product: productId,
                  barcode: trimmed,
                  delete: false,
                }),
              });

              if (res.code === 'success') {
                setBarcodes((prev) => [...prev, trimmed]);
                message.success(t('productForm.barcodeAdded'));
                setBarcodeInput('');
              }
            } catch {
              message.error(t('productForm.barcodeAddError'));
            }
          };

          // === Отфильтрованные баркоды (исключая основной)
          const filteredBarcodes = barcodes.filter(
            (b) => b !== form.getFieldValue('code')
          );

          return (
            <div className={styles.additionalBarcodesWrapper}>
              <Form.Item className={styles.spaceMarginBottom}>
                <Input.Search
                  placeholder={t('productForm.enterNewBarcode')}
                  enterButton={t('productForm.add')}
                  allowClear
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onSearch={handleAddBarcode}
                />
              </Form.Item>

              {filteredBarcodes.length === 0 ? (
                <div className={styles.textGray}>
                  {t('productForm.noAdditionalBarcodes')}
                </div>
              ) : (
                <div className={styles.additionalBarcodesContainer}>
                  {filteredBarcodes.map((code) => (
                    <Tag
                      key={code}
                      closable
                      onClose={async () => {
                        try {
                          await sendRequest(`${API_URL}/api/products/add_products_barcode`, {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify({
                              product: productId,
                              barcode: code,
                              delete: true,
                            }),
                          });
                          setBarcodes((prev) => prev.filter((b) => b !== code));
                          message.success(t('productForm.barcodeDeleted'));
                        } catch {
                          message.error(t('productForm.barcodeDeleteError'));
                        }
                      }}
                      color="green"
                    >
                      {code}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          );
        })(),
      },
    ]}
  />
)}


        {/* === Дополнительные параметры === */}
        <Collapse
          size="small"
          className={styles.collapseWrapper}
          items={[
            {
              key: '1',
              label: t('productForm.additionalParams'),
              children: (
                <div className={styles.paddingInline8}>
                  <Row gutter={[12, 0]}>
                    <Col flex="300px">
                      <Form.Item label={t('productForm.category')} 
                      name="category" 
                      className={styles.spaceMarginBottom}>
                        <TreeSelect
                          treeData={categories}
                          placeholder={t('productForm.noCategory')}
                          allowClear
                          showSearch
                          treeDefaultExpandAll
                          className={styles.fullWidth}
                        />
                      </Form.Item>
                    </Col>

                    <Col flex="250px">
                      <Form.Item label={t('productForm.brand')} name="brand" 
                      className={styles.spaceMarginBottom}>
                        <Select
                          placeholder={t('productForm.noBrand')}
                          options={brands.map((b) => ({ label: b.brand, value: b.id }))}
                          className={styles.fullWidth}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row>
                    <Col flex="250px">
                      <Form.Item
                        label={t('productForm.tnved')}
                        name="tnved"
                        rules={[{ pattern: /^\d*$/, message: t('productForm.numbersOnly') }]}
                        className={styles.barcodeInput}
                      >
                        <InputNumber
                          placeholder={t('productForm.enterTnved')}
                          onKeyPress={(e) => {
                            if (!/[0-9]/.test(e.key)) e.preventDefault();
                          }}
                          onPaste={(e) => {
                            const paste = e.clipboardData.getData('Text');
                            if (!/^\d+$/.test(paste)) e.preventDefault();
                          }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              ),
            },
          ]}
        />

        {/* === Атрибуты === */}
<Collapse
  size="small"
  className={styles.collapseWrapper}
  items={[
    {
      key: 'attrs',
      label: t('productForm.attrs'),
      children: (
        <>
          {/* === Постоянные характеристики === */}
          <div className={styles.constantAttrsWrapper}>
            <h4 className={styles.spaceMarginBottom}>{t('productForm.constantAttrs')}</h4>
            <Row gutter={8} wrap={false}>
              <Col flex="1 1 380px">
                <Select
                  placeholder={t('productForm.attribute')}
                  value={selectedDetail || undefined}
                  options={attributes.map((a) => ({
                    label: a.values,
                    value: a.id,
                  }))}
                  onChange={(val) => {
                    setSelectedDetail(val);
                    setSelectedDetailValue('');
                  }}
                  allowClear
                  className={styles.fullWidth}
                />
              </Col>
              <Col flex="0 0 180px">
                {renderValueInput(selectedDetail, selectedDetailValue, setSelectedDetailValue)}
              </Col>
              <Col flex="0 0 auto">
                <Button type="primary" onClick={handleAddDetail}>
                  {t('productForm.add')}
                </Button>
              </Col>
            </Row>

            <div className={styles.marginTop10}>
              {detailsValue.map((item) => (
                <Tag
                  key={item.code}
                  closable
                  onClose={() => handleDeleteDetail(item.code)}
                  color="blue"
                  className={styles.tagMargin}
                >
                  {item.name}: {item.value}
                </Tag>
              ))}
            </div>
          </div>

          <div className={styles.borderTopWithMargin} />

          {/* === Партийные атрибуты === */}
          <div>
            <h4 className={styles.spaceMarginBottom}>{t('productForm.batchAttrs')}</h4>
            <Row gutter={8} wrap={false}>
              <Col flex="1 1 300px">
                <Select
                  placeholder={t('productForm.attribute')}
                  value={selectedAttr || undefined}
                  options={attributes.map((a) => ({
                    label: a.values,
                    value: a.id,
                  }))}
                  onChange={(val) => setSelectedAttr(val)}
                  allowClear
                  className={styles.fullWidth}
                />
              </Col>
              <Col flex="0 0 auto">
                <Button type="primary" onClick={handleAddAttr}>
                  {t('productForm.add')}
                </Button>
              </Col>
            </Row>

            <div className={styles.marginTop10}>
              {attributesValue.map((item) => (
                <Tag
                  key={item.code}
                  closable
                  onClose={() => handleDeleteAttr(item.code)}
                  color="purple"
                  className={styles.tagMargin}
                >
                  {item.name}
                </Tag>
              ))}
            </div>
          </div>
        </>
      ),
    },
  ]}
/>

        {/* === Кнопки === */}
        <Row justify="end" gutter={8} className={styles.rowButtonsMarginTop}>
          <Col>
            <Button
              onClick={() => {
                form.resetFields();
                setPiece(false);
                onClose();
              }}
            >
              {t('productForm.cancel')}
            </Button>
          </Col>
          <Col>
            <Button
              onClick={() => {

                if (!isEdit) { 
                  form.resetFields(); 
                  setPiece(false);
                   form.setFieldsValue({
          taxid: '1', 
        });
                 } else { 
                  setSelectedDetail(null);
                  setSelectedDetailValue('');
                   setSelectedAttr(null); 
                   setSelectedAttrValue('');
                   setBarcodeInput(''); 
                  }

                
               
              }}
            >
              {t('productForm.reset')}
            </Button>
          </Col>
          <Col>
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              {isEdit ? t('productForm.save') : t('productForm.add')}
            </Button>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default ProductFormModal;
