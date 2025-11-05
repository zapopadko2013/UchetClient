import React, { useEffect, useState } from 'react';
import { Modal, Checkbox, Spin, message } from 'antd';
import useApiRequest from '../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next';
import styles from './UserProgram.module.css'; // ✅ импорт CSS-модуля

interface FunctionAccess {
  id: number;
  code: string;
  name: string;
}

interface CategoryGroup {
  category_id: string;
  category: string;
  functions: FunctionAccess[];
  access_functions: FunctionAccess[];
}

interface Role {
  id: string;
  name: string;
}

interface UserAccessEditorProps {
  user: {
    id: string;
    name: string;
    iin: string;
    login: string;
    status: string;
   roles: Role[] | string; 
  };
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isNew?: boolean;
}

const UserAccessEditor: React.FC<UserAccessEditorProps> = ({
  user,
  visible,
  onClose,
  onSuccess,
  isNew = false,
}) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  const [loading, setLoading] = useState(true);
  const [accessGroups, setAccessGroups] = useState<CategoryGroup[]>([]);
  const [selectedAccessIds, setSelectedAccessIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (visible && user) {
      loadAccesses();
    }
  }, [visible, user, isNew]);

  const loadAccesses = async () => {
    setLoading(true);
    try {
      const response = await sendRequest(
        `${import.meta.env.VITE_API_URL}/api/erpuser/getuseraccessesun?id=${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        }
      );

      let groups: CategoryGroup[] = [];

      if (Array.isArray(response) && response.length > 0) {
        if ('accesses' in response[0]) {
          groups = [
            {
              category_id: '0',
              category: 'Все функции',
              functions: response[0].accesses || [],
              access_functions: [],
            },
          ];
        } else {
          groups = response;
        }
      }

      setAccessGroups(groups);

      const selectedIds = new Set<number>();
      groups.forEach(group => {
        group.access_functions?.forEach(access => {
          selectedIds.add(access.id);
        });
      });
      setSelectedAccessIds(selectedIds);
    } catch (err) {
      console.error(err);
      message.error(t('userProgram.loadAccessError'));
    } finally {
      setLoading(false);
    }
  };

  const isGroupSelected = (group: CategoryGroup) =>
    group.functions.every(f => selectedAccessIds.has(f.id));

  const isGroupIndeterminate = (group: CategoryGroup) => {
    const selectedCount = group.functions.filter(f => selectedAccessIds.has(f.id)).length;
    return selectedCount > 0 && selectedCount < group.functions.length;
  };

  const handleToggleGroup = (group: CategoryGroup, checked: boolean) => {
    const updatedSet = new Set(selectedAccessIds);
    group.functions.forEach(func => {
      if (checked) updatedSet.add(func.id);
      else updatedSet.delete(func.id);
    });
    setSelectedAccessIds(updatedSet);
  };

  const handleToggleFunctions = (group: CategoryGroup, checkedIds: number[]) => {
    const updatedSet = new Set(selectedAccessIds);
    group.functions.forEach(func => {
      if (checkedIds.includes(func.id)) updatedSet.add(func.id);
      else updatedSet.delete(func.id);
    });
    setSelectedAccessIds(updatedSet);
  };

  const handleSave = async () => {
    try {
      const selectedAccesses: FunctionAccess[] = [];

      accessGroups.forEach(group => {
        group.functions.forEach(access => {
          if (selectedAccessIds.has(access.id)) selectedAccesses.push(access);
        });
      });

      /* const rolesParsed = user.roles
        ? JSON.parse(user.roles.replace(/'/g, '"'))
        : []; */

        let rolesParsed: Role[] = [];

try {
  rolesParsed = typeof user.roles === 'string'
    ? JSON.parse(user.roles)
    : user.roles;
} catch (err) {
  console.warn('Invalid JSON in user.roles:', user.roles);
  rolesParsed = [];
}

      const payload = {
        erpusr: {
          ...(!isNew && { id: user.id }),
          name: user.name,
          iin: user.iin,
          login: user.login,
          status: isNew ? 'ACTIVE' : user.status,
          roles: rolesParsed,
          accesses: selectedAccesses,
        },
      };

      const url = isNew
        ? `${import.meta.env.VITE_API_URL}/api/erpuser/new-manage`
        : `${import.meta.env.VITE_API_URL}/api/erpuser/updateuser`;

      const method = isNew ? 'POST' : 'PUT';

      await sendRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      message.success(isNew ? t('userProgram.addSuccess') : t('userProgram.editSuccess'));
      onSuccess();
    } catch (err) {
      console.error(err);
      message.error(isNew ? t('userProgram.userCreateError') : t('userProgram.accessesUpdateError'));
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      onOk={handleSave}
      title={
        <div className={styles.modalTitle}>
          <span>{t('userProgram.editAccesses')}:</span>
          <span className={styles.modalUserName}>{user?.name || ''}</span>
        </div>
      }
      okText={t('userProgram.save')}
      cancelText={t('userProgram.cancel')}
      width={700}
      destroyOnHidden
    >
      {loading ? (
        <Spin />
      ) : (
        <div className={styles.accessContainer}>
          <table className={styles.accessTable}>
            <thead>
              <tr>
                <th className={styles.tableHeader}>
                  {t('userProgram.category')}
                </th>
                <th className={styles.tableHeader}>
                  {t('userProgram.functions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {accessGroups.map(group => (
                <tr key={group.category_id} style={{ verticalAlign: 'top' }}>
                  <td className={`${styles.tableCell} ${styles.categoryCell}`}>
                    <Checkbox
                      checked={isGroupSelected(group)}
                      indeterminate={isGroupIndeterminate(group)}
                      onChange={e => handleToggleGroup(group, e.target.checked)}
                    >
                      {group.category}
                    </Checkbox>
                  </td>
                  <td className={styles.tableCell}>
                    <Checkbox.Group
                      value={group.functions.filter(f => selectedAccessIds.has(f.id)).map(f => f.id)}
                      onChange={checkedIds => handleToggleFunctions(group, checkedIds as number[])}
                    >
                      <div className={styles.functionGroup}>
                        {group.functions.map(func => (
                          <Checkbox key={func.id} value={func.id}>
                            {func.name}
                          </Checkbox>
                        ))}
                      </div>
                    </Checkbox.Group>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};

export default UserAccessEditor;
