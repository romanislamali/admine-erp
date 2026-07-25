import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, Mail, MapPin, ArrowLeft, Loader2, FileText, CreditCard, Coins, AlertCircle, X, Wallet, ReceiptText } from 'lucide-react';
import Table from '../components/Table';

interface Bill {
    id: number;
    contractor_id: number;
    contractor_name: string;
    project_id: number;
    project_name: string;
    amount: string | number;
    invoice_number: string;
    bill_date: string;
}

interface Payment {
    id: number;
    contractor_id: number;
    contractor_name: string;
    bill_id: number;
    bill_invoice: string;
    amount: string | number;
    payment_date: string;
}

interface Contractor {
    id: number;
    name: string;
    phone: string;
    email: string;
    address: string;
    total_bills: string | number;
    total_payments: string | number;
    balance: string | number;
}

export default function ContractorDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [contractor, setContractor] = useState<Contractor | null>(null);
    const [bills, setBills] = useState<Bill[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const [submittingBill, setSubmittingBill] = useState(false);
    const [submittingPayment, setSubmittingPayment] = useState(false);

    // Bill Form state
    const [billFormData, setBillFormData] = useState({
        contractor_id: '',
        project_id: '',
        amount: '',
        invoice_number: '',
        bill_date: ''
    });

    // Payment Form state
    const [paymentFormData, setPaymentFormData] = useState({
        contractor_id: '',
        bill_id: '',
        amount: '',
        payment_date: ''
    });

    const fetchData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError('');

            const [billsRes, paymentRes, contractorRes] = await Promise.all([
                fetch(`/api/bills?contractor_id=${id}`),
                fetch(`/api/payments?contractor_id=${id}`),
                fetch(`/api/contractors/${id}`)
            ]);

            if (!billsRes.ok || !paymentRes.ok || !contractorRes.ok) {
                throw new Error('Failed to load contractor details records');
            }

            const billsData = await billsRes.json();
            const paymentsData = await paymentRes.json();
            const contractorData = await contractorRes.json();

            setContractor(contractorData);
            setBills(billsData);
            setPayments(paymentsData);
        } catch (err: any) {
            setError(err.message || 'An error occurred while loading details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const formatCurrency = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num) || num === null || num === undefined) return '0';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(num);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Submit bill
    const handleBillSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!billFormData.contractor_id || !billFormData.amount.trim()) return;

        try {
            setSubmittingBill(true);
            const res = await fetch('/api/bills', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contractor_id: parseInt(billFormData.contractor_id),
                    project_id: billFormData.project_id ? parseInt(billFormData.project_id) : null,
                    amount: parseFloat(billFormData.amount),
                    invoice_number: billFormData.invoice_number || null,
                    bill_date: billFormData.bill_date || null
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create bill');
            }

            setBillFormData({
                contractor_id: '',
                project_id: '',
                amount: '',
                invoice_number: '',
                bill_date: ''
            });
            setIsBillModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to create bill');
        } finally {
            setSubmittingBill(false);
        }
    };


    // Submit payment
    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentFormData.contractor_id || !paymentFormData.amount.trim()) return;

        try {
            setSubmittingPayment(true);
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contractor_id: parseInt(paymentFormData.contractor_id),
                    bill_id: paymentFormData.bill_id ? parseInt(paymentFormData.bill_id) : null,
                    amount: parseFloat(paymentFormData.amount),
                    payment_date: paymentFormData.payment_date || null
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create payment');
            }

            setPaymentFormData({
                contractor_id: '',
                bill_id: '',
                amount: '',
                payment_date: ''
            });
            setIsPaymentModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to create payment');
        } finally {
            setSubmittingPayment(false);
        }
    };

    const columnsForBills = [
        {
            header: 'Invoice #',
            key: 'invoice_number',
            sortable: true,
            render: (b: Bill) => (
                <div className="font-mono">
                    <div className="font-semibold text-slate-900">{b.invoice_number || `INV-${b.id}`}</div>
                    <div className="text-[10px] text-slate-400">ID: #{b.id}</div>
                </div>
            )
        },
        {
            header: 'Associated Project',
            key: 'project_name',
            sortable: true,
            render: (b: Bill) => (
                <div>
                    {b.project_name ? (
                        <>
                            <div className="font-semibold text-slate-900">{b.project_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: #{b.project_id}</div>
                        </>
                    ) : (
                        <span className="text-slate-400 text-xs italic">N/A</span>
                    )}
                </div>
            )
        },
        {
            header: 'Invoice Date',
            key: 'bill_date',
            sortable: true,
            render: (b: Bill) => (
                <span className="font-medium text-slate-600 font-mono">
                    {formatDate(b.bill_date)}
                </span>
            )
        },
        {
            header: 'Amount',
            key: 'amount',
            align: 'right' as const,
            sortable: true,
            render: (b: Bill) => (
                <span className="font-bold text-slate-900">
                    {formatCurrency(b.amount)}
                </span>
            )
        }
    ];

    const columnsForPayments = [
        {
            header: 'Payment ID',
            key: 'id',
            sortable: true,
            render: (p: Payment) => (
                <div className="font-mono">
                    <div className="font-semibold text-slate-900">PAY-#{p.id}</div>
                </div>
            )
        },
        {
            header: 'Linked Invoice',
            key: 'bill_invoice',
            sortable: true,
            render: (p: Payment) => (
                <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                    <FileText size={12} className="text-slate-400" />
                    <span className="font-mono font-medium">{p.bill_invoice || `INV-${p.bill_id}`}</span>
                </div>
            )
        },
        {
            header: 'Payment Date',
            key: 'payment_date',
            sortable: true,
            render: (p: Payment) => (
                <span className="font-medium text-slate-600 font-mono">
                    {formatDate(p.payment_date)}
                </span>
            )
        },
        {
            header: 'Paid Amount',
            key: 'amount',
            align: 'right' as const,
            sortable: true,
            render: (p: Payment) => (
                <span className="font-semibold text-emerald-700">
                    {formatCurrency(p.amount)}
                </span>
            )
        }
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center py-40">
                <Loader2 className="animate-spin text-primary" size={36} />
            </div>
        );
    }

    if (error || !contractor) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => navigate('/contractors')}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-semibold mb-4"
                >
                    <ArrowLeft size={16} />
                    Back to Directory
                </button>
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-6 rounded-xl text-sm flex items-start gap-3">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <div>
                        <h4 className="font-bold text-rose-800">Error Loading Contractor</h4>
                        <p className="mt-1">{error || 'Contractor record not found or has been disabled.'}</p>
                    </div>
                </div>
            </div>
        );
    }

    const balanceNum = typeof contractor.balance === 'string' ? parseFloat(contractor.balance) : contractor.balance;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className='bg-white shadow-sm shadow-amber-100 p-5 rounded-xl'>
                {/* make three button in a single line, first button align will be left and rest of two button align will be right */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/contractors')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-semibold"
                    >
                        <ArrowLeft size={16} />
                        Back to Directory
                    </button>
                </div>

                {/* Contractor Overview Card */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mt-5">
                    <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                        <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                Contractor Profile
                            </span>
                            <h1 className="text-3xl font-bold text-slate-900 mt-1">{contractor.name}</h1>

                            <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                                {contractor.phone && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone size={14} className="text-slate-400" />
                                        <span>{contractor.phone}</span>
                                    </div>
                                )}
                                {contractor.email && (
                                    <div className="flex items-center gap-1.5">
                                        <Mail size={14} className="text-slate-400" />
                                        <span>{contractor.email}</span>
                                    </div>
                                )}
                                {contractor.address && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={14} className="text-slate-400" />
                                        <span>{contractor.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Summary Group */}
                        <div className="grid grid-cols-3 gap-4 lg:w-120 shrink-0">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1">
                                <div className="text-[10px] font-semibold uppercase text-slate-400 flex items-center gap-1">
                                    <FileText size={10} />
                                    Invoiced
                                </div>
                                <p className="text-sm font-bold text-slate-900">{formatCurrency(contractor.total_bills)}</p>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1">
                                <div className="text-[10px] font-semibold uppercase text-slate-400 flex items-center gap-1">
                                    <Coins size={10} />
                                    Paid
                                </div>
                                <p className="text-sm font-bold text-slate-900">{formatCurrency(contractor.total_payments)}</p>
                            </div>

                            <div className={`border rounded-xl p-3.5 space-y-1 ${balanceNum < 0
                                    ? 'bg-emerald-50/40 border-emerald-100 text-emerald-800'
                                    : balanceNum > 0
                                        ? 'bg-rose-50/40 border-rose-100 text-rose-800'
                                        : 'bg-slate-50 border-slate-100 text-slate-800'
                                }`}>
                                <div className="text-[10px] font-semibold uppercase opacity-75 flex items-center gap-1">
                                    <CreditCard size={10} />
                                    Balance
                                </div>
                                <p className="text-sm font-bold">{formatCurrency(Math.abs(balanceNum))}</p>
                                <div className="text-[8px] font-bold uppercase tracking-tight opacity-75">
                                    {balanceNum < 0 ? '(Advance)' : balanceNum > 0 ? '(Due)' : '(Settled)'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Ledger Split Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">

                    {/* Bills Column */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900">Invoices & Bills</h2>
                            <div className='flex items-center gap-2'>
                                <button
                                    onClick={() => setIsBillModalOpen(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <ReceiptText size={18} />
                                    Create Bill
                                </button>
                            </div>
                        </div>
                        <Table
                            data={bills}
                            columns={columnsForBills}
                            searchKeys={['invoice_number', 'project_name']}
                            searchPlaceholder="Search bills by invoice # or project..."
                            keyExtractor={(b) => b.id}
                            emptyMessage="No logged bills found for this contractor."
                        />
                    </div>

                    {/* Payments Column */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900">Payments Ledger</h2>
                            <div className='flex items-center gap-2'>
                                <button
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Wallet size={18} />
                                    Record Payment
                                </button>   
                            </div>
                        </div>
                        <Table
                            data={payments}
                            columns={columnsForPayments}
                            searchKeys={['bill_invoice']}
                            searchPlaceholder="Search payments by invoice ref..."
                            keyExtractor={(p) => p.id}
                            emptyMessage="No logged payments found for this contractor."
                        />
                    </div>

                </div>
            </div>


            {/* Create Bill Modal */}
            <AnimatePresence>
                {isBillModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsBillModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">Create Bill</h3>
                                <button
                                    onClick={() => setIsBillModalOpen(false)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleBillSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Contractor *</label>
                                    <select
                                        required
                                        value={contractor?.id}
                                        disabled
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                                    >
                                        <option value={contractor?.id}>{contractor?.name}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Project Link (Optional)</label>
                                    <select
                                        value={billFormData.project_id}
                                        disabled={!billFormData.contractor_id}
                                        onChange={(e) => setBillFormData({ ...billFormData, project_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white focus:disabled:bg-slate-100 disabled:opacity-65 transition-all text-slate-900"
                                    >
                                        <option value="">-- No Project Link --</option>
                                        {/* {filteredProjects.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name} (ID: #{p.id})</option>
                                        ))} */}
                                    </select>
                                    {!billFormData.contractor_id && (
                                        <p className="text-[10px] text-slate-400 mt-1">Please select a contractor to see their projects.</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Invoice Number</label>
                                        <input
                                            type="text"
                                            value={billFormData.invoice_number}
                                            onChange={(e) => setBillFormData({ ...billFormData, invoice_number: e.target.value })}
                                            placeholder="e.g. INV-9901"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Bill Date</label>
                                        <input
                                            type="date"
                                            value={billFormData.bill_date}
                                            onChange={(e) => setBillFormData({ ...billFormData, bill_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Invoice Amount *</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            value={billFormData.amount}
                                            onChange={(e) => setBillFormData({ ...billFormData, amount: e.target.value })}
                                            placeholder="0"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsBillModalOpen(false)}
                                        className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingBill}
                                        className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                                    >
                                        {submittingBill ? <Loader2 size={16} className="animate-spin" /> : 'Submit'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Payment Modal */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPaymentModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">Record Payment</h3>
                                <button
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handlePaymentSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Contractor *</label>
                                    <select
                                        required
                                        value={paymentFormData.contractor_id}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, contractor_id: e.target.value, bill_id: '' })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                                    >
                                        <option value="" disabled>-- Select Contractor --</option>
                                        {/* {contractors.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name} (ID: #{c.id})</option>
                                        ))} */}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Link to Invoice (Optional)</label>
                                    <select
                                        value={paymentFormData.bill_id}
                                        disabled={!paymentFormData.contractor_id}
                                        onChange={(e) => {
                                            const selectedBill = bills.find((b) => b.id === parseInt(e.target.value));
                                            setPaymentFormData({
                                                ...paymentFormData,
                                                bill_id: e.target.value,
                                                amount: selectedBill ? selectedBill.amount.toString() : paymentFormData.amount
                                            });
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white focus:disabled:bg-slate-100 disabled:opacity-65 transition-all text-slate-900"
                                    >
                                        <option value="">-- No Direct Link (Advance Payment) --</option>
                                        {/* {filteredBills.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.invoice_number || `INV-${b.id}`} ({formatCurrency(b.amount)})
                                            </option>
                                        ))} */}
                                    </select>
                                    {!paymentFormData.contractor_id && (
                                        <p className="text-[10px] text-slate-400 mt-1">Please select a contractor to view outstanding invoices.</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Payment Date</label>
                                        <input
                                            type="date"
                                            value={paymentFormData.payment_date}
                                            onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Paid Amount *</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            value={paymentFormData.amount}
                                            onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                            placeholder="0"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsPaymentModalOpen(false)}
                                        className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingPayment}
                                        className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                                    >
                                        {submittingPayment ? <Loader2 size={16} className="animate-spin" /> : 'Submit'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
