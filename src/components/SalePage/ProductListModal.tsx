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

  const loadData = async () => {
    try {
      const [prod, stock, attrs] = await Promise.all([
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
      ]);

      // карта атрибутов (если понадобится)
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
          });
        });
      });

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
    { title: "Цена", dataIndex: "price", width: 100 },
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
