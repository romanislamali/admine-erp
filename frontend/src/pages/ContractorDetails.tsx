import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, Mail, MapPin, ArrowLeft, Loader2, FileText, CreditCard, Coins, AlertCircle, X, Wallet, ReceiptText, Pencil, Trash2 } from 'lucide-react';
import Table from '../components/Table';
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';

interface Bill {
    id: string;
    contractor_id: string;
    contractor_name: string;
    project_id?: string | null;
    project_name?: string;
    amount: string | number;
    invoice_number: string;
    bill_date: string;
}

interface Payment {
    id: string;
    contractor_id: string;
    contractor_name: string;
    project_id?: string | null;
    project_name?: string;
    bill_id?: string | null;
    bill_invoice?: string;
    amount: string | number;
    payment_date: string;
}

interface Contractor {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    total_bills: string | number;
    total_payments: string | number;
    balance: string | number;
}

interface Project {
    id: string;
    name: string;
    contractor_id: string;
}

export default function ContractorDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showSuccess, showError, confirmSave, confirmDelete } = useModal();
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [contractor, setContractor] = useState<Contractor | null>(null);
    const [bills, setBills] = useState<Bill[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const [editingBillId, setEditingBillId] = useState<string | null>(null);
    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

    const [submittingBill, setSubmittingBill] = useState(false);
    const [submittingPayment, setSubmittingPayment] = useState(false);

    // Bill Form state
    const [billFormData, setBillFormData] = useState({
        contractor_id: id || '',
        project_id: '',
        amount: '',
        invoice_number: '',
        bill_date: ''
    });

    // Payment Form state
    const [paymentFormData, setPaymentFormData] = useState({
        contractor_id: id || '',
        project_id: '',
        bill_id: '',
        amount: '',
        payment_date: ''
    });

    const fetchData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError('');

            const [billsRes, paymentRes, contractorRes, projectsRes] = await Promise.all([
                fetch(`/api/bills?contractor_id=${id}`),
                fetch(`/api/payments?contractor_id=${id}`),
                fetch(`/api/contractors/${id}`),
                fetch('/api/projects')
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

            if (projectsRes.ok) {
                const projectsData = await projectsRes.json();
                setProjects(projectsData);
            }
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
        return new Intl.NumberFormat('en-IN', {
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

    // Bill modal actions
    const handleOpenCreateBill = () => {
        setEditingBillId(null);
        setBillFormData({
            contractor_id: id || '',
            project_id: '',
            amount: '',
            invoice_number: '',
            bill_date: ''
        });
        setIsBillModalOpen(true);
    };

    const handleCloseBillModal = () => {
        setIsBillModalOpen(false);
        setEditingBillId(null);
        setBillFormData({
            contractor_id: id || '',
            project_id: '',
            amount: '',
            invoice_number: '',
            bill_date: ''
        });
    };

    const handleEditBill = (b: Bill) => {
        setEditingBillId(b.id);
        setBillFormData({
            contractor_id: b.contractor_id ? b.contractor_id.toString() : (id || ''),
            project_id: b.project_id ? b.project_id.toString() : '',
            amount: b.amount ? b.amount.toString() : '',
            invoice_number: b.invoice_number || '',
            bill_date: b.bill_date ? new Date(b.bill_date).toISOString().split('T')[0] : ''
        });
        setIsBillModalOpen(true);
    };

    const handleDeleteBill = async (billId: string) => {
        const confirmed = await confirmDelete(
            'Delete Invoice Bill?',
            'Are you sure you want to remove this bill? This action is irreversible.'
        );
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/bills/${billId}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to delete bill');
            }

            await showSuccess(
                'Bill Deleted',
                'The invoice bill has been successfully removed.'
            );
            fetchData();
        } catch (err: any) {
            await showError(
                'Deletion Failed',
                err.message || 'We could not delete this bill record.'
            );
        }
    };

    const handleBillSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const contractorIdToUse = billFormData.contractor_id || id;
        if (!contractorIdToUse || !billFormData.amount.trim()) return;

        const actionText = editingBillId ? 'Save Bill Updates' : 'Create New Bill';
        const messageText = editingBillId
            ? 'Are you sure you want to save updates to this bill?'
            : 'Are you sure you want to log this new bill?';

        const confirmed = await confirmSave(actionText, messageText);
        if (!confirmed) return;

        try {
            setSubmittingBill(true);
            const url = editingBillId ? `/api/bills/${editingBillId}` : '/api/bills';
            const method = editingBillId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contractor_id: contractorIdToUse,
                    project_id: billFormData.project_id || null,
                    amount: parseFloat(billFormData.amount),
                    invoice_number: billFormData.invoice_number || null,
                    bill_date: billFormData.bill_date || null
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || `Failed to ${editingBillId ? 'update' : 'create'} bill`);
            }

            await showSuccess(
                editingBillId ? 'Bill Updated' : 'Bill Logged',
                editingBillId
                    ? 'Bill updates were successfully saved.'
                    : 'New bill has been recorded successfully.'
            );

            handleCloseBillModal();
            fetchData();
        } catch (err: any) {
            await showError(
                'Operation Failed',
                err.message || 'Unable to store changes. Please try again.'
            );
        } finally {
            setSubmittingBill(false);
        }
    };

    // Payment modal actions
    const handleOpenCreatePayment = () => {
        setEditingPaymentId(null);
        setPaymentFormData({
            contractor_id: id || '',
            project_id: '',
            bill_id: '',
            amount: '',
            payment_date: ''
        });
        setIsPaymentModalOpen(true);
    };

    const handleClosePaymentModal = () => {
        setIsPaymentModalOpen(false);
        setEditingPaymentId(null);
        setPaymentFormData({
            contractor_id: id || '',
            project_id: '',
            bill_id: '',
            amount: '',
            payment_date: ''
        });
    };

    const handleEditPayment = (p: Payment) => {
        setEditingPaymentId(p.id);
        setPaymentFormData({
            contractor_id: p.contractor_id ? p.contractor_id.toString() : (id || ''),
            project_id: p.project_id ? p.project_id.toString() : '',
            bill_id: p.bill_id ? p.bill_id.toString() : '',
            amount: p.amount ? p.amount.toString() : '',
            payment_date: p.payment_date ? new Date(p.payment_date).toISOString().split('T')[0] : ''
        });
        setIsPaymentModalOpen(true);
    };

    const handleDeletePayment = async (paymentId: string) => {
        const confirmed = await confirmDelete(
            'Delete Payment Record?',
            'Are you sure you want to remove this payment record? This action is irreversible.'
        );
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/payments/${paymentId}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to delete payment');
            }

            await showSuccess(
                'Payment Deleted',
                'The payment record has been successfully removed.'
            );
            fetchData();
        } catch (err: any) {
            await showError(
                'Deletion Failed',
                err.message || 'We could not delete this payment record.'
            );
        }
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const contractorIdToUse = paymentFormData.contractor_id || id;
        if (!contractorIdToUse || !paymentFormData.amount.trim()) return;

        const actionText = editingPaymentId ? 'Save Payment Updates' : 'Record Payment';
        const messageText = editingPaymentId
            ? 'Are you sure you want to save updates to this payment record?'
            : 'Are you sure you want to record this payment?';

        const confirmed = await confirmSave(actionText, messageText);
        if (!confirmed) return;

        try {
            setSubmittingPayment(true);
            const url = editingPaymentId ? `/api/payments/${editingPaymentId}` : '/api/payments';
            const method = editingPaymentId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contractor_id: contractorIdToUse,
                    project_id: paymentFormData.project_id || null,
                    bill_id: paymentFormData.bill_id || null,
                    amount: parseFloat(paymentFormData.amount),
                    payment_date: paymentFormData.payment_date || null
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || `Failed to ${editingPaymentId ? 'update' : 'create'} payment`);
            }

            await showSuccess(
                editingPaymentId ? 'Payment Updated' : 'Payment Recorded',
                editingPaymentId
                    ? 'Payment updates were successfully saved.'
                    : 'New payment record has been saved.'
            );

            handleClosePaymentModal();
            fetchData();
        } catch (err: any) {
            await showError(
                'Operation Failed',
                err.message || 'Unable to store changes. Please try again.'
            );
        } finally {
            setSubmittingPayment(false);
        }
    };

    const columnsForBills = [
        {
            header: 'Actions',
            key: 'actions',
            render: (b: Bill) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleEditBill(b)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                        title="Edit bill"
                    >
                        <Pencil size={14} />
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => handleDeleteBill(b.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                            title="Delete bill"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )
        },
        {
            header: 'Invoice',
            key: 'invoice_number',
            sortable: true,
            render: (b: Bill) => (
                <div className="font-mono">
                    <div className="font-semibold text-slate-900">{b.invoice_number || `INV-${b.id}`}</div>
                </div>
            )
        },
        {
            header: 'Project',
            key: 'project_name',
            sortable: true,
            render: (b: Bill) => (
                <div>
                    {b.project_name ? (
                        <>
                            <div className="font-semibold text-slate-900">{b.project_name}</div>
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
            header: 'Actions',
            key: 'actions',
            render: (p: Payment) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleEditPayment(p)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                        title="Edit payment"
                    >
                        <Pencil size={14} />
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => handleDeletePayment(p.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                            title="Delete payment"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )
        },
        {
            header: 'Project',
            key: 'project_name',
            sortable: true,
            render: (p: Payment) => {
                const project = projects.find(pr => pr.id === p.project_id);
                const nameToDisplay = p.project_name || project?.name || (p.project_id ? `PROJ-${p.project_id}` : null);
                return (
                    <div>
                        {nameToDisplay ? (
                            <div className="items-center gap-1.5 text-slate-600 text-xs">
                                <span className="font-mono font-medium">{nameToDisplay}</span>
                            </div>
                        ) : (
                            <span className="text-slate-400 text-xs italic">N/A</span>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Linked Invoice',
            key: 'bill_invoice',
            sortable: true,
            render: (p: Payment) => (
                <div className="items-center gap-1.5 text-slate-600 text-xs">
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
    const filteredProjects = projects.filter((p) => p.contractor_id === contractor.id);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className='bg-white shadow-sm shadow-amber-100 p-5 rounded-xl'>
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/contractors')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-semibold"
                    >
                        <ArrowLeft size={16} />
                        Back to Directory
                    </button>
                </div>

                {/* Contractor Overview Card (60 / 40 Split) */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 sm:p-6 mt-5 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

                        {/* Left Section (60% Width on Desktop) */}
                        <div className="lg:col-span-3 min-w-0 flex flex-col items-start gap-3">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                Contractor Profile
                            </span>

                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words w-full">
                                {contractor.name}
                            </h1>

                            <div className="flex flex-row flex-wrap items-center gap-y-2 gap-x-4 sm:gap-x-6 text-xs sm:text-sm text-slate-500 pt-1 w-full">
                                {contractor.phone && (
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Phone size={15} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{contractor.phone}</span>
                                    </div>
                                )}

                                {contractor.email && (
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Mail size={15} className="text-slate-400 shrink-0" />
                                        <span className="truncate break-all">{contractor.email}</span>
                                    </div>
                                )}

                                {contractor.address && (
                                    <div className="flex items-center gap-2 min-w-0">
                                        <MapPin size={15} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{contractor.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Section / Side-by-Side Stats Cards (40% Width on Desktop) */}
                        <div className="lg:col-span-2 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">

                            {/* Invoiced Card */}
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between min-w-0">
                                <div className="text-[11px] font-semibold uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                                    <FileText size={14} className="shrink-0" />
                                    <span className="truncate">Invoiced</span>
                                </div>
                                <div className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 break-all leading-tight">
                                    {formatCurrency(contractor.total_bills)}
                                </div>
                            </div>

                            {/* Paid Card */}
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between min-w-0">
                                <div className="text-[11px] font-semibold uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                                    <Coins size={14} className="shrink-0" />
                                    <span className="truncate">Paid</span>
                                </div>
                                <div className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 break-all leading-tight">
                                    {formatCurrency(contractor.total_payments)}
                                </div>
                            </div>

                            {/* Balance Card */}
                            <div className={`border rounded-xl p-3 flex flex-col justify-between min-w-0 ${balanceNum < 0
                                ? 'bg-emerald-50/40 border-emerald-100 text-emerald-800'
                                : balanceNum > 0
                                    ? 'bg-rose-50/40 border-rose-100 text-rose-800'
                                    : 'bg-slate-50 border-slate-100 text-slate-800'
                                }`}>
                                <div className="text-[11px] font-semibold uppercase opacity-75 flex items-center gap-1.5 mb-2">
                                    <CreditCard size={14} className="shrink-0" />
                                    <span className="truncate">Balance</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm sm:text-base lg:text-lg font-bold break-all leading-tight">
                                        {formatCurrency(Math.abs(balanceNum))}
                                    </div>
                                    <div className="text-[10px] font-bold uppercase tracking-tight opacity-75 truncate">
                                        {balanceNum < 0 ? '(Advance)' : balanceNum > 0 ? '(Due)' : '(Settled)'}
                                    </div>
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
                            <h2 className="text-lg font-bold text-slate-900">Billing & Invoices</h2>
                            <div className='flex items-center gap-2'>
                                <button
                                    onClick={handleOpenCreateBill}
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
                                    onClick={handleOpenCreatePayment}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Wallet size={18} />
                                    New Payment
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

            {/* Create/Edit Bill Modal */}
            <AnimatePresence>
                {isBillModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseBillModal}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">
                                    {editingBillId ? 'Edit Bill' : 'Create Bill'}
                                </h3>
                                <button
                                    onClick={handleCloseBillModal}
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
                                        onChange={(e) => setBillFormData({ ...billFormData, project_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white focus:disabled:bg-slate-100 disabled:opacity-65 transition-all text-slate-900"
                                    >
                                        <option value="">-- No Project Link --</option>
                                        {filteredProjects.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
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
                                        onClick={handleCloseBillModal}
                                        className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingBill}
                                        className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                                    >
                                        {submittingBill ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : editingBillId ? (
                                            'Save Changes'
                                        ) : (
                                            'Submit'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create/Edit Payment Modal */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClosePaymentModal}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">
                                    {editingPaymentId ? 'Edit Payment' : 'New Payment'}
                                </h3>
                                <button
                                    onClick={handleClosePaymentModal}
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
                                        value={paymentFormData.project_id}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, project_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                                    >
                                        <option value="">-- No Project Link --</option>
                                        {filteredProjects.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Link to Invoice (Optional)</label>
                                    <select
                                        value={paymentFormData.bill_id}
                                        onChange={(e) => {
                                            const selectedBill = bills.find((b) => b.id === e.target.value);
                                            setPaymentFormData({
                                                ...paymentFormData,
                                                bill_id: e.target.value,
                                                amount: selectedBill ? selectedBill.amount.toString() : paymentFormData.amount
                                            });
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white focus:disabled:bg-slate-100 disabled:opacity-65 transition-all text-slate-900"
                                    >
                                        <option value="">-- No Direct Link (Advance Payment) --</option>
                                        {bills.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.invoice_number || `INV-${b.id}`} ({formatCurrency(b.amount)})
                                            </option>
                                        ))}
                                    </select>
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
                                        onClick={handleClosePaymentModal}
                                        className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingPayment}
                                        className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                                    >
                                        {submittingPayment ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : editingPaymentId ? (
                                            'Save Changes'
                                        ) : (
                                            'Submit'
                                        )}
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
