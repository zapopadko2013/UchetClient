/* import { useState } from 'react';

const useApiRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendRequest = async (url, options) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      

      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  return { loading, error, sendRequest };
};

export default useApiRequest; */

/* import { useState, useRef, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';

const useApiRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Получаем onLogout из AuthContext
  const { onLogout } = useContext(AuthContext); 

  const sendRequest = useCallback(async (url, options = {}) => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    
    const controller = new AbortController();
    controllerRef.current = controller;
    const signal = controller.signal;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, { ...options, signal });
      const data = await response.json();

      // Проверка на статус 401 (UNAUTHORIZED)
      if (response.status === 401) {
        //console.log('auth.unauthorized');
        message.error(t('auth.unauthorized'));
        onLogout();
        //localStorage.clear(); 
        //window.location.reload(); 
        //navigate('/login');
        return data; // Прекращаем выполнение функции
      }
      
      if (!response.ok) {
       // setError(JSON.stringify(data));
       // return;
        throw new Error(JSON.stringify(data));
       // throw new Error(data.message || 'Something went wrong');
      }

      setLoading(false);
      return data;
    } catch (err) {
      
      setLoading(false);
      setError(err.message);
      throw err;
    }
  },  [onLogout,t ]);

  // Убедитесь, что возвращаете все три значения
  return { loading, error, sendRequest };
};

export default useApiRequest; 
 */
/* import { useCallback, useRef, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import AuthContext from '../contexts/AuthContext';

const useApiRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { onLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const sendRequest = useCallback(
    async (url, options = {}) => {
      const controller = new AbortController();
      const signal = controller.signal;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          ...options,
          signal,
        });

        const data = await response.json();

        if (response.status === 401) {
          message.error(t('auth.unauthorized'));
          onLogout(); // Выход из системы
          return null;
        }

        if (!response.ok) {
          //throw new Error(data || 'Ошибка запроса');
          // setError(JSON.stringify(data));
       // return;
        throw new Error(JSON.stringify(data));
       // throw new Error(data.message || 'Something went wrong');
     
        }

        return data;
      } catch (err) {
        if (err.name === 'AbortError') {
          // Запрос отменён — можно не показывать ошибку
          return null;
        }

        message.error(err.message || 'Ошибка сети');
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onLogout, t]
  );

  return { loading, error, sendRequest };
};

export default useApiRequest;
 */

///10.10.2025
/* import { useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import AuthContext from '../contexts/AuthContext';

const useApiRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { onLogout } = useContext(AuthContext);

  const sendRequest = useCallback(async (url, options = {}) => {
    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, { ...options, signal });
      const data = await response.json();

      if (response.status === 401) {
        //message.error(t('auth.unauthorized'));
        onLogout();
        return data;
      }

      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('Запрос был прерван');
        return null;
      }

      setError(err.message);
      message.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onLogout, t]);

  return { loading, error, sendRequest };
};

export default useApiRequest; */

/////20.10.2025


import { useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import AuthContext from '../contexts/AuthContext';

const useApiRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { onLogout } = useContext(AuthContext);

 const sendRequest = 
 useCallback(async (url, options = {}) => {
  const controller = new AbortController();
  const signal = controller.signal;

  setLoading(true);
  setError(null);

  try {
    const response = await fetch(url, { ...options, signal });

    if (response.status === 401) {
      onLogout();
      throw new Error(t('auth.unauthorized') || 'Не авторизован');
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    let data = null;

    // Проверяем, есть ли тело ответа (content-length > 0) или не пустое тело
    if (response.status !== 204 && (contentLength === null || +contentLength > 0)) {
      if (options.responseType === 'blob') {
        data = await response.blob();
      } else if (options.responseType === 'text') {
        data = await response.text();
      } else if (contentType && contentType.includes('application/json')) {
        // Пробуем безопасно распарсить JSON, если тело не пустое
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error('Ошибка парсинга JSON');
          }
        } else {
          data = null; // пустой ответ
        }
      } else if (contentType && contentType.includes('text/plain')) {
        data = await response.text();
      } else {
        // Если тип не определён — читаем как текст
        data = await response.text();
      }
    } else {
      data = null; // Нет содержимого
    }

    if (!response.ok) {
      const errorMsg =
        typeof data === 'string'
          ? data
          : data?.text || data?.message || data?.error || 'Ошибка запроса';
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('Запрос был прерван');
      return null;
    }

    setError(err.message);
    message.error(err.message);
    throw err;
  } finally {
    setLoading(false);
  }
}, [onLogout, t]);


  return { loading, error, sendRequest };
};

export default useApiRequest;


