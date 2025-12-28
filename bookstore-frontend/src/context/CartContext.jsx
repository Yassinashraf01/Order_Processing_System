import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);
    const { user } = useAuth();

    const fetchCart = async () => {
        if (!user) return;
        try {
            const response = await api.get('/customer/cart');
            setCart(response.data.items || []);
        } catch (error) {
            console.error('Failed to fetch cart', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchCart();
        } else {
            setCart([]);
        }
    }, [user]);

    const addToCart = async (isbn, quantity = 1) => {
        try {
            await api.post('/customer/cart/add', { isbn, quantity });
            await fetchCart();
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Failed to add to cart' };
        }
    };

    const removeFromCart = async (isbn) => {
        try {
            await api.delete('/customer/cart/remove', { data: { isbn } });
            await fetchCart();
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Failed to remove from cart' };
        }
    };

    const clearCart = async () => {
        try {
            await api.delete('/customer/cart/clear');
            setCart([]);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Failed to clear cart' };
        }
    };

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const checkout = async () => {
        try {
            await api.post('/customer/checkout');
            await clearCart(); // Ensure cart is cleared via its dedicated endpoint
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Checkout failed' };
        }
    };

    return (
        <CartContext.Provider value={{ cart, totalItems, addToCart, removeFromCart, clearCart, checkout, fetchCart }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
