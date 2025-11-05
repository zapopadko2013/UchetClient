import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, message, Spin } from 'antd';
import useApiRequest from '../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next';
import styles from './LimitPricesPage.module.css';  

interface Product {
  id: string;
  name: string;
  code: string;
  price: number | null;
  staticprice: number | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddLimitPriceModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const { sendRequest } = useApiRequest();
  const { t } = useTranslation();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [barcodeSearch, setBarcodeSearch] = useState('');

  useEffect(() => {
    if (visible) {
      loadProductList();
      form.resetFields();
      setBarcodeSearch('');
    }
  }, [visible]);

  const loadProductList = async () => {
    try {
      setLoading(true);
      const res = await sendRequest(
        `${import.meta.env.VITE_API_URL}/api/products/withprice?type=add`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        }
      );
      setProducts(res);
    } catch {
      message.error(t('limitPrices.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Поиск и заполнение при вводе штрихкода
  const handleBarcodeChange = (value: string) => {
    setBarcodeSearch(value);

    const searchStr = value.trim().toLowerCase();
    if (!searchStr) {
      form.setFieldsValue({ product: undefined, price: undefined });
      return;
    }

    const foundProduct = products.find(
      (p) => p.code.toLowerCase() === searchStr || p.name.toLowerCase().includes(searchStr)
    );

    if (foundProduct) {
      form.setFieldsValue({
        product: foundProduct.id,
        price: foundProduct.staticprice ?? foundProduct.price ?? undefined,
      });
    } else {
      form.setFieldsValue({ product: undefined, price: undefined });
    }
  };

  // Заполнение штрихкода и цены при выборе из списка
  const handleProductSelect = (productId: string) => {
    const foundProduct = products.find((p) => p.id === productId);
    if (foundProduct) {
      setBarcodeSearch(foundProduct.code);
      form.setFieldsValue({
        price: foundProduct.staticprice ?? foundProduct.price ?? undefined,
      });
    } else {
      setBarcodeSearch('');
      form.setFieldsValue({ price: undefined });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/invoice/changeprice`, {
        method: 'POST',
        body: JSON.stringify({
          isstaticprice: true,
          product: values.product,
          price: values.price,
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });
      message.success(t('limitPrices.messages.addSuccess'));
      form.resetFields();
      setBarcodeSearch('');
      onSuccess();
      onClose();
    } catch {
      message.error(t('limitPrices.messages.addError'));
    }
  };

  return (
    <Modal
      title={t('limitPrices.actions.add')}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={t('limitPrices.actions.save')}
      cancelText={t('limitPrices.actions.cancel')}
    >
      {loading ? (
        <Spin />
      ) : (
        <Form layout="vertical" form={form}>
          <Form.Item
            name="product"
            label={t('limitPrices.form.product')}
            rules={[{ required: true, message: t('limitPrices.validation.selectProduct') }]}
          >
            <Select
              showSearch
              optionFilterProp="children"
              placeholder={t('limitPrices.form.selectProduct')}
              filterOption={(input, option) =>
                (option?.label as string).toLowerCase().includes(input.toLowerCase())
              }
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.code})`,
              }))}
              onChange={handleProductSelect}  // вот тут обработчик выбора
            />
          </Form.Item>

          <Form.Item label={t('limitPrices.form.barcode')}>
            <Input
              placeholder={t('limitPrices.form.enterBarcode')}
              value={barcodeSearch}
              onChange={(e) => handleBarcodeChange(e.target.value)}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="price"
            label={t('limitPrices.form.limitPrice')}
            rules={[{ required: true, message: t('limitPrices.validation.enterLimitPrice') }]}
          >
            <InputNumber min={0} className={styles.fullWidth} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default AddLimitPriceModal;
