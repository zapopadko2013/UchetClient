import React, { useState, useEffect } from 'react';
import { Select, Input, Button, message } from 'antd';
import { LoadingOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './ProductBarcodeSearch.module.css';
import useApiRequest from '../hooks/useApiRequest';

const { Option } = Select;

interface Product {
  id: string;
  name: string;
  code: string;
}

interface ProductBarcodeSearchProps {
  onProductSelect: (productId: string, barcode: string) => void;
  onClear: () => void;
  includeAllProduct?: boolean;
  resetTrigger?: number;
  useLocalApi?: boolean;
}

const ProductBarcodeSearch: React.FC<ProductBarcodeSearchProps> = ({ onProductSelect, onClear , includeAllProduct, resetTrigger, useLocalApi = false,}) => {
  const { t } = useTranslation();
  const [barcode, setBarcode] = useState<string | undefined>(undefined);
  const [productSearch, setProductSearch] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [barcodeLoading, setBarcodeLoading] = useState<boolean>(false);
  const API_URL = import.meta.env.VITE_API_URL || '';
  const { sendRequest } = useApiRequest();

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    if (productSearch.length >= 3) {
      fetchProducts(productSearch); // Загружаем продукты, только если длина запроса >= 3
    } else if (productSearch === '') {
      fetchProducts(); // Загружаем все продукты, если строка поиска пустая
    }
  }, [productSearch]); // Зависимость от текста поиска

  /* useEffect(() => {
  setBarcode('');
  setProductSearch('');
  onClear();
  }, [resetTrigger, onClear]); */

  useEffect(() => {
  setBarcode('');
  setProductSearch('');
  
  }, [resetTrigger]);

  // Запрос на получение списка товаров
  const fetchProducts = (searchTerm: string = '') => {
    const query = searchTerm.length >= 3 ? `?productName=${encodeURIComponent(searchTerm)}` : '?report=true';
    
    const url = useLocalApi
      ? `${API_URL}/api/products/searchbyname`
      : `${API_URL}/api/products${query}`;

    sendRequest(url, {
      headers: getHeaders(),
    })
    
    /* sendRequest(`${API_URL}/api/products${query}`, {
      headers: getHeaders(),
    }) */
      
      //.then(setProducts)
      .then((data: Product[]) => {
         let updatedProducts = data;

        // Если передан параметр includeAllProduct, добавляем товар "Все"
        if (includeAllProduct) {
          const allProduct: Product = {
            id: '-1',
            name: 'Все',
            code: '', // Можно установить фиктивный код для этого товара
          };
          updatedProducts = [allProduct, ...data]; // Добавляем товар "Все" в начало списка
        }

        // Обновляем состояние с полученными товарами
        setProducts(updatedProducts);
      })
      .catch(() => message.error(t('couponAddModal.errorAdd')));
  };

  // Поиск товара по штрих-коду
  const onBarcodeSearch = (e?: React.KeyboardEvent<HTMLInputElement>, barcodeParam?: string) => {
    const searchBarcode = barcodeParam ?? barcode;

    if (!searchBarcode) {
      onClear(); // Сбрасываем все данные товара, если штрих-код пустой
      return;
    }

    if (e && e.key !== 'Enter') return; // Не обрабатываем, если не нажата клавиша Enter

    setBarcodeLoading(true);
    //sendRequest(`${API_URL}/api/products/getProductByBarcodeLocal?barcode=${searchBarcode}`, {
    /* sendRequest(`${API_URL}/api/products/barcode?barcode=${searchBarcode}`, {
      headers: getHeaders(),
    }) */

      const url = useLocalApi
      ? `${API_URL}/api/products/getProductByBarcodeLocal?barcode=${searchBarcode}`
      : `${API_URL}/api/products/barcode?barcode=${searchBarcode}`;

    sendRequest(url, {
      headers: getHeaders(),
    })
      
      .then((product: Product) => {
        setBarcode(product.code);
        setProductSearch(product.name); // Обновляем значение поиска, чтобы отображать товар
        onProductSelect(product.id, product.code);
      })
      .catch(() => {
        message.error(t('couponAddModal.productNotFound'));
        onClear();
      })
      .finally(() => setBarcodeLoading(false));
  };

  // Обработчик очистки штрих-кода
  const handleBarcodeClear = () => {
    setBarcode(''); // Очищаем штрих-код
    setProductSearch(''); // Очищаем строку поиска
    onClear(); // Сбрасываем выбранный товар
  };

  return (
    <div>
      <div className={styles.searchContainer}>
        
        <Select
          placeholder={t('couponAddModal.product')}
          showSearch
          optionFilterProp="children"
          allowClear
          value={productSearch} // Значение поля поиска обновляется с выбором товара
          onSearch={(value) => setProductSearch(value)} // Обновляем текст запроса
          onChange={(value) => {
            const selectedProduct = products.find((p) => p.id === value);
            if (selectedProduct) {
              setBarcode(selectedProduct.code); // Устанавливаем штрих-код выбранного товара
              setProductSearch(selectedProduct.name); // Обновляем текст в поле поиска
              onProductSelect(selectedProduct.id, selectedProduct.code);
            } else {
              setBarcode(undefined);
              setProductSearch(''); // Очистить текст поиска, если ничего не выбрано
              fetchProducts(''); // Очистить список товаров
              onClear(); 
            }
          }}
          filterOption={false}
          className={styles.selectInput} // ширина селекта
        >
          {products.map((p) => (
            <Option key={p.id} value={p.id}>
              {p.name}
            
            </Option>
          ))}
        </Select>

        
        <Input
          allowClear
          value={barcode}
          placeholder={t('couponAddModal.barcodePlaceholder')}
          onChange={(e) => setBarcode(e.target.value)} // Обновляем штрих-код
          onKeyDown={(e) => onBarcodeSearch(e)} // Слушаем клавишу Enter
          suffix={
            barcodeLoading ? (
              <LoadingOutlined spin />
            ) : (
              <SearchOutlined onClick={() => onBarcodeSearch(undefined, barcode)} />
            )
          }
          className={styles.barcodeInput} // Ширина инпута
          onClear={handleBarcodeClear} // Очистка штрих-кода и товара, когда пользователь очищает поле
        />
      </div>
    </div>
  );
};

export default ProductBarcodeSearch;
