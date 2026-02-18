import React, { useState,useEffect } from "react";
import { Modal, Table, Input, Button, Space } from "antd";
import { useTranslation } from "react-i18next";
import { SearchOutlined } from "@ant-design/icons";
import styles from "./Sale.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedCerts: any[]) => void; // Изменено: передаем массив
  certificates: any[];
  alreadySelectedKeys: string[]; // Чтобы модалка знала, что уже выбрано
}

const CertificateSelectModal: React.FC<Props> = ({ 
  open, 
  onClose, 
  onConfirm, 
  certificates,
  alreadySelectedKeys 
}) => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  // Локальное состояние выбранных ключей (ID)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>(alreadySelectedKeys);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const activeCerts = certificates.filter(c => c.status === "Продан (Активен)");

  const filteredData = activeCerts.filter(c =>
    c.code.toLowerCase().includes(searchText.toLowerCase())
  );

  // Эффект для синхронизации при каждом открытии модального окна
  useEffect(() => {
    if (open) {
      // Когда окно открывается, берем ключи из родительского компонента
      setSelectedRowKeys(alreadySelectedKeys);
      
      // Находим сами объекты строк, чтобы при нажатии "ОК" сразу передать их
      const preSelectedRows = certificates.filter(c => 
        alreadySelectedKeys.includes(String(c.id))
      );
      setSelectedRows(preSelectedRows);
      
      // Сбрасываем поиск при открытии
      setSearchText("");
    }
  }, [open, alreadySelectedKeys, certificates]);

  const columns = [
    { title: t('sale.certificates.columns.code'), dataIndex: "code", key: "code" },
    { title: t('sale.certificates.columns.balance'), dataIndex: "balance", key: "balance", render: (v: any) => <b>{v}</b> },
    { title: t('sale.certificates.columns.expireDate'), dataIndex: "expiredate", key: "expiredate" },
  ];

  // Настройка выбора строк
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[], rows: any[]) => {
      setSelectedRowKeys(keys);
      setSelectedRows(rows);
    },
  };

  const handleOk = () => {
    onConfirm(selectedRows);
    onClose();
  };

  return (
    <Modal
      title={t('sale.certificates.modalTitle')}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      zIndex={3503}
      okText={t('sale.certificates.common.apply')}
      cancelText={t('sale.certificates.common.cancel')}
      width={700}
    >
      <Input
        placeholder={t('sale.certificates.searchPlaceholder')}
        prefix={<SearchOutlined />}
        /* style={{ marginBottom: 16 }} */ 
        className={styles.searchInput}
        
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
      />
      <Table
        rowSelection={{ type: 'checkbox', ...rowSelection }}
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 7 }}
      />
    </Modal>
  );
};

export default CertificateSelectModal;