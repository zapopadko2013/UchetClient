import React, { useState } from "react";
import { Button, List, Space, Typography, Input } from "antd";
import dayjs from "dayjs";
import DateRangePickerSafe from "../DateRangePickerSafe";
import type { TicketFromApi } from "./types";
import type { Dayjs } from "dayjs";

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
  const [ticketNumber, setTicketNumber] = useState<string>("");
  const [dates, setDates] = useState<RangeValue>([dayjs(), dayjs()]);

   const handleClear = () => {
    setTicketNumber("");
    setDates([dayjs(), dayjs()]);
    onClear?.(); // очищаем списки и выбранный чек
  };

  const getPaymentMethodText = (paymentType) => {
    switch (paymentType) {
      case "cash": return "Наличный расчет";
      case "card": return "Оплата картой";
      case "mixed": return "Смешанная оплата";
      case "debit": return "Безналичный перевод";
      case "debt": return "Продажа в долг";
      case "certificate": return "Оплата сертификатом";
      default: return "Не указан";
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
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
     
      <DateRangePickerSafe value={dates} onChange={setDates} />
      <Space>
        <Button onClick={handleClear}>Очистить</Button>
        <Button type="primary" onClick={handleSearch}>Найти</Button>
      </Space>

      <List
        bordered
        size="small"
        locale={{ emptyText: "Чеки не найдены" }}
        dataSource={tickets}
        renderItem={(ticket, index) => {
          const isSelected = selectedTicket === ticket;
          return (
            <List.Item
              onClick={() => onSelect(index)}
              style={{
                cursor: "pointer",
                backgroundColor: isSelected ? "#e6f7ff" : undefined,
              }}
            >
              <Space direction="vertical" size={0}>
                <Text strong>{index + 1} от {dayjs(ticket.date).format("DD.MM.YYYY HH:mm:ss")}</Text>
                <Text type="secondary">{getPaymentMethodText(ticket.paymenttype)} — {ticket.price}</Text>
              </Space>
            </List.Item>
          );
        }}
      />
    </Space>
  );
};

export default TicketList;
