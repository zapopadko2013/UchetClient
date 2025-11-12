import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Select,
  Input,
  Button,
  Typography,
  Form,
  message,
  Checkbox,
  Divider,
} from 'antd';
import { SearchOutlined, RotateRightOutlined, PrinterOutlined } from '@ant-design/icons';
import useApiRequest from '../../../hooks/useApiRequest';
import Barcode from 'react-barcode';

// Импорт компонента для второй вкладки (предполагаем, что он находится рядом)
import InvoicePrintPage from './InvoicePrintPage';

// Импорт хука перевода
import { useTranslation } from 'react-i18next';


const { Option } = Select;
const { Title, Text } = Typography;

// =========================================================================
// === ТИПЫ ДАННЫХ =========================================================
// =========================================================================

interface Point {
  id: string;
  name: string;
  address: string;
  point_type_name: string;
  status: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  discount?: number | null;
  sumdiscount?: number | null;
}

// =========================================================================
// === КОНСТАНТЫ И РАСЧЕТЫ РАЗМЕРОВ ========================================
// =========================================================================
const GAP_MM = 2; 

// =========================================================================
// === ОСНОВНОЙ КОМПОНЕНТ ==================================================
// =========================================================================

const BarcodePrintPage: React.FC = () => {
  // Используем корневую ветку `barcodePrint`
  const { t } = useTranslation(); 
  
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [points, setPoints] = useState<Point[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [barcodeValue, setBarcodeValue] = useState<string>('');
  const [barcodeFormat, setBarcodeFormat] = useState<string>('svg');
  const [rotation, setRotation] = useState<number>(0);
  const [activeTabKey, setActiveTabKey] = useState('productSearch'); 

  const [paperWidth, setPaperWidth] = useState<string>('60мм');
  const [extraAttr, setExtraAttr] = useState<string>('');
  const [brandName, setBrandName] = useState<string>('');
  const [withDiscount, setWithDiscount] = useState<boolean>(false);
  const [textSize, setTextSize] = useState<'big' | 'small'>('big');


  const getLabelStyles = (format: string, isRotated: boolean) => {
    let width = '76mm';
    let heightMM = 40;
    let rotationTargetMM = 76; 
    let padding = '2mm';
    let fontSize = '10pt';
    let barcodeWidth = 1.6;
    let barcodeHeight = 30;
    let barcodeFontSize = 14; 

    if (format === '30x20_price' || format === '30x20') {
      width = '30mm';
      heightMM = 20;
      rotationTargetMM = 30;
      padding = '1mm';
      fontSize = '6pt';
      barcodeWidth = 0.6;
      barcodeHeight = 12;
      barcodeFontSize = 8;
    } else if (format === '60x30_price') {
      width = '60mm';
      heightMM = 30;
      rotationTargetMM = 60;
      padding = '2mm';
      fontSize = '8pt';
      barcodeWidth = 1.3;
      barcodeHeight = 20;
      barcodeFontSize = 14;
    }

    const hasBorder = format === 'svg_price';
    const FLOW_COMPENSATION_MM = rotationTargetMM - heightMM;
    const ROTATED_MARGIN_BOTTOM = `${FLOW_COMPENSATION_MM + GAP_MM}mm`;

    return {
      style: {
        width,
        minHeight: `${heightMM}mm`,
        marginBottom: isRotated ? ROTATED_MARGIN_BOTTOM : '2mm',

        border: hasBorder ? '1px solid #000' : 'none',
        padding: padding,
        boxSizing: 'border-box' as const,

        display: 'flex' as const,
        flexDirection: 'column' as const,
        justifyContent: 'center' as const,

        transform: isRotated ? 'rotate(90deg) translateY(-100%)' : 'none',
        transformOrigin: 'top left' as const,

        fontSize: fontSize,
        lineHeight: 1.2,
        textAlign: 'center' as const,
        wordBreak: (format.includes('_price') ? 'break-all' : 'normal') as 'break-all' | 'normal',
        marginRight: isRotated ? '50px' : '0', 
      },
      barcodeProps: {
        width: barcodeWidth,
        height: barcodeHeight,
        margin: 0,
        fontSize: barcodeFontSize,
      }
    };
  };

  const getPaperWidthPx = (paperWidth: string) => {
    switch (paperWidth) {
      case '60мм':
      case '60':
        return 226; 
      case '80мм':
      case '80':
        return 302; 
      default:
        return 226;
    }
  };

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  const handlePrint = () => {
    const printContents = document.getElementById('barcodePrintArea')?.innerHTML;
    if (!printContents) return;

    const widthPx = getPaperWidthPx(paperWidth); 

    const win = window.open('', '', `height=800,width=${widthPx + 100}`); 
    if (!win) return;

    const style = `
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          width: ${widthPx}px; 
        }

        @media print {
          body {
            width: ${widthPx}px !important;
            margin: 0;
            padding: 0;
          }

          .no-print { display: none !important; }

          .barcode-label {
            margin: 0 !important;
            padding: 0 !important;
            break-after: avoid; 
          }

          #barcodePrintArea {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            width: ${widthPx}px !important; 
          }
        }
      </style>
    `;

    win.document.write(`<html><head><title>${t('barcodePrint.printTitle')}</title>`);
    win.document.write(style);
    win.document.write('</head><body>');
    win.document.write(printContents);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const fetchPoints = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/point`, { headers: getHeaders() });
      setPoints(data);
    } catch (err) {
      console.error(err);
      message.error(t('barcodePrint.error.loadPoints'));
    }
  };

  useEffect(() => {
    fetchPoints();
  }, []);

  const fetchProducts = async (pointId: string, search?: string) => {
    try {
      const url =
        search && search.length >= 3
          ? `${API_URL}/api/products/bypointdiscount?productName=${encodeURIComponent(
              search
            )}&point=${pointId}`
          : `${API_URL}/api/products/bypointdiscount?point=${pointId}`;

      const data = await sendRequest(url, { headers: getHeaders() });

      if (Array.isArray(data) && data.length === 0 && search) {
        const allData = await sendRequest(`${API_URL}/api/products/bypointdiscount?point=${pointId}`, {
          headers: getHeaders(),
        });
        setProducts(allData);
      } else {
        setProducts(data);
      }

    } catch (err) {
      console.error(err);
      message.error(t('barcodePrint.error.loadProducts'));
    }
  };

  const fetchByBarcode = async (barcode: string) => {
    if (!barcode) {
      setSelectedProduct(null); 
      return; 
    }

    try {
      const data = await sendRequest(
        `${API_URL}/api/products/getProductByBarcodeLocal?barcode=${barcode}`,
        { headers: getHeaders() }
      );
      setSelectedProduct(data);
    } catch (err) {
      console.error(err);
      message.error(t('barcodePrint.error.barcodeNotFound'));
    }
  };


  const renderBarcodeByFormat = () => {
    if (!selectedProduct || !barcodeFormat) return null;

    const isRotated = rotation === 90;
    const formWrapperStyle: React.CSSProperties = { marginTop: 16, width: 300 };

    // ====================================================
    // === Обычный SVG / Обычный IMG (76x40мм) ============
    // ====================================================
    if (barcodeFormat === 'svg' || barcodeFormat === 'img') {
      const { style, barcodeProps } = getLabelStyles(barcodeFormat, isRotated);
      const renderer = barcodeFormat as 'svg' | 'img'; 

      return (
        <>
            <div style={formWrapperStyle}>
                 {barcodeFormat === 'img' && (
                    <Form.Item label={t('barcodePrint.label.paperWidth')} initialValue="60мм">
                       <Select value={paperWidth} onChange={setPaperWidth} style={{ width: 120 }}>
                           <Option value="60мм">60мм</Option>
                           <Option value="80мм">80мм</Option>
                       </Select>
                    </Form.Item>
                 )}
            </div>
               
            <div 
                id="barcodePrintArea" 
                style={{ 
                    marginTop: 40, 
                    marginLeft: 40,
                    display: 'flex', 
                    justifyContent: 'flex-start', 
                    alignItems: 'flex-start',
                    //width: `${getPaperWidthPx(paperWidth)}px`,
                }}
            >
                <div 
                    className="barcode-label" 
                    style={{ ...style }}
                >
                    
                    <div style={{ margin: '2px 0' }}>
                        <Barcode 
                            value={selectedProduct.code} 
                            {...barcodeProps} 
                            displayValue={true} 
                            renderer={renderer}
                        />
                    </div>

                    <div 
                     style={{
                        marginBottom: '4px',
                        textAlign: 'center',
                        // display: '-webkit-box',
                        // WebkitLineClamp: 2, 
                        // WebkitBoxOrient: 'vertical',
                        // overflow: 'hidden',
                        // textOverflow: 'ellipsis',
                        // lineHeight: 1.2,
                        // maxHeight: '2.4em', 
                      }}
                    >
                        {selectedProduct.name}
                    </div>
                       
                </div>

                <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 16 }}>
                    <Button
                        icon={<RotateRightOutlined />}
                        onClick={() => setRotation((prevRotation) => (prevRotation === 0 ? 90 : 0))}
                    >
                        {t('barcodePrint.button.rotate')}
                    </Button>
                    <Button
                        type="primary"
                        icon={<PrinterOutlined />}
                        onClick={handlePrint}
                    >
                        {t('barcodePrint.button.print')}
                    </Button>
                </div>
            </div>
        </>
      );
    }
    
    // =================================================================================
    // === ФОРМАТЫ С ЦЕНОЙ ==============================================================
    // =================================================================================

    if (barcodeFormat.includes('_price') || barcodeFormat === '30x20') {
      
      const { style, barcodeProps } = getLabelStyles(barcodeFormat, isRotated);
      const isPriceFormat = barcodeFormat.includes('_price');
      const showDivider = barcodeFormat === 'svg_price';
      
      return (
        <>
          {/* === Настройки для форматов с ценой === */}
          <div style={formWrapperStyle}>
            {/* Бренд теперь только для svg_price */}
            {barcodeFormat === 'svg_price' && (
              <Form.Item label={t('barcodePrint.label.brand')}>
                <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
              </Form.Item>
            )}
            
            {barcodeFormat === '60x30_price' && (
              <Form.Item label={t('barcodePrint.label.textSize')}>
                <Select value={textSize} onChange={setTextSize}>
                  <Option value="big">{t('barcodePrint.option.bigText')}</Option>
                  <Option value="small">{t('barcodePrint.option.smallText')}</Option>
                </Select>
              </Form.Item>
            )}
            
            {/* Доп. атрибут */}
            <Form.Item label={t('barcodePrint.label.extraAttribute')}>
              <Input value={extraAttr} onChange={(e) => setExtraAttr(e.target.value)} />
            </Form.Item>
            
            {isPriceFormat && (
              <Form.Item>
                <Checkbox checked={withDiscount} onChange={(e) => setWithDiscount(e.target.checked)}>
                  {t(withDiscount ? 'barcodePrint.checkbox.hasDiscount' : 'barcodePrint.checkbox.noDiscount')}
                </Checkbox>
              </Form.Item>
            )}
          </div>

          {/* === Область печати с применением динамических стилей === */}
          <div 
            id="barcodePrintArea" 
            style={{ 
              marginTop: 40, 
              marginLeft: 40,
              display: 'flex', 
              justifyContent: 'flex-start', 
              alignItems: 'flex-start',
              //width: `${getPaperWidthPx(paperWidth)}px`,
            }}
          >
            <div
              className="barcode-label" 
              style={{...style}}
            >
              {/* === Бренд (печатается) === */}
              {brandName && barcodeFormat === 'svg_price' &&  <div><Text >{brandName}</Text></div>}

              {/* === Название товара === */}
              {(isPriceFormat || barcodeFormat === '30x20') && (
                <div
                      /* style={{
                        marginBottom: '4px',
                        textAlign: 'center',
                        display: '-webkit-box',
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: 'vertical',
                        fontSize: barcodeFormat === '60x30_price' && textSize === 'big' ? '16px' : undefined,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2,
                        maxHeight: '2.4em', 
                    }}  */


                   style={{
    

    fontSize: barcodeFormat === '60x30_price' && textSize === 'big' ? '16px' : undefined,
    
    
}}     
                       
                >
                  {selectedProduct.name}
                </div>
              )}

              {/* === Разделитель (для svg_price) === */}
              {showDivider && (
                <Divider style={{ margin: '4px 0', borderTop: '1px solid #000' }} />
              )}

              {/* === Штрихкод (печатается) === */}
              <div style={{ margin: '2px 0' }}>
                <Barcode
                  value={selectedProduct.code}
                  {...barcodeProps}
                  displayValue={true}
                />
              </div>

              {/* === Разделитель (для svg_price) === */}
              {showDivider && (
                <Divider style={{ margin: '4px 0', borderTop: '1px solid #000' }} />
              )}
                 
              {/* === Цена и атрибуты (печатается для форматов с ценой) === */}
              {isPriceFormat && (
                <div style={{ marginTop: '2px' }}>
                  {withDiscount ? (
                    <>
                      <Text delete>{selectedProduct.price}</Text>
                      {selectedProduct.discount && selectedProduct.sumdiscount && (
                        <div>
                          <Text strong>
                            {selectedProduct.sumdiscount} {extraAttr ? ` | ${extraAttr}` : ''}
                          </Text>
                        </div>
                      )}
                    </>
                  ) : selectedProduct.discount && selectedProduct.sumdiscount ? (
                    <Text strong>
                      {selectedProduct.sumdiscount} {extraAttr ? ` | ${extraAttr}` : ''}
                    </Text>
                  ) : (
                    <Text strong>
                      {selectedProduct.price} {extraAttr ? ` | ${extraAttr}` : ''}
                    </Text>
                  )}
                </div>
              )}
              
              {/* === Атрибуты для 30x20 без цены === */}
               {barcodeFormat === '30x20' && extraAttr && (
                 <Text strong style={{ fontSize: '8pt' }}> {extraAttr}</Text>
               )}
            </div>

           {/* === Кнопки управления === */}
           <div className="no-print"  style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 56, marginTop: 16 }}>
              <Button
                icon={<RotateRightOutlined />}
                onClick={() => setRotation((prevRotation) => (prevRotation === 0 ? 90 : 0))}
              >
                {t('barcodePrint.button.rotate')}
              </Button>
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={handlePrint}
              >
                {t('barcodePrint.button.print')}
              </Button>
            </div>
          </div>
        </>
      );
    }
    
    return null;
  };

  // =========================================================================
  // === JSX: Контент для вкладки "Поиск товара" =============================
  // =========================================================================

  const productSearchTabContent = (
    <>
      <Title level={4}>{t('barcodePrint.title.selectProduct')}</Title>
      <Form layout="vertical">
        {/* Торговая точка */}
        <Form.Item label={t('barcodePrint.label.point')}>
          <Select
            placeholder={t('barcodePrint.placeholder.selectPoint')}
            onChange={(val) => {
              setSelectedPoint(val);
              fetchProducts(val);
              setSelectedProduct(null);
              setBarcodeFormat('svg');
            }}
            style={{ width: 300 }}
          >
            {points.map((p) => (
              <Option key={p.id} value={p.id}>
                {p.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {selectedPoint && (
          <>
            {/* Наименование товара */}
            <Form.Item label={t('barcodePrint.label.productName')}>
              <Select
                showSearch
                placeholder={t('barcodePrint.placeholder.enterProductSearch')}
                filterOption={false}
                style={{ width: 500 }}
                allowClear
                optionLabelProp="label"
                value={selectedProduct ? `${selectedProduct.id}_${selectedProduct.price}` : undefined}
                onSearch={(val) => {
                  if (val.length >= 3 && selectedPoint) {
                    fetchProducts(selectedPoint, val);
                  } else if (val.trim() === '' && selectedPoint) {
                    fetchProducts(selectedPoint);
                  }
                }}
                onChange={(val) => {
                  if (val) {
                    const prod = products.find((p) => `${p.id}_${p.price}` === val);
                    setSelectedProduct(prod || null);
                    setBarcodeValue(prod?.code || '');
                  } else {
                    setSelectedProduct(null);
                    setBarcodeValue('');
                    fetchProducts(selectedPoint, '');
                  }
                }}
              >
                {products.map((prod, index) => (
                  <Select.Option
                    key={`${prod.id}_${prod.price}_${index}`}
                    value={`${prod.id}_${prod.price}`}
                    label={`${prod.name} | ${prod.price}`}
                  >
                    {prod.name} | {prod.price}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* Штрих-код */}
            <Form.Item label={t('barcodePrint.label.barcode')}>
              <Input.Search
                placeholder={t('barcodePrint.placeholder.enterBarcode')}
                value={barcodeValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setBarcodeValue(val);
                  if (val === '') fetchProducts(selectedPoint, '');
                }}
                onSearch={(val) => fetchByBarcode(val)}
                enterButton={<SearchOutlined />}
                style={{ width: 300 }}
                allowClear
              />
            </Form.Item>
          </>
        )}

        {selectedProduct && (
          <>
            {/* Формат штрих-кода */}
            <Form.Item label={t('barcodePrint.label.barcodeFormat')}>
              <Select
                placeholder={t('barcodePrint.placeholder.selectFormat')}
                value={barcodeFormat}
                onChange={(val) => {
                  setBarcodeFormat(val);
                  setRotation(0); 
                }}
                style={{ width: 300 }}
              >
                <Option value="svg">{t('barcodePrint.option.svgNormal')}</Option>
                <Option value="img">{t('barcodePrint.option.imgNormal')}</Option>
                <Option value="svg_price">{t('barcodePrint.option.svgPrice')}</Option>
                <Option value="30x20_price">{t('barcodePrint.option.price30x20')}</Option>
                <Option value="60x30_price">{t('barcodePrint.option.price60x30')}</Option>
                <Option value="30x20">{t('barcodePrint.option.noPrice30x20')}</Option>
              </Select>
            </Form.Item>

            {renderBarcodeByFormat()}
          </>
        )}
      </Form>
    </>
  );

  // =========================================================================
  // === JSX: Компонент с использованием Tabs API `items` ====================
  // =========================================================================
  const tabItems = [
    {
      label: t('barcodePrint.tab.productSearch'),
      key: 'productSearch',
      children: productSearchTabContent,
    },
    {
      label: t('barcodePrint.tab.invoicePrint'),
      key: 'invoicePrint',
      children: <InvoicePrintPage />,
    },
  ];

  return (
    <Tabs 
      defaultActiveKey="productSearch"
      activeKey={activeTabKey}
      onChange={setActiveTabKey}
      items={tabItems} // Использование нового API `items`
    />
  );
};

export default BarcodePrintPage;