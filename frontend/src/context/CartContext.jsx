import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

/** In-memory only, matching the original design — the cart is not persisted
 * across reloads (unlike language, user, testimonials, and courses). */
export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  const toggleCart = useCallback((id) => {
    setCart((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.concat([id])));
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart((prev) => prev.filter((x) => x !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);
  const inCart = useCallback((id) => cart.includes(id), [cart]);

  const value = useMemo(
    () => ({ cart, cartCount: cart.length, toggleCart, removeFromCart, clearCart, inCart }),
    [cart, toggleCart, removeFromCart, clearCart, inCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
