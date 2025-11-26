import React, { Fragment } from 'react';
import { Popover, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './Atributte.module.css';

export interface Access {
  id: string;
  name: string;
  code: string;
}

export interface ErpUser {
  id: string;
  iin: string;
  name: string;
  login: string;
  self?: boolean;
  accesses?: Access[];
}

interface Props {
  erpuser: ErpUser;
}

const CustomPopover: React.FC<Props> = ({ erpuser }) => {
  const { t } = useTranslation();

  const content = (
    <Typography.Paragraph className={styles.formItemNoMargin}>
      {erpuser.accesses?.length ? (
        erpuser.accesses.map((access) => (
          <Fragment key={erpuser.id + access.id}>
            {t(`erpusers.accesses.${access.code}`, access.name)}
            <br />
          </Fragment>
        ))
      ) : (
        <i>{t('erpusers.noAccesses')}</i>
      )}
    </Typography.Paragraph>
  );

  return (
    <Popover content={content} trigger="click">
      <Typography.Text
      className={styles.textLink}
        /* style={{ fontSize: 14, color: '#162ece', cursor: 'pointer' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#09135b')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#162ece')} */
      >
        {t('erpusers.viewAll')}
      </Typography.Text>
    </Popover>
  );
};

export default CustomPopover;
