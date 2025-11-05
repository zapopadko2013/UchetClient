import React from 'react';

const AccessDeniedPage: React.FC = () => (
  <div style={{ padding: 20, textAlign: 'center' }}>
    <h1>403 — Доступ запрещён</h1>
    <p>У вас нет прав для просмотра этой страницы.</p>
  </div>
);

export default AccessDeniedPage;