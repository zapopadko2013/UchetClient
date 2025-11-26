// components/AddUserAccessForm.tsx
import React, { useEffect, useState } from "react";
import { Select, Checkbox, Button, Alert, Row, Col, message } from "antd";
import useApiRequest from "../../../hooks/useApiRequest";
import { useTranslation } from "react-i18next"; // Импорт для интернационализации
import styles from './Atributte.module.css';

interface Access {
  id: number;
  code: string;
}

interface AccessFunction {
  id: number;
  code: string;
  name: string;
}

interface AccessCategory {
  category: string;
  functions: AccessFunction[];
}

interface Role {
  id: number;
  name: string;
   accesses?: Access[];
}

interface UserAccessData {
  id: number;
  name: string;
  login?: string | null;
  iin?: string | null;
  status?: string;
  accesses?: Access[];
}

interface AddUserAccessFormProps {
  reset: any;
  dispatch: any;
  handleSubmit: (fn: (data: any) => void) => void;
  setSubmitting: (b: boolean) => void;
  isSubmitting: boolean;
  submitting: boolean;
  userData?: UserAccessData;
  setAccessForm: (b: boolean) => void;
  history: any;
  userName?: string;
  sendRequest: any; 
  formData?: any;
}

// Новый CheckBoxList компонент
interface CheckBoxListProps {
  category: string;
  functions: AccessFunction[];
  checkedCheckboxes: Access[];
  onChange: (newChecked: Access[]) => void;
}

const CheckBoxList: React.FC<CheckBoxListProps> = ({
  category,
  functions,
  checkedCheckboxes,
  onChange,
}) => {
  // Хук useTranslation не нужен внутри этого компонента,
  // так как category и fn.name приходят извне.
  const allIds = functions.map((fn) => fn.id);
  const checkedIds = checkedCheckboxes.map((c) => c.id);
  const allChecked = allIds.every((id) => checkedIds.includes(id));
  const indeterminate = checkedIds.some((id) => allIds.includes(id)) && !allChecked;
  const { t } = useTranslation();

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const newAccesses = functions.map((fn) => ({ id: fn.id, code: fn.code }));
      const merged = [...checkedCheckboxes];
      newAccesses.forEach((a) => {
        if (!merged.some((c) => c.id === a.id)) merged.push(a);
      });
      onChange(merged);
    } else {
      onChange(checkedCheckboxes.filter((c) => !functions.some((fn) => fn.id === c.id)));
    }
  };

  const toggleOne = (id: number) => {
    const fn = functions.find((f) => f.id === id);
    if (!fn) return;
    const exists = checkedCheckboxes.some((c) => c.id === id);
    const newChecked = exists
      ? checkedCheckboxes.filter((c) => c.id !== id)
      : [...checkedCheckboxes, { id: fn.id, code: fn.code }];
    onChange(newChecked);
  };

  return (
    <div className={styles.checkboxList}>
      <Checkbox
        indeterminate={indeterminate}
        onChange={(e) => toggleAll(e.target.checked)}
        checked={allChecked}
        className={styles.checkboxCategory}
      >
        {category}
      </Checkbox>
      <div className={styles.checkboxCol}>
        {functions.map((fn) => (
          <Checkbox
            key={fn.id}
            checked={checkedIds.includes(fn.id)}
            onChange={() => toggleOne(fn.id)}
            /* style={{ marginLeft: 8 }} */
          >
            {t(`erpusers.accesses.${fn.code}`)}
          </Checkbox>
        ))}
      </div>
    </div>
  );
};

// Основной компонент
const AddUserAccessForm: React.FC<AddUserAccessFormProps> = ({
  handleSubmit,
  setSubmitting,
  isSubmitting,
  submitting,
  userData,
  setAccessForm,
  history,
  userName,
  sendRequest,
  formData,
}) => {
  const { t } = useTranslation(); // Использование хука перевода
  const [checkedCheckboxes, setCheckedCheckboxes] = useState<Access[]>(userData?.accesses || []);
  const [accessFunctions, setAccessFunctions] = useState<AccessCategory[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [role, setRole] = useState<{ value: string; label: string }>({ value: "", label: t('erpusers.template') }); // Переведено
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);

  //const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || "";

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });

  useEffect(() => {
    fetchRoles();
    fetchAccessFunctions();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/erpuser/roles`, { headers: getHeaders() });
      setRoles(data);
      setOptions(data.map((role: Role) => ({ value: role.id.toString(), label: role.name })));
    } catch (err) {
      console.error(err);
      message.error(t('erpusers.loadRolesError')); // Переведено
    }
  };

  const fetchAccessFunctions = async () => {
    try {
      const id = userData?.id || "";
      const data = await sendRequest(`${API_URL}/api/erpuser/getaccesses?id=${id}`, { headers: getHeaders() });
      setAccessFunctions(data);
      const accesses: Access[] = data.map((cat: AccessCategory) => cat.functions).flat().map((fn: AccessFunction) => ({ id: fn.id, code: fn.code }));
      setCheckedCheckboxes(accesses);
    } catch (err) {
      console.error(err);
      message.error(t('erpusers.loadAccessesError')); // Переведено
    }
  };

  // const updateAccesses = (data: any) => ({ erpusr: { ...data, accesses: checkedCheckboxes.map((a) => ({ id: a.id, code: a.code })) } }); // Не используется

  const submit = async (_: any) => {
    try {
      const payload = {
        erpusr: {
          login: formData.login,
          name: formData.name,
          iin: formData.iin,
          status: "ACTIVE",
          roles: role.value ? [{ id: Number(role.value) }] : [],
          accesses: checkedCheckboxes.map(a => ({ id: a.id, code: a.code })),
        }
      };
      
      setSubmitting(true);
      await sendRequest(`${API_URL}/api/erpuser/new-manage`, { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) });
      message.success(t('erpusers.userCreatedSuccess')); // Переведено
      history.push("/oldusercabinet/options/erpuser");
      setSubmitting(false);
     // dispatch(reset("AddErpUserForm"));
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.text || t('erpusers.saveError')); // Переведено
      setSubmitting(false);
    }
  };

  const edit = async (_: any) => {
    try {
      setSubmitting(true);

      const payload = {
        erpusr: {
          id: userData?.id,
          login: userData?.login,
          name: formData.name,
          iin: formData.iin,
          status: "ACTIVE",
          roles: role.value ? [{ id: Number(role.value) }] : [],
          accesses: checkedCheckboxes.map(a => ({ id: a.id, code: a.code })),
        }
      };

      await sendRequest(`${API_URL}/api/erpuser/updateuser`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(payload) });
      message.success(t('erpusers.userUpdatedSuccess')); // Переведено
      history.push("/oldusercabinet/options/erpuser");
      setSubmitting(false);
     // dispatch(reset("AddErpUserForm"));
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.text || t('erpusers.updateError')); // Переведено
      setSubmitting(false);
    }
  };

  const handleRoleChange = (value: string, option: any) => {
  if (!option) {
    // нажали "очистить"
    setRole({ value: "", label: t('erpusers.template') }); // Переведено
    setCheckedCheckboxes(userData?.accesses || []);
    return;
  }

  setRole({ value, label: option.label });

  const selectedRole = roles.find((r) => r.id.toString() === value);
  setCheckedCheckboxes(selectedRole?.accesses || []);
};

  return (
    <div className={styles.accessFormContainer}>
      <h6>
        {userData 
          ? t('erpusers.selectAccessesForUser', { userName: userData.name }) // Переведено
          : t('erpusers.selectAccessesForUser', { userName: userName }) // Переведено
        }
      </h6>
      
      <Alert
        type="info"
        message={t('erpusers.accessHint')} // Переведено
        className={styles.alert}
      />
      
      <Row gutter={16} className={styles.roleRow}>
        <Col span={8}>
          <Select
            allowClear
            value={role.value}
            options={options}
            onChange={handleRoleChange}
            placeholder={t('erpusers.templatePlaceholder')} // Переведено
            className={styles.fullWidth}
            onClear={() => {
              setRole({ value: "", label: t('erpusers.template') }); // Переведено
              setCheckedCheckboxes(userData?.accesses || []);
            }}
          />
        </Col>
      </Row>

      <div className={styles.checkboxesWrapper}>
        {accessFunctions.map((category) => (
          <CheckBoxList
            key={category.category}
            category={category.category}
            functions={category.functions}
            checkedCheckboxes={checkedCheckboxes}
            onChange={setCheckedCheckboxes}
          />
        ))}
      </div>

      <Button onClick={() => setAccessForm(false)}>{t('erpusers.backButton')}</Button>
      <Button
        type="primary"
        disabled={isSubmitting || submitting}
        className={styles.saveButton}
        onClick={() => userData ? handleSubmit(edit) : handleSubmit(submit)}
      >
        {isSubmitting ? t('erpusers.submittingText') : t('erpusers.saveAccessesButton')}
      </Button>
    </div>
  );
};

export default AddUserAccessForm;