import React from 'react';
import {
  HomeOutlined,
  BellOutlined,
  LockOutlined,
  BarChartOutlined,
  TeamOutlined,
  SolutionOutlined,
  ShopOutlined,       // для Объекты торговли
  UsergroupAddOutlined, // для Продавцы и покупатели
  UserOutlined,
  ApartmentOutlined,
  ShoppingOutlined,
  ContactsOutlined,
  IdcardOutlined,
  UserSwitchOutlined,
  ProfileOutlined,
  ContainerOutlined,
  ShopTwoTone,
  BarcodeOutlined,
  DollarOutlined,
  EditOutlined,
  SettingOutlined,
  FileDoneOutlined,
  GiftOutlined,
  PercentageOutlined,
  CreditCardOutlined,
  SmileOutlined,
  TagOutlined,
  RocketOutlined,
  AppstoreOutlined,
  DownloadOutlined,
  SwapOutlined,
  DeleteOutlined,
  DashboardOutlined,
  FileTextOutlined,
  AuditOutlined,ClusterOutlined,InboxOutlined,
  TrademarkCircleOutlined,ReconciliationOutlined,DatabaseOutlined,ShoppingCartOutlined,
  RobotOutlined,QuestionCircleOutlined, LineChartOutlined,
} from '@ant-design/icons';

import HomePage from './components/HomePage';
import NewsPage from './components/NewsPage';
import NewsDetail from './components/NewsDetail';
import ChangePasswordPage from './components/ChangePasswordPage';
import CashBoxUser from './components/BusinessManagement/CashBoxUser';
import SalesPlan from './components/BusinessManagement/SalesPlan';
import UserProgram from './components/BusinessManagement/UserProgram';
import AccessDeniedPage from './components/AccessDeniedPage';
import SuppliersPage from './components/SellersBuyers/SuppliersPage';
import LegalBuyersPage from './components/SellersBuyers/LegalBuyersPage';
import IndividualBuyersPage from './components/SellersBuyers/IndividualBuyersPage';
import WarehousePage from './components/TradeObjects/WarehousePage';
import TradePointsPage from './components/TradeObjects/TradePointsPage';
import ScalesPage from './components/TradeObjects/ScalesPage';
import CashDesksPage from './components/TradeObjects/CashDesksPage';
import LimitPricesPage from './components/Pricing/LimitPricesPage';
import PricingMasterPage from './components/Pricing/PricingMasterPage';
import ChangePrices from './components/Pricing/ChangePrices';
import Coupons from './components/Marketing/Coupons';
import Bonuses from './components/Marketing/Bonuses';
import GiftCertificates from './components/Marketing/GiftCertificates';
import DiscountsPage from './components/Marketing/DiscountsPage';
import PromotionsPage from './components/Marketing/PromotionsPage';
import WeightGoodsPage from './components/ProductManagement/WeightGoodsPage';
import ProductsPage from './components/ProductManagement/ProductsPage';
import GoodsReceipt from './components/ProductManagement/GoodsReceiptPage/GoodsReceipt';
import InvoiceDetailsPage from './components/ProductManagement/GoodsReceiptPage/InvoiceDetailsPage';
import StockTransfer from './components/ProductManagement/StockTransfer/StockTransfer';
import GoodsWriteoffPage from './components/ProductManagement/GoodsWriteoffPage/GoodsWriteoffPage';
import RevisionPage from './components/ProductManagement/RevisionPage/RevisionPage';
import BarcodePrintPage from './components/ProductManagement/BarcodePrintPage/BarcodePrintPage';
import WorkordersPage from './components/ProductManagement/WorkordersPage/WorkordersPage';


import AdminNews from './components/Administration/News/AdminNews';
import CompanySettings from './components/Administration/CompanySettings/CompanySettings';
import RegisterPage from './components/Administration/CompanyCreate/RegisterPage';
import CompanyList from './components/Administration/CompanyCreate/CompanyList';
import InfoCompanyPage from './components/Administration/CompanyCreate/InfoCompanyPage';
import ImpNomenclature from './components/Administration/DownloadProduct/ImpNomenclature';
import UpdateAttributePage from './components/Administration/AttributeBrand/UpdateAttributePage';
import BrandList from './components/Administration/AttributeBrand/BrandList';
import ERPUserListPage from './components/Administration/AttributeBrand/ERPUserListPage';
import SalesByChecksReport from './components/Reports/SalesByChecksReport';
import SoldProductsReport from './components/Reports/SoldProductsReport/SoldProductsReport';
import InvoicesHistoryReport from './components/Reports/InvoicesHistoryReport/InvoicesHistoryReport';
import RevisionReport from './components/Reports/RevisionReport/RevisionReport';
import StockReport from './components/Reports/StockReport/StockReport';
import SalePage from './components/SalePage/SalePage';
import AiChatHistory from './components/AiChatHistory';

import DebtReport from './components/Reports/DebtReport';
import CertificateReport from './components/Reports/CertificateReport';



import SupportAdminPage from './components/Administration/SupportAdminPage';

import AnalyticsCharts from './components/Charts/AnalyticsCharts';




export const routes = [
  {
    path: '/',
    element: <HomePage />,
    key: 'home',
    code: 'home', // ← даже если доступ всегда открыт — для единообразия
    icon: <HomeOutlined />,
  },
  {
      path: '/charts',
      key: 'charts',
      label: 'Графики',
      icon: <LineChartOutlined />,
      element: <AnalyticsCharts />,
      code: 'charts',
    },
  {
    key: 'businessManagement',
    label: 'Управление бизнесом',
    code: 'businessManagement',
    icon: <TeamOutlined />,
    children: [
      {
        path: '/portal-users',
        key: 'portalUsers',
        label: 'Пользователи портала',
        icon: <TeamOutlined />,
        element: <UserProgram />,
        code: 'setting_portal_user', // ← доступ по этому коду
      },
      {
        path: '/cash-users',
        key: 'cashUsers',
        label: 'Пользователи касс',
        icon: <SolutionOutlined />,
        element: <CashBoxUser />,
        code: 'setting_user_chekout',
      },
      {
        path: '/sales-plan',
        key: 'salesPlan',
        label: 'План продаж',
        icon: <BarChartOutlined />,
        element: <SalesPlan />,
        code: 'setting_sales_plan',
      },
    ],
  },
  
  
      {
        key: 'sellersBuyers',
        label: 'Поставщики и покупатели',
        icon: <UsergroupAddOutlined />,
        children: [
          {
            path: '/suppliers',
            key: 'suppliers',
            label: 'Поставщики',
            icon: <ContactsOutlined />,
            element: <SuppliersPage />, 
            code: 'setting_supplies',
          },
          {
            path: '/legal-buyers',
            key: 'legalBuyers',
            label: 'Покупатели юр.лица',
            icon: <IdcardOutlined />,
            element: <LegalBuyersPage />,
            code: 'setting_buyers',
          },
          {
            path: '/individual-buyers',
            key: 'individualBuyers',
            label: 'Покупатели физ.лица',
            icon: <UserSwitchOutlined />,
            element: <IndividualBuyersPage />,
            code: 'setting_buyers_fiz',
          },
        ],
      },
      {
        key: 'tradeObjects',
        label: 'Объекты торговли',
        icon: <ShopOutlined />,
        children: [
          {
            path: '/warehouse',
            key: 'warehouse',
            label: 'Склад',
            icon: <ContainerOutlined />,
            element: <WarehousePage />,
            code: 'setting_whs',
          },
          {
            path: '/store-points',
            key: 'storePoints',
            label: 'Торговая точка',
            icon: <ShopTwoTone />,
            element: <TradePointsPage />,
            code: 'setting_store',
          },
          {
            path: '/cash-desks',
            key: 'cashDesks',
            label: 'Кассы',
            icon: <BarcodeOutlined />,
            element: <CashDesksPage />,
            code: 'setting_cash_reg',
          },
          {
            path: '/scales',
            key: 'scales',
            label: 'Весы',
            icon: <ProfileOutlined />,
            element: <ScalesPage />,
            code: 'setting_scales',
          },
        ],
      },

    ///
     {
    key: 'pricing',
    label: 'Ценообразование',
    icon: <DollarOutlined />,
    children: [
      {
        path: '/price-change',
        key: 'priceChange',
        label: 'Изменение цен',
        icon: <EditOutlined />,
        element: <ChangePrices />, 
        code: 'price_change',
      },
      {
        path: '/pricing-master',
        key: 'pricingMaster',
        label: 'Мастер ценообразования',
        icon: <SettingOutlined />,
        element: <PricingMasterPage />, 
        code: 'price_wizard',
      },
      {
        path: '/limit-prices',
        key: 'limitPrices',
        label: 'Предельные цены',
        icon: <FileDoneOutlined />,
        element: <LimitPricesPage />, 
        code: 'price_marginal',
      },
    ],
  },
    ///

  {
  key: 'marketing',
  label: 'Маркетинг',
  icon: <GiftOutlined />,
  children: [
    {
      path: '/coupons',
      key: 'coupons',
      label: 'Купоны',
      icon: <PercentageOutlined />,
      element: <Coupons />,
      code: 'market_coupons',
    },
    {
      path: '/gift-certificates',
      key: 'giftCertificates',
      label: 'Подарочные сертификаты',
      icon: <CreditCardOutlined />,
      element: <GiftCertificates />,
      code: 'market_gift',
    },
    {
      path: '/bonuses',
      key: 'bonuses',
      label: 'Бонусы',
      icon: <SmileOutlined />,
      element: <Bonuses />,
      code: 'market_bonuses',
    },
    {
      path: '/discounts',
      key: 'discounts',
      label: 'Создание скидок',
      icon: <TagOutlined />,
      element: <DiscountsPage />,
      code: 'market_create_discount',
    },
    {
      path: '/promotions',
      key: 'promotions',
      label: 'Акции',
      icon: <RocketOutlined />,
      element: <PromotionsPage />,
      code: 'market_stock',
    },
  ],
},
  
{
  key: 'productManagement',
  label: 'Управление товарами',
  icon: <AppstoreOutlined />,
  children: [
    {
      path: '/goods-receipt',
      key: 'goodsReceipt',
      label: 'Прием товара',
      icon: <DownloadOutlined />,
      element: <GoodsReceipt />,
      code: 'contr_newto_whr',
    },
    {
  path: '/invoices/:invoicenumber',
  element: <InvoiceDetailsPage />,
  key: 'invoiceDetails',
  code: 'invoice_details', // если хочешь ограничивать доступ по коду
},
    {
      path: '/goods-transfer',
      key: 'goodsTransfer',
      label: 'Перемещение товара',
      icon: <SwapOutlined />,
      element: <StockTransfer />,
      code: 'contr_move_between',
    },
    {
      path: '/goods-writeoff',
      key: 'goodsWriteoff',
      label: 'Списание товара',
      icon: <DeleteOutlined />,
      element: <GoodsWriteoffPage />,
      code: 'contr_removefrom_whr',
    },
    {
      path: '/barcode-print',
      key: 'barcodePrint',
      label: 'Печать штрих кода',
      icon: <BarcodeOutlined />,
      element: <BarcodePrintPage />,
      code: 'contr_barcode_print',
    },
    {
      path: '/weight-goods',
      key: 'weightGoods',
      label: 'Весовые товары',
      icon: <DashboardOutlined />,
      element: <WeightGoodsPage />,
      code: 'contr_weigh_prod',
    },
    {
      path: '/nomenclature',
      key: 'nomenclature',
      label: 'Товар',
      icon: <ProfileOutlined />,
      element: <ProductsPage />,
      code: 'contr_nomenclature',
    },
    /* {
      path: '/job-order',
      key: 'jobOrder',
      label: 'Наряд-заказ',
      icon: <FileTextOutlined />,
      //element: <JobOrderPage />,
      code: 'contr_reconciliation',
    }, */
    {
      path: '/inventory',
      key: 'inventory',
      label: 'Ревизия',
      icon: <AuditOutlined />,
      element: <RevisionPage />,
      code: 'contr_revision',
    },
    {
      path: '/orderproduct',
      key: 'orderproduct',
      label: 'Заказ товаров',
      icon: <ShoppingCartOutlined />,
      element: <WorkordersPage />,
      code: 'contr_reconciliation',
    },
  ],
},

  {
  key: 'administration',
  label: 'Администрирование',
  icon: <SettingOutlined />,
  code: 'administration',
  children: [
    {
      path: '/adminnews',
      key: 'adminnews',
      label: 'Новости',
      icon: <FileTextOutlined />,
      element: <AdminNews />,
      code: 'adminnews',
    },
    {
      path: '/admincompanysettings',
      key: 'admincompanysettings',
      label: 'Настройка компании',
      icon: <ClusterOutlined />,
      element: <CompanySettings />,
      code: 'admincompanysettings',
    },
    {
      path: '/admincompanycreate',
      key: 'admincompanycreate',
      label: 'Создание компании',
      icon: <ShopOutlined />,
      element: <RegisterPage />,
      code: 'admincompanycreate',
    },
    {
      path: '/admincompanylist',
      key: 'admincompanylist',
      label: 'Список компаний',
      icon: <ApartmentOutlined />,
      element: <CompanyList />,
      code: 'admincompanylist',
    },
    {
      path: '/admindownloadproduct',
      key: 'admindownloadproduct',
      label: 'Загрузить номенклатуру',
      icon: <InboxOutlined />,
      element: <ImpNomenclature />,
      code: 'admindownloadproduct',
    },
    {
      path: '/adminattribute',
      key: 'adminattribute',
      label: 'Атрибуты',
      icon: <AppstoreOutlined />,
      element: <UpdateAttributePage />,
      code: 'adminattribute',
    },
    {
      path: '/adminabrand',
      key: 'adminabrand',
      label: 'Бренды',
      icon: <TrademarkCircleOutlined />,
      element: <BrandList />,
      code: 'adminabrand',
    },
     
    {
      path: '/adminusers',
      key: 'adminusers',
      label: 'Пользователи',
      icon: <TeamOutlined />,
      element: <ERPUserListPage />,
      code: 'adminusers',
    },
{
      path: '/supportrequests',
      key: 'supportrequests',
      label: 'Вопросы пользователей',
      icon: <QuestionCircleOutlined />,
      element: <SupportAdminPage />,
      code: 'supportrequests',
    },
  ],
},  

{
  key: 'report',
  label: 'Отчёты',
  icon: <BarChartOutlined />,
  code: 'report',
  children: [
    {
      path: '/reportticet',
      key: 'reportticet',
      label: 'Продажи по чекам',
      icon: <FileTextOutlined />,
      element: <SalesByChecksReport />,
      code: 'rep_checks',
    },
    {
      path: '/soldProductsReport',
      key: 'soldProductsReport',
      label: 'Проданные товары',
      icon: <ShoppingOutlined />,
      element: <SoldProductsReport />,
      code: 'rep_prod_solds',
    },
    {
      path: '/invoicesHistoryReport',
      key: 'invoicesHistoryReport',
      label: 'История по накладным',
      icon: <ReconciliationOutlined />,
      element: <InvoicesHistoryReport />,
      code: 'whs_inv_history',
    },
     {
      path: '/revisionReport',
      key: 'revisionReport',
      label: 'Ревизия',
      icon: <AuditOutlined />,
      element: <RevisionReport />,
      code: 'whs_revision',
    },
     {
      path: '/stockreport',
      key: 'stockreport',
      label: 'Остаток на складе',
      icon: <DatabaseOutlined />,
      element: <StockReport />,
      code: 'whs_leftovers',
    },

    {
      path: '/debtreport',
      key: 'debtreport',
      label: 'Отчёт по долгам',
      icon: <DatabaseOutlined />,
      element: <DebtReport />,
      code: 'rep_debt_book',
    },

    {
      path: '/certificatesreport',
      key: 'certificatesreport',
      label: 'Отчёт по сертификатам',
      icon: <GiftOutlined />,
      element: <CertificateReport />,
      code: 'rep_debt_book',
    },
    
    ],
},  

{
      path: '/saleslist',
      key: 'saleslist',
      label: 'Продажи',
      icon: <ClusterOutlined />,
      element: <SalePage />,
      code: 'saleslist',
    },

    

/* {
      path: '/adminattribute/adminattributeadd',
      key: 'adminattributeadd',
      label: 'Добавить атрибут',
      icon: <ClusterOutlined />,
      element: <AddAttributeForm />,
      code: 'adminattributeadd',
    }, */
//Настройка компании settings
{
      path: '/admincompanylist/admincompanyinfo',
      key: 'admincompanyinfo',
      label: 'Информация о компании',
      icon: <ClusterOutlined />,
      element: <InfoCompanyPage />,
      code: 'admincompanyinfo',
    },

//////
//AiChatHistory

{
      path: '/aichathistory',
      key: 'aichathistory',
      label: 'История AI-помощника',
      icon: <RobotOutlined />,
      element: <AiChatHistory />,
      code: 'aichathistory',
    },

//////

  {
    path: '/news',
    element: <NewsPage />,
    key: 'news',
    code: 'news', // ← если новости открыты всем, можно не проверять
    icon: <BellOutlined />,
  },
  {
    path: '/news/:id',
    element: <NewsDetail />,
    key: 'news-detail',
    code: 'news-detail', // ← можно исключить в фильтрации
  },
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
    key: 'changePassword',
    code: 'change-password', // ← можно исключить из меню
    icon: <LockOutlined />,
  },
  {
  path: '/403',
  element: <AccessDeniedPage />,
  key: 'accessDenied',
},
];


/* import React from 'react';
import { HomeOutlined, DashboardOutlined, SettingOutlined, BellOutlined,LockOutlined, TagOutlined,GatewayOutlined,FileTextOutlined,SolutionOutlined
  ,BarChartOutlined,TeamOutlined
 } from '@ant-design/icons';
import HomePage from './components/HomePage';
import NewsPage from './components/NewsPage';
import NewsDetail from './components/NewsDetail';
import ChangePasswordPage from './components/ChangePasswordPage';
import CashBoxUser from './components/BusinessManagement/CashBoxUser';
import SalesPlan from './components/BusinessManagement/SalesPlan';
import UserProgram from './components/BusinessManagement/UserProgram';


export const routes = [
  {
    path: '/',
    element: <HomePage />,
    key: 'home',
    icon: <HomeOutlined />,
  },

  { 
            key: 'businessManagement', 
            label: 'Управление бизнесом', 
            icon: <BarChartOutlined />,
            children: [

                { path: '/portal-users', key: 'portalUsers', label: 'Пользователи портала', icon: <TeamOutlined />,element: <UserProgram />, code: 'setting_portal_user' },
                { path: '/cash-users', key: 'cashUsers', label: 'Пользователи касс', icon: <SolutionOutlined /> ,element: <CashBoxUser />, code: 'setting_user_chekout'},
                { path: '/sales-plan', key: 'salesPlan', label: 'План продаж', icon: <BarChartOutlined />,element: <SalesPlan />, code: 'setting_sales_plan' },
            ]
        },

  {
    path: '/news',
    element: <NewsPage />,
    key: 'news',
    icon: <BellOutlined />,
  },
  {
    path: '/news/:id',
    element: <NewsDetail />,
    key: 'news-detail',
  },

  {
    path: '/change-password',
    element: <ChangePasswordPage />,
    key: 'changePassword',
    icon: <LockOutlined />,
  },
]; */
