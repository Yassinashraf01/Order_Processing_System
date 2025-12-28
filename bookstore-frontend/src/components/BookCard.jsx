import React, { useState } from 'react';
import { ShoppingCart, Tag, Book as BookIcon, User as AuthorIcon, Building2, Check, Hash } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const BookCard = ({ book }) => {
    const { addToCart } = useCart();
    const { user } = useAuth();
    const [status, setStatus] = useState('idle'); // idle, adding, success

    const handleAddToCart = async () => {
        if (!user) {
            alert('Please login to add to cart');
            return;
        }
        setStatus('adding');
        const result = await addToCart(book.ISBN, 1);

        if (result.success) {
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
        } else {
            alert(result.message);
            setStatus('idle');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="card flex flex-col justify-between"
        >
            <div>
                <div className="h-48 bg-slate-700 rounded-lg mb-4 flex items-center justify-center text-slate-100 overflow-hidden p-4 relative border border-white/5">
                    <div className="flex items-center gap-2 justify-center text-center">
                        <BookIcon size={20} className="text-primary flex-shrink-0" />
                        <span className="font-bold text-lg leading-tight">{book.title}</span>
                    </div>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                    <h3 className="text-xl font-bold line-clamp-1">{book.title}</h3>
                </div>

                <div className="flex items-center gap-2 text-text-muted text-xs font-mono mb-2 bg-slate-800/50 w-fit px-2 py-0.5 rounded border border-border/50">
                    <Hash size={12} />
                    <span>{book.ISBN}</span>
                </div>

                <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
                    <AuthorIcon size={14} />
                    <span>{book.authors || 'Unknown Author'}</span>
                </div>

                <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
                    <Tag size={14} />
                    <span>{book.category}</span>
                </div>

                <div className="flex items-center gap-2 text-text-muted text-xs italic mb-2">
                    <Building2 size={12} />
                    <span>Published by: {book.publisher_name || 'N/A'}</span>
                </div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border/50">
                <span className="text-lg font-bold text-accent">${book.selling_price}</span>
                <button
                    onClick={handleAddToCart}
                    disabled={status !== 'idle' || book.quantity_in_stock <= 0}
                    className={`btn-primary flex items-center gap-2 text-sm transition-all ${book.quantity_in_stock <= 0 ? 'opacity-50 cursor-not-allowed grayscale' :
                        status === 'success' ? 'bg-accent text-white border-accent' : ''
                        }`}
                    style={{ padding: '0.4rem 0.8rem' }}
                >
                    {status === 'success' ? <Check size={14} /> : <ShoppingCart size={14} />}
                    {book.quantity_in_stock <= 0 ? 'Out of Stock' :
                        status === 'adding' ? 'Adding...' :
                            status === 'success' ? 'Added!' : 'Add to Cart'}
                </button>
            </div>

            {book.quantity_in_stock > 0 && book.quantity_in_stock < 10 && (
                <p className="text-xs text-error mt-2">Only {book.quantity_in_stock} left!</p>
            )}
        </motion.div>
    );
};

export default BookCard;
