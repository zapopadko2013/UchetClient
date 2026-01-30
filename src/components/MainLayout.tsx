import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Space, Avatar, Dropdown, Badge, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    BellOutlined,
    UserOutlined,
    LogoutOutlined,
    LockOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import LanguageSelector from '../components/LanguageSelector';
import NotificationDrawer from '../components/NotificationDrawer';
import { routes } from '../routes';
import './MainLayout.css';

import AiChat from './AiChat'; // Путь к вашему компоненту чата
import { FloatButton } from 'antd'; // Ant Design имеет отличную кнопку для таких целей
import { MessageOutlined, CloseOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

interface RouteItem {
    path?: string;
    key: string;
    code?: string;
    icon?: React.ReactNode;
    children?: RouteItem[];
}

type AccessItem = {
  id: number;
  code: string;
  category: string;
};

interface MainLayoutProps {
    username?: string;
    accesses?: AccessItem[];
}

const MainLayout: React.FC<MainLayoutProps> = ({ username, accesses }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [openKeys, setOpenKeys] = useState<string[]>([]);
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const [isAiChatVisible, setIsAiChatVisible] = useState(false);

    
    ///////30.01.2026

    // Автоматически закрывать меню при переходе по ссылке на мобильных устройствах
useEffect(() => {
    const handleRouteChange = () => {
        if (window.innerWidth < 992) {
            setCollapsed(true);
        }
    };
    handleRouteChange();
}, [location.pathname]);
    ///////30.01.2026

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    // Собираем все коды доступа из групп
    const accessCodes: string[] = (accesses ?? []).map(access => access.code);

    // Коды маршрутов, которые всегда видны независимо от доступа
    //const alwaysVisibleCodes = ['home', 'news', 'change-password','adminnews','admincompanysettings','admincompanycreate','setting_portal_user','businessManagement','admincompanylist','admincompanyinfo','admindownloadproduct','adminattribute','adminattributeadd','adminabrand','adminusers'];
    const alwaysVisibleCodes1 = [
         'home', 'news', 'change-password', 'setting_portal_user', 'businessManagement','saleslist'
         ,'aichathistory'
    ];

    const alwaysVisibleCodesd = [
    'adminnews','admincompanysettings','admincompanycreate','admincompanylist',
    'admincompanyinfo','admindownloadproduct','adminattribute','adminattributeadd',
    'adminabrand','adminusers','supportrequests'
    ];

    const alwaysVisibleCodes =
        username === 'admin'
        ? [...alwaysVisibleCodes1, ...alwaysVisibleCodesd]
        : [...alwaysVisibleCodes1];


    



    // Фильтрация маршрутов по accessCodes + всегда видимые
    const filterRoutesByAccess = (routes: RouteItem[]): RouteItem[] => {
      return routes
        .map(route => {
          if (route.children) {
            const filteredChildren = filterRoutesByAccess(route.children);
            if (filteredChildren.length > 0) {
              return { ...route, children: filteredChildren };
            }
            return null;
          }
          if (!route.code) return null;
          if (alwaysVisibleCodes.includes(route.code)) return route;
          return accessCodes.includes(route.code) ? route : null;
        })
        .filter(Boolean) as RouteItem[];
    };

    const filteredRoutes = React.useMemo(() => {

        const excludedCodes = ['news-detail',  'admincompanyinfo']; 

        return filterRoutesByAccess(
            routes.filter(r => !excludedCodes.includes(r.code ?? ''))
        );

        //return filterRoutesByAccess(routes.filter(r => r.code !== 'news-detail'));
    }, [accessCodes]);

    // Создание элементов меню рекурсивно
    const createMenuItems = (items: RouteItem[]): MenuItem[] => {
        return items.map(item => {
           // const isBold = item.key === 'businessManagement';
           const boldKeys = ['businessManagement', 'sellersBuyers','tradeObjects','pricing','marketing','productManagement','administration','report'];
           const isBold = boldKeys.includes(item.key);

            if (item.children) {
                return {
                    key: item.key,
                    icon: item.icon,
                    label: t(`menu.${item.key}`),
                    className: isBold ? 'always-bold' : undefined,
                    children: createMenuItems(item.children),
                };
            }

            return {
                key: item.key,
                icon: item.icon,
                label: <Link to={item.path!} className="menu-item-link">{t(`menu.${item.key}`)}</Link>,
                className: isBold ? 'always-bold' : undefined,
            };
        });
    };

    // Рекурсивно ищем ключи маршрута по пути, чтобы подсветить и открыть подменю
    const findKeysFromPath = (routes: RouteItem[], pathname: string, parentKeys: string[] = []): string[] => {
        for (const route of routes) {
            if (route.path && pathname === route.path) {
                return [...parentKeys, route.key];
            }
            if (route.path && pathname.startsWith(route.path + '/')) {
                return [...parentKeys, route.key];
            }
            if (route.children) {
                const foundKeys = findKeysFromPath(route.children, pathname, [...parentKeys, route.key]);
                if (foundKeys.length > 0) {
                    return foundKeys;
                }
            }
        }
        return [];
    };

    /////22.01.2026
    const toggleAiChat = () => {
    // Если мы открываем чат вручную (не через историю), 
    // и он сейчас закрыт — сбрасываем предыдущую сессию из истории
    if (!isAiChatVisible) {
        setSelectedSession(null); 
    }
    setIsAiChatVisible(!isAiChatVisible);
    };
    /////22.01.2026


    // Функция для поиска маршрута по пути (поиск по исходному routes)
    const findRouteByPath = (routes: RouteItem[], path: string): RouteItem | null => {
        for (const route of routes) {
            if (route.path === path) {
                return route;
            }
            if (route.children) {
                const found = findRouteByPath(route.children, path);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    };

    // Проверяем доступ для текущего пути
    const currentRoute = findRouteByPath(routes, location.pathname);

    const isAccessible = currentRoute
      ? !currentRoute.code || alwaysVisibleCodes.includes(currentRoute.code) || accessCodes.includes(currentRoute.code)
      : true;

    // Редирект если нет доступа
    useEffect(() => {
        if (!isAccessible) {
            navigate('/403', { replace: true });
        }
    }, [isAccessible, navigate]);

    // Получаем ключи выбранного пункта и открытые ключи подменю
    const pathKeys = findKeysFromPath(filteredRoutes, location.pathname);
    const selectedKeys = pathKeys.length > 0 ? [pathKeys[pathKeys.length - 1]] : [];
    const defaultOpenKeys = pathKeys.slice(0, -1);

    // Управление открытыми пунктами меню для раскрытия подменю
    useEffect(() => {
        setOpenKeys(defaultOpenKeys);
    }, [location.pathname]);


    /////22.01.2026
    const [selectedSession, setSelectedSession] = useState<any>(null);

    useEffect(() => {
    const handleContinue = (event: any) => {
        setSelectedSession(event.detail); // Сохраняем данные сессии
        setIsAiChatVisible(true);        // Открываем чат
    };

    window.addEventListener('continueAiSession', handleContinue);
    return () => window.removeEventListener('continueAiSession', handleContinue);
}, []);
    /////22.01.2026

    //////23.01.2026

    //const FOUR_HOURS = 4 * 60 * 60 * 1000; // 4 часа в миллисекундах
    /* const FOUR_HOURS =  60*60 * 1000;
    const API_URL = import.meta.env.VITE_API_URL || '';

    useEffect(() => {
    const checkAutoFetch = async () => {
        const lastFetch = localStorage.getItem('lastAutoStockFetch');
        const now = Date.now();

        // Генерируем ID для авто-сессии (фиксированный, чтобы история копилась в одном месте)
    const AUTO_SESSION_ID = 'auto-stock-session'; 

    if (!lastFetch || (now - parseInt(lastFetch)) > FOUR_HOURS) {
        try {
            const response = await fetch(`${API_URL}/api/chatroute/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
                },
                body: JSON.stringify({ 
                    message: "Остатки", 
                    isAutoRequest: true,
                    // ОБЯЗАТЕЛЬНО ПЕРЕДАЕМ ID СЮДА:
                    sessionId: AUTO_SESSION_ID 
                }),
            });

            if (response.ok) {
                const data = await response.json();
                
                const autoSession = {
                    id: AUTO_SESSION_ID, // Используем тот же ID
                    messages: [
                         {
                            question: t('aiChat.autoUpdateTrigger') || "Авто-проверка остатков",
                            //answer: data
                            answer: {
                    text: data.answer, // Перекладываем data.answer в text
                    dataType: data.dataType,
                    stockData: data.stockData,
                    salesData: data.salesData
                }
                        } 

                            
                    ]
                };




                setSelectedSession(autoSession);
                setIsAiChatVisible(true);
                localStorage.setItem('lastAutoStockFetch', now.toString());
            }
            } catch (error) {
                console.error("Ошибка авто-запроса остатков:", error);
            }
        }
    };

    // Проверяем при загрузке страницы
    checkAutoFetch();

    // Каждую минуту проверяем, не пора ли сделать новый запрос
    const interval = setInterval(checkAutoFetch, 60000000); 

    return () => clearInterval(interval);
}, [t]); // Зависимость от t для корректных переводов
 */

useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || '';
    const AUTO_SESSION_ID = 'auto-stock-session';

    const checkAutoFetch = async () => {
        try {
            // 1. Сначала запрашиваем настройки компании
            const companyRes = await fetch(`${API_URL}/api/company`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}` }
            });
            
            if (!companyRes.ok) return;
            const companyData = await companyRes.json();

            // Проверяем флаг включения автоопроса
            if (!companyData.avtoupdatestockflag) {
                console.log("Автоопрос остатков отключен в настройках");
                return;
            }

            // Вычисляем интервал из настроек (в часах) или берем 4 часа по умолчанию
            const hours = companyData.avtoupdatestocktime || 4;
            const INTERVAL_MS = hours * 60 * 60 * 1000;

            const lastFetch = localStorage.getItem('lastAutoStockFetch');
            const now = Date.now();

            // 2. Проверяем, пришло ли время для запроса
            if (!lastFetch || (now - parseInt(lastFetch)) > INTERVAL_MS) {
                const response = await fetch(`${API_URL}/api/chatroute/chat`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
                    },
                    body: JSON.stringify({ 
                        message: "Остатки", 
                        isAutoRequest: true,
                        sessionId: AUTO_SESSION_ID 
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    const autoSession = {
                        id: AUTO_SESSION_ID,
                        messages: [{
                            question: t('aiChat.autoUpdateTrigger'),
                            answer: {
                                text: data.answer,
                                dataType: data.dataType,
                                stockData: data.stockData,
                                salesData: data.salesData
                            }
                        }]
                    };

                    setSelectedSession(autoSession);
                    setIsAiChatVisible(true);
                    localStorage.setItem('lastAutoStockFetch', now.toString());
                }
            }
        } catch (error) {
            console.error("Ошибка в процессе авто-запроса:", error);
        }
    };

    // Запускаем проверку
    checkAutoFetch();

    // Проверяем каждые 15 минут, не пора ли сделать новый запрос 
    // (на случай если пользователь долго не обновлял страницу)
    const interval = setInterval(checkAutoFetch, 15 * 60 * 1000); 

    return () => clearInterval(interval);
}, [t]); // Зависимость t для перевода триггера

    //////23.01.2026
    


    const onOpenChange = (keys: string[]) => {
        setOpenKeys(keys);
    };

    // Формируем меню боковой панели
    const sideMenuItems: MenuItem[] = [
        ...createMenuItems(filteredRoutes),
        { type: 'divider', key: 'divider-2' },
        {
            key: 'logout-main',
            icon: <LogoutOutlined />,
            label: t('userMenu.logout'),
            danger: true,
            onClick: () => {
                localStorage.clear();
                window.location.reload();
            },
            className: 'logout-menu-item',
        },
    ];

    // Меню пользователя
    const userMenu: MenuProps = {
        items: [
            {
                key: 'profile',
                label: t('userMenu.profile'),
                icon: <UserOutlined />,
                onClick: () => {
                    navigate('/');
                },
            },
            {
                key: 'changePassword',
                label: t('userMenu.changePassword'),
                icon: <LockOutlined />,
                onClick: () => {
                    navigate('/change-password');
                },
            },
            {
                type: 'divider',
            },
            {
                key: 'logout',
                label: t('userMenu.logout'),
                icon: <LogoutOutlined />,
                danger: true,
                onClick: () => {
                    localStorage.clear();
                    window.location.reload();
                },
            },
        ],
    };

    // Если нет доступа — ничего не рендерим (редирект сделает useEffect)
    if (!isAccessible) {
        return null;
    }

    return (
        <Layout className="app-layout">
            <Sider 
           
           breakpoint="lg"
    collapsedWidth="0"
    width={300}     
    onBreakpoint={(broken) => {
            if (broken) setCollapsed(true);
        }}

            /* width={340}  */
            trigger={null} 
            collapsible 
            collapsed={collapsed} className="app-sider">
                <div className="sider-header">
                    {!collapsed && (
                        <span className="app-name-text">
                            <img
    src="Qazinvent1.svg"
    alt="App Icon"
    className="app-icon"
  />
                            {t('misc.appName')}</span>
                    )}
                     <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        className="collapse-button"
                    /> 
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={selectedKeys}
                    openKeys={openKeys}
                    onOpenChange={onOpenChange}
                    className="app-menu"
                    items={sideMenuItems}
                />
            </Sider>
            <Layout className="site-layout">
                <Header className="app-header">
                    <div className="header-content">
                        {/* <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        className="collapse-button"
                    /> */}
                    
                    <Button
    type="text"
    onClick={() => setCollapsed(!collapsed)}
    className="header-toggle-button"
>
    <Space>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        {/* Показываем текст "Меню" только если меню свернуто */}
        {collapsed && <span className="menu-button-text">{t('misc.menu')}</span>}
    </Space>
</Button>
                        <div></div>
                        <div className="right-header-items">
                            <LanguageSelector />
                            <Badge count={5} size="small">
                                <Button type="text" icon={<BellOutlined className="bell-icon" />} onClick={() => setIsDrawerVisible(true)} />
                            </Badge>
                            <Dropdown menu={userMenu} trigger={['hover']}>
                                <Space className="user-dropdown">
                                    <Avatar size="small" icon={<UserOutlined />} className="user-avatar" />
                                    <Typography.Text className="username">{username || t('misc.usernameGuest')}</Typography.Text>
                                </Space>
                            </Dropdown>
                        </div>
                    </div>
                </Header>
                <Content
                    className="main-content"
                    style={{ background: colorBgContainer, borderRadius: borderRadiusLG }}
                >
                    <Outlet />
                </Content>

                {/* --- КНОПКА И ОКНО ЧАТА --- */}
            <div className="ai-chat-container">
                {isAiChatVisible && (
    <div className="ai-chat-wrapper">
        <div className="ai-chat-header">
            <Space>
                <MessageOutlined />
                <span>{t('misc.aiAssistant') || 'ИИ NuraAi'}</span>
            </Space>
            <Button 
                type="text" 
                icon={<CloseOutlined />} 
                onClick={() => setIsAiChatVisible(false)} 
                style={{ color: 'white' }}
            />
        </div>
        {/* Внутри AiChat убедитесь, что контейнер занимает 100% высоты */}
        <AiChat 
        
        key={selectedSession?.id || 'new'}
        
        initialSession={selectedSession} />
    </div>
)}

{/* <FloatButton
    icon={isAiChatVisible ? <CloseOutlined /> : <MessageOutlined />}
    type="primary"
    style={{ right: 24, bottom: 24, width: 60, height: 60 }}
    onClick={() => setIsAiChatVisible(!isAiChatVisible)}
    tooltip={<div>{isAiChatVisible ? t('misc.aiCloseAssistant') ||'Закрыть чат' : t('misc.aiReadAssistant') ||'Спросить NuraAi'}</div>}
/> */}

<FloatButton
    icon={isAiChatVisible ? <CloseOutlined /> : <MessageOutlined />}
    type="primary"
    style={{ right: 24, bottom: 24, width: 60, height: 60 }}
    onClick={toggleAiChat} // Используем нашу новую функцию
    tooltip={<div>{isAiChatVisible ? t('misc.aiCloseAssistant') : t('misc.aiReadAssistant')}</div>}
/>
            </div>


                <NotificationDrawer visible={isDrawerVisible} onClose={() => setIsDrawerVisible(false)} onNewsClick={(news) => {
                    setIsDrawerVisible(false);
                    navigate(`/news/${news.id}`);
                }} />
            </Layout>
        </Layout>
    );
};

export default MainLayout;





/*  import React, { useState } from 'react';
import {
    Layout, Menu, Button, theme, Space, Avatar, Dropdown, Badge, Typography
} from 'antd';
import type { MenuProps } from 'antd';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined,
    UserOutlined, LogoutOutlined, LockOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import LanguageSelector from '../components/LanguageSelector';
import NotificationDrawer from '../components/NotificationDrawer';
import { routes } from '../routes'; // <-- Убедись, что у маршрутов есть поле `code`
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

// Типы
type MenuItem = Required<MenuProps>['items'][number];

interface RouteItem {
    key: string;
    code: string; // ← доступ для проверки
    path?: string;
    icon?: React.ReactNode;
    children?: RouteItem[];
}

type AccessItem = {
    id: number;
    code: string;
    category: string;
};

type AccessGroup = {
    accesses: AccessItem[];
};

interface MainLayoutProps {
    username?: string;
    accesses?: AccessItem[];
}

const MainLayout: React.FC<MainLayoutProps> = ({ username, accesses }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    // console.log('accesses:', accesses);

    // 🔹 Достаём список code из accesses
   const accessCodes: string[] = (accesses ?? []).map(access => access.code);

    //console.log('accessCodes:', accessCodes);

    // 🔹 Фильтрация маршрутов по accessCodes → сравниваем с route.code
   

    const alwaysVisibleCodes = ['home', 'news', 'change-password'];

const filterRoutesByAccess = (routes: RouteItem[]): RouteItem[] => {
  return routes
    .map(route => {
      if (route.children) {
        const filteredChildren = filterRoutesByAccess(route.children);
        if (filteredChildren.length > 0) {
          return { ...route, children: filteredChildren };
        }
        return null;
      }

      if (alwaysVisibleCodes.includes(route.code)) {
        return route;
      }

      return accessCodes.includes(route.code) ? route : null;
    })
    .filter(Boolean) as RouteItem[];
};

    const filteredRoutes = filterRoutesByAccess(
        routes.filter(r => r.code !== 'news-detail') // ← если нужен фильтр на исключение
    );

    // 🔹 Создание меню
    const createMenuItems = (items: RouteItem[]): MenuItem[] => {
        return items.map(item => {
            const isBold = item.key === 'businessManagement';

            if (item.children) {
                return {
                    key: item.key,
                    icon: item.icon,
                    label: t(`menu.${item.key}`),
                    className: isBold ? 'always-bold' : undefined,
                    children: createMenuItems(item.children),
                };
            }

            return {
                key: item.key,
                icon: item.icon,
                label: <Link to={item.path!} className="menu-item-link">{t(`menu.${item.key}`)}</Link>,
                className: isBold ? 'always-bold' : undefined,
            };
        });
    };

    // 🔹 Выделение активного маршрута
    const findKeysFromPath = (routes: RouteItem[], pathname: string, parentKeys: string[] = []): string[] => {
        for (const route of routes) {
            if (route.path && pathname.startsWith(route.path)) {
                return [...parentKeys, route.key];
            }
            if (route.children) {
                const foundKeys = findKeysFromPath(route.children, pathname, [...parentKeys, route.key]);
                if (foundKeys.length > 0) {
                    return foundKeys;
                }
            }
        }
        return [];
    };

    const pathKeys = findKeysFromPath(filteredRoutes, location.pathname);
    const menuSelectedKeys = pathKeys.length > 0 ? [pathKeys[pathKeys.length - 1]] : [];
    const menuOpenKeys = pathKeys.slice(0, -1);

    // 🔹 Меню боковое
    const sideMenuItems: MenuItem[] = [
        ...createMenuItems(filteredRoutes),
        { type: 'divider', key: 'divider-logout' },
        {
            key: 'logout-main',
            icon: <LogoutOutlined />,
            label: t('userMenu.logout'),
            danger: true,
            onClick: () => {
                localStorage.clear();
                window.location.reload();
            },
            className: 'logout-menu-item',
        },
    ];

    // 🔹 Меню пользователя
    const userMenu: MenuProps = {
        items: [
            {
                key: 'profile',
                label: t('userMenu.profile'),
                icon: <UserOutlined />,
                onClick: () => navigate('/'),
            },
            {
                key: 'changePassword',
                label: t('userMenu.changePassword'),
                icon: <LockOutlined />,
                onClick: () => navigate('/change-password'),
            },
            { type: 'divider' },
            {
                key: 'logout',
                label: t('userMenu.logout'),
                icon: <LogoutOutlined />,
                danger: true,
                onClick: () => {
                    localStorage.clear();
                    window.location.reload();
                },
            },
        ],
    };

    return (
        <Layout className="app-layout">
            <Sider width={260} trigger={null} collapsible collapsed={collapsed} className="app-sider">
                <div className="sider-header">
                    {!collapsed && (
                        <span className="app-name-text">{t('misc.appName')}</span>
                    )}
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        className="collapse-button"
                    />
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={menuSelectedKeys}
                    defaultOpenKeys={menuOpenKeys}
                    className="app-menu"
                    items={sideMenuItems}
                />
            </Sider>
            <Layout className="site-layout">
                <Header className="app-header">
                    <div className="header-content">
                        <div />
                        <div className="right-header-items">
                            <LanguageSelector />
                            <Badge count={5} size="small">
                                <Button type="text" icon={<BellOutlined className="bell-icon" />} onClick={() => setIsDrawerVisible(true)} />
                            </Badge>
                            <Dropdown menu={userMenu} trigger={['hover']}>
                                <Space className="user-dropdown">
                                    <Avatar size="small" icon={<UserOutlined />} className="user-avatar" />
                                    <Typography.Text className="username">{username || t('misc.usernameGuest')}</Typography.Text>
                                </Space>
                            </Dropdown>
                        </div>
                    </div>
                </Header>
                <Content className="main-content" style={{ background: colorBgContainer, borderRadius: borderRadiusLG }}>
                    <Outlet />
                </Content>
                <NotificationDrawer
                    visible={isDrawerVisible}
                    onClose={() => setIsDrawerVisible(false)}
                    onNewsClick={(news) => {
                        setIsDrawerVisible(false);
                        navigate(`/news/${news.id}`);
                    }}
                />
            </Layout>
        </Layout>
    );
};

export default MainLayout; 
 */

/* import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Space, Avatar, Dropdown, Badge, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    BellOutlined,
    UserOutlined,
    LogoutOutlined,
    LockOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import LanguageSelector from '../components/LanguageSelector';
import NotificationDrawer from '../components/NotificationDrawer';
import { routes } from '../routes';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

// Тип пункта меню из antd, учитывающий divider, submenu и обычные пункты
type MenuItem = Required<MenuProps>['items'][number];

interface RouteItem {
    path?: string;
    key: string;
    icon?: React.ReactNode;
    children?: RouteItem[];
}

type AccessItem = {
  id: number;
  code: string;
  category: string;
};

type AccessGroup = {
  accesses: AccessItem[];
};

interface MainLayoutProps {
    username?: string;
    accesses?: AccessGroup[];
}

const MainLayout: React.FC<MainLayoutProps> = ({ username, accesses }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const showDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    const handleNewsClick = (news: { id: string | number }) => {
        closeDrawer();
        navigate(`/news/${news.id}`);
    };

    const createMenuItems = (items: RouteItem[]): MenuItem[] => {
        return items.map(item => {
            const isBold = item.key === 'businessManagement';

            if (item.children) {
                return {
                    key: item.key,
                    icon: item.icon,
                    label: t(`menu.${item.key}`),
                    className: isBold ? 'always-bold' : undefined,
                    children: createMenuItems(item.children),
                };
            }

            return {
                key: item.key,
                icon: item.icon,
                label: <Link to={item.path!} className="menu-item-link">{t(`menu.${item.key}`)}</Link>,
                className: isBold ? 'always-bold' : undefined,
            };
        });
    };

    // Рекурсивная функция поиска ключей маршрута по пути
    const findKeysFromPath = (routes: RouteItem[], pathname: string, parentKeys: string[] = []): string[] => {
        for (const route of routes) {
            if (route.path && pathname.startsWith(route.path) && (pathname.length === route.path.length || pathname.charAt(route.path.length) === '/')) {
                return [...parentKeys, route.key];
            }
            if (route.children) {
                const foundKeys = findKeysFromPath(route.children, pathname, [...parentKeys, route.key]);
                if (foundKeys.length > 0) {
                    return foundKeys;
                }
            }
        }
        return [];
    };

    const filteredRoutes = routes.filter(r => r.key !== 'news-detail');

    const pathKeys = findKeysFromPath(filteredRoutes, location.pathname);
    const menuSelectedKeys = pathKeys.length > 0 ? [pathKeys[pathKeys.length - 1]] : [];
    const menuOpenKeys = pathKeys.slice(0, -1);

    // Боковое меню, с добавлением divider и пункта "Выйти"
    const sideMenuItems: MenuItem[] = [
        ...createMenuItems(filteredRoutes),
        { type: 'divider', key: 'divider-2' },
        {
            key: 'logout-main',
            icon: <LogoutOutlined />,
            label: t('userMenu.logout'),
            danger: true,
            onClick: () => {
                localStorage.clear();
                window.location.reload();
            },
            className: 'logout-menu-item',
        },
    ];

    // Меню пользователя в выпадающем списке
    const userMenu: MenuProps = {
        items: [
            {
                key: 'profile',
                label: t('userMenu.profile'),
                icon: <UserOutlined />,
                onClick: () => {
                    navigate('/');
                },
            },
            {
                key: 'changePassword',
                label: t('userMenu.changePassword'),
                icon: <LockOutlined />,
                onClick: () => {
                    navigate('/change-password');
                },
            },
            {
                type: 'divider',
            },
            {
                key: 'logout',
                label: t('userMenu.logout'),
                icon: <LogoutOutlined />,
                danger: true,
                onClick: () => {
                    localStorage.clear();
                    window.location.reload();
                },
            },
        ],
    };

    return (
        <Layout className="app-layout">
            <Sider width={340} trigger={null} collapsible collapsed={collapsed} className="app-sider">
                <div className="sider-header">
                    {!collapsed && (
                        <span className="app-name-text">{t('misc.appName')}</span>
                    )}
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        className="collapse-button"
                    />
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={menuSelectedKeys}
                    defaultOpenKeys={menuOpenKeys}
                    className="app-menu"
                    items={sideMenuItems}
                />
            </Sider>
            <Layout className="site-layout">
                <Header className="app-header">
                    <div className="header-content">
                        <div></div>
                        <div className="right-header-items">
                            <LanguageSelector />
                            <Badge count={5} size="small">
                                <Button type="text" icon={<BellOutlined className="bell-icon" />} onClick={showDrawer} />
                            </Badge>
                            <Dropdown menu={userMenu} trigger={['hover']}>
                                <Space className="user-dropdown">
                                    <Avatar size="small" icon={<UserOutlined />} className="user-avatar" />
                                    <Typography.Text className="username">{username || t('misc.usernameGuest')}</Typography.Text>
                                </Space>
                            </Dropdown>
                        </div>
                    </div>
                </Header>
                <Content
                    className="main-content"
                    style={{ background: colorBgContainer, borderRadius: borderRadiusLG }}
                >
                    <Outlet />
                </Content>
                <NotificationDrawer visible={isDrawerVisible} onClose={closeDrawer} onNewsClick={handleNewsClick} />
            </Layout>
        </Layout>
    );
};

export default MainLayout;
 */
 

/* import { useState } from 'react';
import { Layout, Menu, Button, theme, Space, Avatar, Dropdown, Badge, Select, Typography } from 'antd';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    BellOutlined,
    UserOutlined,
    LogoutOutlined,
    LockOutlined,
    InfoCircleOutlined,
    ShopOutlined,
    ContainerOutlined,
    DollarCircleOutlined,
    TagOutlined,
    BarChartOutlined,
    SolutionOutlined,
    SettingOutlined,
    TeamOutlined,
    PartitionOutlined,
    ContactsOutlined,
    InteractionOutlined,
    FileTextOutlined,
    PrinterOutlined,
    GatewayOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
import NotificationDrawer from '../components/NotificationDrawer';
import { routes } from '../routes';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

interface MenuItem {
    key: string;
    icon?: React.ReactNode;
    label: React.ReactNode;
    children?: MenuItem[];
    danger?: boolean;
    onClick?: () => void;
}

interface RouteItem {
    path?: string;
    key: string;
    icon?: React.ReactNode;
    children?: RouteItem[];
}

const MainLayout = ({ username }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

    const selectedKey = location.pathname;

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const showDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    const handleNewsClick = (news) => {
        closeDrawer();
        navigate(`/news/${news.id}`);
    };

    const createMenuItems = (items: RouteItem[]): MenuItem[] => {
        return items.map(item => {
            if (item.children) {
                return {
                    key: item.key,
                    icon: item.icon,
                    label: t(`menu.${item.key}`),
                    children: createMenuItems(item.children),
                };
            }
            return {
                key: item.path!,
                icon: item.icon,
                label: <Link to={item.path!} className="menu-item-link">{t(`menu.${item.key}`)}</Link>,
            };
        });
    };
    
    // Фильтруем маршруты, исключая те, что не должны быть в боковом меню
    const filteredRoutes = routes.filter(
        route => route.key !== 'changePassword' && route.key !== 'news-detail'
    );
    
    // Функция для получения ключей выделенных и открытых пунктов меню
    const getSelectedAndOpenKeys = (items: RouteItem[], pathname: string) => {
        let selectedKeys = [pathname];
        let openKeys: string[] = [];
        
        const findKeys = (routesToSearch: RouteItem[]) => {
            for (const route of routesToSearch) {
                if (route.children) {
                    const isChildSelected = route.children.some(child => child.path === pathname);
                    if (isChildSelected) {
                        openKeys.push(route.key);
                        selectedKeys.push(route.key);
                    }
                    findKeys(route.children);
                }
            }
        };

        findKeys(items);
        return { selectedKeys, openKeys };
    };
    
    const { selectedKeys: menuSelectedKeys, openKeys: menuOpenKeys } = getSelectedAndOpenKeys(filteredRoutes, selectedKey);

    // Элементы бокового меню
    const sideMenuItems: MenuItem[] = [
        ...createMenuItems(filteredRoutes),
        { type: 'divider' as const, key: 'divider-1' },
        { 
            key: 'changePassword', 
            icon: <LockOutlined />,
            label: <Link to="/change-password">{t('menu.changePassword')}</Link>,
        },
        { type: 'divider' as const, key: 'divider-2' },
        {
            key: 'logout-main',
            icon: <LogoutOutlined />,
            label: t('userMenu.logout'),
            danger: true,
            onClick: () => {
                localStorage.clear();
                window.location.reload();
            },
        },
    ];
    
    // Элементы выпадающего меню пользователя
    const userMenu = {
        items: [
            { 
                key: 'profile', 
                label: t('userMenu.profile'), 
                icon: <UserOutlined />,
                onClick: () => {
                    navigate('/');
                }
            },
            { 
                key: 'changePassword', 
                label: t('userMenu.changePassword'), 
                icon: <LockOutlined />,
                onClick: () => {
                   navigate('/change-password');
                }
            },
            { 
                type: 'divider',
            },
            { 
                key: 'logout', 
                label: t('userMenu.logout'), 
                icon: <LogoutOutlined />, 
                danger: true, 
                onClick: () => { 
                    localStorage.clear(); 
                    window.location.reload(); 
                } 
            },
        ],
    };

    const handleLanguageChange = (lng) => {
        i18n.changeLanguage(lng);
        setCurrentLanguage(lng);
    };

    return (
        <Layout className="app-layout">
            <style>
                {`
                    .app-menu .ant-menu-item-selected .ant-menu-title-content,
                    .app-menu .ant-menu-submenu-selected .ant-menu-submenu-title .ant-menu-title-content {
                        font-weight: bold;
                    }
                `}
            </style>
            <Sider width={260} trigger={null} collapsible collapsed={collapsed} className="app-sider">
                <div className="sider-header">
                    {!collapsed && (
                        <span className="app-name-text">{t('misc.appName')}</span>
                    )}
                    <Button 
                        type="text" 
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} 
                        onClick={() => setCollapsed(!collapsed)} 
                        className="collapse-button"
                    />
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={menuSelectedKeys}
                    className="app-menu"
                    items={sideMenuItems}
                    defaultOpenKeys={menuOpenKeys}
                />
            </Sider>
            <Layout className="site-layout">
                <Header className="app-header">
                    <div className="header-content">
                        <div>
                        </div>
                        <div className="right-header-items">
                            <LanguageSelector />
                            <Badge count={5} size="small" >
                                <Button type="text" icon={<BellOutlined className="bell-icon" />} onClick={showDrawer} />
                            </Badge>
                            <Dropdown menu={userMenu} trigger={['hover']}>
                                <Space className="user-dropdown">
                                    <Avatar size="small" icon={<UserOutlined />} className="user-avatar" />
                                    <Typography.Text className="username">{username || t('misc.usernameGuest')}</Typography.Text>
                                </Space>
                            </Dropdown>
                        </div>
                    </div>
                </Header>
                <Content className="main-content" style={{ background: colorBgContainer, borderRadius: borderRadiusLG }}>
                    <Outlet />
                </Content>
                <NotificationDrawer visible={isDrawerVisible} onClose={closeDrawer} onNewsClick={handleNewsClick} />
            </Layout>
        </Layout>
    );
};

export default MainLayout;
 */
