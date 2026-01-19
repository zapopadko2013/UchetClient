/* import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Login from './components/Login';
import { routes } from './routes';
import AuthContext from './contexts/AuthContext';

const generateRoutes = (routeList) => {
  return routeList.flatMap((route) => {
    if (route.children) {
      return generateRoutes(route.children); // рекурсивный вызов
    }
    if (route.path && route.element) {
      return (
        <Route
          key={route.key}
          path={route.path}
          element={route.element}
        />
      );
    }
    return [];
  });
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [accesses, setAccesses] = useState([]);

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUsername('');
  };

  const handleLogin = (token, user, accesses) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('username', user);
    localStorage.setItem('accesses', JSON.stringify(accesses));
    setIsLoggedIn(true);
    setUsername(user);
    setAccesses(accesses);
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUsername = localStorage.getItem('username');
    const storedaccesses = localStorage.getItem('accesses');
    console.log('storedaccesses:', storedaccesses);
    if (token) {
      setIsLoggedIn(true);
      setUsername(storedUsername || '');
      if (storedaccesses) {

       try {
      //setAccesses(JSON.parse(storedaccesses));
      const parsedAccesses = JSON.parse(storedaccesses);
        console.log('parsedAccesses:', parsedAccesses); // для отладки
        setAccesses(parsedAccesses);
    } catch (e) {
      console.error("Ошибка при парсинге accesses из localStorage", e);
    }

    }
  }
  }, []);

  return (
    <AuthContext.Provider value={{ onLogout: handleLogout }}>
      <Router>
        <Routes>
          {isLoggedIn ? (
            <Route path="/" element={<MainLayout username={username} accesses={accesses} />}>
              
              {generateRoutes(routes)}

              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          ) : (
            <>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};

export default App; */

/*  import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Login from './components/Login';
import { routes } from './routes';
import AuthContext from './contexts/AuthContext';
import { AntdI18nProvider } from './AntdI18nProvider';

const generateRoutes = (routeList) => {
  return routeList.flatMap((route) => {
    if (route.children) {
      return generateRoutes(route.children);
    }
    if (route.path && route.element) {
      return (
        <Route
          key={route.key}
          path={route.path}
          element={route.element}
        />
      );
    }
    return [];
  });
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading] = useState(true); // 👈 флаг загрузки

  // Обработка выхода
  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUsername('');
    setAccesses([]);
  };

  // Обработка входа
  const handleLogin = (token, user, accesses) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('username', user);
    localStorage.setItem('accesses', JSON.stringify(accesses));
    setIsLoggedIn(true);
    setUsername(user);
    setAccesses(accesses);
  };

  // Загрузка данных из localStorage при монтировании
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUsername = localStorage.getItem('username');
    const storedAccesses = localStorage.getItem('accesses');

    if (token) {
      setIsLoggedIn(true);
      setUsername(storedUsername || '');

      try {
        const parsed = storedAccesses ? JSON.parse(storedAccesses) : [];
        setAccesses(parsed);
      } catch (e) {
        console.error("Ошибка при парсинге accesses:", e);
        setAccesses([]);
      }
    }

    setLoading(false); // ✅ завершили инициализацию
  }, []);

  // Пока загружается — можно показать спиннер
  if (loading) return <div>Loading...</div>; // или Antd Spin

  return (
    <AuthContext.Provider value={{ onLogout: handleLogout }}>
      <AntdI18nProvider>
      
        <Routes>
          {isLoggedIn ? (
            <Route path="/" element={<MainLayout username={username} accesses={accesses || []} />}>
              {generateRoutes(routes)}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          ) : (
            <>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      
      </AntdI18nProvider>
    </AuthContext.Provider>
  );
};

export default App;
 */

/* import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Login from './components/Login';
import { routes } from './routes';
import AuthContext from './contexts/AuthContext';

const generateRoutes = (routeList) => {
  return routeList.flatMap((route) => {
    if (route.children) {
      return generateRoutes(route.children);
    }
    if (route.path && route.element) {
      return (
        <Route
          key={route.key}
          path={route.path}
          element={route.element}
        />
      );
    }
    return [];
  });
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading] = useState(true); // 👈 флаг загрузки

  // Обработка выхода
  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUsername('');
    setAccesses([]);
  };

  // Обработка входа
  const handleLogin = (token, user, accesses) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('username', user);
    localStorage.setItem('accesses', JSON.stringify(accesses));
    setIsLoggedIn(true);
    setUsername(user);
    setAccesses(accesses);
  };

  // Загрузка данных из localStorage при монтировании
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUsername = localStorage.getItem('username');
    const storedAccesses = localStorage.getItem('accesses');

    if (token) {
      setIsLoggedIn(true);
      setUsername(storedUsername || '');

      try {
        const parsed = storedAccesses ? JSON.parse(storedAccesses) : [];
        setAccesses(parsed);
      } catch (e) {
        console.error("Ошибка при парсинге accesses:", e);
        setAccesses([]);
      }
    }

    setLoading(false); // ✅ завершили инициализацию
  }, []);

  // Пока загружается — можно показать спиннер
  if (loading) return <div>Loading...</div>; // или Antd Spin

  return (
    <AuthContext.Provider value={{ onLogout: handleLogout }}>
      
        <Routes>
          {isLoggedIn ? (
            <Route path="/" element={<MainLayout username={username} accesses={accesses || []} />}>
              {generateRoutes(routes)}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          ) : (
            <>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
     
    </AuthContext.Provider>
  );
};

export default App; */

 import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Login from './components/Login';
import { routes } from './routes';
import AuthContext from './contexts/AuthContext';
import { AntdI18nProvider } from './AntdI18nProvider';

const generateRoutes = (routeList) => {
  return routeList.flatMap((route) => {
    if (route.children) {
      return generateRoutes(route.children);
    }
    if (route.path && route.element) {
      return (
        <Route
          key={route.key}
          path={route.path}
          element={route.element}
        />
      );
    }
    return [];
  });
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading] = useState(true);

  

  const handleLogout = () => {
    // очищаем только пользовательские данные
    localStorage.removeItem('accessToken');
    localStorage.removeItem('username');
    localStorage.removeItem('accesses');

    setIsLoggedIn(false);
    setUsername('');
    setAccesses([]);
  };

  const handleLogin = (token, user, accesses) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('username', user);
    localStorage.setItem('accesses', JSON.stringify(accesses));

    setIsLoggedIn(true);
    setUsername(user);
    setAccesses(accesses);
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUsername = localStorage.getItem('username');
    const storedAccesses = localStorage.getItem('accesses');

    if (token) {
      setIsLoggedIn(true);
      setUsername(storedUsername || '');
      setAccesses(storedAccesses ? JSON.parse(storedAccesses) : []);
    }

    setLoading(false);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ onLogout: handleLogout }}>
      <AntdI18nProvider>
        <Routes>
          {isLoggedIn ? (
            <Route path="/" element={<MainLayout username={username} accesses={accesses || []} />}>
              {generateRoutes(routes)}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          ) : (
            <>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </AntdI18nProvider>
    </AuthContext.Provider>
  );
};

export default App;
