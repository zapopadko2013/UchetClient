import React, { useState } from "react";
import { Button, List, Space, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next"; // 1. Импорт хука
import DateRangePickerSafe from "../DateRangePickerSafe";
import type { TicketFromApi } from "./types";
import type { Dayjs } from "dayjs";
import styles from "./Sale.module.css";

type RangeValue = [Dayjs | null, Dayjs | null] | null;
const { Text } = Typography;

interface Props {
  tickets: TicketFromApi[];
  selectedTicket?: TicketFromApi | null;
  onSearch: (params: { ticketNumber?: string; dateBegin: string; dateEnd: string }) => void;
  onSelect: (ticketIndex: number) => void;
  onClear?: () => void;
}

const TicketList: React.FC<Props> = ({ tickets, selectedTicket, onSearch, onSelect, onClear  }) => {
  const { t } = useTranslation(); // 2. Инициализация
  const [ticketNumber, setTicketNumber] = useState<string>("");
  const [dates, setDates] = useState<RangeValue>([dayjs(), dayjs()]);

   const handleClear = () => {
    setTicketNumber("");
    setDates([dayjs(), dayjs()]);
    onClear?.(); 
  };

  // Используем общие ключи методов оплаты
  const getPaymentMethodText = (paymentType: string) => {
    switch (paymentType) {
      case "cash": return t('sale.paymentMethods.cash') || "Наличный расчет";
      case "card": return t('sale.paymentMethods.card') || "Оплата картой";
      case "mixed": return t('sale.paymentMethods.mixed') || "Смешанная оплата";
      case "debit": return t('sale.paymentMethods.debit') || "Безналичный перевод";
      case "debt": return t('sale.paymentMethods.debt') || "Продажа в долг";
      case "certificate": return t('sale.paymentMethods.certificate') || "Оплата сертификатом";
      default: return t('sale.paymentMethods.unknown') || "Не указан";
    }
  };

  const handleSearch = () => {
    if (!dates || !dates[0] || !dates[1]) return;
    onSearch({
      ticketNumber: ticketNumber || undefined,
      dateBegin: dates[0].format("YYYY-MM-DD"),
      dateEnd: dates[1].format("YYYY-MM-DD"),
    });
  };

  return (
    <Space direction="vertical" className={styles.container} size="middle">
     
      <DateRangePickerSafe value={dates} onChange={setDates} />
      
      <Space>
        <Button onClick={handleClear}>
          {t('sale.ticketList.clearBtn') || "Очистить"}
        </Button>
        <Button type="primary" onClick={handleSearch}>
          {t('sale.ticketList.searchBtn') || "Найти"}
        </Button>
      </Space>

      <List
        bordered
        size="small"
        locale={{ emptyText: t('sale.ticketList.emptyText') || "Чеки не найдены" }}
        dataSource={tickets}
        renderItem={(ticket, index) => {
          const isSelected = selectedTicket === ticket;
          const itemClassName = `${styles.listItem} ${isSelected ? styles.selectedItem : ""}`;
          return (
            <List.Item
              onClick={() => onSelect(index)}
              className={itemClassName}
            >
              <Space direction="vertical" size={0}>
                <Text strong>
                  {index + 1} {t('sale.ticketList.ticketFrom') || "от"} {dayjs(ticket.date).format("DD.MM.YYYY HH:mm:ss")}
                </Text>
                <Text type="secondary">
                  {getPaymentMethodText(ticket.paymenttype)} — {ticket.price}
                </Text>
              </Space>
            </List.Item>
          );
        }}
      />
    </Space>
  );
};

export default TicketList;