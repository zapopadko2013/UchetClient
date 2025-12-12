import React, { useEffect, useState } from "react";
import { Modal, Input, Table, Button, message } from "antd";
import useApiRequest from "../../hooks/useApiRequest";

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
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || "";

  const [products, setProducts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });

  // Хелпер для парсинга даты DD.MM.YYYY
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      // new Date(year, monthIndex, day)
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

    /*   // карта атрибутов (если понадобится)
      const attrMap = new Map<number, any[]>();
      attrs.catalog.forEach((a: any) => attrMap.set(a.id, a.values));

      // группируем остатки по productId
      const stockGrouped = new Map<number, any[]>();
      stock.catalog.forEach((s: any) => {
        if (!stockGrouped.has(s.product)) stockGrouped.set(s.product, []);
        stockGrouped.get(s.product)!.push(s);
      });

      // создаем объединенный массив товаров
      const combined: any[] = [];
      prod.catalog.forEach((p: any) => {
        const stockList = stockGrouped.get(p.id) || [];
        stockList.forEach((s: any, index: number) => {
          combined.push({
            id: s.id ?? `${p.id}_${index}`, // <-- ключ гарантированно уникальный
            productId: p.id,
            code: p.code,
            name: p.name,
            price: s.price ?? 0,
            stock: s.units ?? 0,
            attributes: s.attributes ?? [],
            ///
            listcode: s.listcode,
            ///
          });
        });
      }); */

     // ============================
    // 1. КАРТА СКИДОК ПО STOCKID
    // ============================

    const stockDiscountMap = new Map<number, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Array.isArray(discounts.catalog)) {
      for (const d of discounts.catalog) {
        const expiration = d.expirationdate ? parseDate(d.expirationdate) : null;

        // скидка активна
        if (d.discount > 0 && (!expiration || expiration >= today)) {
          if (Array.isArray(d.products)) {
            for (const prodItem of d.products) {
              const stockId = prodItem.id; // << ЭТО stockid

              const current = stockDiscountMap.get(stockId) || 0;
              if (d.discount > current) {
                stockDiscountMap.set(stockId, d.discount);
              }
            }
          }
        }
      }
    }

    // ============================
    // 2. КАРТА АТРИБУТОВ
    // ============================

    const attrMap = new Map<number, any[]>();
    if (Array.isArray(attrs.catalog)) {
      attrs.catalog.forEach(a => attrMap.set(a.id, a.values));
    }

    // ============================
    // 3. ГРУППИРОВКА ОСТАТКОВ
    // ============================

    const stockGrouped = new Map<number, any[]>();
    stock.catalog.forEach(s => {
      if (!stockGrouped.has(s.product)) stockGrouped.set(s.product, []);
      stockGrouped.get(s.product)!.push(s);
    });

    // ============================
    // 4. СОБИРАЕМ ИТОГОВЫЙ СПИСОК
    // ============================

    const combined: any[] = [];

    prod.catalog.forEach((p: any) => {
      const stockList = stockGrouped.get(p.id) || [];

      stockList.forEach((s: any, __: number) => {
        const stockId = s.stockid; // ✔ Правильный уникальный ID остатка

        // скидка по stockid
        const discountPercent = stockDiscountMap.get(stockId) || 0;

        const originalPrice = s.price ?? 0;
        const discountAmount = originalPrice * (discountPercent / 100);
        const finalPrice = originalPrice - discountAmount;

        combined.push({
          id: stockId,                // ID строки = ID остатка
          productId: p.id,            // ID товара
          code: p.code,
          name: p.name,

          originalPrice,
          price: finalPrice,
          discountPercent,

          stock: s.units ?? 0,

          attributes: s.attributes || [],
          listcode: s.listcode,
        });
      });
    });

      //console.log(combined);

      const result = combined.filter((item) => item.stock > 0);

      setProducts(result);
      setFiltered(result);

      // обновляем родителя
      if (onLoadProducts) onLoadProducts(result);
    } catch (err) {
      console.error(err);
      message.error("Ошибка загрузки товаров");
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
      title: "Наименование",
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
    { title: "Штрих-код", dataIndex: "code", width: 140 },
    /* { title: "Цена", dataIndex: "price", width: 100 }, */
    { title: "Цена", dataIndex: "originalPrice", width: 100 },
    { title: "Остаток", dataIndex: "stock", width: 90 },
    {
      title: "Действие",
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
          Выбрать
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title="Выбор товара"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
    >
      <Input
        placeholder="Поиск по наименованию или штрих-коду"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 10 }}
      />

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey={(record) => `${record.productId}_${record.id}`} // теперь всегда уникальный
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
