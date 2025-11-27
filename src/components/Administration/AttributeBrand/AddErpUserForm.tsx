import React, { useState, useEffect } from "react";
import { Form, Input, Button, message } from "antd";
import AddUserAccessForm from "./AddUserAccessForm";
import useApiRequest from "../../../hooks/useApiRequest";
import { useTranslation } from "react-i18next";
import styles from './Atributte.module.css';

interface Access {
  id: number;
  code: string;
}

interface UserData {
  id: number;
  name: string;
  iin: string;
  login?: string;
  accesses?: Access[];
}

interface AddErpUserFormProps {
  location: any;
  history: any;
}

const AddErpUserForm: React.FC<AddErpUserFormProps> = ({ location, history }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [isSubmitting, setSubmitting] = useState(false);
  const [accessForm, setAccessForm] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(location.state?.userData || null);
  const [userName, setUserName] = useState<string | undefined>();
  const [newUserFormData, setNewUserFormData] = useState<any>(null);

  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || "";
  const isEditing = !!userData;

  useEffect(() => {
    if (userData) {
      fetchUserAccesses();
      form.setFieldsValue(userData);
    }
  }, []);

  const fetchUserAccesses = async () => {
    try {
      //const data = await sendRequest(`${API_URL}/api/erpuser/getaccesses?id=${userData?.id}`, {
      const data = await sendRequest(`${API_URL}/api/erpuser/getuseraccessesun?id=${userData?.id}`, {
      
      headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
          "Content-Type": "application/json",
        },
      });
      setUserData((prev) => ({ ...prev!, accesses: data.accesses }));
    } catch (err) {
      console.error(err);
      message.error(t('erpusers.loadUserAccessesError'));
    }
  };

  const handleNext = (values: any) => {
    //console.log("Form values:", values);
    setNewUserFormData(values);
    setUserName(values.name);
    setAccessForm(true);
  };

  const userLocales = JSON.parse(sessionStorage.getItem("user-locales") || "{}");
  const iinRules = [
    { required: true, message: t('erpusers.iinRequiredMessage') },
    ...(userLocales.LC_MONETARY === "KZT"
      ? [{ pattern: /^\d{12}$/, message: t('erpusers.digitsOnlyMessage') }]
      : []),
  ];

  return (
    <div className={styles.container}>
      {/* <h3>
        {isEditing
          ? t('erpusers.editUserTitle')
          : t('erpusers.addUserTitle')}
      </h3> */}

      <Button
        type="link"
        onClick={() => history.push("../erpuser")}
       className={styles.backButton}
      >
        {t('erpusers.userListButton')}
      </Button>

      {accessForm ? (
        <AddUserAccessForm
          formData={newUserFormData}
          isSubmitting={isSubmitting}
          submitting={isSubmitting}
          userData={userData || undefined}
          setAccessForm={setAccessForm}
          history={history}
          handleSubmit={(fn) => fn(userData)}
          setSubmitting={setSubmitting}
          dispatch={{ reset: () => {} }}
          reset={() => {}}
          userName={userName}
          sendRequest={sendRequest}
        />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleNext}
          onFinishFailed={(errorInfo) => {
            console.log("Validation Failed:", errorInfo);
            message.error(t('erpusers.fillAllFields'));
          }}
        >
          <Form.Item label={t('erpusers.iinLabel')} name="iin" rules={iinRules}>
            <Input maxLength={12} placeholder={t('erpusers.iinPlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('erpusers.nameLabel')}
            name="name"
            rules={[{ required: true, message: t('erpusers.nameRequiredMessage') }]}
          >
            <Input placeholder={t('erpusers.namePlaceholder')} />
          </Form.Item>

          {!isEditing && (
            <Form.Item
              label={t('erpusers.loginLabel')}
              name="login"
              rules={[
                { required: true, message: t('erpusers.loginRequiredMessage') },
                { type: "email", message: t('erpusers.invalidEmailMessage') },
              ]}
            >
              <Input placeholder={t('erpusers.loginPlaceholder')} />
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {t('erpusers.nextButton')}
            </Button>
            {!isEditing && (
              <Button
                type="default"
                onClick={() => form.resetFields()}
                className={styles.clearButton}
                disabled={isSubmitting}
              >
                {t('erpusers.clearButton')}
              </Button>
            )}
          </Form.Item>
        </Form>
      )}
    </div>
  );
};

export default AddErpUserForm;
