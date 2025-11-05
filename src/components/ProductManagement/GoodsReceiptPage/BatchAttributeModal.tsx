import React, { useState, useEffect } from 'react';
import { Modal, Select, Input, Button, Row, Col, Table, Popconfirm, message } from 'antd';

export interface BatchAttr {
  code: string;
  name: string;
  value: string;
}

export interface AttributeItem {
  id: string;          // attribute_id
  name: string;        // attribute_name
  format: string;      // формат: 'SPR', 'DATE' или другой
  sprvalues?: string[]; // справочник, если есть
}

interface BatchAttributeModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (attrs: BatchAttr[]) => void;
  attributes: AttributeItem[];
}

const BatchAttributeModal: React.FC<BatchAttributeModalProps> = ({
  isVisible,
  onClose,
  onSubmit,
  attributes,
}) => {
  const [selectedAttrId, setSelectedAttrId] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [addedAttrs, setAddedAttrs] = useState<BatchAttr[]>([]);

  useEffect(() => {
    if (!isVisible) {
      setSelectedAttrId(null);
      setSelectedValue('');
      setAddedAttrs([]);
    }
  }, [isVisible]);

  const handleAdd = () => {
    if (!selectedAttrId || !selectedValue) {
      message.warning('Выберите атрибут и введите значение');
      return;
    }

    if (addedAttrs.some(attr => attr.code === selectedAttrId)) {
      message.warning('Этот атрибут уже добавлен');
      return;
    }

    const attr = attributes.find(a => a.id === selectedAttrId);
    if (!attr) return;

    setAddedAttrs(prev => [
      ...prev,
      { code: selectedAttrId, name: attr.name, value: selectedValue },
    ]);

    setSelectedAttrId(null);
    setSelectedValue('');
  };

  const handleDelete = (code: string) => {
    setAddedAttrs(prev => prev.filter(attr => attr.code !== code));
  };

  const renderValueInput = () => {
    if (!selectedAttrId) {
      return <Input disabled placeholder="Сначала выберите атрибут" />;
    }

    const attr = attributes.find(a => a.id === selectedAttrId);
    if (!attr) return <Input placeholder="Введите значение" value={selectedValue} onChange={e => setSelectedValue(e.target.value)} />;

    if (attr.format === 'SPR') {
      return (
        <Select
          placeholder="Выберите значение"
          value={selectedValue || undefined}
          options={(attr.sprvalues || []).map(v => ({ label: v, value: v }))}
          onChange={v => setSelectedValue(v)}
          allowClear
          style={{ minWidth: 150 }}
        />
      );
    }

    if (attr.format === 'DATE') {
      return (
        <Input
          type="date"
          value={selectedValue}
          onChange={e => setSelectedValue(e.target.value)}
          style={{ minWidth: 150 }}
        />
      );
    }

    return (
      <Input
        placeholder="Введите значение"
        value={selectedValue}
        onChange={e => setSelectedValue(e.target.value)}
        style={{ minWidth: 150 }}
      />
    );
  };

  const columns = [
    {
      title: 'Атрибут',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Значение',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: BatchAttr) => (
        <Popconfirm
          title="Удалить атрибут?"
          onConfirm={() => handleDelete(record.code)}
          okText="Да"
          cancelText="Нет"
        >
          <Button danger size="small">Удалить</Button>
        </Popconfirm>
      ),
    },
  ];

  const handleOk = () => {
    if (addedAttrs.length === 0) {
      message.error('Добавьте хотя бы один атрибут');
      return;
    }
    onSubmit(addedAttrs);
    onClose();
  };

  return (
    <Modal
      title="Партийные атрибуты"
      open={isVisible}
      onCancel={onClose}
      onOk={handleOk}
      okText="Сохранить"
      cancelText="Отмена"
      width={600}
    >
      <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
        <Col flex="1 1 200px">
          <Select
            placeholder="Выберите атрибут"
            value={selectedAttrId || undefined}
            options={attributes.map(attr => ({
              label: attr.name,
              value: attr.id,
            }))}
            onChange={val => {
              setSelectedAttrId(val);
              setSelectedValue('');
            }}
            allowClear
            style={{ width: '100%' }}
          />
        </Col>
        <Col flex="1 1 250px">{renderValueInput()}</Col>
        <Col flex="0 0 auto">
          <Button type="primary" onClick={handleAdd}>
            Добавить
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={addedAttrs}
        columns={columns}
        rowKey="code"
        pagination={false}
        locale={{ emptyText: 'Нет добавленных атрибутов' }}
        size="small"
      />
    </Modal>
  );
};

export default BatchAttributeModal;
