import React, { useState, useEffect } from 'react';
import { 
  Modal, Form, Input, Select, Switch, Row, Col, Button, message, Divider, Typography, Spin 
,Tag,Collapse} from 'antd';
// 1. Импорт useTranslation
import { useTranslation } from 'react-i18next'; 
import styles from './CreateInvoice.module.css';

const { Text } = Typography;

const ProductEditModal = ({ 
  isVisible, 
  onClose, 
  details, 
  attributes,
  invoiceNumber,
  onSuccess,
  sendRequest,
  API_URL,
}) => {
  // 2. Инициализация хука перевода
  const { t } = useTranslation();
  
  const [form] = Form.useForm();
  
  const [loading, setLoading] = useState(false);

  // Сохраняем оригинальные типы (хотя они неполные)
  const [selectedAttr, setSelectedAttr] = useState<string | null>(null);
  const [selectedAttrValue, setSelectedAttrValue] = useState<string>('');
  const [attributesListCode, setAttributesListCode] = useState<string | null>(null);
  const [attributesValue, setAttributesValue] = useState<
    { code: string; name: string; value: string }[]
  >([]);

    const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  // --- Инициализация формы ---
  useEffect(() => {
    if (details) {
      const pp = Number(details.purchaseprice) || 0;
      const np = Number(details.newprice) || 0;
      const markup = pp > 0 && np > 0 ? ((np / pp) - 1) * 100 : 0;

      const initialAttributes = {};
      if (Array.isArray(details.attributesarray)) {
        details.attributesarray.forEach(attr => {
          initialAttributes[`attribute-${attr.id}`] = attr.value;
        });
      }

      if (Array.isArray(details.attributescaption)) {
        const initialBatchAttrs = details.attributescaption.map(attr => ({
            code: String(attr.attribute_id), 
            name: attr.attribute_name, 
            value: attr.attribute_value,
        }));
        setAttributesValue(initialBatchAttrs);
      } else {
          setAttributesValue([]);
      }

      setAttributesListCode(details.attributes || null);

      form.setFieldsValue({
        purchaseprice: pp,
        newprice: np,
        amount: details.amount,
        wholesale_price: details.wholesale_price,
        markup: markup.toFixed(2),
        updateallprodprice: details.updateallprodprice,
        ...initialAttributes,
      });
    } else {
      form.resetFields();
      setAttributesListCode(null);
      setAttributesValue([]);
    }
  }, [details, attributes, form]); // Добавлен form в зависимости для совместимости с React Hooks

  const selectedAttrObj = attributes.find((a) => a.id === selectedAttr);


    // === Добавление партийного атрибута ===
  
  const handleAddAttr = async () => {

    if (!selectedAttr || !selectedAttrValue) return;
    
      //  Проверка на дубликаты
      if (attributesValue.some((d) => d.code === selectedAttr)) {
         // Перевод: 'Такая характеристика уже есть'
         message.warning(t('goodsReceipt.productEdit.attributeExistsWarning'));
        return;
      }
    
      //  Формируем тело запроса
      const body: any = {
        attribcode: selectedAttr,
        value: selectedAttrValue,
      };
    
      //  Добавляем listcode только если он уже есть и не равен "0"
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
          //  Обновляем listcode, если сервер вернул реальный идентификатор
          if (res.text && res.text !== '0') {
            setAttributesListCode(res.text);
          }
    
          //  Добавляем новую характеристику в список
          const attr = attributes.find((a) => a.id === selectedAttr);
          setAttributesValue((prev) => [
            ...prev,
            {
              code: selectedAttr,
              name: attr?.values || '',
              value: selectedAttrValue,
            },
          ]);
    
          //  Сброс локальных полей
          setSelectedAttr(null);
          setSelectedAttrValue('');
         // Перевод: 'Характеристика добавлена'
         message.success(t('goodsReceipt.productEdit.attributeAddedSuccess'));
        }
      } catch {
        // Перевод: 'Ошибка добавления характеристики'
        message.error(t('goodsReceipt.productEdit.attributeAddError'));
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
       // Перевод: 'Удалено'
       message.success(t('goodsReceipt.productEdit.common.deletedSuccess'));
      } catch {
         // Перевод: 'Ошибка удаления'
         message.error(t('goodsReceipt.productEdit.common.deleteError'));
      }
    };
  

  const handlePriceChange = () => {
    const { purchaseprice, newprice } = form.getFieldsValue();
    const pp = Number(purchaseprice);
    const np = Number(newprice);
    if (pp > 0 && np > 0) {
      const markup = ((np / pp) - 1) * 100;
      form.setFieldsValue({ markup: markup.toFixed(2) });
    }
  };

  const handleMarkupChange = () => {
    const { purchaseprice, markup } = form.getFieldsValue();
    const pp = Number(purchaseprice);
    const mu = Number(markup);
    if (pp > 0 && mu >= 0) {
      const np = pp * (1 + mu / 100);
      form.setFieldsValue({ newprice: np.toFixed(2) });
    }
  };

  const renderValueInput = (
      selectedId: string | null,
      value: string,
      onChange: (v: string) => void
    ) => {
      const attr = attributes.find((a) => a.id === selectedId);
      // Перевод: 'Введите значение'
      const enterPlaceholder = t('goodsReceipt.productEdit.enterValuePlaceholder'); 
      
      if (!attr) return <Input placeholder={enterPlaceholder} value={value} onChange={(e) => onChange(e.target.value)} />;
      
      if (attr.format === 'SPR')
        return (
          <Select
            // Перевод: 'Выберите значение'
            placeholder={t('goodsReceipt.productEdit.selectValuePlaceholder')}
            value={value || undefined}
            options={(attr.sprvalues || []).map((v) => ({ label: v, value: v }))}
            onChange={onChange}
            allowClear
          />
        );
      if (attr.format === 'DATE')
        return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />;
        
      return <Input placeholder={enterPlaceholder} value={value} onChange={(e) => onChange(e.target.value)} />;
    };

  const handleApply = async (values: any) => { // Добавлен тип any для values, чтобы избежать ошибки
    if (!details || !invoiceNumber) {
        // Перевод: 'Ошибка: данные товара или номер накладной отсутствуют.'
        message.error(t('goodsReceipt.productEdit.missingDetailsError'));
        return;
    }

    // 1. Сбор атрибутов из Form.Item (те, что привязаны к форме)
    let finalAttrList = attributes
        .map(attr => ({
            id: attr.id,
            // Значение берется из полей формы: values['attribute-3'] и т.д.
            value: values[`attribute-${attr.id}`] || '0', 
        }))
        // Фильтруем пустые или '0' значения, чтобы не отправлять их, если они не заданы
        .filter(a => a.value !== '0' && a.value !== null && a.value !== undefined);
        
    // 2. Добавление атрибутов из локального состояния (если вы их используете)
    // Если `attributesValue` используется для *добавления* атрибутов, 
    // нужно включить их в отправку:
    const newLocalAttributes = attributesValue.map(item => ({
        code: item.code, // item.code - это ID атрибута
        value: item.value,
    }));
    
    // Объединяем списки атрибутов
    finalAttrList = [...finalAttrList, ...newLocalAttributes];

    // Проверка, что ID строки существует
    const invoicelist_id = details.invoicelist_id;

    if (!invoicelist_id) {
         // Перевод: 'Ошибка: ID строки накладной (invoicelist_id) отсутствует.'
         message.error(t('goodsReceipt.productEdit.missingInvoiceListIdError'));
         return;
    }

    try {
        setLoading(true);

        // --- ШАГ 1: УДАЛЕНИЕ СТАРОЙ ЗАПИСИ ---
        // Это необходимо, чтобы избежать дубликатов или конфликтов уникальных ключей
        const deleteBody = {
            invoice: invoiceNumber,
            stock: details.id,
            // Используем ИСХОДНЫЕ атрибуты, чтобы найти конкретную строку для удаления
            attributes: details.attributes || '0'
        };
        
        const deleteRes = await sendRequest(`${API_URL}/api/invoice/delete/product`, {
            method: 'POST',
            headers: getHeaders(), 
            body: JSON.stringify(deleteBody),
        });

        if (deleteRes.code !== 'success') {
            // Если удаление не удалось, прерываем операцию
            // Перевод: 'Ошибка при удалении старой записи товара.'
            message.error(deleteRes.text || t('goodsReceipt.productEdit.deleteOldRecordError'));
            return; 
        }

        // --- ШАГ 2: ДОБАВЛЕНИЕ/ОБНОВЛЕНИЕ НОВОЙ ЗАПИСИ ---
        const body = {
            invoice: invoiceNumber,
            type: "2",
            zapros: "invoice_product_addnew",
            stockcurrentfrom: [
                {
                    id: details.id, // ID товара
                    amount: String(values.amount),
                    lastpurchaseprice: details.purchaseprice, // Исходная цена закупки
                    newprice: Number(values.newprice),
                    piece: false,
                    pieceinpack: 0,
                    purchaseprice: Number(values.purchaseprice),
                    updateprice: values.updateallprodprice,
                    // Передаем исходный атрибут, если он не менялся, или '0'
                    attributes: attributesListCode || details.attributes || '0', 
                    attrlist: finalAttrList, // Новый/обновленный список атрибутов
                    wholesale_price: Number(values.wholesale_price),
                    invoicelist_id: invoicelist_id, // Используем ID удаленной строки
                    code: details.code,
                }
            ]
        };

        const res = await sendRequest(`${API_URL}/api/invoice/functioncall`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(body),
        });

        if (res.code === 'success') {
            // Перевод: `Товар "${details.name}" успешно обновлен!`
            message.success(t('goodsReceipt.productEdit.productUpdateSuccess', { productName: details.name }));
            onClose();
            onSuccess();
        } else {
            // Перевод: 'Ошибка при добавлении обновленного товара.'
            message.error(res.text || t('goodsReceipt.productEdit.addNewProductError'));
        }

    } catch (err) {
        console.error('Ошибка при выполнении операций редактирования:', err);
        // Перевод: 'Не удалось выполнить операцию обновления товара.'
        message.error(t('goodsReceipt.productEdit.updateOperationFailure'));
    } finally {
        setLoading(false);
    }
};


  return (
    <Modal
      // Перевод: `Редактировать товар | ${details.name}` или 'Загрузка товара...'
      title={details ? t('goodsReceipt.productEdit.modalTitle', { productName: details.name }) : t('goodsReceipt.productEdit.loadingProductTitle')}
      open={isVisible}
      onCancel={onClose}
      footer={
        details && (
          <>
            {/* Перевод: Сбросить, Отменить, Применить */}
            <Button onClick={() => form.resetFields()} disabled={loading}>{t('goodsReceipt.productEdit.common.reset')}</Button>
            <Button onClick={onClose} disabled={loading}>{t('goodsReceipt.productEdit.common.cancel')}</Button>
            <Button type="primary" loading={loading} onClick={() => form.submit()}>
              {t('goodsReceipt.productEdit.common.apply')}
            </Button>
          </>
        )
      }
      width={700}
    >
      {!details ? (
        <div className={styles.loadingContainer}>
         
          <Spin size="large" />
           {/* Перевод: 'Загрузка данных товара...' */}
           <Typography.Text>{t('goodsReceipt.productEdit.loadingData')}</Typography.Text>
        </div>
      ) : (
        <Form form={form} layout="vertical" onFinish={handleApply}>
          <Row gutter={16} className={styles.section}>
            {/* Перевод: Штрих-код, Категория (ТН ВЭД), Бренд, Единица измерения */}
            <Col span={12}><Text strong>{t('goodsReceipt.productEdit.barcode')}:</Text> {details.code}</Col>
            <Col span={12}><Text strong>{t('goodsReceipt.productEdit.category')}:</Text> {details.cnofeacode}</Col>
            <Col span={12}><Text strong>{t('goodsReceipt.productEdit.brand')}:</Text> {details.brand}</Col>
            <Col span={12}><Text strong>{t('goodsReceipt.productEdit.unit')}:</Text> {details.unitspr_name}</Col>
          </Row>

          <Divider />

          <Row gutter={16}>
            <Col span={8}>
              {/* Перевод: Цена закупки */}
              <Form.Item label={t('goodsReceipt.productEdit.purchasePrice')} name="purchaseprice" rules={[{ required: true }]}>
                <Input type="number" step="0.01" min={0} onChange={handlePriceChange} />
              </Form.Item>
            </Col>
            <Col span={8}>
              {/* Перевод: Надбавка */}
              <Form.Item label={t('goodsReceipt.productEdit.markup')} name="markup">
                <Input type="number" step="0.01" min={0} suffix="%" onChange={handleMarkupChange} />
              </Form.Item>
            </Col>
            <Col span={8}>
              {/* Перевод: Цена продажи */}
              <Form.Item label={t('goodsReceipt.productEdit.sellingPrice')} name="newprice" rules={[{ required: true }]}>
                <Input type="number" step="0.01" min={0} onChange={handlePriceChange} />
              </Form.Item>
            </Col>
            <Col span={8}>
              {/* Перевод: Количество */}
              <Form.Item label={t('goodsReceipt.productEdit.amount')} name="amount" rules={[{ required: true }]}>
                <Input type="number" step="1" min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              {/* Перевод: Оптовая цена продажи */}
              <Form.Item label={t('goodsReceipt.productEdit.wholesalePrice')} name="wholesale_price">
                <Input type="number" step="0.01" min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            // Перевод: Обновление цены на всех торговых точках
            label={t('goodsReceipt.productEdit.updateAllPrices')} 
            name="updateallprodprice" 
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

     

<Collapse
  size="small"
  items={[
    {
      key: 'attrs',
      // Перевод: Атрибут
      label: t('goodsReceipt.productEdit.attributeSectionTitle'),
      children: (
        <>
          <div>
            {/* Перевод: Партийные атрибуты */}
            <h4>{t('goodsReceipt.productEdit.batchAttributes')}</h4>
            <Row gutter={8} wrap={false}>
              {/* --- Выбор атрибута --- */}
              <Col flex="1 1 380px">
                <Select
                  // Перевод: Атрибут (placeholder)
                  placeholder={t('goodsReceipt.productEdit.attributePlaceholder')}
                  value={selectedAttr || undefined}
                  options={attributes.map((a) => ({
                    //label: a.name, // отображаем имя атрибута
                    label: a.values,
                    value: a.id,
                  }))}
                  onChange={(val) => {
                    setSelectedAttr(val);
                    setSelectedAttrValue(''); // сбрасываем значение при смене атрибута
                  }}
                  allowClear
                />
              </Col>

              {/* --- Ввод значения атрибута --- */}
              <Col flex="0 0 180px">
                {renderValueInput(selectedAttr, selectedAttrValue, setSelectedAttrValue)}
              </Col>

              {/* --- Кнопка добавления --- */}
              <Col flex="0 0 auto">
                {/* Перевод: Добавить */}
                <Button type="primary" onClick={handleAddAttr}>
                  {t('goodsReceipt.productEdit.common.add')}
                </Button>
              </Col>
            </Row>

            {/* --- Список добавленных атрибутов в виде Tag --- */}
            <div className={styles.tagList}>
              {attributesValue.map((item) => (
                <Tag
                  key={item.code}
                  closable
                  onClose={() => handleDeleteAttr(item.code)}
                  color="blue"
                  className={styles.tagItem}
                >
                  {item.name}: {item.value}
                </Tag>
              ))}
            </div>
          </div>
        </>
      ),
    },
  ]}
/>


        </Form>
      )}
    </Modal>
  );
};

export default ProductEditModal;