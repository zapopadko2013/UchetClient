import React, { useState } from "react";
import { Button, List, Typography, Space } from "antd";
import { CheckOutlined, CheckSquareOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next"; // 1. Импорт хука
import type { TicketDetailFromApi } from "./types";
import styles from "./Sale.module.css";

const { Text } = Typography;

interface Props {
  details: TicketDetailFromApi[];
  paymentType?: string;
  onConfirm: (details: TicketDetailFromApi[]) => void;
}

const TicketDetails: React.FC<Props> = ({ details, paymentType, onConfirm }) => {
  const { t } = useTranslation(); // 2. Инициализация
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Локализация методов оплаты
  const getPaymentMethodText = () => {
    switch (paymentType) {
      case "cash": return t('sale.ticketDetails.paymentMethods.cash') || "Наличный расчет";
      case "card": return t('sale.ticketDetails.paymentMethods.card') || "Оплата картой";
      case "mixed": return t('sale.ticketDetails.paymentMethods.mixed') || "Смешанная оплата";
      case "debit": return t('sale.ticketDetails.paymentMethods.debit') || "Безналичный перевод";
      case "debt": return t('sale.ticketDetails.paymentMethods.debt') || "Продажа в долг";
      case "certificate": return t('sale.ticketDetails.paymentMethods.certificate') || "Оплата сертификатом";
      default: return t('sale.ticketDetails.paymentMethods.unknown') || "Не указан";
    }
  };

  const toggleSelectAll = () => {
    if (selectedIndices.length === details.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(details.map((_, i) => i));
    }
  };

  const toggleItem = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== index));
    } else {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  return (
    <div>
      <Space className={styles.detailsHeader}>
        <Text strong>
          {t('sale.ticketDetails.paymentTypeLabel') || "Тип оплаты:"} {getPaymentMethodText()}
        </Text>
      </Space>

      <List
        size="small"
        bordered
        dataSource={details}
        renderItem={(item, index) => {
          const isSelected = selectedIndices.includes(index);
          const className1 = `${styles.detailsItem} ${isSelected ? styles.selectedItem : ""}`;
          return (
            <List.Item
              className={className1}
              onClick={() => toggleItem(index)}
            >
              <Text>
                {index + 1}. {item.name} — {item.units} {t('sale.ticketDetails.units') || "шт."} = {item.price}
              </Text>
            </List.Item>
          );
        }}
      />

      <Space className={styles.detailsFooter}>
        <Button
          icon={selectedIndices.length === details.length ? <CheckOutlined /> : <CheckSquareOutlined />}
          onClick={toggleSelectAll}
        >
          {selectedIndices.length === details.length 
            ? (t('sale.ticketDetails.unselectAll') || "Снять выбор всех") 
            : (t('sale.ticketDetails.selectAll') || "Выбрать все")}
        </Button>

        <Button
          type="primary"
          onClick={() => onConfirm(details.filter((_, i) => selectedIndices.includes(i)))}
          disabled={selectedIndices.length === 0}
        >
          {t('sale.ticketDetails.confirmReturn') || "Выполнить возврат"}
        </Button>
      </Space>
    </div>
  );
};

export default TicketDetails;