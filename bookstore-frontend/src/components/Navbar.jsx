import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, LogOut, User, BookOpen, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
    const { user, logout, isAdmin, loading } = useAuth();
    const { totalItems } = useCart();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="glass sticky top-0 z-50 py-4 mb-8">
            <div className="container flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold text-primary flex items-center gap-2">
                    <BookOpen size={28} />
                    <span>BookStore</span>
                </Link>

                <div className="flex items-center gap-6">
                    <Link to="/" className="hover:text-primary transition-colors">Browse</Link>

                    {!loading && (
                        user ? (
                            <>
                                {isAdmin && (
                                    <Link to="/admin" className="flex items-center gap-1 hover:text-accent">
                                        <LayoutDashboard size={20} />
                                        <span>Admin</span>
                                    </Link>
                                )}

                                <Link to="/cart" className="relative hover:text-primary p-2 transition-all active:scale-90 flex items-center justify-center">
                                    <ShoppingCart size={30} />
                                    {totalItems > 0 && (
                                        <span className="absolute bg-primary text-white text-[10px] font-extrabold rounded-full min-w-[1.2rem] h-[1.2rem] flex items-center justify-center border-2 border-bg-main shadow-lg" style={{ top: '-4px', right: '-4px' }}>
                                            {totalItems}
                                        </span>
                                    )}
                                </Link>

                                <Link to="/profile" className="hover:text-primary">
                                    <User size={24} />
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="text-error flex items-center gap-1 hover:opacity-80"
                                >
                                    <LogOut size={20} />
                                    <span>Logout</span>
                                </button>
                            </>
                        ) : (
                            <div className="flex gap-4">
                                <Link to="/login" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Login</Link>
                                <Link to="/register" className="hover:text-primary transition-colors py-2">Sign Up</Link>
                            </div>
                        )
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
