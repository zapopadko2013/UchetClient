import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  DatePicker,
  Button,
  message,
  Space,
  Row,
  Col,
} from 'antd';
import dayjs from 'dayjs';
import { LoadingOutlined, SearchOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './CouponsPage.module.css';
import useApiRequest from '../../hooks/useApiRequest';

const { Option } = Select;

interface Category {
  value: string;
  label: string;
}

interface Brand {
  id: string;
  brand: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
}

interface Props {
  visible: boolean;
  onCancel: () => void;
  onSave: () => void;
}

const CouponAddModal: React.FC<Props> = ({ visible, onCancel, onSave }) => {
  const { t } = useTranslation();

  const [form] = Form.useForm();

  const [couponType, setCouponType] = useState<'Многоразовый' | 'Одноразовый' | undefined>();
  const [usageType, setUsageType] = useState<'На товар' | 'На чек' | undefined>();
  const [bindingType, setBindingType] = useState<'0' | '1' | '2' | '3' | undefined>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [barcodeLoading, setBarcodeLoading] = useState(false);

  const { sendRequest } = useApiRequest();

  const [productSearch, setProductSearch] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || '';

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({ expire: dayjs() });
    }
  }, [visible, form]);

const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Разрешаем только цифры, Backspace, Delete, стрелки, Tab
  if (
    !/[0-9]/.test(e.key) &&
    !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)
  ) {
    e.preventDefault();
  }
};


const removeBarcode = () => {
  form.setFieldsValue({ barcode: undefined, object: undefined });
};

  // ... fetchCategories, fetchBrands, fetchProducts, onBarcodeSearch, handleUsageTypeChange, handleBindingTypeChange, handleReset - без изменений

  const fetchCategories = () => {
    sendRequest(`${API_URL}/api/categories/get_categories?category=`, { headers: getHeaders() })
      
      .then(setCategories)
      .catch(() => message.error(t('couponAddModal.errorAdd')));
  };

  const fetchBrands = () => {
    sendRequest(`${API_URL}/api/brand/margin`, { headers: getHeaders() })
     
      .then(setBrands)
      .catch(() => message.error(t('couponAddModal.errorAdd')));
  };

  //const fetchProducts = () => {
  const fetchProducts = (searchTerm: string = '') => {
    const query = searchTerm.length >= 3 ? `?productName=${encodeURIComponent(searchTerm)}` : '?report=true';
  sendRequest(`${API_URL}/api/products${query}`, {
    headers: getHeaders(),
  })
    //fetch(`${API_URL}/api/products?report=true`, { headers: getHeaders() })
      
      .then(setProducts)
      .catch(() => message.error(t('couponAddModal.errorAdd')));
  };

  const onBarcodeSearch = (e?: React.KeyboardEvent<HTMLInputElement>, barcodeParam?: string) => {
    //if (e.key !== 'Enter') return;

   // const barcode = form.getFieldValue('barcode');
   // if (!barcode) return;

   const barcode = barcodeParam ?? form.getFieldValue('barcode');
  if (!barcode) return;

  // Если есть событие и это не Enter, то не ищем
  if (e && e.key !== 'Enter') return;

    setBarcodeLoading(true);
    sendRequest(`${API_URL}/api/products/getProductByBarcodeLocal?barcode=${barcode}`, {
      headers: getHeaders(),
    })
      
      .then((product: Product) => {
        form.setFieldsValue({ object: product.id, barcode: product.code });
        // message.success(t('couponAddModal.productFound', { name: product.name }));
      })
      .catch(() => {
        // message.error(t('couponAddModal.productNotFound'));
        form.setFieldsValue({ object: undefined });
      })
      .finally(() => setBarcodeLoading(false));
  };

  const handleUsageTypeChange = (value: 'На товар' | 'На чек') => {
    setUsageType(value);
    setBindingType(undefined);
    form.setFieldsValue({ object: undefined, binding: undefined, barcode: undefined });

    if (value === 'На товар') {
      fetchCategories();
      fetchBrands();
      fetchProducts();
    } else {
      setCategories([]);
      setBrands([]);
      setProducts([]);
    }
  };

  const handleBindingTypeChange = (value: '0' | '1' | '2' | '3') => {
    setBindingType(value);
    form.setFieldsValue({ object: undefined, barcode: undefined });
  };

  const handleReset = () => {
    form.resetFields();
    form.setFieldsValue({ expire: dayjs() });
    setCouponType(undefined);
    setUsageType(undefined);
    setBindingType(undefined);
    setCategories([]);
    setBrands([]);
    setProducts([]);
  };

  const handleFinish = (values: any) => {
    const payload = {
      coupons: {
        discount: String(values.discount),
        object: values.object || '0',
        objtype: bindingType || (usageType === 'На чек' ? '0' : '0'),
        expire: dayjs(values.expire).format('DD.MM.YYYY'),
        type: usageType === 'На товар' ? '1' : '2',
        subtype: couponType === 'Многоразовый' ? '1' : '2',
        numberfrom: couponType === 'Одноразовый' ? String(values.numberfrom) : String(values.number),
        numberto: couponType === 'Одноразовый' ? String(values.numberto) : String(values.number),
      },
    };

    sendRequest(`${API_URL}/api/coupons/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })
      .then(() => {
        message.success(t('couponAddModal.successAdd'));
        onSave();
        handleReset();
      })
      .catch(() => {
        message.error(t('couponAddModal.errorAdd'));
      });
  };

  const removeSelectedObject = () => {
    form.setFieldsValue({ object: undefined, barcode: undefined });
  };

  

  return (
    <Modal
      title={t('couponAddModal.title')}
      open={visible}
      onCancel={() => {
        onCancel();
        handleReset();
      }}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label={t('couponAddModal.couponType')}
          name="type"
          rules={[{ required: true, message: t('couponAddModal.couponTypeRequired') }]}
        >
          <Select placeholder={t('couponAddModal.couponType')} onChange={setCouponType} allowClear>
            <Option value="Многоразовый">{t('couponAddModal.multiUse')}</Option>
            <Option value="Одноразовый">{t('couponAddModal.singleUse')}</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={t('couponAddModal.usage')}
          name="objtype"
          rules={[{ required: true, message: t('couponAddModal.usageRequired') }]}
        >
          <Select placeholder={t('couponAddModal.usage')} onChange={handleUsageTypeChange} allowClear>
            <Option value="На товар">{t('couponAddModal.onProduct')}</Option>
            <Option value="На чек">{t('couponAddModal.onReceipt')}</Option>
          </Select>
        </Form.Item>

        {usageType === 'На товар' && (
          <Form.Item
            label={t('couponAddModal.binding')}
            name="binding"
            rules={[{ required: true, message: t('couponAddModal.bindingRequired') }]}
          >
            <Select
              placeholder={t('couponAddModal.binding')}
              onChange={handleBindingTypeChange}
              allowClear
              suffixIcon={<SearchOutlined />}
              popupRender={menu => (
                <>
                  {menu}
                  {bindingType && (
                    <Button
                      onClick={() => {
                        setBindingType(undefined);
                        form.setFieldsValue({ binding: undefined, object: undefined, barcode: undefined });
                      }}
                      type="text"
                      icon={<CloseCircleOutlined />}
                      className={styles.resetButton}
                    >
                      {t('couponAddModal.reset')}
                    </Button>
                  )}
                </>
              )}
            >
              <Option value="0">{t('couponAddModal.bindingOptions.all')}</Option>
              <Option value="1">{t('couponAddModal.bindingOptions.category')}</Option>
              <Option value="2">{t('couponAddModal.bindingOptions.brand')}</Option>
              <Option value="3">{t('couponAddModal.bindingOptions.product')}</Option>
            </Select>
          </Form.Item>
        )}

        {bindingType === '1' && (
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label={t('couponAddModal.category')}
                name="object"
                rules={[{ required: true, message: t('couponAddModal.category') }]}
              >
                <Select
                  placeholder={t('couponAddModal.category')}
                  allowClear
                  suffixIcon={
                    <CloseCircleOutlined
                      onClick={() => form.setFieldsValue({ object: undefined })}
                    />
                  }
                >
                  {categories.map(cat => (
                    <Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}

        {bindingType === '2' && (
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label={t('couponAddModal.brand')}
                name="object"
                rules={[{ required: true, message: t('couponAddModal.brand') }]}
              >
                <Select
                  placeholder={t('couponAddModal.brand')}
                  allowClear
                  suffixIcon={
                    <CloseCircleOutlined
                      onClick={() => form.setFieldsValue({ object: undefined })}
                    />
                  }
                >
                  {brands.map(brand => (
                    <Option key={brand.id} value={brand.id}>
                      {brand.brand}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}

  {bindingType === '3' && (
 <div className={styles.productBarcodeContainer}>
  <Form.Item
    label={t('couponAddModal.product')}
    name="object"
    rules={[{ required: true, message: t('couponAddModal.product') }]}
    className={styles.productSelectFormItem}
    labelCol={{ className: styles.labelPadding }}
    wrapperCol={{ className: styles.wrapperPadding }}
  >
    {/* <Select
      placeholder={t('couponAddModal.product')}
      showSearch
      optionFilterProp="children"
      allowClear
      onChange={(value) => {
        const selectedProduct = products.find(p => p.id === value);
        if (selectedProduct) {
          form.setFieldsValue({ barcode: selectedProduct.code });
        } else {
          form.setFieldsValue({ barcode: undefined });
        }
      }}
    //    suffixIcon={
    //     form.getFieldValue('object') ? (
    //       <CloseCircleOutlined
    //         onClick={(e) => {
    //           e.stopPropagation();
    //           removeSelectedObject();
    //         }}
    //         style={{ cursor: 'pointer', fontSize: 16, lineHeight: '40px' }}
    //       />
    //     ) : undefined
    //   } 
      className={styles.fullHeightInput}
      popupMatchSelectWidth={false}
    >
      {products.map(p => (
        <Option key={p.id} value={p.id}>
          {p.name} ({p.code})
        </Option>
      ))}
    </Select> */}

    <Select
  placeholder={t('couponAddModal.product')}
  showSearch
  optionFilterProp="children"
  allowClear
  onSearch={(value) => {
    setProductSearch(value);
    fetchProducts(value);
  }}
  onFocus={() => fetchProducts('')} // при открытии — загрузить все
  onChange={(value) => {
    const selectedProduct = products.find(p => p.id === value);
    if (selectedProduct) {
      form.setFieldsValue({ barcode: selectedProduct.code });
    } else {
      form.setFieldsValue({ barcode: undefined });
      fetchProducts('');
    }
  }}
  filterOption={false} // отключаем локальный фильтр, используем серверный
  className={styles.fullHeightInput}
  popupMatchSelectWidth={false}
>
  {products.map(p => (
    <Option key={p.id} value={p.id}>
      {p.name} ({p.code})
    </Option>
  ))}
</Select>
  </Form.Item>

  <Form.Item
    label={t('couponAddModal.barcode')}
    name="barcode"
    className={styles.barcodeFormItem}
    labelCol={{ className: styles.labelPadding }}
    wrapperCol={{ className: styles.wrapperPadding }}
  >
    <Input
  allowClear
  placeholder={t('couponAddModal.barcodePlaceholder')}
  onKeyDown={onBarcodeSearch}
  value={form.getFieldValue('barcode')}
  onChange={e => {
    form.setFieldsValue({ barcode: e.target.value });
    if (!e.target.value) {
      form.setFieldsValue({ object: undefined });
    }
  }}
  suffix={
    barcodeLoading ? (
      <LoadingOutlined spin className={styles.inputSuffixIcon} />
    ) : (
      <SearchOutlined
        onClick={() => {
          onBarcodeSearch(
            /* {
            key: 'Enter',
            // @ts-ignore
            preventDefault: () => {},
            currentTarget: null,
            target: null,
          } as React.KeyboardEvent<HTMLInputElement> */
        );
        }}
       className={styles.searchIcon}
      />
    )
  }
className={styles.input}

/>

  </Form.Item>
</div>

)}




        <Row gutter={16}>
          <Col flex="1 1 150px">
            <Form.Item
              label={t('couponAddModal.discount')}
              name="discount"
              rules={[
                { required: true, message: t('couponAddModal.discountRequired') },
                { type: 'number', min: 1, max: 100, message: t('couponAddModal.discountRange') },
              ]}
            >
              <InputNumber onKeyDown={handleNumberKeyDown} min={1} max={100} className={styles.fullWidth}
 />
            </Form.Item>
          </Col>
          <Col flex="2 1 250px">
            <Form.Item
              label={t('couponAddModal.expireDate')}
              name="expire"
              rules={[{ required: true, message: t('couponAddModal.expireDateRequired') }]}
            >
              <DatePicker className={styles.fullWidth}
 />
            </Form.Item>
          </Col>
        </Row>

        {couponType === 'Многоразовый' && (
          <Form.Item
            label={t('couponAddModal.couponNumber')}
            name="number"
            rules={[{ required: true, message: t('couponAddModal.couponNumberRequired') }]}
          >
            <InputNumber onKeyDown={handleNumberKeyDown} min={1} className={styles.fullWidth}
 />
          </Form.Item>
        )}

        {couponType === 'Одноразовый' && (
          <Row gutter={16}>
            <Col flex="1 1 150px">
              <Form.Item
                label={t('couponAddModal.numberFrom')}
                name="numberfrom"
                rules={[{ required: true, message: t('couponAddModal.numberFromRequired') }]}
              >
                <InputNumber onKeyDown={handleNumberKeyDown} min={1} className={styles.fullWidth}
 />
              </Form.Item>
            </Col>
            <Col flex="1 1 150px">
              <Form.Item
                label={t('couponAddModal.numberTo')}
                name="numberto"
                rules={[{ required: true, message: t('couponAddModal.numberToRequired') }]}
              >
                <InputNumber onKeyDown={handleNumberKeyDown} min={1} className={styles.fullWidth}
 />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item>
          <Space className={styles.formFooter} >
            <Button onClick={handleReset}>{t('couponAddModal.reset')}</Button>
           <Button
  onClick={() => {
    handleReset(); // сброс формы и локальных стейтов
    onCancel();    // закрыть модалку или любой внешний обработчик
  }}
>
  {t('couponAddModal.cancel')}
</Button>

            <Button type="primary" htmlType="submit">{t('couponAddModal.save')}</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CouponAddModal;
