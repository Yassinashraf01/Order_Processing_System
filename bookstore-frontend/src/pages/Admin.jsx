import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
    PackagePlus,
    BarChart3,
    Users,
    TrendingUp,
    Search,
    RefreshCcw,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const Admin = () => {
    const [activeTab, setActiveTab] = useState('add');
    const [reports, setReports] = useState({
        topBooks: [],
        topCustomers: [],
        salesMonth: 0
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [pendingOrders, setPendingOrders] = useState([]);

    // Add/Edit Book Form State
    const [bookForm, setBookForm] = useState({
        ISBN: '', Title: '', Category: '', Authors: '',
        PublisherName: '', PublicationYear: '', Price: '', StockQuantity: ''
    });

    const fetchReports = async () => {
        setLoading(true);
        try {
            const [topBooks, topCustomers, salesMonth] = await Promise.all([
                api.get('/admin/reports/top-books'),
                api.get('/admin/reports/top-customers'),
                api.get('/admin/reports/sales/previous-month')
            ]);

            setReports({
                topBooks: topBooks.data.data || [],
                topCustomers: topCustomers.data.data || [],
                salesMonth: salesMonth.data.data?.total_sales || 0
            });
        } catch (error) {
            console.error('Failed to fetch reports', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingOrders = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/orders/pending');
            setPendingOrders(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch orders', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'reports') fetchReports();
        if (activeTab === 'orders') fetchPendingOrders();
    }, [activeTab]);

    const handleAddBook = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/books', bookForm);
            setMessage({ type: 'success', text: 'Book added successfully!' });
            setBookForm({
                ISBN: '', Title: '', Category: '', Authors: '',
                PublisherName: '', PublicationYear: '', Price: '', StockQuantity: ''
            });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to add book' });
        }
    };

    const handleUpdateStock = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/admin/books/${bookForm.ISBN}`, {
                quantity_in_stock: bookForm.StockQuantity
            });
            setMessage({ type: 'success', text: 'Stock updated successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update stock' });
        }
    };

    const handleFormSubmit = (e) => {
        if (activeTab === 'add') {
            handleAddBook(e);
        } else {
            handleUpdateStock(e);
        }
    };

    const handleEditSearch = async () => {
        if (!bookForm.ISBN) return;
        setLoading(true);
        try {
            const response = await api.get(`/books/isbn/${bookForm.ISBN}`);
            const book = response.data.book || response.data;
            if (book) {
                setBookForm({
                    ISBN: book.ISBN,
                    Title: book.title,
                    Category: book.category,
                    Authors: book.authors || '',
                    PublisherName: book.publisher_name || '',
                    PublicationYear: book.publication_year,
                    Price: book.selling_price,
                    StockQuantity: book.quantity_in_stock
                });

                if (book.quantity_in_stock < book.threshold) {
                    setMessage({
                        type: 'error',
                        text: 'Quantity in stock is less than threshold...Publisher order is waiting for confirmation'
                    });
                } else {
                    setMessage({ type: 'success', text: 'Book found and details loaded!' });
                }
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Book not found' });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmOrder = async (orderId) => {
        try {
            await api.post(`/admin/orders/${orderId}/confirm`);
            setMessage({ type: 'success', text: 'Order confirmed and stock updated!' });
            fetchPendingOrders();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to confirm order' });
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '5rem' }}>
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block">
                    Admin Dashboard
                </h1>
                <p className="text-text-muted">Manage inventory, handle publisher orders, and monitor performance.</p>
            </div>

            {/* Horizontal Navigation Tabs */}
            <div className="flex flex-wrap gap-4 mb-10 justify-center">
                {[
                    { id: 'add', label: 'Add Book', icon: PackagePlus },
                    { id: 'modify', label: 'Modify Book', icon: RefreshCcw },
                    { id: 'orders', label: 'Confirm Orders', icon: CheckCircle2 },
                    { id: 'reports', label: 'Sales Reports', icon: BarChart3 }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setMessage({ type: '', text: '' });
                            if (tab.id === 'add' || tab.id === 'modify') {
                                setBookForm({
                                    ISBN: '', Title: '', Category: '', Authors: '',
                                    PublisherName: '', PublicationYear: '', Price: '', StockQuantity: ''
                                });
                            }
                        }}
                        className={`px-6 py-4 rounded-2xl flex items-center gap-3 transition-all font-bold shadow-lg ${activeTab === tab.id
                            ? 'bg-primary text-white scale-105 ring-4 ring-primary/20'
                            : 'bg-bg-card hover:bg-slate-800 text-text-muted border border-border'
                            }`}
                    >
                        <tab.icon size={22} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="max-w-5xl mx-auto w-full">
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`mb-8 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success'
                            ? 'bg-accent/10 text-accent border border-accent/20'
                            : 'bg-error/10 text-error border border-error/20'
                            }`}
                    >
                        {message.type === 'success' ? <CheckCircle2 /> : <AlertCircle />}
                        <span>{message.text}</span>
                    </motion.div>
                )}

                {(activeTab === 'add' || activeTab === 'modify') && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold">{activeTab === 'add' ? 'Register New Book' : 'Update Existing Book'}</h2>
                            {activeTab === 'modify' && (
                                <div className="flex gap-2">
                                    <input
                                        placeholder="Enter ISBN to search"
                                        className="max-w-[200px]"
                                        value={bookForm.ISBN}
                                        onChange={e => setBookForm({ ...bookForm, ISBN: e.target.value })}
                                        style={{ height: '45px' }}
                                    />
                                    <button onClick={handleEditSearch} disabled={loading} className="btn-primary" style={{ height: '45px', padding: '0 1rem' }}>
                                        <Search size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-muted">ISBN</label>
                                {activeTab === 'modify' ? (
                                    <div className="p-4 bg-bg-card/50 rounded-xl border border-border text-text-muted font-mono">
                                        {bookForm.ISBN || '---'}
                                    </div>
                                ) : (
                                    <input required placeholder="978..." value={bookForm.ISBN} onChange={e => setBookForm({ ...bookForm, ISBN: e.target.value })} />
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-muted">Title</label>
                                {activeTab === 'modify' ? (
                                    <div className="p-4 bg-bg-card/50 rounded-xl border border-border text-text-muted font-bold">
                                        {bookForm.Title || '---'}
                                    </div>
                                ) : (
                                    <input required placeholder="Book Title" value={bookForm.Title} onChange={e => setBookForm({ ...bookForm, Title: e.target.value })} />
                                )}
                            </div>
                            {activeTab === 'add' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-text-muted">Category</label>
                                        <select required value={bookForm.Category} onChange={e => setBookForm({ ...bookForm, Category: e.target.value })}>
                                            <option value="">Select Category</option>
                                            <option value="Science">Science</option>
                                            <option value="Art">Art</option>
                                            <option value="Religion">Religion</option>
                                            <option value="History">History</option>
                                            <option value="Geography">Geography</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-text-muted">Authors (comma separated)</label>
                                        <input required value={bookForm.Authors} placeholder="Author Name(s)" onChange={e => setBookForm({ ...bookForm, Authors: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-text-muted">Publisher Name</label>
                                        <input required value={bookForm.PublisherName} placeholder="Publisher" onChange={e => setBookForm({ ...bookForm, PublisherName: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-text-muted">Publication Year</label>
                                        <input required type="number" value={bookForm.PublicationYear} onChange={e => setBookForm({ ...bookForm, PublicationYear: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-text-muted">Selling Price ($)</label>
                                        <input required type="number" step="0.01" value={bookForm.Price} onChange={e => setBookForm({ ...bookForm, Price: e.target.value })} />
                                    </div>
                                </>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-muted">{activeTab === 'add' ? 'Initial Stock' : 'Current Stock (Manual Decrease Only)'}</label>
                                <input required type="number" value={bookForm.StockQuantity} onChange={e => setBookForm({ ...bookForm, StockQuantity: e.target.value })} />
                            </div>
                            <div className="md:col-span-2 pt-4">
                                <button type="submit" className="btn-primary w-full py-4 font-bold text-lg shadow-lg">
                                    {activeTab === 'add' ? 'Add Book to Catalog' : 'Update Stock Quantity'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {activeTab === 'orders' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Pending Publisher Orders</h2>
                            <button onClick={fetchPendingOrders} className="p-2 hover:bg-bg-card rounded-full transition-colors text-primary">
                                <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {pendingOrders.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {pendingOrders.map((order) => (
                                    <div key={order.order_id} className="card flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 border-l-amber-500">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-bold uppercase">Order #{order.order_id}</span>
                                                <span className="text-text-muted text-xs">{new Date(order.order_date).toLocaleDateString()}</span>
                                            </div>
                                            <h3 className="text-lg font-bold">{order.title}</h3>
                                            <p className="text-sm text-text-muted">ISBN: {order.ISBN}</p>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-center">
                                                <p className="text-xs text-text-muted uppercase font-bold">Quantity</p>
                                                <p className="text-2xl font-black text-primary">+{order.quantity_ordered}</p>
                                            </div>
                                            <button
                                                onClick={() => handleConfirmOrder(order.order_id)}
                                                className="bg-accent hover:bg-accent/80 text-white p-3 rounded-xl shadow-lg shadow-accent/20 transition-all active:scale-95"
                                                title="Confirm Receipt"
                                            >
                                                <CheckCircle2 size={24} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="card text-center py-20 bg-bg-card/30 border-dashed border-2">
                                <AlertCircle size={48} className="mx-auto mb-4 text-text-muted opacity-20" />
                                <p className="text-text-muted text-lg">No pending orders found.</p>
                                <p className="text-text-muted/60 text-sm">Orders appear automatically when stock falls below threshold.</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'reports' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card border-l-4 border-l-primary flex flex-col justify-between py-6">
                                <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Last Month Sales</p>
                                <h3 className="text-4xl font-bold mt-2 text-primary">${reports.salesMonth.toFixed(2)}</h3>
                            </div>
                            <div className="card border-l-4 border-l-accent flex flex-col justify-between py-6">
                                <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Top Customer</p>
                                <h3 className="text-2xl font-bold mt-2 truncate">{reports.topCustomers[0]?.username || 'N/A'}</h3>
                            </div>
                            <div className="card border-l-4 border-l-amber-500 flex flex-col justify-between py-6">
                                <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Best Seller</p>
                                <h3 className="text-2xl font-bold mt-2 line-clamp-1">{reports.topBooks[0]?.title || 'N/A'}</h3>
                            </div>
                        </div>

                        {/* Lists */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="card">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <TrendingUp className="text-accent" />
                                    Top 10 Selling Books
                                </h3>
                                <div className="space-y-4">
                                    {reports.topBooks.map((book, i) => (
                                        <div key={i} className="flex justify-between items-center gap-4 py-3 border-b border-border last:border-0">
                                            <span className="font-medium line-clamp-1 flex-1">{book.title}</span>
                                            <span className="bg-primary/20 text-primary-hover px-3 py-1 rounded-full text-xs font-bold border border-primary/20">
                                                {book.total_sold} sold
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="card">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <Users className="text-primary" />
                                    Top 5 Customers
                                </h3>
                                <div className="space-y-4">
                                    {reports.topCustomers.map((cust, i) => (
                                        <div key={i} className="flex justify-between items-center gap-4 py-3 border-b border-border last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs uppercase">
                                                    {cust.username[0]}
                                                </div>
                                                <span className="font-medium">{cust.username}</span>
                                            </div>
                                            <span className="text-accent font-bold">
                                                ${cust.total_spent.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Admin;
