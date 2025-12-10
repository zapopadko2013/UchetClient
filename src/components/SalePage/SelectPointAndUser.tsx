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
  onComplete: (pointId: string, cashboxId: number, user: User) => void;
}

const SelectPointAndUser: React.FC<Props> = ({
  points,
  cashboxes,
  users,
  loadUsers,
  loadCashboxes,
  onComplete,
}) => {
  const [step, setStep] = useState(0);

  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [selectedCashboxId, setSelectedCashboxId] = useState<number | null>(
    null
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Фильтрация роли 4
  const filteredUsers = users.filter((u) => String(u.role) !== "4");

  const selectedUser = filteredUsers.find(
    (u) => String(u.id) === selectedUserId
  );

  // ---------------------------------------------
  // Выбор торговой точки
  // ---------------------------------------------
  const handleSelectPoint = async (id: string) => {
    setSelectedPoint(id);
    setStep(1);
    await loadCashboxes(id);
  };

  // ---------------------------------------------
  // Выбор кассы
  // ---------------------------------------------
  const handleSelectCashbox = async (id: number) => {
    setSelectedCashboxId(id);
    setStep(2);

    if (selectedPoint) {
      await loadUsers(selectedPoint);
    }
  };

  return (
    <Card style={{ maxWidth: 500, margin: "0 auto", marginTop: 40, padding: 20 }}>
      <Title level={4} style={{ textAlign: "center" }}>
        Начало работы кассы
      </Title>

      <Steps
        current={step}
        items={[
          { title: "Точка", icon: <ShopOutlined /> },
          { title: "Касса", icon: <DatabaseOutlined /> },
          { title: "Пользователь", icon: <TeamOutlined /> },
        ]}
        style={{ marginBottom: 30, marginTop: 20 }}
      />

      {/* STEP 1 - Точка */}
      {step === 0 && (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text strong>Выберите торговую точку</Text>

          <Select
            size="large"
            options={points.map((p) => ({
              value: p.id,
              label: (
                <Space>
                  <ShopOutlined />
                  <span>
                    <b>{p.name}</b>
                    <div style={{ fontSize: 12 }}>{p.address}</div>
                  </span>
                </Space>
              ),
            }))}
            onChange={handleSelectPoint}
            style={{ width: "100%" }}
            placeholder="Торговая точка"
          />
        </Space>
      )}

      {/* STEP 2 - Касса */}
      {step === 1 && (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text strong>Выберите кассу</Text>

          <Select
            size="large"
            style={{ width: "100%" }}
            placeholder="Касса"
            options={cashboxes.map((c) => ({
              value: c.id,
              label: (
                <Space>
                  <DatabaseOutlined />
                  <span>
                    <b>{c.name}</b>
                    <div style={{ fontSize: 12 }}>{c.address}</div>
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
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text strong>Выберите пользователя кассы</Text>

          {filteredUsers.length === 0 ? (
            <Skeleton active />
          ) : (
            <Select
              size="large"
              style={{ width: "100%" }}
              placeholder="Пользователь кассы"
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
              onComplete(selectedPoint!, selectedCashboxId!, selectedUser!)
            }
          >
            Продолжить
          </Button>
        </Space>
      )}
    </Card>
  );
};

export default SelectPointAndUser;
