import React, { useState, useEffect } from 'react';
import {
  Modal,
  Select,
  InputNumber,
  Checkbox,
  Button,
  Table,
  message,
  Input,
} from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import ProductBarcodeSearch from '../ProductBarcodeSearch';
import DateRangePickerSafe from '../DateRangePickerSafe';
import styles from './DiscountsPage.module.css';

const { Option } = Select;

interface DiscountAddModalProps {
  visible: boolean;
  onCancel: () => void;
  onSaveSuccess: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || '';

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
  'Content-Type': 'application/json',
});

const DiscountAddModal: React.FC<DiscountAddModalProps> = ({
  visible,
  onCancel,
  onSaveSuccess,
}) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  const [applyDiscountType, setApplyDiscountType] = useState<
    'all' | 'point' | 'category' | 'product'
  >('all');

  const [points, setPoints] = useState<{ id: string; name: string; address?: string }[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);

  const [selectedProductBarcode, setSelectedProductBarcode] = useState<string | undefined>(undefined);
  const [stockRecords, setStockRecords] = useState<any[]>([]);
  const [selectedStockRows, setSelectedStockRows] = useState<any[]>([]);

  const [selectedPoint, setSelectedPoint] = useState<string>('0');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const [discountPercent, setDiscountPercent] = useState<number | undefined>(undefined);
  const [discountTenge, setDiscountTenge] = useState<number | undefined>(undefined);

  //const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs()]);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>([dayjs(), dayjs()]);
  const [considerTime, setConsiderTime] = useState<boolean>(false);
  const [timeFrom, setTimeFrom] = useState<string>('00:00');
  const [timeTo, setTimeTo] = useState<string>('00:00');

  const [discountSumOption, setDiscountSumOption] = useState<'no' | 'yes'>('no');

  // Загрузка торговых точек
  const fetchPoints = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/point`, {
        headers: getHeaders(),
      });
      setPoints(data);
    } catch {
      message.error(t('discount.errorLoadingPoints'));
    }
  };

  // Загрузка категорий
  const fetchCategories = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/categories/get_categories?category=`, {
        headers: getHeaders(),
      });
      setCategories(data);
    } catch {
      message.error(t('discount.errorLoadingCategories'));
    }
  };

  // Загрузка остатков по штрихкоду
  const fetchStockByBarcode = async (barcode: string) => {
    try {
      const data = await sendRequest(`${API_URL}/api/stockcurrent/pointprod?barcode=${barcode}`, {
        headers: getHeaders(),
      });
      setStockRecords(data);
      setSelectedStockRows([]);
    } catch {
      message.error(t('discount.errorLoadingStock'));
      setStockRecords([]);
      setSelectedStockRows([]);
    }
  };

  useEffect(() => {
    if (visible) {
      setApplyDiscountType('all');
      setSelectedPoint('0');
      setSelectedCategory(undefined);
      setSelectedProductBarcode(undefined);
      setStockRecords([]);
      setSelectedStockRows([]);
      setDiscountPercent(undefined);
      setDiscountTenge(undefined);
      setDateRange([dayjs(), dayjs()]);
      setConsiderTime(false);
      setTimeFrom('00:00');
      setTimeTo('00:00');
      setDiscountSumOption('no');
    }
  }, [visible]);

  useEffect(() => {
    if ((applyDiscountType === 'point' || applyDiscountType === 'category') && points.length === 0) {
      fetchPoints();
    }
  }, [applyDiscountType]);

  useEffect(() => {
    if (applyDiscountType === 'category' && categories.length === 0) {
      fetchCategories();
    }
  }, [applyDiscountType]);

  const getFirstSelectedPrice = (): number | null => {
    if (selectedStockRows.length === 0) return null;
    const firstRow = selectedStockRows[0];
    return firstRow?.info?.[0]?.price ?? null;
  };

  const onDiscountPercentChange = (val: number | string | null) => {
    const numVal = typeof val === 'number' ? val : undefined;
    setDiscountPercent(numVal);

    const price = getFirstSelectedPrice();
    if (price !== null && numVal !== undefined) {
      const discountInTenge = +(price * (numVal / 100)).toFixed(2);
      setDiscountTenge(discountInTenge);
    } else {
      setDiscountTenge(undefined);
    }
  };

  const onDiscountTengeChange = (val: number | string | null) => {
    const numVal = typeof val === 'number' ? val : undefined;
    setDiscountTenge(numVal);

    const price = getFirstSelectedPrice();
    if (price !== null && numVal !== undefined && price !== 0) {
      const discountPercentCalculated = Math.round((numVal / price) * 100);
      setDiscountPercent(discountPercentCalculated);
    } else {
      setDiscountPercent(undefined);
    }
  };

  const onProductSelect = (_productId: string, barcode: string) => {
    setSelectedProductBarcode(barcode);
    fetchStockByBarcode(barcode);
  };

  const onProductClear = () => {
    setSelectedProductBarcode(undefined);
    setStockRecords([]);
    setSelectedStockRows([]);
    setDiscountPercent(undefined);
    setDiscountTenge(undefined);
  };

  const sendDiscount = async () => {
    if (discountPercent == null && discountTenge == null) {
      message.error(t('discount.specifyDiscount'));
      return;
    }

    const payload: any = {
      discountsum: discountSumOption === 'yes',
      //datefrom: dateRange[0].format('YYYY-MM-DD'),
      //dateto: dateRange[1].format('YYYY-MM-DD'),
      datefrom: dateRange?.[0]?.format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD'),
      dateto: dateRange?.[1]?.format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD'),
      discount: discountPercent ?? 0,
      tag: false,
      timefrom: considerTime ? timeFrom : '00:00',
      timeto: considerTime ? timeTo : '00:00',
    };

    try {
      if (applyDiscountType === 'all') {
        payload.type = 0;
        payload.object = '0';
        payload.point = '0';
        const data = await sendRequest(`${API_URL}/api/discount/add`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ discount: payload }),
        });
        if (data.code === 'success') {
          message.success(t('discount.added'));
          onSaveSuccess();
        } else {
          message.error(data.text || t('discount.addError'));
        }
      } else if (applyDiscountType === 'point') {
        if (!selectedPoint || selectedPoint === '0') {
          message.error(t('discount.selectPoint'));
          return;
        }
        payload.type = 1;
        payload.object = selectedPoint;
        payload.point = selectedPoint;

        const data = await sendRequest(`${API_URL}/api/discount/add`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ discount: payload }),
        });
        if (data.code === 'success') {
          message.success(t('discount.added'));
          onSaveSuccess();
        } else {
          message.error(data.text || t('discount.addError'));
        }
      } else if (applyDiscountType === 'category') {
        if (!selectedCategory) {
          message.error(t('discount.selectCategory'));
          return;
        }
        if (!selectedPoint || selectedPoint === '0') {
          message.error(t('discount.selectPoint'));
          return;
        }
        payload.type = 2;
        payload.object = selectedCategory;
        payload.point = selectedPoint;

        const data = await sendRequest(`${API_URL}/api/discount/add`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ discount: payload }),
        });
        if (data.code === 'success') {
          message.success(t('discount.added'));
          onSaveSuccess();
        } else {
          message.error(data.text || t('discount.addError'));
        }
      } else if (applyDiscountType === 'product') {
        if (!selectedProductBarcode) {
          message.error(t('discount.selectProduct'));
          return;
        }
        if (stockRecords.length > 0 && selectedStockRows.length === 0) {
          message.error(t('discount.selectStockRows'));
          return;
        }

        const stock = selectedStockRows.map(row => ({
          object: row.info[0].stockcurrentid,
          point: row.id,
        }));

        payload.type = 4;
        payload.stock = stock;

        const data = await sendRequest(`${API_URL}/api/discount/addprod`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ discount: payload }),
        });
        if (data.code === 'success') {
          message.success(t('discount.added'));
          onSaveSuccess();
        } else {
          message.error(data.text || t('discount.addError'));
        }
      }
    } catch (error: any) {
      console.error('Error sending request:', error);
      message.error(`${t('discount.sendError')}: ${error.message || t('discount.unknownError')}`);
    }
  };

  const stockColumns = [
    {
      title: t('discount.stockPoint'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('discount.address'),
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: t('discount.amount'),
      dataIndex: ['info', 0, 'amount'],
      key: 'amount',
      render: (_: any, record: any) => record.info && record.info[0]?.amount,
    },
    {
      title: t('discount.price'),
      dataIndex: ['info', 0, 'price'],
      key: 'price',
      render: (_: any, record: any) => record.info && record.info[0]?.price,
    },
  ];

  return (
    <Modal
      title={t('discount.addDiscount')}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>{t('discount.cancel')}</Button>,
        <Button
          key="reset"
          onClick={() => {
            setApplyDiscountType('all');
            setSelectedPoint('0');
            setSelectedCategory(undefined);
            setSelectedProductBarcode(undefined);
            setStockRecords([]);
            setSelectedStockRows([]);
            setDiscountPercent(undefined);
            setDiscountTenge(undefined);
            setDateRange([dayjs(), dayjs()]);
            setConsiderTime(false);
            setTimeFrom('00:00');
            setTimeTo('00:00');
            setDiscountSumOption('no');
          }}
        >
          {t('discount.reset')}
        </Button>,
        <Button key="submit" type="primary" onClick={sendDiscount}>
          {t('discount.save')}
        </Button>,
      ]}
      width={800}
    >
      <Select
        value={applyDiscountType}
        onChange={setApplyDiscountType}
        className={`${styles.selectWidth300} ${styles.marginBottom15}`}
      >
        <Option value="all">{t('discount.allPoints')}</Option>
        <Option value="point">{t('discount.byPoint')}</Option>
        <Option value="category">{t('discount.byCategory')}</Option>
        <Option value="product">{t('discount.byProduct')}</Option>
      </Select>

      {(applyDiscountType === 'point' || applyDiscountType === 'category') && (
        <div className={`${styles.flexGap16} ${styles.marginBottom15}`}>
          <Select
            className={styles.selectWidth300}
            value={selectedPoint}
            onChange={setSelectedPoint}
            placeholder={t('discount.selectPoint')}
          >
            <Option value="0">{t('discount.choosePoint')}</Option>
            {points.map(p => (
              <Option key={p.id} value={p.id}>
                {p.name} {p.address ? `(${p.address})` : ''}
              </Option>
            ))}
          </Select>

          {applyDiscountType === 'category' && (
            <Select
              className={styles.selectWidth300}
              value={selectedCategory}
              onChange={setSelectedCategory}
              placeholder={t('discount.selectCategory')}
            >
              {categories.map(c => (
                <Option key={c.value} value={c.value}>
                  {c.label}
                </Option>
              ))}
            </Select>
          )}
        </div>
      )}

      {applyDiscountType === 'product' && (
        <>
          <ProductBarcodeSearch
            onProductSelect={onProductSelect}
            onClear={onProductClear}
          />

          {stockRecords.length > 0 && (
            <Table
              dataSource={stockRecords}
              rowKey={record => record.id}
              columns={stockColumns}
              rowSelection={{
                type: 'checkbox',
                onChange: (_keys, rows) => setSelectedStockRows(rows),
              }}
              pagination={false}
              className={styles.marginTop15}
            />
          )}
        </>
      )}

      <div className={`${styles.marginTop10} ${styles.marginBottom15} ${styles.fontBold}`}>
        {t('discount.discountParams')}
      </div>

      <div className={styles.flexGapAlign}>
        {/* <InputNumber
          min={0}
          max={100}
          value={discountPercent}
          onChange={onDiscountPercentChange}
          placeholder={t('discount.percentDiscount')}
          className={styles.inputNumber150}
        />

        {(applyDiscountType === 'product' && stockRecords.length > 0) && (
          <InputNumber
            min={0}
            value={discountTenge}
            onChange={onDiscountTengeChange}
            placeholder={t('discount.discountInTenge')}
            className={styles.inputNumber150}
          />
        )} */}

        <InputNumber
          min={0}
          max={100}
          value={discountPercent}
          onChange={onDiscountPercentChange}
          placeholder={t('discount.percentDiscount')}
          className={styles.inputNumber150}
     formatter={(value) => {
      const num = parseInt(String(value || '0') , 10);
      return Math.min(100, Math.max(0, num)).toString();
    }}
    parser={(value) => {
      const num = parseInt(value || '0', 10);
      return Math.min(100, Math.max(0, num));
    }}
    onKeyPress={(e) => {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    }}
    onPaste={(e) => {
      const paste = e.clipboardData.getData('text');
      if (!/^\d+$/.test(paste)) {
        e.preventDefault();
      }
    }} 
        />

        {(applyDiscountType === 'product' && stockRecords.length > 0) && (
          <InputNumber
            min={0}
            value={discountTenge}
            onChange={onDiscountTengeChange}
            placeholder={t('discount.discountInTenge')}
            className={styles.inputNumber150}
              onKeyPress={(e) => {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    }}
    onPaste={(e) => {
      const paste = e.clipboardData.getData('text');
      if (!/^\d+$/.test(paste)) {
        e.preventDefault();
      }
    }} 
          />
        )}

        <DateRangePickerSafe
          value={dateRange}
          onChange={setDateRange}
        />
      </div>

      <div className={styles.marginTop10Bottom15}>
        <div className={styles.marginBottom5Font500}>
          {t('discount.ifProductHasExpiryDiscount')}
        </div>
        <Select
          value={discountSumOption}
          onChange={(value) => setDiscountSumOption(value)}
         className={styles.selectWidth200}
        >
          <Option value="no">{t('discount.doNotSum')}</Option>
          <Option value="yes">{t('discount.sumDiscounts')}</Option>
        </Select>
      </div>

      <div className={styles.marginBottom15}>
        <Checkbox
          checked={considerTime}
          onChange={e => setConsiderTime(e.target.checked)}
        >
          {t('discount.considerTime')}
        </Checkbox>

        {considerTime && (
          <div className="flexGap10AlignCenterMarginTop10">
            <span>{t('discount.from')}</span>
            <Input
              type="time"
              value={timeFrom}
              onChange={e => setTimeFrom(e.target.value)}
              className={styles.inputTime100}
            />
            <span>{t('discount.to')}</span>
            <Input
              type="time"
              value={timeTo}
              onChange={e => setTimeTo(e.target.value)}
              className={styles.inputTime100}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DiscountAddModal;
