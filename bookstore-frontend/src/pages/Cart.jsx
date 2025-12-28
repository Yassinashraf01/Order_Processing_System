import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, ShoppingBag, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const Cart = () => {
    const { cart, removeFromCart, checkout } = useCart();
    const [checkingOut, setCheckingOut] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);

    const total = cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);

    const handleCheckout = async () => {
        setCheckingOut(true);
        const result = await checkout();
        if (result.success) {
            setOrderComplete(true);
        } else {
            alert(result.message);
        }
        setCheckingOut(false);
    };

    if (orderComplete) {
        return (
            <div className="container flex justify-center items-center py-20 text-center">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card max-w-md">
                    <div className="bg-accent/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="text-accent" size={48} />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Order Placed!</h2>
                    <p className="text-text-muted mb-8 text-lg">Your books are on their way. Thank you for shopping with us!</p>
                    <Link to="/" className="btn-primary inline-flex items-center gap-2">
                        Continue Shopping <ArrowRight size={18} />
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="container">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <ShoppingBag className="text-primary" />
                Your Shopping Cart
            </h1>

            {cart.length === 0 ? (
                <div className="card text-center py-20 bg-bg-card/50">
                    <p className="text-text-muted text-xl mb-6">Your cart is empty.</p>
                    <Link to="/" className="btn-primary">Go to Collection</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <AnimatePresence>
                            {cart.map((item) => (
                                <motion.div
                                    key={item.ISBN}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="card flex justify-between items-center"
                                >
                                    <div className="flex gap-4 items-center">
                                        <div className="w-16 h-20 bg-slate-700 rounded flex-shrink-0 flex items-center justify-center font-bold text-xs text-center p-1">
                                            {item.title}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg">{item.title}</h4>
                                            <p className="text-text-muted">Quantity: {item.quantity}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <span className="text-xl font-bold text-accent">${(item.selling_price * item.quantity).toFixed(2)}</span>
                                        <button
                                            onClick={() => removeFromCart(item.ISBN)}
                                            className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <div className="space-y-6">
                        <div className="card bg-primary/5 border-primary/20">
                            <h3 className="text-xl font-bold mb-6">Order Summary</h3>
                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between text-text-muted">
                                    <span>Subtotal</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-text-muted">
                                    <span>Shipping</span>
                                    <span className="text-accent font-medium">FREE</span>
                                </div>
                                <div className="pt-4 border-t border-border flex justify-between font-bold text-2xl">
                                    <span>Total</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={checkingOut}
                                className="btn-primary w-full py-4 text-lg font-bold flex justify-center items-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {checkingOut ? <Loader2 className="animate-spin" /> : 'Complete Checkout'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
