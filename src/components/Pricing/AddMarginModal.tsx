import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Spin,
} from 'antd';
import useApiRequest from '../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next';
import styles from './MarkupTab.module.css'; 

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: 1 | 2 | 3; // 1 - категория, 2 - бренд, 3 - товар
}

interface OptionItem {
  id: string;
  name?: string;
  brand?: string;
  code?: string;
}

const typeOptions = [
  { label: 'Товары', value: 3 },
  { label: 'Бренды', value: 2 },
  { label: 'Категории', value: 1 },
];

const AddMarginModal: React.FC<Props> = ({ visible, onClose, onSuccess, type }) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [selectedType, setSelectedType] = useState<1 | 2 | 3>(type);

  const isProduct = selectedType === 3;
  const isBrand = selectedType === 2;
  const isCategory = selectedType === 1;

  // При открытии модалки
  /* useEffect(() => {
    if (visible) {
      form.resetFields();
      setOptions([]);
      setBarcodeSearch('');
      setSelectedType(type);
      fetchOptions(type); // загружаем список сразу
    }
  }, [visible, type]); */

  useEffect(() => {
  if (visible) {
    // задержка сброса, чтобы форма успела смонтироваться
    setTimeout(() => {
      form.resetFields();
      setOptions([]);
      setBarcodeSearch('');
      setSelectedType(type);
      fetchOptions(type);
    }, 0);
  }
}, [visible, type]);

  const fetchOptions = async (typeToLoad: 1 | 2 | 3) => {
    setLoading(true);
    try {
      let res;
      const headers = {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      };

      if (typeToLoad === 3) {
        res = await sendRequest(`${import.meta.env.VITE_API_URL}/api/products/searchbyname`, { headers });
        res = res.map((item: any) => ({
          id: item.id,
          name: item.name,
          code: item.code,
        }));
      } else if (typeToLoad === 2) {
        res = await sendRequest(`${import.meta.env.VITE_API_URL}/api/brand/margin`, { headers });
        res = res.map((item: any) => ({
          id: item.id,
          name: item.brand,
        }));
      } else if (typeToLoad === 1) {
        res = await sendRequest(`${import.meta.env.VITE_API_URL}/api/categories/margin_plan`, { headers });
        res = res.map((cat: any) => ({ id: cat.value, name: cat.label }));
      }

      if (res) setOptions(res);
    } catch {
      message.error(t('pricingMaster.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSearch = async (barcode: string) => {
    if (!barcode?.trim()) {
    return; // ничего не делать, если штрихкод пустой
  }
    try {
      const product = await sendRequest(
        `${import.meta.env.VITE_API_URL}/api/products/getProductByBarcodeLocal?barcode=${barcode}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        }
      );
      if (product?.id) {
        form.setFieldsValue({ object: product.id });
        setOptions([{ id: product.id, name: product.name, code: product.code }]);
       // message.success(t('pricingMaster.messages.productFound'));
      } else {
      //  message.warning(t('pricingMaster.messages.productNotFound'));
      }
    } catch {
    //  message.error(t('pricingMaster.messages.barcodeError'));
    }
  };

  const handleSearchByName = async () => {
    if (!isProduct) return;
    try {
      const res = await sendRequest(
        `${import.meta.env.VITE_API_URL}/api/products/searchbyname`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        }
      );
      setOptions(res);
    } catch {
      message.error(t('pricingMaster.messages.loadError'));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedType) {
        message.warning(t('pricingMaster.validation.selectType'));
        return;
      }

      setLoading(true);
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/margin/add`, {
        method: 'POST',
        body: JSON.stringify({
          object: values.object,
          rate: values.rate,
          sum: values.sum,
          type: selectedType,
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });

      message.success(t('pricingMaster.messages.addSuccess'));
      form.resetFields();
      onSuccess();
      onClose();
    } catch {
      message.error(t('pricingMaster.messages.addError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={t('pricingMaster.actions.add')}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={t('pricingMaster.actions.save')}
      cancelText={t('pricingMaster.actions.cancel')}
      destroyOnHidden
    >
      {loading ? (
        <Spin />
      ) : (
        <Form layout="vertical" form={form} 
        initialValues={{
    rate: 0,
    sum: 0,
  }}>
          {/* Выбор типа */}
          <Form.Item
            label={t('pricingMaster.modalFields.selectType')}
            rules={[{ required: true, message: t('pricingMaster.validation.selectType') }]}
          >
            <Select
              placeholder={t('pricingMaster.modalFields.selectType')}
              value={selectedType}
              onChange={(value: 1 | 2 | 3) => {
                setSelectedType(value);
                form.setFieldsValue({ object: undefined });
                fetchOptions(value);
              }}
              options={typeOptions}
            />
          </Form.Item>

          {/* Для товаров */}
          {isProduct && (
            <>
              
              <Form.Item label={t('pricingMaster.modalFields.barcode')}>
  <Input.Search
  placeholder={t('pricingMaster.modalFields.enterBarcode')}
  enterButton
  value={barcodeSearch}
  onChange={(e) => {
    const val = e.target.value;
    setBarcodeSearch(val);
    if (val === '') {
      form.setFieldsValue({ object: undefined });
    }
  }}
  onSearch={handleBarcodeSearch}
  allowClear
/>
</Form.Item>

<Form.Item
  name="object"
  label={t('pricingMaster.modalFields.productName')}
  rules={[{ required: true, message: t('pricingMaster.validation.select') }]}
>
  <Select
    showSearch
    placeholder={t('pricingMaster.modalFields.selectProduct')}
    filterOption={false}
    onSearch={handleSearchByName}
    onSelect={(value) => {
      const selected = options.find((item) => item.id === value);
      if (selected?.code) {
        setBarcodeSearch(selected.code); // <- Автозаполнение штрихкода
      }
    }}
    options={options.map((item) => ({
      value: item.id,
      label: `${item.name || ''}${item.code ? ` (${item.code})` : ''}`,
    }))}
  />
</Form.Item>
            </>
          )}

          {/* Для брендов и категорий */}
          {(isBrand || isCategory) && (
            <Form.Item
              name="object"
              label={isBrand ? t('pricingMaster.modalFields.brand') : t('pricingMaster.modalFields.category')}
              rules={[{ required: true, message: t('pricingMaster.validation.select') }]}
            >
              <Select
                placeholder={
                  isBrand
                    ? t('pricingMaster.modalFields.selectBrand')
                    : t('pricingMaster.modalFields.selectCategory')
                }
                options={options.map((item) => ({
                  value: item.id,
                  label: item.name || 'Без названия',
                }))}
              />
            </Form.Item>
          )}

          {/* Наценка % */}
          <Form.Item
            name="rate"
            label={`${t('pricingMaster.modalFields.marginRate')} (${t('pricingMaster.validation.titleSum')})`}
            rules={[{ required: true, message: t('pricingMaster.validation.enterRate') }]}
          >
            <InputNumber min={0} className={styles.fullWidth} />
          </Form.Item>

          {/* Наценка сумма */}
          <Form.Item
            name="sum"
            label={t('pricingMaster.modalFields.marginSum')}
            rules={[{ required: true, message: t('pricingMaster.validation.enterSum') }]}
          >
            <InputNumber min={0} className={styles.fullWidth} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default AddMarginModal;
