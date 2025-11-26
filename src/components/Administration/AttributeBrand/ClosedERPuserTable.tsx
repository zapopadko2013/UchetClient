import React from "react";
import { Table, Button, Tag, Space } from "antd";
import { useTranslation } from "react-i18next";
import CustomPopover from "./CustomPopover";
import type { ErpUser, Access } from "./CustomPopover";
import { UndoOutlined } from '@ant-design/icons';

interface Props {
  result: ErpUser[];
  handleRollbackFunction: (user: ErpUser) => void;
}

const ClosedERPuserTable: React.FC<Props> = ({ result, handleRollbackFunction }) => {
  const { t } = useTranslation("");

  const columns = [
    {
      title: "№",
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    /* {
      title: t("erpusers.userIDN"),
      dataIndex: "iin",
      key: "iin",
    }, */
    {
    title: t('erpusers.login'),
      dataIndex: 'login',
      render: (v: string) => v.toUpperCase()
      },
    {
      title: t("erpusers.userName"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t('erpusers.company'),
      dataIndex: 'company'
    },
   /*  {
      title: t("erpusers.accessName"),
      dataIndex: "accesses",
      key: "accesses",
      render: (_: Access[] | undefined, record: ErpUser) => {
        if (!record.accesses || record.accesses.length === 0) return null;

        return (
          <Space direction="vertical">
            <p
              style={{
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                overflow: "hidden",
                width: "25em",
                margin: 0,
              }}
            >
              {record.accesses.map((access) => (
                <span key={record.id + access.id}>
                  {access.name},{" "}
                </span>
              ))}
            </p>
            <CustomPopover erpuser={record} />
          </Space>
        );
      },
    }, */
    {
      title: t("erpusers.status"),
      key: "status",
      render: () => <Tag color="red">{t("erpusers.deleted")}</Tag>,
    },
    {
      title: "",
      key: "actions",
      align: "right" as const,
      width: 100,
      render: (_: any, record: ErpUser) => (
        <Button
          type="default"
          onClick={() => handleRollbackFunction(record)}
          icon={<UndoOutlined />}
          title={t('erpusers.restore')}
        >
         
        </Button>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={result}
      pagination={{ pageSize: 10 }}
    />
  );
};

export default ClosedERPuserTable;
