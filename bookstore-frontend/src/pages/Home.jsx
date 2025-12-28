import React, { useState, useEffect } from 'react';
import api from '../api/api';
import BookCard from '../components/BookCard';
import { Search, Loader2, BookOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Home = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchBooks = async () => {
        setLoading(true);
        try {
            let url = '/books';

            if (search) {
                url = `/books/global-search?query=${search}`;
            }

            const response = await api.get(url);
            const data = response.data;
            const bookList = data.books || (data.book ? [data.book] : (Array.isArray(data) ? data : []));
            setBooks(bookList);
        } catch (error) {
            console.error('Failed to fetch books', error);
            setBooks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchBooks();
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const handleClear = () => {
        setSearch('');
    };

    return (
        <div className="container">
            <div className="mb-12 text-center max-w-4xl mx-auto">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient leading-tight"
                >
                    Find Your Next Adventure
                </motion.h1>
                <p className="text-text-muted text-xl leading-relaxed">
                    Search across our entire catalog by Title, Author, ISBN, Publisher, or Category.
                </p>
            </div>

            {/* Expanded Universal Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-16 max-w-4xl mx-auto">
                <div className="relative flex-1 group">
                    <input
                        type="text"
                        placeholder="Search for books by Title, Author, ISBN, Publisher, or Category..."
                        className="px-6 pr-14 w-full h-16 text-xl border-none bg-slate-900/60 backdrop-blur-md rounded-full ring-1 ring-border focus:ring-2 focus:ring-primary transition-all shadow-2xl placeholder:text-text-muted/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-5 top-1\/2 -translate-y-1\/2 p-1.5 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={20} className="text-text-muted" />
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col justify-center items-center py-32 space-y-6">
                    <Loader2 className="animate-spin text-primary" size={72} />
                    <p className="text-text-muted text-lg animate-pulse font-medium">Scouring our library shelves...</p>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    {books.length > 0 ? (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                        >
                            {books.map((book) => (
                                <BookCard key={book.ISBN} book={book} />
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-32 card rounded-3xl border border-border/50 bg-slate-900/20 backdrop-blur-sm shadow-2xl max-w-2xl mx-auto"
                        >
                            <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                                <Search size={48} className="text-primary opacity-50" />
                            </div>
                            <h3 className="text-3xl font-bold mb-4">No match found</h3>
                            <p className="text-text-muted text-xl mb-10 max-w-sm mx-auto">
                                We couldn't find any books for "{search}". Try another keyword or browse all books.
                            </p>
                            <button
                                onClick={handleClear}
                                className="btn-primary py-4 px-10 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                            >
                                Show All Books
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            )
            }
        </div >
    );
};

export default Home;
