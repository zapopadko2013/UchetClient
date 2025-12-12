import { Modal, Table } from "antd";

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
  const columns = [
    { title: "Имя", dataIndex: "firstname" },
    { title: "Фамилия", dataIndex: "lastname" },
    { title: "Телефон", dataIndex: "telephone" },
    {
      title: "Выбрать",
      render: (_, row) => <a onClick={() => onSelect(row)}>Выбрать</a>,
    },
  ];

  return (
    <Modal
      title="Выберите клиента"
      open={open}
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
