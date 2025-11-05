import { createContext, useContext } from 'react';

// Определяем тип для данных, которые будут храниться в контексте.
// В нашем случае это одна функция: onLogout.
interface AuthContextType {
  onLogout: () => void;
}

// Создаем контекст с начальным значением null.
// Указываем тип контекста, чтобы TypeScript мог проверять его.
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Хук для удобного доступа к контексту аутентификации.
 * Позволяет получить onLogout в любом дочернем компоненте.
 * @returns {AuthContextType} Объект с функцией onLogout.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;