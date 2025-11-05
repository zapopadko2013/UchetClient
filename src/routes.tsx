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
  AuditOutlined,
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



export const routes = [
  {
    path: '/',
    element: <HomePage />,
    key: 'home',
    code: 'home', // ← даже если доступ всегда открыт — для единообразия
    icon: <HomeOutlined />,
  },
  {
    key: 'businessManagement',
    label: 'Управление бизнесом',
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
      //element: <BarcodePrintPage />,
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
    {
      path: '/job-order',
      key: 'jobOrder',
      label: 'Наряд-заказ',
      icon: <FileTextOutlined />,
      //element: <JobOrderPage />,
      code: 'contr_reconciliation',
    },
    {
      path: '/inventory',
      key: 'inventory',
      label: 'Ревизия',
      icon: <AuditOutlined />,
      //element: <InventoryPage />,
      code: 'contr_revision',
    },
  ],
},



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