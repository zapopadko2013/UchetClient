import React, { useState } from "react";
import { Button, Input, Space, Table, message } from "antd";
import {
  AppstoreOutlined,
  BarcodeOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  MoneyCollectOutlined,
} from "@ant-design/icons";
import ProductListModal from "./ProductListModal";
import PaymentModal from "./PaymentModal";

interface Props {
  //pointId: string;
  point: { id: string; name: string; address: string };
  cashboxUser: any;
  role4Users?: User[];
  companyInfo: any;
  ticketFormat: any;
}

interface User {
  id: number;
  name: string;
  role: string;
}

const SaleWorkspace: React.FC<Props> = ({ 
  //pointId
  point
  , cashboxUser, role4Users,companyInfo,ticketFormat }) => {
  const [saleProducts, setSaleProducts] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [paymentVisible, setPaymentVisible] = useState(false);

  const [productStock, setProductStock] = useState<Map<string, { initial: number; current: number }>>(
    new Map()
  );

  const total = saleProducts.reduce((sum, p) => sum + p.price * p.qty, 0);

  // --- Хелпер для округления ---
  const round = (num: number, precision = 3) => {
    const factor = 10 ** precision;
    return Math.round(num * factor) / factor;
  };

  // --- Генерация ключа товара ---
  const makeProductKey = (product: any, weight?: number) => `${product.id}_${weight ?? 0}`;

  // --- Парсинг штрих-кода ---
  const parseBarcode = (bar: string) => {
    const code = bar.trim();
    let temp = code;
    let productWeight: number | null = null;
    let productCode: string | null = null;

    if (code.startsWith("00") || code.startsWith("21")) {
      if (code.startsWith("00")) while (temp.length < 12) temp = "0" + temp;

      if (temp.length >= 12) {
        productCode = temp.substring(0, 7);
        const kg = Number(temp.substring(7, 9));
        const gr = Number(temp.substring(9, 12));
        if (!isNaN(kg) && !isNaN(gr)) productWeight = kg+ gr / 1000;
      }

      return { isWeight: true, productCode, productWeight };
    }

    return { isWeight: false, productCode: code, productWeight: null };
  };

  // --- Добавление товара ---
  const addProduct = (product: any, qty: number = 1, weight?: number) => {
    const key = makeProductKey(product, weight);

    if (!productStock.has(key)) {
      productStock.set(key, { initial: product.stock, current: product.stock });
      setProductStock(new Map(productStock));
    }

    const stock = productStock.get(key)!;

    if (stock.current <= 0) {
      message.warning("Больше товара нет на складе");
      return;
    }

    const actualQty = Math.min(qty, stock.current);

    const existing = saleProducts.find((p) => p.key === key);
    if (existing) {
      existing.qty = round(existing.qty + actualQty);
      stock.current = round(stock.current - actualQty);
      setSaleProducts([...saleProducts]);
      setProductStock(new Map(productStock));
    } else {
      setSaleProducts([...saleProducts, { ...product, qty: round(actualQty), key, isWeight: !!weight }]);
      stock.current = round(stock.current - actualQty);
      setProductStock(new Map(productStock));
    }
  };

  // --- Увеличение количества ---
  const increaseQty = () => {
    if (!selectedRowKey) return;
    const row = saleProducts.find((p) => p.key === selectedRowKey);
    if (!row) return;

    const stock = productStock.get(selectedRowKey)!;
    const step = 1;

    if (stock.current < step) {
      message.warning("Больше товара нет на складе");
      return;
    }

    row.qty = round(row.qty + step);
    stock.current = round(stock.current - step);
    setSaleProducts([...saleProducts]);
    setProductStock(new Map(productStock));
  };

  // --- Уменьшение количества ---
  const decreaseQty = () => {
    if (!selectedRowKey) return;
    const row = saleProducts.find((p) => p.key === selectedRowKey);
    if (!row) return;

    const step = 1;

    if (row.qty <= step) {
      message.warning("Количество не может быть меньше минимального");
      return;
    }

    row.qty = round(row.qty - step);
    const stock = productStock.get(selectedRowKey)!;
    stock.current = round(stock.current + step);
    setSaleProducts([...saleProducts]);
    setProductStock(new Map(productStock));
  };

  // --- Удаление товара ---
  const deleteProduct = () => {
    if (!selectedRowKey) return;
    const row = saleProducts.find((p) => p.key === selectedRowKey);
    if (!row) return;

    const stock = productStock.get(selectedRowKey)!;
    stock.current = round(stock.current + row.qty);
    setSaleProducts(saleProducts.filter((p) => p.key !== selectedRowKey));
    setSelectedRowKey(null);
    setProductStock(new Map(productStock));
  };

  // --- Колонки таблицы ---
  const columns = [
    { title: "Наименование", dataIndex: "name" },
    /* { title: "Цена", dataIndex: "price" }, */
    { title: "Цена", dataIndex: "originalPrice" },
    {
      title: "Кол-во",
      dataIndex: "qty",
      render: (_: any, row: any) => {
        const stock = productStock.get(row.key)!;
        return (
          <Input
            type="number"
            //min={1}
            min={row.isWeight ? 0.001 : 1}
            //step={1}
            //step={row.isWeight ? 0.001 : 1}
            step={undefined}
            value={row.qty}
            onChange={(e) => {
              const newQty = Number(e.target.value);
              //if (newQty < 1) {
              if (isNaN(newQty) || newQty < (row.isWeight ? 0.001 : 1)) {
                message.warning("Количество не может быть меньше минимального");
                return;
              }
              if (newQty > stock.initial) {
                message.warning("Больше товара нет на складе");
                return;
              }
              row.qty = round(newQty);
              stock.current = round(stock.initial - newQty);
              setSaleProducts([...saleProducts]);
              setProductStock(new Map(productStock));
            }}
          />
        );
      },
    },
    {
      title: "Остаток",
      render: (_: any, row: any) => round(productStock.get(row.key)?.current ?? row.stock, 3),
    },
    { title: "Скидка", 
     // dataIndex: "discount"
    render: (_: any, row: any) => {
      const discount = row.originalPrice ? (row.originalPrice - row.price) : 0;
      return discount > 0 ? (row.qty *discount).toFixed(2) : "0";
    },
    },
    {
      title: "Итого",
      render: (_: any, row: any) => (row.qty * row.price).toFixed(2),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 10 }}>
        <Button icon={<AppstoreOutlined />} onClick={() => setModalVisible(true)}>
          Список товаров
        </Button>

        <Input
          prefix={<BarcodeOutlined />}
          placeholder="Штрих-код"
          style={{ width: 200 }}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onPressEnter={() => {
            const parsed = parseBarcode(barcode);

            if (!parsed.productCode) {
              message.warning("Неверный штрих-код");
              return;
            }

            const product = allProducts.find(
              (p) => p.code.trim() === parsed.productCode!.trim()
            );

            if (!product) {
              message.warning("Товар с таким штрих-кодом не найден");
              return;
            }

            const qty = parsed.isWeight && parsed.productWeight ? parsed.productWeight : 1;
            const weight = parsed.isWeight && parsed.productWeight != null ? parsed.productWeight : undefined;

            addProduct(product, qty, weight);
            setBarcode("");
          }}
        />

        <Button icon={<PlusOutlined />} onClick={increaseQty} />
        <Button icon={<MinusOutlined />} onClick={decreaseQty} />
        <Button icon={<DeleteOutlined />} danger onClick={deleteProduct} />

        <Button
          icon={<MoneyCollectOutlined />}
          onClick={() => {
            const printWindow = window.open("", "_blank", "width=300,height=400");
            if (printWindow) {
              printWindow.document.write(`
                <html>
                  <head>
                    <title>Чек</title>
                    <style>
                      body { font-family: monospace; padding: 20px; }
                      .center { text-align: center; }
                    </style>
                  </head>
                  <body>
                    <div class="center"><h3>Спасибо за покупку!</h3></div>
                  </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
              printWindow.close();
            } else {
              message.error("Не удалось открыть окно печати");
            }
          }}
        >
          Денежный ящик
        </Button>

        <div style={{ background: "black", color: "white", padding: 10 }}>
          Сумма: {total.toFixed(2)}
        </div>
      </Space>

      <Table
        dataSource={saleProducts}
        columns={columns}
        rowKey="key"
        pagination={false}
        rowSelection={{
          type: "radio",
          selectedRowKeys: selectedRowKey ? [selectedRowKey] : [],
          onChange: (keys) => setSelectedRowKey(keys.length ? String(keys[0]) : null),
        }}
      />

      <Space style={{ marginTop: 10 }}>
        <Button danger>Возврат</Button>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            if (saleProducts.length === 0) {
              message.warning("Сначала добавьте товары для продажи");
              return;
            }
            setPaymentVisible(true);
          }}
        >
          Оплата
        </Button>
      </Space>

      <ProductListModal
        visible={modalVisible}
        //pointId={pointId}
        pointId={point.id}
        onClose={() => setModalVisible(false)}
        //onSelectProduct={(p: any) => addProduct(p)}
        onSelectProduct={(p: any) => addProduct({ 
          ...p, 
          originalPrice: p.originalPrice,  // цена без скидки
    price: p.price,                  // цена со скидкой
    discount: p.originalPrice - p.price,
        })}
        onLoadProducts={setAllProducts}
      />

      <PaymentModal
        open={paymentVisible}
        saleProducts={saleProducts}
        totalAmount={total}
        role4Users={role4Users}
        cashboxUser={cashboxUser}
        point={point}
        companyInfo={companyInfo}
        onClose={() => setPaymentVisible(false)}
        ticketFormat={ticketFormat}
        onCompletePayment={(_) => {
          //console.log("Оплата завершена:", data);
          setSaleProducts([]);        
          setSelectedRowKey(null);   
        }}
      />
    </>
  );
};

export default SaleWorkspace;
