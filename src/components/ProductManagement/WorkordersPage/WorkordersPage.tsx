import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Tag, message, Space, Card, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { 
  PlusOutlined, 
  EditOutlined, 
  SendOutlined, 
  CheckCircleOutlined , DeleteOutlined, EyeOutlined,
  StarOutlined, 
  StarFilled    
} from '@ant-design/icons';
import useApiRequest from '../../../hooks/useApiRequest';
import styles from './WorkordersPage.module.css'; // Используйте ваш файл стилей
import WorkorderDetailsTable from './WorkorderDetailsTable';
import WorkorderModal from './WorkorderModal';

interface Workorder {
  id: string;
  workorder_number: string;
  date: string;
  point_name: string;
  username: string;
  status: string;
  company: string;
  point: string;
  counterparty: string;
  isfavorite: boolean;
}

/* {
 "company":18,"workorder_number":1,"point":189,
 "user":42,"product":1,"units":"1",
 "accepted_units","1","accepted_user":42, "deleted":true, "id":1
 } */

interface Attribute {
  id: number;
  name: string; // Название атрибута (например, "Размер")
  value: string; // Значение (например, "XL")
  format: string;
}

interface WorkorderDetail {
  product: string;
  code: string;
  name: string;
  purchaseprice: number;
  price: number;
  units: number;
  accepted_units: number;
  status: string;
  counterpartiesname: string;
  sendwhatsapp: string;
  attr_json: Attribute[] | null;
}

const WorkordersPage: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const [data, setData] = useState<Workorder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Workorder | null>(null);
  const [activeTab, setActiveTab] = useState('my'); // 'my' или 'incoming'
  const [modalVisible, setModalVisible] = useState(false);

  const [detailsVisible, setDetailsVisible] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '';

  const fetchWorkorders = async () => {
    setLoading(true);
    setSelectedRow(null);
    try {
      // rec=true загружает подтвержденные заказы, иначе только свои черновики/отправленные
      //const url = `${API_URL}/api/workorder/list?rec=${isRec}`;
      const url = `${API_URL}/api/workorder/list`;
      const result = await sendRequest(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });
      setData(result || []);
    } catch (err) {
      console.error(err);
      message.error(t('workorder.loadError'));
    } finally {
      setLoading(false);
    }
  };

  //workorder_id

  useEffect(() => {
    fetchWorkorders();
  }, [activeTab]);


  const toggleFavorite = async (record: Workorder) => {
  try {
    // Временное обновление локального стейта для мгновенного отклика (опционально)
    const newStatus = !record.isfavorite;
    
    await sendRequest(`${API_URL}/api/workorder/favorite`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
      },
      body: JSON.stringify({ workorderId: record.id, isfavorite: newStatus }),
    });
    
    fetchWorkorders(); // Перезагружаем список
  } catch (err) {
    message.error(t('workorder.favoriteError'));
  }
};

  const handleReceive = () => {
  if (!selectedRow) return;

  Modal.confirm({
    title: t('workorder.receive'),
    content: t('workorder.receiveConfirm'),
    onOk: async () => {
      try {
        setLoading(true);
        const updateResponse = await sendRequest(`${API_URL}/api/workorder/invoice`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
          },
          body: JSON.stringify({ workorder_id: selectedRow.id, counterparty: selectedRow.counterparty }),
        });

        // Обработка бизнес-ошибки от сервера (exception)
        if (updateResponse && (updateResponse.code === 'exception' || updateResponse.code === 'internal_error')) {
          message.error(updateResponse.text);
        } else {
          message.success(t('workorder.receiveSuccess'));
          fetchWorkorders(); // Обновляем таблицу
        }
      } catch (err) {
        console.error(err);
        message.error(t('workorder.receiveError'));
      } finally {
        setLoading(false);
      }
    },
  });
};

/*   const handleSend = async () => {
  if (!selectedRow) return;

  if (selectedRow.status !== 'FORMATION') {
    message.warning(t('workorder.alreadyProcessed'));
    return;
  }

  try {
    setLoading(true);
    // 1. Проверяем наличие товаров в заказе
    const details: WorkorderDetail[] = await sendRequest(
      `${API_URL}/api/workorder/details?workorderId=${selectedRow.id}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
    );

    if (!details || details.length === 0) {
      message.warning(t('workorder.noItems'));
      setLoading(false);
      return;
    }

    // Отправляем ID и новый статус 
    const updateResponse = await sendRequest(`${API_URL}/api/workorder/manage`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
      },
      body: JSON.stringify({ 
        workorder_id: selectedRow.id, // передаем workorder_id
        status: 'inprocess'      // устанавливаем статус "Отправлен"
      }),
    });

    // Обработка возможной ошибки от сервера (как мы делали ранее)
    if (updateResponse && updateResponse.code === 'exception') {
      message.error(updateResponse.text);
    } else {
      message.success(t('workorder.sendSuccess'));
      // 4. Обновляем список заказов, чтобы увидеть новый статус в таблице
      fetchWorkorders(); 
    }

    // 2. Группируем товары по номеру WhatsApp
    // Ключ - номер телефона, значение - массив товаров для этого номера
    const groups: { [key: string]: WorkorderDetail[] } = {};
    
    details.forEach(item => {
      const phone = item.sendwhatsapp;
      if (phone) {
        if (!groups[phone]) groups[phone] = [];
        groups[phone].push(item);
      }
    });

    if (Object.keys(groups).length === 0) {
      message.info("У поставщиков не указаны номера WhatsApp");
      return;
    }

    // 3. Формируем сообщения и открываем WhatsApp
    Object.keys(groups).forEach(phone => {
      const itemsText = groups[phone]
        .map(item => `${item.name} (${item.units} шт.)`)
        .join(', ');
      
      const messageText = `Здравствуйте! Заказ №${selectedRow.workorder_number}. Товары: ${itemsText}`;
      
      // Кодируем текст для URL
      const encodedText = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/${phone}?text=${encodedText}`;
      
      // Открываем в новой вкладке
      window.open(whatsappUrl, '_blank');
    });

   

  } catch (err) {
    console.error(err);
    message.error(t('workorder.loadError'));
  } finally {
    setLoading(false);
  }
}; */

const handleSend = async () => {
  if (!selectedRow) return;
  
  try {
    setLoading(true);
    await sendRequest(`${API_URL}/api/workorder/send-whatsapp`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
      },
      body: JSON.stringify({ workorderId: selectedRow.id, counterparty: selectedRow.counterparty }),
    });

    message.success(t('workorder.sendSuccess'));
    fetchWorkorders(); // Обновить таблицу
  } catch (err) {
    message.error(t('workorder.sendError'));
  } finally {
    setLoading(false);
  }
};

  const handleDelete = () => {
  if (!selectedRow) return;

  Modal.confirm({
    title: t('workorder.delete'),
    content: t('workorder.deleteConfirm'),
    okText: t('workorder.common.yes'),
    okType: 'danger',
    cancelText: t('workorder.common.no'),
    onOk: async () => {
      try {
        await sendRequest(`${API_URL}/api/workorder/delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ workorderId: selectedRow.id }),
        });

        message.success(t('workorder.deleteSuccess'));
        setSelectedRow(null);
        fetchWorkorders(); // Обновляем список
      } catch (err) {
        console.error(err);
        message.error(t('workorder.deleteError'));
      }
    },
  });
};

  const columns: ColumnsType<Workorder> = [
    {
    title: '',
    key: 'favorite',
    width: 50,
    render: (_, record) => (
      <Button
        type="text"
        icon={record.isfavorite ? 
          <StarFilled className={styles.favoriteActive} /> : 
          <StarOutlined className={styles.favoriteInactive} />
        }
        onClick={(e) => {
          e.stopPropagation(); // Чтобы не выделялась строка
          toggleFavorite(record);
        }}
      />
    ),
  },
    {
      title: '№',
      dataIndex: 'workorder_number',
      key: 'workorder_number',
      width: 100,
    },
    {
      title: t('workorder.date'),
      dataIndex: 'date',
      key: 'date',
      render: (date) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: t('workorder.point'),
      dataIndex: 'point_name',
      key: 'point_name',
    },
     {
      title: t('workorder.counterparty'),
      dataIndex: 'counterpartyname',
      key: 'counterpartyname',
    },
    {
      title: t('workorder.user'),
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: t('workorder.status1'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'APPROVED') color = 'blue';
        if (status === 'ACCEPTED') color = 'green';
        if (status === 'DRAFT') color = 'orange';
        return <Tag color={color}>{t(`workorder.status.${status.toLowerCase()}`)}</Tag>;
      },
    },
    {
    title: '', // Заголовок можно оставить пустым
    key: 'actions',
    fixed: 'right', // Фиксируем колонку справа
    width: 50,
    render: (_, record) => (
      <Button
        type="text" // Прозрачная кнопка
        icon={<EyeOutlined className={styles.viewIcon} />} // Синяя иконка глаза
        onClick={(e) => {
          e.stopPropagation(); // Важно: чтобы не срабатывал выбор строки radio
          setSelectedRow(record);
          setDetailsVisible(true);
        }}
      />
    ),
  },
  ];

  return (
    <div className={styles.container}>
      <Card title={t('workorder.title')} extra={
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
    setSelectedRow(null); // Сбрасываем выбор для режима "Добавить"
    setModalVisible(true);
  }}
          >
            {t('workorder.common.add')}
          </Button>
          {/* <Button 
            disabled={!selectedRow || selectedRow.status !== 'FORMATION'} 
            icon={<EditOutlined />}
            onClick={() => setModalVisible(true)}
          >
            {t('workorder.common.edit')}
          </Button> */}
          <Button 
    danger 
    disabled={!selectedRow } 
    icon={<DeleteOutlined />}
    onClick={handleDelete}
  >
    {t('workorder.delete')}
  </Button>
          <Button 
            disabled={!selectedRow || selectedRow.status !== 'FORMATION'} 
            icon={<SendOutlined />}
            color="primary" variant="outlined"
            onClick={handleSend} // Привязываем функцию
            loading={loading}
          >
            {t('workorder.send')}
          </Button>
          <Button 
            disabled={!selectedRow || selectedRow.status === 'FORMATION' || selectedRow.status === 'ACCEPTED'} 
  icon={<CheckCircleOutlined />}
  type="primary"
  className={`${styles.receiveButton} ${
    !selectedRow ||
    selectedRow.status === 'FORMATION' ||
    selectedRow.status === 'ACCEPTED'
      ? styles.receiveButtonDisabled
      : styles.receiveButtonActive
  }`}
  onClick={handleReceive}
  loading={loading}
          >
            {t('workorder.receive')}
          </Button>
        </Space>
      }>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          items={[
            { key: 'my', label: t('workorder.myOrders') },
            /* { key: 'incoming', label: t('workorder.incomingOrders') }, */
          ]}
        />
        
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          
          rowSelection={{
            type: 'radio',
            onChange: (_, rows) => setSelectedRow(rows[0]),
            selectedRowKeys: selectedRow ? [selectedRow.id] : [],
          }}
          onRow={(record) => ({
            onClick: () => setSelectedRow(record),
            onDoubleClick: () => { // Дополнительно: открытие по двойному клику
                setSelectedRow(record);
                setDetailsVisible(true);
            }
          })}
          pagination={{ pageSize: 10 }}
        />
      </Card>
      <WorkorderModal
  visible={modalVisible}
  onCancel={() => setModalVisible(false)}
  onSuccess={() => {
    setModalVisible(false);
    fetchWorkorders(); // Обновляем таблицу
  }}
  initialValues={selectedRow ? {
    id: selectedRow.id,
    workorder_number: Number(selectedRow.workorder_number),
    point: selectedRow.point,
    counterparty: selectedRow.counterparty
  } : undefined}
/>

<Modal
        title={`${t('workorder.details')} №${selectedRow?.workorder_number}`}
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsVisible(false)}>
            {t('workorder.common.close')}
          </Button>
        ]}
        width={1000} // Делаем модалку широкой для таблицы
      >
        {selectedRow && <WorkorderDetailsTable workorderId={selectedRow.id} point={selectedRow.point}  counterparty={selectedRow.counterparty}/>}
      </Modal>

    </div>
  );
};

export default WorkordersPage;