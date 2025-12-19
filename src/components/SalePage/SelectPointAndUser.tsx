import React, { useState } from "react";
import {
  Card,
  Select,
  Avatar,
  Steps,
  Space,
  Button,
  Typography,
  Skeleton,
} from "antd";
import {
  ShopOutlined,
  UserOutlined,
  TeamOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next"; // 1. Импорт хука
import styles from "./Sale.module.css";

const { Title, Text } = Typography;

interface Point {
  id: string;
  name: string;
  address: string;
  point_type: number;
}

interface Cashbox {
  id: number;
  name: string;
  address: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface Props {
  points: Point[];
  cashboxes: Cashbox[];
  users: User[];
  loadUsers: (pointId: string) => Promise<void>;
  loadCashboxes: (pointId: string) => Promise<void>;
  onComplete: (pointId: string, cashboxId: number, user: User, pointName: string, address: string) => void;
}

const SelectPointAndUser: React.FC<Props> = ({
  points,
  cashboxes,
  users,
  loadUsers,
  loadCashboxes,
  onComplete,
}) => {
  const { t } = useTranslation(); // 2. Инициализация
  const [step, setStep] = useState(0);

  const [selectedPoint, setSelectedPoint] = useState<{ id: string; name: string; address: string } | null>(null);
  const [selectedCashboxId, setSelectedCashboxId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => String(u.role) !== "4");
  const selectedUser = filteredUsers.find((u) => String(u.id) === selectedUserId);

  const handleSelectPoint = async (id: string) => {
    const point = points.find((p) => p.id === id);
    if (point) {
      setSelectedPoint({ id: point.id, name: point.name, address: point.address });
      setStep(1);
      await loadCashboxes(point.id);
    }
  };

  const handleSelectCashbox = async (id: number) => {
    setSelectedCashboxId(id);
    setStep(2);
    if (selectedPoint) {
      await loadUsers(selectedPoint.id);
    }
  };

  return (
    <Card className={styles.setupCard}>
      <Title level={4} className={styles.setupTitle}>
        {t('sale.setup.title') || "Начало работы кассы"}
      </Title>

      <Steps
        current={step}
        items={[
          { title: t('sale.setup.stepPoint') || "Точка", icon: <ShopOutlined /> },
          { title: t('sale.setup.stepCashbox') || "Касса", icon: <DatabaseOutlined /> },
          { title: t('sale.setup.stepUser') || "Пользователь", icon: <TeamOutlined /> },
        ]}
        className={styles.stepWrapper}
      />

      {/* STEP 1 - Точка */}
      {step === 0 && (
        <Space direction="vertical" className={styles.fullWidth}>
          <Text strong>{t('sale.setup.selectPoint') || "Выберите торговую точку"}</Text>

          <Select
            size="large"
            options={points.map((p) => ({
              value: p.id,
              label: (
                <Space>
                  <ShopOutlined />
                  <span>
                    <b>{p.name}</b>
                    <div className={styles.optionLabel}>{p.address}</div>
                  </span>
                </Space>
              ),
            }))}
            onChange={handleSelectPoint}
            className={styles.fullWidth}
            placeholder={t('sale.setup.placeholderPoint') || "Торговая точка"}
          />
        </Space>
      )}

      {/* STEP 2 - Касса */}
      {step === 1 && (
        <Space direction="vertical" className={styles.fullWidth}>
          <Text strong>{t('sale.setup.selectCashbox') || "Выберите кассу"}</Text>

          <Select
            size="large"
            className={styles.fullWidth}
            placeholder={t('sale.setup.placeholderCashbox') || "Касса"}
            options={cashboxes.map((c) => ({
              value: c.id,
              label: (
                <Space>
                  <DatabaseOutlined />
                  <span>
                    <b>{c.name}</b>
                    <div className={styles.optionLabel}>{c.address}</div>
                  </span>
                </Space>
              ),
            }))}
            onChange={handleSelectCashbox}
          />
        </Space>
      )}

      {/* STEP 3 - Пользователь */}
      {step === 2 && (
        <Space direction="vertical" className={styles.fullWidth}>
          <Text strong>{t('sale.setup.selectUser') || "Выберите пользователя кассы"}</Text>

          {filteredUsers.length === 0 ? (
            <Skeleton active />
          ) : (
            <Select
              size="large"
              className={styles.fullWidth}
              placeholder={t('sale.setup.placeholderUser') || "Пользователь кассы"}
              options={filteredUsers.map((u) => ({
                value: u.id,
                label: (
                  <Space>
                    <Avatar icon={<UserOutlined />} />
                    {u.name}
                  </Space>
                ),
              }))}
              onChange={(id) => setSelectedUserId(id)}
            />
          )}

          <Button
            type="primary"
            size="large"
            block
            disabled={!selectedUser}
            onClick={() =>
              onComplete(
                selectedPoint!.id,
                selectedCashboxId!, 
                selectedUser!, 
                selectedPoint!.name, 
                selectedPoint!.address
              )
            }
          >
            {t('sale.setup.continueBtn') || "Продолжить"}
          </Button>
        </Space>
      )}
    </Card>
  );
};

export default SelectPointAndUser;