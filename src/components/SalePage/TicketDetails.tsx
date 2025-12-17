import React, { useState } from "react";
import { Button, List, Typography, Space } from "antd";
import { CheckOutlined, CheckSquareOutlined } from "@ant-design/icons";
import type { TicketDetailFromApi } from "./types";

const { Text } = Typography;

interface Props {
  details: TicketDetailFromApi[];
  paymentType?: string;
  onConfirm: (details: TicketDetailFromApi[]) => void;
}

const TicketDetails: React.FC<Props> = ({ details, paymentType, onConfirm }) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const getPaymentMethodText = () => {
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

  const toggleSelectAll = () => {
    if (selectedIndices.length === details.length) {
      setSelectedIndices([]); // снять выбор
    } else {
      setSelectedIndices(details.map((_, i) => i)); // выбрать все
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
      <Space style={{ marginBottom: 8 }}>
        <Text strong>Тип оплаты: {getPaymentMethodText()}</Text>
       
      </Space>

      <List
        size="small"
        bordered
        dataSource={details}
        renderItem={(item, index) => {
          const isSelected = selectedIndices.includes(index);
          return (
            <List.Item
              style={{ backgroundColor: isSelected ? "#e6f7ff" : undefined, cursor: "pointer" }}
              onClick={() => toggleItem(index)}
            >
              <Text>{index + 1}. {item.name} — {item.units} шт.={item.price}</Text>
            </List.Item>
          );
        }}
      />

<Space style={{ marginTop: 12 }}>
       <Button
          
          icon={selectedIndices.length === details.length ? <CheckOutlined /> : <CheckSquareOutlined />}
          onClick={toggleSelectAll}
        >
          {selectedIndices.length === details.length ? "Снять выбор всех" : "Выбрать все"}
        </Button>

      <Button
        type="primary"
        
        onClick={() => onConfirm(details.filter((_, i) => selectedIndices.includes(i)))}
        disabled={selectedIndices.length === 0}
      >
        Выполнить возврат
      </Button>

      </Space>
    </div>
  );
};

export default TicketDetails;
