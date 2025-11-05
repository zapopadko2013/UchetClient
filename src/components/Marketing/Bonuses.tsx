import React, { useEffect, useState } from 'react';
import { Tabs, Button, Input, message, Space, Select, Table } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import ProductBarcodeSearch from '../ProductBarcodeSearch';
import styles from './Bonuses.module.css';

const { Option } = Select;

interface Category {
  value: string;
  label: string;
}

interface ConflictItem {
  id: number;
  name: string;
  bonusrate: number;
}

interface CategoryBonus {
  id: string;
  name: string;
  bonusrate: number;
  conflict: ConflictItem[];
}

const Bonuses: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [bonusRateProduct, setBonusRateProduct] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryBonusData, setCategoryBonusData] = useState<CategoryBonus | null>(null);
  const [bonusRateCategory, setBonusRateCategory] = useState<number | null>(null);

  const shouldShowSaveButton =
    categoryBonusData &&
    Array.isArray(categoryBonusData.conflict) &&
    categoryBonusData.conflict.length === 0;

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await sendRequest(`${import.meta.env.VITE_API_URL}/api/categories/get_categories`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });
      setCategories(cats);
    } catch (err) {
      message.error(t('bonuses.loadCategoriesError'));
    }
  };

  const handleClearProduct = () => {
    setSelectedProductId(null);
    setBonusRateProduct(null);
  };

  const onProductSelect = async (productId: string) => {
    setSelectedProductId(productId);
    if (productId === "-1") {
      setBonusRateProduct(0);
      return;
    }

    try {
      const response = await sendRequest(`${import.meta.env.VITE_API_URL}/api/products/bonusratebyid?id=${productId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });

      if (response?.bonusrate !== undefined) {
        setBonusRateProduct(response.bonusrate);
      } else {
        setBonusRateProduct(0);
      }
    } catch (err) {
      message.error(t('bonuses.loadBonusError'));
    }
  };

  const onSaveProductBonus = async () => {
    if (!selectedProductId || bonusRateProduct === null) return;

    const bonusRatePayload =
      Number(selectedProductId) === -1
        ? { type: 'allprod', rate: bonusRateProduct.toString() }
        : { type: 'prod', rate: bonusRateProduct.toString(), id: selectedProductId };

    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/products/change_bonusrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify({ bonusrate: bonusRatePayload }),
      });
      message.success(t('bonuses.saveBonusSuccess'));
    } catch (err) {
      message.error(t('bonuses.saveBonusError'));
    }
  };

  const onSelectCategory = async (catId: string) => {
    setSelectedCategoryId(catId);
    setCategoryBonusData(null);
    setBonusRateCategory(null);
    try {
      const resp = await sendRequest(`${import.meta.env.VITE_API_URL}/api/products/bonusrateconflicts?catId=${catId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });

      if (Array.isArray(resp) && resp.length > 0) {
        const category = resp[0];
        setCategoryBonusData(category);
        setBonusRateCategory(category.bonusrate ?? 0);
      } else {
        message.warning(t('bonuses.noCategoryData'));
      }
    } catch (err) {
      message.error(t('bonuses.loadCategoryBonusError'));
    }
  };

  const onSaveCategoryBonus = async (exception: ConflictItem[] = []) => {
    if (!selectedCategoryId || bonusRateCategory === null) return;

    const payload: any = {
      bonusrate: { type: 'cat', rate: bonusRateCategory.toString(), id: selectedCategoryId },
    };

    if (exception.length > 0) {
      payload.bonusrate.exception = exception;
    }

    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/products/change_bonusrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });
      message.success(t('bonuses.saveCategoryBonusSuccess'));
      onSelectCategory(selectedCategoryId);
    } catch (err) {
      message.error(t('bonuses.saveCategoryBonusError'));
    }
  };

  const onKeepOldBonuses = () => {
    if (!categoryBonusData) return;
    onSaveCategoryBonus(categoryBonusData.conflict);
  };

  const onChangeAllBonuses = () => {
    onSaveCategoryBonus([]);
  };

  return (
    <Tabs
      defaultActiveKey="products"
      onChange={() => {
        setSelectedProductId(null);
        setBonusRateProduct(null);
        setSelectedCategoryId(null);
        setCategoryBonusData(null);
        setBonusRateCategory(null);
      }}
      items={[
        {
          key: 'products',
          label: t('bonuses.products'),
          children: (
            <Space direction="vertical" className={styles.container}>
              <ProductBarcodeSearch
                onProductSelect={onProductSelect}
                onClear={handleClearProduct}
                includeAllProduct={false}
              />
              {selectedProductId && bonusRateProduct !== null && (
                <Space className={styles.spaceMarginTop}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={bonusRateProduct ?? ''}
                    onChange={(e) => setBonusRateProduct(Number(e.target.value))}
                    placeholder={t('bonuses.bonusRatePlaceholder')}
                    className={styles.inputWidth200}
                  />
                  <Button type="primary" onClick={onSaveProductBonus}>
                    {t('bonuses.save')}
                  </Button>
                </Space>
              )}
            </Space>
          ),
        },
        {
          key: 'categories',
          label: t('bonuses.categories'),
          children: (
            <Space direction="vertical" className={styles.container}>
              <Select
                value={selectedCategoryId}
                className={styles.selectWidth300}
                onChange={onSelectCategory}
              >
                {categories.map((cat) => (
                  <Option key={cat.value} value={cat.value}>
                    {cat.label}
                  </Option>
                ))}
              </Select>
              {categoryBonusData && (
                <>
                  <Space>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={bonusRateCategory ?? ''}
                      onChange={(e) => setBonusRateCategory(Number(e.target.value))}
                      placeholder={t('bonuses.bonusRatePlaceholder')}
                      className={styles.inputWidth200}
                    />
                    {shouldShowSaveButton && (
                      <Button type="primary" onClick={() => onSaveCategoryBonus()}>
                        {t('bonuses.save')}
                      </Button>
                    )}
                  </Space>

                  {Array.isArray(categoryBonusData?.conflict) &&
                    categoryBonusData.conflict.length > 0 && (
                      <>
                        <Space className={styles.spaceMarginTop}>
                          <Button onClick={onKeepOldBonuses}>{t('bonuses.keepOld')}</Button>
                          <Button type="primary" onClick={onChangeAllBonuses}>
                            {t('bonuses.changeAll')}
                          </Button>
                        </Space>

                        <Table
                          dataSource={categoryBonusData.conflict}
                          columns={[
                            {
                              title: t('bonuses.productName'),
                              dataIndex: 'name',
                              key: 'name',
                            },
                            {
                              title: t('bonuses.bonusRate'),
                              dataIndex: 'bonusrate',
                              key: 'bonusrate',
                              render: (value: number) => `${value}%`,
                            },
                          ]}
                          rowKey="id"
                          className={styles.tableStyle}
                          pagination={false}
                        />
                      </>
                    )}
                </>
              )}
            </Space>
          ),
        },
      ]}
    />
  );
};

export default Bonuses;
