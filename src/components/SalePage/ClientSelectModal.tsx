import React from "react";
import { Modal, Table } from "antd";
import { useTranslation } from "react-i18next"; // 1. Импортируем хук

interface ClientSelectModalProps {
  open: boolean;
  clients: any[];
  onSelect: (client: any) => void;
  onCancel: () => void;
}

const ClientSelectModal: React.FC<ClientSelectModalProps> = ({
  open,
  clients,
  onSelect,
  onCancel,
}) => {
  const { t } = useTranslation(); // 2. Инициализируем перевод

  const columns = [
    { 
      title: t('sale.clientModal.firstName') || "Имя", 
      dataIndex: "firstname" 
    },
    { 
      title: t('sale.clientModal.lastName') || "Фамилия", 
      dataIndex: "lastname" 
    },
    { 
      title: t('sale.clientModal.phone') || "Телефон", 
      dataIndex: "telephone" 
    },
    {
      title: t('sale.clientModal.action') || "Выбрать",
      render: (_: any, row: any) => (
        <a onClick={() => onSelect(row)}>
          {t('sale.clientModal.selectBtn') || "Выбрать"}
        </a>
      ),
    },
  ];

  return (
    <Modal
      title={t('sale.clientModal.title') || "Выберите клиента"}
      open={open}
      zIndex={3503}
      onCancel={onCancel}
      footer={null}
      getContainer={() => document.body}
    >
      <Table
        rowKey="id"
        dataSource={clients}
        columns={columns}
        pagination={{ pageSize: 5 }}
      />
    </Modal>
  );
};

export default ClientSelectModal;