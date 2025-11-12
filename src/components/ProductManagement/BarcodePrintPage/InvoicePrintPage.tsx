import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Tag,
  Space,
  Typography,
  Select,
  Checkbox,
  Divider,
  message,
} from 'antd';
import { EyeOutlined, RotateRightOutlined, PrinterOutlined, FilterOutlined } from '@ant-design/icons';
import Barcode from 'react-barcode';
import dayjs, { Dayjs } from 'dayjs';
import useApiRequest from '../../../hooks/useApiRequest';
import DateRangePickerSafe from '../../DateRangePickerSafe'; 

// Импорт хука перевода
import { useTranslation } from 'react-i18next';


const { Title, Text } = Typography;
const { Option } = Select;

// =========================================================================
// === ТИПЫ ДАННЫХ =========================================================
// =========================================================================

interface Invoice {
  altnumber: string;
  invoicenumber: string;
  invoicedate: string;
  invoicetype: string;
  invoicetypeid: string;
  stockto: string;
  stockfrom: string;
  bin: string;
  counterparty: string;
  name: string;
}

interface InvoiceDetail {
  name: string;
  code: string;
  price: number;
  newprice: number;
  purchaseprice: number;
  attributescaption: string | null;
  brand: string;
}

type RangeValue = [Dayjs, Dayjs];

// =========================================================================
// === КОНСТАНТЫ И РАСЧЕТЫ РАЗМЕРОВ ========================================
// =========================================================================
const GAP_MM = 2; // Желаемый зазор между этикетками (2 мм)

// =========================================================================
// === ОСНОВНОЙ КОМПОНЕНТ ==================================================
// =========================================================================

const InvoicePrintPage: React.FC = () => {
  // Вызываем useTranslation без аргумента, так как корневой ключ используется в t()
  const { t } = useTranslation(); 

  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [details, setDetails] = useState<InvoiceDetail[]>([]);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [barcodeFormat, setBarcodeFormat] = useState('svg_price');
  const [showBrand, setShowBrand] = useState(false);
  const [rotation, setRotation] = useState(0);

  // фильтр по датам
  const [dateRange, setDateRange] = useState<RangeValue>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [filterVisible, setFilterVisible] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange[0].format('YYYY-MM-DD');
      const dateTo = dateRange[1].format('YYYY-MM-DD');

      const [data1, data2] = await Promise.all([
        sendRequest(
          `${API_URL}/api/report/history/invoicesnoformation?dateFrom=${dateFrom}&dateTo=${dateTo}&invoicetype=0&counterpartie=0&consignator=0`,
          { headers: getHeaders() }
        ),
        sendRequest(
          `${API_URL}/api/report/history/invoicesnoformation?dateFrom=${dateFrom}&dateTo=${dateTo}&invoicetype=2&counterpartie=0&consignator=0`,
          { headers: getHeaders() }
        ),
      ]);

      const merged = [...data1 as Invoice[], ...data2 as Invoice[]];
      setInvoices(merged);
    } catch (err) {
      console.error(err);
      // !!! Перевод !!!
      message.error(t('barcodePrint.error.loadProducts')); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDetails = async (invoiceNumber: string) => {
    try {
      const data = await sendRequest(
        `${API_URL}/api/report/history/invoice/details?invoicenumber=${invoiceNumber}`,
        { headers: getHeaders() }
      );
      setDetails(data as InvoiceDetail[]);
    } catch (err) {
      console.error(err);
      // !!! Перевод !!!
      message.error(t('barcodePrint.error.loadProducts')); 
    }
  };

  const handleOpenDetails = async (record: Invoice) => {
    setSelectedInvoice(record);
    await fetchDetails(record.invoicenumber);
    setDetailsModalVisible(true);
  };

const handlePrint = () => {
  const printContents = document.getElementById('printArea')?.innerHTML;
  if (!printContents) return;

  const win = window.open('', '', 'height=800,width=1000');
  if (!win) return;

  const style = `
    <style>
      body { margin: 0; padding: 0; }
      @media print {
        .no-print { display: none !important; }
        .barcode-label {
          margin-top: 0 !important; 
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding: 0 !important;
          break-after: avoid; 
        }
        #printArea {
          padding: 0 !important;
          margin: 0 !important;
          overflow: visible !important;
        }
      }
    </style>
  `;

  // !!! Перевод !!!
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

  // =========================================================================
  // === ФУНКЦИЯ ДЛЯ РАСЧЕТА ДИНАМИЧЕСКИХ СТИЛЕЙ ЭТИКЕТКИ (без изменений) ===
  // =========================================================================
  const getLabelStyles = (format: string, isRotated: boolean) => {
    // Default values for 'svg', 'svg_price' (Assuming 76x40mm)
    let width = '76mm';
    let heightMM = 40;
    let rotationTargetMM = 76; 
    let padding = '2mm';
    let fontSize = '10pt';
    let barcodeWidth = 1.6;
    let barcodeHeight = 30;
    let barcodeFontSize = 14; 

    if (format === '30x20_price') {
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

    const FLOW_COMPENSATION_MM = rotationTargetMM - heightMM;
    const ROTATED_MARGIN_BOTTOM = `${FLOW_COMPENSATION_MM + GAP_MM}mm`; 
    
    return {
      style: {
        width,
        minHeight: `${heightMM}mm`,
        marginBottom: isRotated ? ROTATED_MARGIN_BOTTOM : '2mm', 
        
        border: (format === 'svg_price' ) ? '1px solid #000' : 'none',
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
      },
      barcodeProps: {
        width: barcodeWidth,
        height: barcodeHeight,
        margin: 0, 
        fontSize: barcodeFontSize,
      }
    };
  };
  
  // !!! Перевод заголовков столбцов !!!
  const columns = [
    {
      title: t('invoicePrint.column.invoiceNumber'), 
      dataIndex: 'invoicenumber',
      render: (_: any, record: Invoice) => {
        const date = dayjs(record.invoicedate).format('DD.MM.YYYY');
        return `${t('invoicePrint.label.invoice')} ${record.altnumber || record.invoicenumber} ${t('invoicePrint.label.from')} ${date}`;
      },
    },
    {
      title: t('invoicePrint.column.invoiceType'),
      dataIndex: 'invoicetype',
    },
    {
      title: t('invoicePrint.column.stockTo'),
      dataIndex: 'stockto',
    },
    {
      title: t('invoicePrint.column.supplier'),
      render: (_: any, record: Invoice) =>
        `${record.bin} | ${record.counterparty}`,
    },
    {
      title: t('invoicePrint.column.details'),
      render: (_: any, record: Invoice) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleOpenDetails(record)}
        />
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<FilterOutlined />}
          onClick={() => setFilterVisible(true)}
        >
          {t('invoicePrint.button.filter')}
        </Button>
        <Tag color="blue">
          {dateRange[0].format('DD.MM.YYYY')} - {dateRange[1].format('DD.MM.YYYY')}
        </Tag>
      </Space>

      <Table
        loading={loading}
        dataSource={invoices}
        rowKey="invoicenumber"
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      {/* Фильтр по датам */}
      <Modal
        title={t('invoicePrint.modalTitle.filterByDate')}
        open={filterVisible}
        onCancel={() => setFilterVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setFilterVisible(false)}>
            {t('invoicePrint.button.cancel')}
          </Button>,
          <Button
            key="reset"
            onClick={() => setDateRange([dayjs(), dayjs()])}
          >
            {t('invoicePrint.button.reset')}
          </Button>,
          <Button
            key="apply"
            type="primary"
            onClick={() => {
              setFilterVisible(false);
              fetchInvoices();
            }}
          >
            {t('invoicePrint.button.apply')}
          </Button>,
        ]}
      >
        <DateRangePickerSafe 
            value={dateRange}
            onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]]);
                }
            }}
        />
      </Modal>

      {/* Модальное окно деталей */}
  <Modal
    // !!! Перевод заголовка модального окна !!!
    title={`${t('barcodePrint.printTitle')} ${t('invoicePrint.label.byInvoice')} ${t('invoicePrint.label.from')} ${dayjs(
        selectedInvoice?.invoicedate
      ).format('DD.MM.YYYY')}`}
    open={detailsModalVisible}
    onCancel={() => setDetailsModalVisible(false)}
    width={900}
    footer={null}
  >
  {selectedInvoice && (
    <>
      {/* Информация о накладной */}
      <p>
        <b>{t('invoicePrint.label.type')}:</b> {selectedInvoice.invoicetype}
      </p>
      <p>
        <b>{t('invoicePrint.label.stockTo')}:</b> {selectedInvoice.stockto}
      </p>
      <p>
        <b>{t('invoicePrint.label.counterparty')}:</b> {selectedInvoice.bin} | {selectedInvoice.counterparty}
      </p>

      <Divider />

      {/* Настройки отображения */}
      <Space style={{ marginBottom: 12 }}>
        <Select
          value={barcodeFormat}
          onChange={setBarcodeFormat}
          style={{ width: 200 }}
        >
          <Option value="svg">{t('barcodePrint.option.svgNormal')}</Option>
          <Option value="svg_price">{t('barcodePrint.option.svgPrice')}</Option>
          <Option value="30x20_price">{t('barcodePrint.option.price30x20')}</Option>
          <Option value="60x30_price">{t('barcodePrint.option.price60x30')}</Option>
        </Select>
        
      </Space>
      <div>
        <Checkbox
          checked={showBrand}
          onChange={(e) => setShowBrand(e.target.checked)}
        >
          {t('invoicePrint.checkbox.showBrand')}
        </Checkbox>
        </div> 

      {/* === Область печати === */}
     <div
        id="printArea"
        style={{
          maxHeight: '60vh',
          overflowY: 'auto',
          border: '1px solid #eee',
          padding: 10,
        }}
      > 
  
      {details.map((item, idx) => {
          const isRotated = rotation === 90;
          
          const { style, barcodeProps } = getLabelStyles(barcodeFormat, isRotated);
          const isPriceFormat = barcodeFormat.includes('_price');
          const showDivider = barcodeFormat === 'svg_price';
          
          return (

   <div key={idx}>

    {/* === Описание товара (только для экрана) === */}
    <div className="no-print" style={{ marginBottom: 8 }}>
                {idx + 1}. {t('invoicePrint.label.product')}: {item.name} {item.attributescaption && <small>, {item.attributescaption}</small>}
              </div>

  <div
    className="barcode-label" 
    style={style} 
  >
    

    {/* === Название товара (для форматов с ценой) === */}
    {isPriceFormat && (
      <div>
          <div><b>{item.name}</b></div>
      </div>
    )}

    {showBrand && barcodeFormat === 'svg_price' &&  item.brand !='Бренд не указан' &&<div><small>[{item.brand}]</small></div>}

    {/* === Разделитель (для svg_price) === */}
    {showDivider && (
      <Divider style={{ margin: '4px 0', borderTop: '1px solid #000' }} />
    )}

    {/* === Штрихкод (печатается) === */}
    <div style={{ margin: '2px 0' }}> 
      <Barcode 
        value={item.code}
        {...barcodeProps} 
        displayValue={true}
      />  
           
    </div>

    {/* === Разделитель (для svg_price) === */}
    {showDivider && (
      <Divider style={{ margin: '4px 0', borderTop: '1px solid #000' }} />
    )}
       
    {/* === Название товара (для svg без цены) === */}
     {barcodeFormat === 'svg' && (
      <>
        <div>{item.name}</div>
        {item.attributescaption && <small>{item.attributescaption}</small>}
       </>
     )}

    {/* === Цена и атрибуты (печатается для форматов с ценой) === */}
    {isPriceFormat && (
      <div>
        <b>{item.newprice}</b> {item.attributescaption ? ` | ${item.attributescaption}` : ''}
      </div>
    )}

    {/* === Бренд (печатается если showBrand === true) === */}
    {showBrand && barcodeFormat === 'svg' &&   item.brand !='Бренд не указан' && <div><small>[{item.brand}]</small></div>}
  </div>
  </div> 
)

})}

</div>


      {/* === Кнопки управления === */}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Button
          style={{ marginRight: 8 }}
          onClick={() => setDetailsModalVisible(false)}
        >
          {t('invoicePrint.button.cancel')}
        </Button>
        <Button
          icon={<RotateRightOutlined />}
          style={{ marginRight: 8 }}
          onClick={() => setRotation((prevRotation) => (prevRotation === 0 ? 90 : 0))}
        >
          {t('invoicePrint.button.rotateBarcode')}
        </Button>
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
        >
          {t('barcodePrint.button.print')}
        </Button>
      </div>
    </>
  )}

  {/* CSS для печати (без изменений) */}
  <style>
    {`
      @media print {
        .no-print {
          display: none !important;
        }
        .barcode-label {
          margin-top: 0 !important; 
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding: 0 !important;
          break-after: avoid; 
        }
        #printArea {
          padding: 0 !important;
          margin: 0 !important;
          overflow: visible !important; 
        }
        body { 
          margin: 0; 
        }
      }
    `}
  </style>
</Modal>

</>
  );
};

export default InvoicePrintPage;