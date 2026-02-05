import React, { useState, useEffect } from "react";
import { Col, Row, message, Spin, Modal } from "antd";
import { useTranslation } from "react-i18next"; // 1. Импорт хука
import TicketList from "./TicketList";
import TicketDetails from "./TicketDetails";
import type { TicketFromApi, TicketDetailFromApi } from "./types";
import useApiRequest from "../../hooks/useApiRequest";

interface Props {
  visible: boolean;
  onClose: () => void;
  pointId: string;
  onReturnReady: (saleProducts: any[], ticket: TicketFromApi, productsCatalog: any[]) => void;
}

const ReturnWorkspace: React.FC<Props> = ({ visible, onClose, pointId, onReturnReady }) => {
  const { t } = useTranslation(); // 2. Инициализация
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || "";

  const [tickets, setTickets] = useState<TicketFromApi[]>([]);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [productsCatalog, setProductsCatalog] = useState<any[]>([]);
  const [returnTickets, setReturnTickets] = useState<TicketFromApi[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await sendRequest(`${API_URL}/external/api/primary/information`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ point: pointId, type: "products" }),
        });
        setProductsCatalog(res.catalog || []);
      } catch {
        message.error(t('sale.returnWorkspace.errors.loadCatalog') || "Ошибка загрузки каталога продуктов");
      }
    };
    if (visible) fetchProducts();
  }, [pointId, visible]);

  useEffect(() => {
    if (visible) {
      setTickets([]);
      setReturnTickets([]);
      setSelectedTicketIndex(null);
    }
  }, [visible]);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });

  const getProductName = (productId: number) => {
    const product = productsCatalog.find((p) => p.id === productId);
    return product ? product.name : String(productId);
  };

  const handleClearTickets = () => {
    setTickets([]);
    setSelectedTicketIndex(null);
  };

  const handleSearch = async ({
    ticketNumber,
    dateBegin,
    dateEnd,
  }: {
    ticketNumber?: string;
    dateBegin: string;
    dateEnd: string;
  }) => {
    try {
      setLoading(true);
      const res = await sendRequest(`${API_URL}/external/api/primary/information`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          point: pointId,
          type: "tickets",
          ticketid: ticketNumber,
          date_begin: dateBegin,
          date_end: dateEnd,
        }),
      });

      const allTickets: TicketFromApi[] = res.catalog || [];
      const saleTickets = allTickets.filter(t => t.tickettype !== 1);
      const returns = allTickets.filter(t => t.tickettype === 1);

      setTickets(saleTickets);
      setReturnTickets(returns);
      setSelectedTicketIndex(null);
    } catch {
      message.error(t('sale.returnWorkspace.errors.loadTickets') || "Ошибка загрузки чеков");
    } finally {
      setLoading(false);
    }
  };

  const hasProductReturn = (ticketId: number, productId: number): boolean => {
    return returnTickets.some(rt =>
      rt.ticketid === ticketId &&
      rt.details?.some(d => d.product === productId)
    );
  };

  const handleConfirmReturn = (details: TicketDetailFromApi[]) => {
    if (selectedTicketIndex === null) return;

    const selectedTicket = tickets[selectedTicketIndex];

    for (const d of details) {
      if (hasProductReturn(selectedTicket.id, d.product)) {
        // Используем интерполяцию для имени товара
        message.error(
          t('sale.returnWorkspace.errors.alreadyReturned', { name: getProductName(d.product) }) || 
          `По товару "${getProductName(d.product)}" уже был выполнен возврат`
        );
        return; 
      }
    }

    const saleProducts = details.map((d, i) => {
      const productFromCatalog = productsCatalog.find(p => p.id === d.product);
      return {
        key: `${d.product}_${i}`,
        product: d.product,
        name: productFromCatalog?.name || t('sale.returnWorkspace.defaultProductName') || "Товар",
        price: d.price,
        originalPrice: d.price + d.discount,
        qty: -Math.abs(d.units),
        isReturn: true,
        stock: productFromCatalog?.stock || 0,
      };
    });

    onReturnReady(saleProducts, selectedTicket, productsCatalog);
    onClose();
  };

  return (
    <Modal 
      open={visible} 
      onCancel={onClose} 
      footer={null} 
      width={900} 
       zIndex={3500}
      title={t('sale.returnWorkspace.title') || "Возврат товаров"}
    >
      <Spin spinning={loading}>
        <Row gutter={16}>
          <Col span={8}>
            <TicketList
              tickets={tickets}
              selectedTicket={selectedTicketIndex !== null ? tickets[selectedTicketIndex] : null}
              onSearch={handleSearch}
              onSelect={(ticketIndex: number) => setSelectedTicketIndex(ticketIndex)}
              onClear={handleClearTickets}
            />
          </Col>

          <Col span={16}>
            {selectedTicketIndex !== null && (
              <TicketDetails
                details={tickets[selectedTicketIndex].details.map((d) => ({
                  ...d,
                  name: getProductName(d.product),
                }))}
                paymentType={tickets[selectedTicketIndex].paymenttype}
                onConfirm={handleConfirmReturn}
              />
            )}
          </Col>
        </Row>
      </Spin>
    </Modal>
  );
};

export default ReturnWorkspace;