import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Button,
  Checkbox,
  DatePicker,
  Typography,
  message,
  notification,
} from "antd";
import type { FormProps } from 'antd';
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslation } from 'react-i18next';

import useApiRequest from "../../../hooks/useApiRequest";

import CountrySelect from "./CountrySelect";
import styles from './RegisterPage.module.css';

const { Title } = Typography;
const API_URL = import.meta.env.VITE_API_URL || '';

interface CountryOption {
  value: string;
  label: string;
}

interface FormData {
  user_login: string;
  user_password: string;
  newpasswordсonfirm: string;
  user_iin: string;
  user_fullname: string;
  company_bin: string;
  company_fullname: string;
  company_juraddress: string;
  company_head_iin: string;
  company_head: string;
  grouping: boolean;
  company_has_nds?: string;
  company_register_number?: string;
  company_nds_date?: string;
}

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm<FormData>();
  const { sendRequest } = useApiRequest();

  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [grouping, setGrouping] = useState(false);
  const [companyCountry, setCompanyCountry] = useState<CountryOption>({
    value: "KZ",
    label: "🇰🇿 Kazakhstan"
  });
  const [userData, setUserData] = useState<any>(null);

  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  }), []);

  const getCompaniesInfo = useCallback(async () => {
    try {
      const userData = await sendRequest(`${API_URL}/api/erpuser/info`, {
        method: 'GET',
        headers: getHeaders()
      });

      sessionStorage.setItem("isme-user-data", JSON.stringify(userData));
      sessionStorage.setItem("user-locales", userData.locales);
      setUserData(userData);
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  }, [API_URL, sendRequest, getHeaders]);

  useEffect(() => {
    getCompaniesInfo();
  }, [getCompaniesInfo]);

  const onGroupingChange = useCallback((e: any) => {
    const isChecked = e.target.checked;
    setGrouping(isChecked);

    if (!isChecked) {
      form.setFieldsValue({
        company_has_nds: undefined,
        company_register_number: undefined,
        company_nds_date: undefined,
      });
    }
  }, [form]);

  const onFinish: FormProps<FormData>['onFinish'] = useCallback(async (values) => {
    if (!isVerified) {
      notification.warning({
        message: t('register.alert.notVerified', { defaultValue: "Подтвердите что вы не робот" }),
        placement: 'topRight',
      });
      return;
    }

    const dataToSend = {
      ...values,
      partner_id: userData?.partner_id ?? null,
      country: companyCountry.value,
    };

    if (!grouping) {
      dataToSend.company_register_number = null;
      dataToSend.company_has_nds = null;
      dataToSend.company_nds_date = null;
    }

    delete dataToSend.newpasswordсonfirm;
    

    setIsLoading(true);
    try {
      const res = await sendRequest(`${API_URL}/auth/signup`, {
        method: 'POST',
        body: JSON.stringify(dataToSend),
        headers: getHeaders()
      });

      if (res.code === "error") {
        message.error(res.text || t('register.alert.signUpfailed'));
      } else {
        navigate("/", { state: { signUpSuccess: true } });
      }
    } catch (err: any) {
      message.error(err.response?.data?.text || t('register.alert.signUpfailed'));
    } finally {
      setIsLoading(false);
    }
  }, [isVerified, userData, companyCountry, grouping, navigate, t, sendRequest, API_URL]);

  const validateIinBin = useCallback((value: string, length: number) => {
    if (companyCountry.value === "KZ") {
      if (!/^\d+$/.test(value) || value.length !== length) {
        return Promise.reject(
          t('register.validation.invalidIinBin', { defaultValue: `Должен содержать ${length} цифр.` })
        );
      }
    }
    return Promise.resolve();
  }, [companyCountry.value, t]);

  const captchaCallback = useCallback((type: string | null) => {
    setIsVerified(!!type);
  }, []);

  const onCountryChange = useCallback((option: CountryOption) => {
    setCompanyCountry(option);
    form.validateFields(['user_iin', 'company_bin', 'company_head_iin']);
  }, [form]);

  // ⭐⭐⭐ ДОРАБОТАННЫЙ renderFormField (теперь принимает extraProps)
  const renderFormField = (
    name: keyof FormData,
    labelKey: string,
    placeholderKey: string,
    rules: any[],
    inputType: 'text' | 'password' | 'email' | 'date' = 'text',
    maxLength?: number,
    customRules?: (value: string) => Promise<void>,
    extraProps: any = {}
  ) => (
    <React.Fragment key={name}>
      <dt>{t(`register.label.${labelKey}`)}</dt>
      <dd>
        <Form.Item
          name={name}
          rules={rules.concat(
            customRules ? [{ validator: (_, value: string) => customRules(value) }] : []
          )}
        >
          {inputType === 'date' ? (
            <DatePicker
              className={styles.fullWidth}
              placeholder={t(`register.placeholder.${placeholderKey}`)}
            />
          ) : (
            <Input
              type={inputType}
              placeholder={t(`register.placeholder.${placeholderKey}`)}
              maxLength={maxLength}
              {...extraProps}        // ⭐ ВАЖНО: теперь можно передавать autoComplete
            />
          )}
        </Form.Item>
      </dd>
    </React.Fragment>
  );

  return (
    <div className="reg-box">
      <div className="reg-box-header">
        <Title level={4}>
          {t('register.label.createNewProfile', { defaultValue: "Создать новый профиль" })}
        </Title>
      </div>

      <div className="reg-box-body">
        {/* <div className="reg-tip">
          {t('register.label.alreadyRegistered')}{" "}
          <Link to="/">{t('register.label.signInText')}</Link>
        </div> */}

        <Form
          form={form}
          name="register_form"
          onFinish={onFinish}
          initialValues={{ grouping: grouping }}
          layout="vertical"
          autoComplete="off"     // ⭐ отключение автофилла формы
        >

          {/* ⭐⭐⭐ Ловушки для автозаполнения */}
          <input type="text" name="fake_username" autoComplete="username" className={styles.hidden} />
          <input type="password" name="fake_password" autoComplete="new-password" className={styles.hidden} />

          <div className="form-detail">
            <dl>

              {/* Страна */}
              <dt>{t('register.label.selectCountry')}</dt>
              <dd>
                <CountrySelect
                  selectedCountry={companyCountry}
                  onChange={onCountryChange}
                />
              </dd>

              {/* ИИН Пользователя */}
              {renderFormField(
                'user_iin',
                'userIdn',
                'userIdn',
                [{ required: true, message: t('register.validation.required') }],
                'text',
                12,
                (value) => validateIinBin(value, 12)
              )}

              {/* ФИО */}
              {renderFormField(
                'user_fullname',
                'userName',
                'userName',
                [{ required: true, message: t('register.validation.required') }]
              )}
            </dl>

            <hr />

            <dl>

              {/* БИН */}
              {renderFormField(
                'company_bin',
                'companyBin',
                'companyBin',
                [{ required: true, message: t('register.validation.required') }],
                'text',
                12,
                (value) => validateIinBin(value, 12)
              )}

              {/* Название компании */}
              {renderFormField(
                'company_fullname',
                'companyName',
                'companyName',
                [
                  { required: true, message: t('register.validation.required') },
                  { min: 4, message: t('register.validation.min4') }
                ]
              )}

              {/* Юр адрес */}
              {renderFormField(
                'company_juraddress',
                'companyAddress',
                'companyAddress',
                [{ required: true, message: t('register.validation.required') }]
              )}

              {/* ИИН руководителя */}
              {renderFormField(
                'company_head_iin',
                'headIdn',
                'headIdn',
                [{ required: true, message: t('register.validation.required') }],
                'text',
                12,
                (value) => validateIinBin(value, 12)
              )}

              {/* ФИО руководителя */}
              {renderFormField(
                'company_head',
                'headName',
                'headName',
                [{ required: true, message: t('register.validation.required') }]
              )}

              {/* НДС checkbox */}
              <div className={styles.ndsCheckboxContainer}>
                <Form.Item name="grouping" valuePropName="checked" noStyle>
                  <Checkbox checked={grouping} onChange={onGroupingChange}>
                    {t('register.label.ndsPayer')}
                  </Checkbox>
                </Form.Item>
              </div>

              {grouping && (
                <div>
                  {renderFormField('company_has_nds', 'hasNds', 'hasNds', [], 'text', 5)}
                  {renderFormField('company_register_number', 'ndsRegisterNumber', 'ndsRegisterNumber', [], 'text', 7)}
                  {renderFormField('company_nds_date', 'ndsDate', 'ndsDate', [], 'date')}
                </div>
              )}

              <hr />

              {/* ✦ Email/Login — автозаполнение выключено */}
              {renderFormField(
                'user_login',
                'email',
                'email',
                [
                  { required: true, message: t('register.validation.required') },
                  { type: 'email', message: t('register.validation.invalidEmail') }
                ],
                'text',
                undefined,
                undefined,
                { autoComplete: "new-password" }   // ← главное исправление
              )}

              {/* ✦ Пароль */}
              {renderFormField(
                'user_password',
                'password',
                'password',
                [
                  { required: true, message: t('register.validation.required') },
                  { min: 6, message: t('register.validation.passwordLength') }
                ],
                'password',
                undefined,
                undefined,
                { autoComplete: "new-password" }
              )}

              {/* ✦ Подтверждение пароля */}
              {renderFormField(
                'newpasswordсonfirm',
                'confirmPassword',
                'confirmPassword',
                [
                  { required: true, message: t('register.validation.required') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('user_password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error(t('register.validation.passwordsMatch'))
                      );
                    },
                  })
                ],
                'password',
                undefined,
                undefined,
                { autoComplete: "new-password" }
              )}
            </dl>
          </div>

          {/* Recaptcha */}
          <div className={styles.recaptchaContainer}>
            <ReCAPTCHA
              sitekey="6LfviKEUAAAAAA-sdbw-YKYZdBJutYZRn6Nree6y"
              onChange={captchaCallback}
              onExpired={() => captchaCallback(null)}
            />
          </div>

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={isLoading}
          >
            {isLoading ? t('register.label.pleaseWait') : t('register.label.createProfile')}
          </Button>
        </Form>

        <div className="aggr-box mt-10">
          {t('register.agreementText')}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
