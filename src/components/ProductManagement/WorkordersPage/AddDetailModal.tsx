import React, { useState, useEffect } from 'react';
import {  InputNumber, 

  Modal, Form, Input, Select, Switch, Row, Col, Button, message, Divider, Typography, Spin 
,Tag,Collapse

 } from 'antd';
import { useTranslation } from 'react-i18next';
import ProductBarcodeSearch from '../../ProductBarcodeSearch'; // Путь к вашему компоненту
import useApiRequest from '../../../hooks/useApiRequest';
import styles from './WorkordersPage.module.css';

interface Counterparty {
  id: string;
  name: string;
}

interface AddDetailModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  workorderId: string;
  point: string;
  counterparty: string;
}

interface AttributeItem {
  id: string;
  category: string | null;
  values: string;
  deleted: boolean;
  format: string;
  sprvalues: any[]; 
}

const AddDetailModal: React.FC<AddDetailModalProps> = ({ visible, onCancel, onSuccess, workorderId, point, counterparty }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { sendRequest } = useApiRequest();
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [selectedAttr, setSelectedAttr] = useState<string | null>(null);
    const [selectedAttrValue, setSelectedAttrValue] = useState<string>('');
    const [attributesListCode, setAttributesListCode] = useState<string | null>(null);
    const [attributesValue, setAttributesValue] = useState<
      { code: string; name: string; value: string }[]
    >([]);

    const [allAttributes, setAllAttributes] = useState<AttributeItem[]>([]);

   const loadAttributes = async () => {
  setLoading(true); // Включаем спиннер, если он есть
  try {
    const attributesUrl = `${API_URL}/api/attributes?deleted=false`;
    
    // Рекомендуется выносить заголовки в отдельный конфиг или интерцептор
    const attributesRes = await sendRequest(attributesUrl, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
    });

    // Всегда проверяем на наличие данных, чтобы не записать null/undefined в стейт
    setAllAttributes(attributesRes || []);
    
  } catch (err) {
    console.error('Failed to load attributes:', err);
    message.error(t('common.errors.loadFailed')); // Уведомление пользователю
  } finally {
    setLoading(false); // Выключаем спиннер в любом случае
  }
}; 

   useEffect(() => {
    if (visible) {

       loadAttributes();
     /*  sendRequest(`${API_URL}/api/counterparties`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      }).then(setCounterparties).catch(() => message.error(t('workorder.common.loadError'))); */
    }
  }, [visible]); 

  const handleProductSelect = async (productId: string, barcode?: string) => {
  // 1. Устанавливаем ID продукта сразу
  form.setFieldsValue({ product: productId });

  // 2. Если есть штрих-код, тянем данные для цен
  if (barcode) {
    try {
      const productData = await sendRequest(
        `${API_URL}/api/products/getProductByBarcodeLocal?barcode=${barcode}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }
      );

      if (productData) {
        // 3. Автоматически заполняем цены из ответа API
        form.setFieldsValue({
          price: productData.lastpurchaseprice || 0, // Закупочная
          price1: productData.price || 0,           // Розничная
          wholesaleprice: productData.wholesale_price || 0 // Оптовая
        });
       // message.info(t('workorder.pricesUpdated'));
      }
    } catch (err) {
      console.error('Error fetching product prices:', err);
      // Не блокируем работу, если цены не загрузились
    }
  }
};

//////

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

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  const attributes=allAttributes;

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
  


///////

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);


      /////

     /*  // 1. Собираем атрибуты, которые могли быть отрисованы в форме (если есть такие поля)
    const formAttributes = attributes
      .map(attr => ({
        id: attr.id,
        value: values[`attribute-${attr.id}`]
      }))
      .filter(a => a.value !== undefined && a.value !== null && a.value !== '0');

    // 2. Нормализуем локальные атрибуты (те, что в виде Tag)
    // Приводим 'code' к 'id', чтобы TypeScript не ругался
    const localAttributes = attributesValue.map(item => ({
      id: item.code, // Переименовываем code в id
      value: item.value,
    }));

    // 3. Объединяем в один массив строгого типа
    const finalAttrList: { id: string; value: any }[] = [
      ...formAttributes,
      ...localAttributes
    ]; */

      //////

      const body = {
        product: values.product,
        point: point,
        workorder_id: workorderId,
        units: values.units,
        price1: values.price1,
        wholesaleprice: values.wholesaleprice,
        price: values.price,
        //counterparty: values.counterparty
        counterparty: counterparty,
        attributes: attributesListCode || 0, 
      };

      const response = await sendRequest(`${API_URL}/api/workorder/details/insert`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
      },
      body: JSON.stringify(body),
    });

    // ОБРАБОТКА ОШИБКИ "УЖЕ СУЩЕСТВУЕТ"
    // Проверяем, не является ли ответ объектом ошибки
    if (response && response.code === 'exception') {
      message.error(response.text); // Выводим текст: "Товар уже существует..."
      setLoading(false);
      return; // Останавливаем выполнение, чтобы не закрывать модалку
    }

      message.success(t('workorder.addSuccess'));
      form.resetFields();
      onSuccess();
    } catch (err) {
      console.error(err);
      message.error(t('workorder.addError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={t('workorder.addProduct')}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical"
      initialValues={{
    product: ''
  }}
      >
        <Form.Item label={t('workorder.product.label')} required>
          <ProductBarcodeSearch 
            /* onProductSelect={(id) => form.setFieldsValue({ product: id })}
            onClear={() => form.setFieldsValue({ product: '' })} */
            onProductSelect={(id, barcode) => handleProductSelect(id, barcode)} // Передаем и ID, и barcode
            onClear={() => {
              form.setFieldsValue({ 
              product: '', 
              price: null, 
              price1: null, 
              wholesaleprice: null 
              });
            }}
          />
          {/* Скрытое поле для валидации выбора продукта */}
          <Form.Item name="product" noStyle rules={[{ required: true, message: t('workorder.common.required') }]}>
            <input type="hidden" />
          </Form.Item>
        </Form.Item>

        {/* <Form.Item name="counterparty" label={t('workorder.counterparty')} rules={[{ required: true }]}>
          <Select showSearch optionFilterProp="children">
            {counterparties.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
          </Select>
        </Form.Item> */}

        <div className={styles.formRow}>
          <Form.Item name="units" label={t('workorder.qty')} rules={[{ required: true }]} className={styles.formItemFlex}>
            <InputNumber min={0.01} className={styles.fullWidthInput} />
          </Form.Item>
          <Form.Item name="price" label={t('workorder.price')} rules={[{ required: true }]} className={styles.formItemFlex}>
            <InputNumber min={0} className={styles.fullWidthInput} />
          </Form.Item>
          
        </div>
        <div className={styles.formRow}>
          
          <Form.Item name="price1" label={t('workorder.price1')} rules={[{ required: false }]} className={styles.formItemFlex}>
            <InputNumber min={0} className={styles.fullWidthInput} />
          </Form.Item>
          <Form.Item name="wholesaleprice" label={t('workorder.wholesaleprice')} rules={[{ required: false }]} className={styles.formItemFlex}>
            <InputNumber min={0} className={styles.fullWidthInput} />
          </Form.Item>
        </div>

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
    </Modal>
  );
};

export default AddDetailModal;