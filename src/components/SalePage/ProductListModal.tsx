import React, { useEffect, useState } from "react";
import { Modal, Input, Table, Button, message } from "antd";
import { useTranslation } from "react-i18next"; // 1. Импорт хука
import useApiRequest from "../../hooks/useApiRequest";
import styles from "./Sale.module.css";

interface Props {
  visible: boolean;
  pointId: string;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
  onLoadProducts?: React.Dispatch<React.SetStateAction<any[]>>;
}

const ProductListModal: React.FC<Props> = ({
  visible,
  pointId,
  onClose,
  onSelectProduct,
  onLoadProducts,
}) => {
  const { t } = useTranslation(); // 2. Инициализация
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || "";

  const [products, setProducts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    return null;
  };

  const loadData = async () => {
    try {
      const [prod, stock, attrs, discounts] = await Promise.all([
        sendRequest(`${API_URL}/external/api/primary/information`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ point: pointId, type: "products" }),
        }),
        sendRequest(`${API_URL}/external/api/primary/information`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ point: pointId, type: "stocks" }),
        }),
        sendRequest(`${API_URL}/external/api/primary/information`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ point: pointId, type: "attributes" }),
        }),
        sendRequest(`${API_URL}/external/api/primary/information`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ point: pointId, type: "discount" }),
        }),
      ]);

    const stockDiscountMap = new Map<number, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Array.isArray(discounts.catalog)) {
      for (const d of discounts.catalog) {
        const expiration = d.expirationdate ? parseDate(d.expirationdate) : null;
        if (d.discount > 0 && (!expiration || expiration >= today)) {
          if (Array.isArray(d.products)) {
            for (const prodItem of d.products) {
              const stockId = prodItem.id;
              const current = stockDiscountMap.get(stockId) || 0;
              if (d.discount > current) {
                stockDiscountMap.set(stockId, d.discount);
              }
            }
          }
        }
      }
    }

    const combined: any[] = [];
    const stockGrouped = new Map<number, any[]>();
    
    stock.catalog.forEach((s: any) => {
      if (!stockGrouped.has(s.product)) stockGrouped.set(s.product, []);
      stockGrouped.get(s.product)!.push(s);
    });

    prod.catalog.forEach((p: any) => {
      const stockList = stockGrouped.get(p.id) || [];
      stockList.forEach((s: any) => {
        const stockId = s.stockid;
        const discountPercent = stockDiscountMap.get(stockId) || 0;
        const originalPrice = s.price ?? 0;
        const discountAmount = originalPrice * (discountPercent / 100);
        const finalPrice = originalPrice - discountAmount;

        combined.push({
          id: stockId,
          productId: p.id,
          code: p.code,
          name: p.name,
          originalPrice,
          price: finalPrice,
          discountPercent,
          stock: s.units ?? 0,
          attributes: s.attributes || [],
          listcode: s.listcode,
          category: p.category,
        });
      });
    });

      const result = combined.filter((item) => item.stock > 0);
      setProducts(result);
      setFiltered(result);
      if (onLoadProducts) onLoadProducts(result);
    } catch (err) {
      console.error(err);
      message.error(t('sale.productModal.loadError') || "Ошибка загрузки товаров");
    }
  };

  useEffect(() => {
    if (visible) loadData();
  }, [visible]);

  useEffect(() => {
    setFiltered(
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.code.includes(search)
      )
    );
  }, [search, products]);

  const columns = [
    {
      title: t('sale.productModal.name') || "Наименование",
      dataIndex: "name",
      render: (_: any, row: any) => {
        const attrs =
          row.attributes && Array.isArray(row.attributes)
            ? row.attributes.map((a: any) => `${a.attributename}: ${a.value}`).join(", ")
            : "";
        return (
          <span>
            {row.name}
            {attrs ? ` (${attrs})` : ""}
          </span>
        );
      },
    },
    { 
      title: t('sale.productModal.code') || "Штрих-код", 
      dataIndex: "code", 
      width: 140 
    },
    { 
      title: t('sale.productModal.price') || "Цена", 
      dataIndex: "originalPrice", 
      width: 100 
    },
    { 
      title: t('sale.productModal.stock') || "Остаток", 
      dataIndex: "stock", 
      width: 90 
    },
    {
      title: t('sale.productModal.action') || "Действие",
      width: 120,
      render: (_: any, row: any) => (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            onSelectProduct(row);
            onClose();
          }}
        >
          {t('sale.productModal.selectBtn') || "Выбрать"}
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title={t('sale.productModal.title') || "Выбор товара"}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      zIndex={3500}
    >
      <Input
        placeholder={t('sale.productModal.searchPlaceholder') || "Поиск по наименованию или штрих-коду"}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.searchInput}
      />

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey={(record) => `${record.productId}_${record.id}`}
        pagination={{ pageSize: 20 }}
        onRow={(row) => ({
          onDoubleClick: () => {
            onSelectProduct(row);
            onClose();
          },
        })}
      />
    </Modal>
  );
};

export default ProductListModal;