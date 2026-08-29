import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Phone, Mail, MapPin, ArrowLeft, Loader2, FileText, CreditCard, Coins, AlertCircle, X,
    Wallet, ReceiptText, Pencil, Trash2, ChevronDown, ShoppingCart, ListChecks, Plus,
    CheckCircle2, Lock, Landmark, MinusCircle
} from 'lucide-react';
import Table from '../components/Table';
import Dropdown from '../components/Dropdown';
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';

interface Client {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    total_billed: string | number;
    total_advance_deduction: string | number;
    total_received: string | number;
    total_due: string | number;
}

interface Project {
    id: string;
    name: string;
}

interface ClientPO {
    id: string;
    client_id: string;
    po_number: string;
    po_date: string | null;
    po_amount: string | number | null;
    description: string | null;
}

interface ClientBill {
    id: string;
    client_id: string;
    po_id: string | null;
    po_number?: string;
    project_id: string | null;
    project_name?: string;
    bill_number: string | null;
    gross_amount: string | number;
    advance_deduction: string | number;
    net_payable: string | number;
    bill_date: string;
    area: string | null;
    remarks: string | null;
}

interface ClientBillSchedule {
    id: string;
    bill_id: string;
    installment_label: string;
    percentage: string | number | null;
    expected_amount: string | number;
    received_amount: string | number;
    status: 'DUE' | 'APPROVED' | 'PAID';
    due_date: string | null;
}

interface ClientPayment {
    id: string;
    client_id: string;
    bill_id: string | null;
    bill_number?: string;
    schedule_id: string | null;
    installment_label?: string;
    amount: string | number;
    payment_date: string;
    bank_name: string | null;
    advice_reference_number: string | null;
    remarks: string | null;
}

interface ScheduleRow {
    installment_label: string;
    percentage: string;
    expected_amount: string;
    due_date: string;
}

const PRESETS: { key: string; label: string; splits: number[] }[] = [
    { key: 'FULL', label: '100%', splits: [100] },
    { key: '80-20', label: '80 / 20', splits: [80, 20] },
    { key: '50-25-25', label: '50 / 25 / 25', splits: [50, 25, 25] },
];

export default function ClientDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showSuccess, showError, confirmDelete } = useModal();
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [client, setClient] = useState<Client | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [billsForDropdown, setBillsForDropdown] = useState<ClientBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Purchase Orders
    const [pos, setPOs] = useState<ClientPO[]>([]);
    const [posTableLoading, setPOsTableLoading] = useState(false);
    const [totalPORecords, setTotalPORecords] = useState(0);
    const [posLazyParams, setPOsLazyParams] = useState({ page: 1, limit: 5, search: '', sortField: null as string | null, sortOrder: null as 'asc' | 'desc' | null });
    const [posRefreshTrigger, setPOsRefreshTrigger] = useState(0);
    const refreshPOs = () => setPOsRefreshTrigger((p) => p + 1);

    const [isPOModalOpen, setIsPOModalOpen] = useState(false);
    const [editingPOId, setEditingPOId] = useState<string | null>(null);
    const [submittingPO, setSubmittingPO] = useState(false);
    const [poFormData, setPOFormData] = useState({ po_number: '', po_date: '', po_amount: '', description: '' });

    // Bills
    const [bills, setBills] = useState<ClientBill[]>([]);
    const [billsTableLoading, setBillsTableLoading] = useState(false);
    const [totalBillRecords, setTotalBillRecords] = useState(0);
    const [billsLazyParams, setBillsLazyParams] = useState({ page: 1, limit: 5, search: '', sortField: null as string | null, sortOrder: null as 'asc' | 'desc' | null });
    const [billsRefreshTrigger, setBillsRefreshTrigger] = useState(0);
    const refreshBills = () => setBillsRefreshTrigger((p) => p + 1);

    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [editingBillId, setEditingBillId] = useState<string | null>(null);
    const [billLocked, setBillLocked] = useState(false);
    const [submittingBill, setSubmittingBill] = useState(false);
    const [billFormData, setBillFormData] = useState({
        po_id: '', project_id: '', bill_number: '', gross_amount: '', advance_deduction: '', bill_date: '', area: '', remarks: ''
    });
    const [schedules, setSchedules] = useState<ScheduleRow[]>([
        { installment_label: 'Full Payment (100%)', percentage: '100', expected_amount: '', due_date: '' }
    ]);

    // Milestones view modal
    const [isMilestonesModalOpen, setIsMilestonesModalOpen] = useState(false);
    const [milestonesBill, setMilestonesBill] = useState<ClientBill | null>(null);
    const [milestoneSchedules, setMilestoneSchedules] = useState<ClientBillSchedule[]>([]);
    const [milestonesLoading, setMilestonesLoading] = useState(false);

    // Payments
    const [payments, setPayments] = useState<ClientPayment[]>([]);
    const [paymentsTableLoading, setPaymentsTableLoading] = useState(false);
    const [totalPaymentRecords, setTotalPaymentRecords] = useState(0);
    const [paymentsLazyParams, setPaymentsLazyParams] = useState({ page: 1, limit: 5, search: '', sortField: null as string | null, sortOrder: null as 'asc' | 'desc' | null });
    const [paymentsRefreshTrigger, setPaymentsRefreshTrigger] = useState(0);
    const refreshPayments = () => setPaymentsRefreshTrigger((p) => p + 1);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [paymentFormData, setPaymentFormData] = useState({
        bill_id: '', schedule_id: '', amount: '', payment_date: '', bank_name: '', advice_reference_number: '', remarks: ''
    });
    const [paymentScheduleOptions, setPaymentScheduleOptions] = useState<ClientBillSchedule[]>([]);

    const fetchClientData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError('');

            const [clientRes, projectsRes, billsDropdownRes] = await Promise.all([
                fetch(`/api/clients/${id}`),
                fetch('/api/projects'),
                fetch(`/api/client-bills?client_id=${id}`)
            ]);

            if (!clientRes.ok) throw new Error('Failed to load client details');

            const clientData = await clientRes.json();
            setClient(clientData);

            if (projectsRes.ok) setProjects(await projectsRes.json());
            if (billsDropdownRes.ok) setBillsForDropdown(await billsDropdownRes.json());
        } catch (err: any) {
            setError(err.message || 'An error occurred while loading details');
        } finally {
            setLoading(false);
        }
    };

    const fetchPOs = async (params: typeof posLazyParams) => {
        if (!id) return;
        try {
            setPOsTableLoading(true);
            const query = new URLSearchParams({
                client_id: id, page: params.page.toString(), limit: params.limit.toString(), search: params.search,
                ...(params.sortField ? { sortField: params.sortField } : {}),
                ...(params.sortOrder ? { sortOrder: params.sortOrder } : {})
            });
            const res = await fetch(`/api/client-pos?${query.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch purchase orders');
            const resData = await res.json();
            setPOs(resData.data);
            setTotalPORecords(resData.total);
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching purchase orders');
        } finally {
            setPOsTableLoading(false);
        }
    };

    const fetchBills = async (params: typeof billsLazyParams) => {
        if (!id) return;
        try {
            setBillsTableLoading(true);
            const query = new URLSearchParams({
                client_id: id, page: params.page.toString(), limit: params.limit.toString(), search: params.search,
                ...(params.sortField ? { sortField: params.sortField } : {}),
                ...(params.sortOrder ? { sortOrder: params.sortOrder } : {})
            });
            const res = await fetch(`/api/client-bills?${query.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch bills');
            const resData = await res.json();
            setBills(resData.data);
            setTotalBillRecords(resData.total);
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching bills');
        } finally {
            setBillsTableLoading(false);
        }
    };

    const fetchPayments = async (params: typeof paymentsLazyParams) => {
        if (!id) return;
        try {
            setPaymentsTableLoading(true);
            const query = new URLSearchParams({
                client_id: id, page: params.page.toString(), limit: params.limit.toString(), search: params.search,
                ...(params.sortField ? { sortField: params.sortField } : {}),
                ...(params.sortOrder ? { sortOrder: params.sortOrder } : {})
            });
            const res = await fetch(`/api/client-payments?${query.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch payments');
            const resData = await res.json();
            setPayments(resData.data);
            setTotalPaymentRecords(resData.total);
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching payments');
        } finally {
            setPaymentsTableLoading(false);
        }
    };

    useEffect(() => { fetchClientData(); }, [id]);
    useEffect(() => { fetchPOs(posLazyParams); }, [id, posLazyParams, posRefreshTrigger]);
    useEffect(() => { fetchBills(billsLazyParams); }, [id, billsLazyParams, billsRefreshTrigger]);
    useEffect(() => { fetchPayments(paymentsLazyParams); }, [id, paymentsLazyParams, paymentsRefreshTrigger]);

    const formatCurrency = (val: string | number | null | undefined) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (num === null || num === undefined || isNaN(num)) return '0';
        return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // ---------------- Purchase Orders ----------------

    const handleOpenCreatePO = () => {
        setEditingPOId(null);
        setPOFormData({ po_number: '', po_date: '', po_amount: '', description: '' });
        setIsPOModalOpen(true);
    };

    const handleClosePOModal = () => {
        setIsPOModalOpen(false);
        setEditingPOId(null);
        setPOFormData({ po_number: '', po_date: '', po_amount: '', description: '' });
    };

    const handleEditPO = (po: ClientPO) => {
        setEditingPOId(po.id);
        setPOFormData({
            po_number: po.po_number || '',
            po_date: po.po_date ? new Date(po.po_date).toISOString().split('T')[0] : '',
            po_amount: po.po_amount ? po.po_amount.toString() : '',
            description: po.description || ''
        });
        setIsPOModalOpen(true);
    };

    const handleDeletePO = async (poId: string) => {
        const confirmed = await confirmDelete('Delete Purchase Order?', 'Are you sure you want to remove this PO? This action is irreversible.');
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/client-pos/${poId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to delete purchase order');
            refreshPOs();
            await Promise.race([
                showSuccess('Purchase Order Deleted', 'The PO has been successfully removed.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        } catch (err: any) {
            await Promise.race([
                showError('Deletion Failed', err.message || 'We could not delete this PO.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        }
    };

    const handlePOSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !poFormData.po_number.trim()) return;
        const isEditing = Boolean(editingPOId);

        try {
            setSubmittingPO(true);
            const url = editingPOId ? `/api/client-pos/${editingPOId}` : '/api/client-pos';
            const method = editingPOId ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: id,
                    po_number: poFormData.po_number,
                    po_date: poFormData.po_date || null,
                    po_amount: poFormData.po_amount ? parseFloat(poFormData.po_amount) : null,
                    description: poFormData.description || null
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} purchase order`);

            handleClosePOModal();
            setSubmittingPO(false);
            refreshPOs();

            await Promise.race([
                showSuccess(isEditing ? 'PO Updated' : 'PO Created', isEditing ? 'Purchase order updates were saved.' : 'New purchase order recorded.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        } catch (err: any) {
            setSubmittingPO(false);
            await Promise.race([
                showError('Operation Failed', err.message || 'Unable to store changes. Please try again.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        }
    };

    // ---------------- Bills & Milestones ----------------

    const netPayable = (Number(billFormData.gross_amount) || 0) - (Number(billFormData.advance_deduction) || 0);
    const scheduleTotal = schedules.reduce((sum, r) => sum + (parseFloat(r.expected_amount) || 0), 0);
    const isBalanced = netPayable > 0 && Math.abs(scheduleTotal - netPayable) < 0.01;

    const recomputeFromNet = (newNet: number, rows: ScheduleRow[]) =>
        rows.map((r) => {
            const pct = parseFloat(r.percentage);
            if (isNaN(pct)) return r;
            return { ...r, expected_amount: newNet > 0 ? (newNet * pct / 100).toFixed(2) : '' };
        });

    const handleGrossChange = (value: string) => {
        const gross = parseFloat(value) || 0;
        const advance = parseFloat(billFormData.advance_deduction) || 0;
        setBillFormData({ ...billFormData, gross_amount: value });
        setSchedules((prev) => recomputeFromNet(gross - advance, prev));
    };

    const handleAdvanceChange = (value: string) => {
        const advance = parseFloat(value) || 0;
        const gross = parseFloat(billFormData.gross_amount) || 0;
        setBillFormData({ ...billFormData, advance_deduction: value });
        setSchedules((prev) => recomputeFromNet(gross - advance, prev));
    };

    const applyPreset = (splits: number[]) => {
        const ordinal = ['1st', '2nd', '3rd', '4th', '5th'];
        setSchedules(splits.map((pct, i) => ({
            installment_label: splits.length === 1 ? 'Full Payment (100%)' : `${ordinal[i] || `${i + 1}th`} Installment (${pct}%)`,
            percentage: String(pct),
            expected_amount: netPayable > 0 ? (netPayable * pct / 100).toFixed(2) : '',
            due_date: ''
        })));
    };

    const updateRow = (idx: number, field: keyof ScheduleRow, value: string) => {
        setSchedules((prev) => prev.map((r, i) => {
            if (i !== idx) return r;
            if (field === 'percentage') {
                const pct = parseFloat(value);
                return { ...r, percentage: value, expected_amount: !isNaN(pct) && netPayable > 0 ? (netPayable * pct / 100).toFixed(2) : r.expected_amount };
            }
            if (field === 'expected_amount') {
                const amt = parseFloat(value);
                const pct = !isNaN(amt) && netPayable > 0 ? ((amt / netPayable) * 100).toFixed(2) : r.percentage;
                return { ...r, expected_amount: value, percentage: pct };
            }
            return { ...r, [field]: value };
        }));
    };

    const addScheduleRow = () => setSchedules((prev) => [...prev, { installment_label: `Installment ${prev.length + 1}`, percentage: '', expected_amount: '', due_date: '' }]);
    const removeScheduleRow = (idx: number) => setSchedules((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

    const resetBillForm = () => {
        setBillFormData({ po_id: '', project_id: '', bill_number: '', gross_amount: '', advance_deduction: '', bill_date: '', area: '', remarks: '' });
        setSchedules([{ installment_label: 'Full Payment (100%)', percentage: '100', expected_amount: '', due_date: '' }]);
        setBillLocked(false);
    };

    const handleOpenCreateBill = () => {
        setEditingBillId(null);
        resetBillForm();
        setIsBillModalOpen(true);
    };

    const handleCloseBillModal = () => {
        setIsBillModalOpen(false);
        setEditingBillId(null);
        resetBillForm();
    };

    const handleEditBill = async (b: ClientBill) => {
        setEditingBillId(b.id);
        setBillFormData({
            po_id: b.po_id || '',
            project_id: b.project_id || '',
            bill_number: b.bill_number || '',
            gross_amount: b.gross_amount ? b.gross_amount.toString() : '',
            advance_deduction: b.advance_deduction ? b.advance_deduction.toString() : '0',
            bill_date: b.bill_date ? new Date(b.bill_date).toISOString().split('T')[0] : '',
            area: b.area || '',
            remarks: b.remarks || ''
        });

        try {
            const [schedulesRes, paymentsRes] = await Promise.all([
                fetch(`/api/client-bill-schedules?bill_id=${b.id}`),
                fetch(`/api/client-payments?client_id=${id}`)
            ]);
            const schedulesData: ClientBillSchedule[] = schedulesRes.ok ? await schedulesRes.json() : [];
            const paymentsData: ClientPayment[] = paymentsRes.ok ? await paymentsRes.json() : [];

            setSchedules(schedulesData.length > 0 ? schedulesData.map((s) => ({
                installment_label: s.installment_label,
                percentage: s.percentage !== null ? s.percentage.toString() : '',
                expected_amount: s.expected_amount.toString(),
                due_date: s.due_date ? new Date(s.due_date).toISOString().split('T')[0] : ''
            })) : [{ installment_label: 'Full Payment (100%)', percentage: '100', expected_amount: '', due_date: '' }]);

            setBillLocked(paymentsData.some((p) => p.bill_id === b.id));
        } catch {
            setBillLocked(false);
        }

        setIsBillModalOpen(true);
    };

    const handleDeleteBill = async (billId: string) => {
        const confirmed = await confirmDelete('Delete Bill?', 'Are you sure you want to remove this bill? This action is irreversible.');
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/client-bills/${billId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to delete bill');
            refreshBills();
            fetchClientData();
            await Promise.race([
                showSuccess('Bill Deleted', 'The bill has been successfully removed.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        } catch (err: any) {
            await Promise.race([
                showError('Deletion Failed', err.message || 'We could not delete this bill.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        }
    };

    const handleBillSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !billFormData.gross_amount) return;
        if (!billLocked && !isBalanced) return;

        const isEditing = Boolean(editingBillId);

        try {
            setSubmittingBill(true);
            const url = editingBillId ? `/api/client-bills/${editingBillId}` : '/api/client-bills';
            const method = editingBillId ? 'PUT' : 'POST';

            const payload: any = {
                client_id: id,
                po_id: billFormData.po_id || null,
                project_id: billFormData.project_id || null,
                bill_number: billFormData.bill_number || null,
                bill_date: billFormData.bill_date || null,
                area: billFormData.area || null,
                remarks: billFormData.remarks || null
            };

            if (!billLocked) {
                payload.gross_amount = parseFloat(billFormData.gross_amount);
                payload.advance_deduction = parseFloat(billFormData.advance_deduction) || 0;
                payload.schedules = schedules.map((s) => ({
                    installment_label: s.installment_label,
                    percentage: s.percentage ? parseFloat(s.percentage) : null,
                    expected_amount: parseFloat(s.expected_amount),
                    due_date: s.due_date || null
                }));
            }

            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} bill`);

            handleCloseBillModal();
            setSubmittingBill(false);
            refreshBills();
            fetchClientData();

            await Promise.race([
                showSuccess(isEditing ? 'Bill Updated' : 'Bill Created', isEditing ? 'Bill updates were saved successfully.' : 'New bill has been recorded successfully.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        } catch (err: any) {
            setSubmittingBill(false);
            await Promise.race([
                showError('Operation Failed', err.message || 'Unable to store changes. Please try again.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        }
    };

    const getScheduleStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-emerald-50 text-emerald-700 border border-emerald-250';
            case 'APPROVED': return 'bg-sky-50 text-sky-700 border border-sky-250';
            case 'DUE':
            default: return 'bg-amber-50 text-amber-700 border border-amber-250';
        }
    };

    const handleOpenMilestones = async (b: ClientBill) => {
        setMilestonesBill(b);
        setIsMilestonesModalOpen(true);
        setMilestonesLoading(true);
        try {
            const res = await fetch(`/api/client-bill-schedules?bill_id=${b.id}`);
            setMilestoneSchedules(res.ok ? await res.json() : []);
        } finally {
            setMilestonesLoading(false);
        }
    };

    const handleCloseMilestones = () => {
        setIsMilestonesModalOpen(false);
        setMilestonesBill(null);
        setMilestoneSchedules([]);
    };

    const handleApproveMilestone = async (scheduleId: string) => {
        try {
            const res = await fetch(`/api/client-bill-schedules/${scheduleId}/approve`, { method: 'PUT' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to approve installment');
            setMilestoneSchedules((prev) => prev.map((s) => s.id === scheduleId ? data : s));
        } catch (err: any) {
            await Promise.race([
                showError('Approval Failed', err.message || 'Unable to approve this installment.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        }
    };

    const handleRecordPaymentForSchedule = (s: ClientBillSchedule) => {
        handleCloseMilestones();
        const outstanding = (Number(s.expected_amount) || 0) - (Number(s.received_amount) || 0);
        setEditingPaymentId(null);
        setPaymentFormData({
            bill_id: s.bill_id,
            schedule_id: s.id,
            amount: outstanding > 0 ? outstanding.toFixed(2) : '',
            payment_date: '', bank_name: '', advice_reference_number: '', remarks: ''
        });
        setPaymentScheduleOptions(milestoneSchedules);
        setIsPaymentModalOpen(true);
    };

    // ---------------- Payments ----------------

    const loadSchedulesForBill = async (billId: string) => {
        if (!billId) {
            setPaymentScheduleOptions([]);
            return;
        }
        const res = await fetch(`/api/client-bill-schedules?bill_id=${billId}`);
        setPaymentScheduleOptions(res.ok ? await res.json() : []);
    };

    const handleOpenCreatePayment = () => {
        setEditingPaymentId(null);
        setPaymentFormData({ bill_id: '', schedule_id: '', amount: '', payment_date: '', bank_name: '', advice_reference_number: '', remarks: '' });
        setPaymentScheduleOptions([]);
        setIsPaymentModalOpen(true);
    };

    const handleClosePaymentModal = () => {
        setIsPaymentModalOpen(false);
        setEditingPaymentId(null);
        setPaymentFormData({ bill_id: '', schedule_id: '', amount: '', payment_date: '', bank_name: '', advice_reference_number: '', remarks: '' });
        setPaymentScheduleOptions([]);
    };

    const handleEditPayment = async (p: ClientPayment) => {
        setEditingPaymentId(p.id);
        setPaymentFormData({
            bill_id: p.bill_id || '',
            schedule_id: p.schedule_id || '',
            amount: p.amount ? p.amount.toString() : '',
            payment_date: p.payment_date ? new Date(p.payment_date).toISOString().split('T')[0] : '',
            bank_name: p.bank_name || '',
            advice_reference_number: p.advice_reference_number || '',
            remarks: p.remarks || ''
        });
        if (p.bill_id) await loadSchedulesForBill(p.bill_id);
        setIsPaymentModalOpen(true);
    };

    const handleDeletePayment = async (paymentId: string) => {
        const confirmed = await confirmDelete('Delete Payment Record?', 'Are you sure you want to remove this payment record? This action is irreversible.');
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/client-payments/${paymentId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to delete payment');
            refreshPayments();
            fetchClientData();
            await Promise.race([
                showSuccess('Payment Deleted', 'Payment has been deleted successfully.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        } catch (err: any) {
            await Promise.race([
                showError('Deletion Failed', err.message || 'Unable to delete this payment. Please try again.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        }
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !paymentFormData.bill_id || !paymentFormData.amount.trim()) return;
        const isEditing = Boolean(editingPaymentId);

        try {
            setSubmittingPayment(true);
            const url = editingPaymentId ? `/api/client-payments/${editingPaymentId}` : '/api/client-payments';
            const method = editingPaymentId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: id,
                    bill_id: paymentFormData.bill_id,
                    schedule_id: paymentFormData.schedule_id || null,
                    amount: parseFloat(paymentFormData.amount),
                    payment_date: paymentFormData.payment_date || null,
                    bank_name: paymentFormData.bank_name || null,
                    advice_reference_number: paymentFormData.advice_reference_number || null,
                    remarks: paymentFormData.remarks || null
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} payment`);

            handleClosePaymentModal();
            setSubmittingPayment(false);
            refreshPayments();
            refreshBills();
            fetchClientData();

            await Promise.race([
                showSuccess(isEditing ? 'Payment Updated' : 'Payment Recorded', isEditing ? 'Payment has been updated successfully.' : 'Payment has been recorded successfully.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        } catch (err: any) {
            setSubmittingPayment(false);
            await Promise.race([
                showError('Operation Failed', err.message || 'Unable to store changes. Please try again.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        }
    };

    // ---------------- Columns ----------------

    const columnsForPOs = [
        {
            header: 'Actions', key: 'actions', render: (po: ClientPO) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => handleEditPO(po)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors" title="Edit PO">
                        <Pencil size={14} />
                    </button>
                    {isAdmin && (
                        <button onClick={() => handleDeletePO(po.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors" title="Delete PO">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )
        },
        {
            header: 'PO Number', key: 'po_number', sortable: true, render: (po: ClientPO) => (
                <div className="flex items-center gap-2">
                    <ShoppingCart size={16} className="text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-900">{po.po_number}</span>
                </div>
            )
        },
        {
            header: 'PO Date', key: 'po_date', sortable: true, render: (po: ClientPO) => (
                <span className="font-medium text-slate-600 font-mono">{formatDate(po.po_date)}</span>
            )
        },
        {
            header: 'PO Amount', key: 'po_amount', align: 'right' as const, sortable: true, render: (po: ClientPO) => (
                <span className="font-bold text-amber-700">{po.po_amount ? formatCurrency(po.po_amount) : 'N/A'}</span>
            )
        }
    ];

    const columnsForBills = [
        {
            header: 'Actions', key: 'actions', render: (b: ClientBill) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenMilestones(b)} className="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-colors" title="View milestones">
                        <ListChecks size={14} />
                    </button>
                    <button onClick={() => handleEditBill(b)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors" title="Edit bill">
                        <Pencil size={14} />
                    </button>
                    {isAdmin && (
                        <button onClick={() => handleDeleteBill(b.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors" title="Delete bill">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )
        },
        {
            header: 'Bill No.', key: 'bill_number', sortable: true, render: (b: ClientBill) => (
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    {b.bill_number ? <span className="font-medium text-slate-700">{b.bill_number}</span> : <span className="text-slate-400 text-xs italic">N/A</span>}
                </div>
            )
        },
        {
            header: 'PO / Project', key: 'po_number', sortable: true, render: (b: ClientBill) => (
                <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-slate-800">{b.po_number || <span className="text-slate-400 italic">No PO</span>}</div>
                    <div className="text-slate-400">{b.project_name || 'No Project Link'}</div>
                </div>
            )
        },
        {
            header: 'Bill Date', key: 'bill_date', sortable: true, render: (b: ClientBill) => (
                <span className="font-medium text-slate-600 font-mono">{formatDate(b.bill_date)}</span>
            )
        },
        {
            header: 'Gross Amount', key: 'gross_amount', align: 'right' as const, sortable: true, render: (b: ClientBill) => (
                <span className="font-semibold text-slate-700">{formatCurrency(b.gross_amount)}</span>
            )
        },
        {
            header: 'Advance/Deduction', key: 'advance_deduction', align: 'right' as const, sortable: true, render: (b: ClientBill) => {
                const adv = Number(b.advance_deduction) || 0;
                return adv > 0
                    ? <span className="font-semibold text-green-600">{formatCurrency(adv)}</span>
                    : <span className="text-slate-400 text-xs italic">None</span>;
            }
        },
        {
            header: 'Net Receivable', key: 'net_payable', align: 'right' as const, sortable: true, render: (b: ClientBill) => (
                <span className="font-bold text-amber-700">{formatCurrency(b.net_payable)}</span>
            )
        }
    ];

    const columnsForPayments = [
        {
            header: 'Actions', key: 'actions', render: (p: ClientPayment) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => handleEditPayment(p)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors" title="Edit payment">
                        <Pencil size={14} />
                    </button>
                    {isAdmin && (
                        <button onClick={() => handleDeletePayment(p.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors" title="Delete payment">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )
        },
        {
            header: 'Bank / Advice Ref', key: 'advice_reference_number', sortable: true, render: (p: ClientPayment) => (
                <div className="text-xs space-y-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Landmark size={13} className="text-slate-400 shrink-0" />
                        {p.bank_name || <span className="text-slate-400 italic">N/A</span>}
                    </div>
                    <div className="font-mono text-slate-500">{p.advice_reference_number || '—'}</div>
                </div>
            )
        },
        {
            header: 'Bill / Milestone', key: 'bill_number', sortable: true, render: (p: ClientPayment) => (
                <div className="text-xs space-y-0.5">
                    <div className="font-medium text-slate-700">{p.bill_number || 'N/A'}</div>
                    <div className="text-slate-400">{p.installment_label || 'General'}</div>
                </div>
            )
        },
        {
            header: 'Payment Date', key: 'payment_date', sortable: true, render: (p: ClientPayment) => (
                <span className="font-medium text-slate-600 font-mono">{formatDate(p.payment_date)}</span>
            )
        },
        {
            header: 'Amount', key: 'amount', align: 'right' as const, sortable: true, render: (p: ClientPayment) => (
                <span className="font-semibold text-emerald-700">{formatCurrency(p.amount)}</span>
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

    if (error || !client) {
        return (
            <div className="space-y-4">
                <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-semibold mb-4">
                    <ArrowLeft size={16} /> Back to Directory
                </button>
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-6 rounded-xl text-sm flex items-start gap-3">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <div>
                        <h4 className="font-bold text-rose-800">Error Loading Client</h4>
                        <p className="mt-1">{error || 'Client record not found or has been disabled.'}</p>
                    </div>
                </div>
            </div>
        );
    }

    const dueNum = typeof client.total_due === 'string' ? parseFloat(client.total_due) : client.total_due;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className='bg-white shadow-sm shadow-amber-100 p-5 rounded-xl'>
                <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-semibold">
                    <ArrowLeft size={16} /> Back to Directory
                </button>

                {/* Client Overview Card */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 sm:p-6 mt-5 w-full">
                    <div className="flex flex-col gap-5">
                        <div className="min-w-0 flex flex-col items-start gap-3">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                Client Profile
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words w-full">{client.name}</h1>
                            <div className="flex flex-row flex-wrap items-center gap-y-2 gap-x-4 sm:gap-x-6 text-xs sm:text-sm text-slate-500 pt-1 w-full">
                                {client.phone && (
                                    <div className="flex items-center gap-2 min-w-0"><Phone size={15} className="text-slate-400 shrink-0" /><span className="truncate">{client.phone}</span></div>
                                )}
                                {client.email && (
                                    <div className="flex items-center gap-2 min-w-0"><Mail size={15} className="text-slate-400 shrink-0" /><span className="truncate break-all">{client.email}</span></div>
                                )}
                                {client.address && (
                                    <div className="flex items-center gap-2 min-w-0"><MapPin size={15} className="text-slate-400 shrink-0" /><span className="truncate">{client.address}</span></div>
                                )}
                            </div>
                        </div>

                        <div className="min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between min-w-0">
                                <div className="text-[14px] font-semibold uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                                    <FileText size={14} className="shrink-0" /><span className="truncate">Billed</span>
                                </div>
                                <div className="text-sm sm:text-base lg:text-md font-bold text-slate-900 break-all leading-tight">{formatCurrency(client.total_billed)}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between min-w-0">
                                <div className="text-[14px] font-semibold uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                                    <MinusCircle size={14} className="shrink-0" /><span className="truncate">Advance/Deduction</span>
                                </div>
                                <div className="text-sm sm:text-base lg:text-md font-bold text-slate-900 break-all leading-tight">{formatCurrency(client.total_advance_deduction)}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between min-w-0">
                                <div className="text-[14px] font-semibold uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                                    <Coins size={14} className="shrink-0" /><span className="truncate">Received</span>
                                </div>
                                <div className="text-sm sm:text-base lg:text-md font-bold text-slate-900 break-all leading-tight">{formatCurrency(client.total_received)}</div>
                            </div>
                            <div className={`border rounded-xl p-3 flex flex-col justify-between min-w-0 ${dueNum < 0 ? 'bg-emerald-50/40 border-emerald-100 text-emerald-800' : dueNum > 0 ? 'bg-rose-50/40 border-rose-100 text-rose-800' : 'bg-slate-50 border-slate-100 text-slate-800'}`}>
                                <div className="text-[14px] font-semibold uppercase opacity-75 flex items-center gap-1.5 mb-2">
                                    <CreditCard size={14} className="shrink-0" /><span className="truncate">Due</span> {dueNum < 0 ? '(Credit)' : dueNum > 0 ? '(Due)' : '(Settled)'}
                                </div>
                                <div className="text-sm sm:text-base lg:text-md font-bold break-all leading-tight">{formatCurrency(Math.abs(dueNum))}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Purchase Orders */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 mt-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">Purchase Orders</h2>
                        <button onClick={handleOpenCreatePO} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <ShoppingCart size={18} /> Add PO
                        </button>
                    </div>
                    <Table
                        data={pos}
                        columns={columnsForPOs}
                        lazy
                        totalRecords={totalPORecords}
                        loading={posTableLoading}
                        onLazyLoad={(params) => setPOsLazyParams(params)}
                        initialItemsPerPage={5}
                        searchPlaceholder="Search by PO number"
                        keyExtractor={(po) => po.id}
                        emptyMessage="No purchase orders found for this client."
                    />
                </div>

                {/* Bills & Milestones */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 mt-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">Bills & Milestones</h2>
                        <button onClick={handleOpenCreateBill} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <ReceiptText size={18} /> Create Bill
                        </button>
                    </div>
                    <Table
                        data={bills}
                        columns={columnsForBills}
                        lazy
                        totalRecords={totalBillRecords}
                        loading={billsTableLoading}
                        onLazyLoad={(params) => setBillsLazyParams(params)}
                        initialItemsPerPage={5}
                        searchPlaceholder="Search by bill number, PO or area"
                        keyExtractor={(b) => b.id}
                        emptyMessage="No bills found for this client."
                    />
                </div>

                {/* Payments */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 mt-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">Payments Received Ledger</h2>
                        <button onClick={handleOpenCreatePayment} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <Wallet size={18} /> New Payment
                        </button>
                    </div>
                    <Table
                        data={payments}
                        columns={columnsForPayments}
                        lazy
                        totalRecords={totalPaymentRecords}
                        loading={paymentsTableLoading}
                        onLazyLoad={(params) => setPaymentsLazyParams(params)}
                        initialItemsPerPage={5}
                        searchPlaceholder="Search by bank, advice ref, or bill"
                        keyExtractor={(p) => p.id}
                        emptyMessage="No payments recorded for this client."
                    />
                </div>
            </div>

            {/* Create/Edit PO Modal */}
            <AnimatePresence>
                {isPOModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClosePOModal} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">{editingPOId ? 'Edit Purchase Order' : 'Add Purchase Order'}</h3>
                                <button onClick={handleClosePOModal} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"><X size={20} /></button>
                            </div>
                            <form onSubmit={handlePOSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">PO Number <span className='text-red-600'>*</span></label>
                                    <input type="text" required value={poFormData.po_number} onChange={(e) => setPOFormData({ ...poFormData, po_number: e.target.value })} placeholder="e.g. PO-2026-001" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900" />
                                </div>
                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">PO Date</label>
                                        <input type="date" value={poFormData.po_date} onChange={(e) => setPOFormData({ ...poFormData, po_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">PO Amount</label>
                                        <input type="number" step="0.01" min="0" value={poFormData.po_amount} onChange={(e) => setPOFormData({ ...poFormData, po_amount: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Description</label>
                                    <textarea value={poFormData.description} onChange={(e) => setPOFormData({ ...poFormData, description: e.target.value })} rows={2} placeholder="Scope of the PO" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 resize-none" />
                                </div>
                                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                    <button type="button" onClick={handleClosePOModal} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button type="submit" disabled={submittingPO} className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50">
                                        {submittingPO ? <Loader2 size={16} className="animate-spin" /> : editingPOId ? 'Save Changes' : 'Submit'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create/Edit Bill Modal */}
            <AnimatePresence>
                {isBillModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseBillModal} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl p-6 rounded-2xl shadow-xl z-10 border border-slate-100 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">{editingBillId ? 'Edit Bill' : 'Create Bill'}</h3>
                                <button onClick={handleCloseBillModal} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"><X size={20} /></button>
                            </div>

                            {billLocked && (
                                <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 rounded-xl">
                                    <Lock size={14} className="shrink-0" />
                                    Payments already recorded against this bill — billed amount and milestone split are locked.
                                </div>
                            )}

                            <form onSubmit={handleBillSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Linked PO (Optional)</label>
                                        <Dropdown
                                            options={[{ value: '', label: '-- No PO Link --' }, ...pos.map((po) => ({ value: po.id, label: po.po_number }))]}
                                            value={billFormData.po_id}
                                            onChange={(v) => setBillFormData({ ...billFormData, po_id: v })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Linked Project (Optional)</label>
                                        <Dropdown
                                            options={[{ value: '', label: '-- No Project Link --' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
                                            value={billFormData.project_id}
                                            onChange={(v) => setBillFormData({ ...billFormData, project_id: v })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Bill Number</label>
                                        <input type="text" value={billFormData.bill_number} onChange={(e) => setBillFormData({ ...billFormData, bill_number: e.target.value })} placeholder="e.g. BILL-2026-001" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Bill Date</label>
                                        <input type="date" value={billFormData.bill_date} onChange={(e) => setBillFormData({ ...billFormData, bill_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Area / Location</label>
                                        <input type="text" value={billFormData.area} onChange={(e) => setBillFormData({ ...billFormData, area: e.target.value })} placeholder="e.g. Gulshan Site" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Remarks</label>
                                        <input type="text" value={billFormData.remarks} onChange={(e) => setBillFormData({ ...billFormData, remarks: e.target.value })} placeholder="Optional note" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Gross Bill Amount <span className='text-red-600'>*</span></label>
                                        <input type="number" step="0.01" min="0.01" required disabled={billLocked} value={billFormData.gross_amount} onChange={(e) => handleGrossChange(e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 disabled:opacity-60" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Advance / Deduction</label>
                                        <input type="number" step="0.01" min="0" disabled={billLocked} value={billFormData.advance_deduction} onChange={(e) => handleAdvanceChange(e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 disabled:opacity-60" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                                    <span className="text-xs font-semibold uppercase text-slate-500">Net Receivable</span>
                                    <span className="font-bold text-slate-900">{formatCurrency(netPayable)}</span>
                                </div>

                                {/* Milestone Schedule Editor */}
                                <div className="border-t border-slate-100 pt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-xs font-semibold uppercase text-slate-500">Payment Milestones</label>
                                        {!billLocked && (
                                            <div className="flex items-center gap-1.5">
                                                {PRESETS.map((preset) => (
                                                    <button key={preset.key} type="button" onClick={() => applyPreset(preset.splits)} className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-colors">
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {schedules.map((row, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                                <input
                                                    type="text" disabled={billLocked} value={row.installment_label}
                                                    onChange={(e) => updateRow(idx, 'installment_label', e.target.value)}
                                                    placeholder="Label" className="col-span-4 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-primary text-slate-900 disabled:opacity-60"
                                                />
                                                <div className="col-span-2 relative">
                                                    <input
                                                        type="number" step="0.01" disabled={billLocked} value={row.percentage}
                                                        onChange={(e) => updateRow(idx, 'percentage', e.target.value)}
                                                        placeholder="%" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-primary text-slate-900 disabled:opacity-60"
                                                    />
                                                </div>
                                                <input
                                                    type="number" step="0.01" required disabled={billLocked} value={row.expected_amount}
                                                    onChange={(e) => updateRow(idx, 'expected_amount', e.target.value)}
                                                    placeholder="Amount" className="col-span-3 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-primary text-slate-900 disabled:opacity-60"
                                                />
                                                <input
                                                    type="date" disabled={billLocked} value={row.due_date}
                                                    onChange={(e) => updateRow(idx, 'due_date', e.target.value)}
                                                    className="col-span-2 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-primary text-slate-900 disabled:opacity-60"
                                                />
                                                {!billLocked && (
                                                    <button type="button" onClick={() => removeScheduleRow(idx)} disabled={schedules.length === 1} className="col-span-1 p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed flex justify-center">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {!billLocked && (
                                        <button type="button" onClick={addScheduleRow} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover">
                                            <Plus size={14} /> Add Installment
                                        </button>
                                    )}

                                    {!billLocked && (
                                        <div className={`mt-3 flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                            <span className="flex items-center gap-1.5">
                                                {isBalanced ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                                Milestone Total: {formatCurrency(scheduleTotal)}
                                            </span>
                                            <span>Net Receivable: {formatCurrency(netPayable)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                    <button type="button" onClick={handleCloseBillModal} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button type="submit" disabled={submittingBill || (!billLocked && !isBalanced)} className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50">
                                        {submittingBill ? <Loader2 size={16} className="animate-spin" /> : editingBillId ? 'Save Changes' : 'Submit'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Milestones View Modal */}
            <AnimatePresence>
                {isMilestonesModalOpen && milestonesBill && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseMilestones} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-lg p-6 rounded-2xl shadow-xl z-10 border border-slate-100 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Milestones</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {milestonesBill.bill_number || 'Bill'} &middot; Gross {formatCurrency(milestonesBill.gross_amount)}
                                        {Number(milestonesBill.advance_deduction) > 0 && <> &middot; Advance/Deduction - {formatCurrency(milestonesBill.advance_deduction)}</>}
                                        &middot; Net Receivable {formatCurrency(milestonesBill.net_payable)}
                                    </p>
                                </div>
                                <button onClick={handleCloseMilestones} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"><X size={20} /></button>
                            </div>

                            {milestonesLoading ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={28} /></div>
                            ) : milestoneSchedules.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-sm">No milestones found for this bill.</div>
                            ) : (
                                <div className="space-y-3">
                                    {milestoneSchedules.map((s) => {
                                        const outstanding = (Number(s.expected_amount) || 0) - (Number(s.received_amount) || 0);
                                        return (
                                            <div key={s.id} className="border border-slate-200 rounded-xl p-3.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-slate-900 text-sm">{s.installment_label}</span>
                                                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-lg ${getScheduleStatusBadgeClass(s.status)}`}>{s.status}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 mt-2.5 text-xs">
                                                    <div>
                                                        <div className="text-slate-400 uppercase font-semibold text-[10px]">Expected</div>
                                                        <div className="font-bold text-slate-800">{formatCurrency(s.expected_amount)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-400 uppercase font-semibold text-[10px]">Received</div>
                                                        <div className="font-bold text-emerald-700">{formatCurrency(s.received_amount)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-400 uppercase font-semibold text-[10px]">Due Date</div>
                                                        <div className="font-bold text-slate-800">{formatDate(s.due_date)}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-3">
                                                    {s.status === 'DUE' && (
                                                        <button onClick={() => handleApproveMilestone(s.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50 transition-colors">
                                                            <CheckCircle2 size={13} /> Approve
                                                        </button>
                                                    )}
                                                    {s.status !== 'PAID' && outstanding > 0 && (
                                                        <button onClick={() => handleRecordPaymentForSchedule(s)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors">
                                                            <Wallet size={13} /> New Payment ({formatCurrency(outstanding)} due)
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create/Edit Payment Modal */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClosePaymentModal} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">{editingPaymentId ? 'Edit Payment' : 'New Payment'}</h3>
                                <button onClick={handleClosePaymentModal} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"><X size={20} /></button>
                            </div>

                            <form onSubmit={handlePaymentSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Client</label>
                                    <div className="relative">
                                        <select required value={client?.id} disabled className="w-full appearance-none px-3 pr-9 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900">
                                            <option value={client?.id}>{client?.name}</option>
                                        </select>
                                        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Bill <span className='text-red-600'>*</span></label>
                                    <Dropdown
                                        options={billsForDropdown.map((b) => ({ value: b.id, label: `${b.bill_number || 'N/A'} (${formatCurrency(b.net_payable)})` }))}
                                        value={paymentFormData.bill_id}
                                        onChange={(v) => { setPaymentFormData({ ...paymentFormData, bill_id: v, schedule_id: '' }); loadSchedulesForBill(v); }}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Milestone (Optional)</label>
                                    <Dropdown
                                        options={[
                                            { value: '', label: '-- General / No Milestone Link --' },
                                            ...paymentScheduleOptions.map((s) => ({
                                                value: s.id,
                                                label: `${s.installment_label} — ${s.status} (${formatCurrency((Number(s.expected_amount) || 0) - (Number(s.received_amount) || 0))} due)`
                                            }))
                                        ]}
                                        value={paymentFormData.schedule_id}
                                        onChange={(v) => {
                                            const selected = paymentScheduleOptions.find((s) => s.id === v);
                                            const outstanding = selected ? (Number(selected.expected_amount) || 0) - (Number(selected.received_amount) || 0) : null;
                                            setPaymentFormData({ ...paymentFormData, schedule_id: v, amount: outstanding && outstanding > 0 ? outstanding.toFixed(2) : paymentFormData.amount });
                                        }}
                                        disabled={!paymentFormData.bill_id}
                                    />
                                </div>

                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Bank Name</label>
                                        <input type="text" value={paymentFormData.bank_name} onChange={(e) => setPaymentFormData({ ...paymentFormData, bank_name: e.target.value })} placeholder="e.g. HSBC" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Advice Ref. No.</label>
                                        <input type="text" value={paymentFormData.advice_reference_number} onChange={(e) => setPaymentFormData({ ...paymentFormData, advice_reference_number: e.target.value })} placeholder="e.g. HSBC-ADV-2201" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Payment Date</label>
                                        <input type="date" value={paymentFormData.payment_date} onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Amount <span className='text-red-600'>*</span></label>
                                        <input type="number" step="0.01" min="0.01" required value={paymentFormData.amount} onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Remarks</label>
                                    <input type="text" value={paymentFormData.remarks} onChange={(e) => setPaymentFormData({ ...paymentFormData, remarks: e.target.value })} placeholder="Optional note" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900" />
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                    <button type="button" onClick={handleClosePaymentModal} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button type="submit" disabled={submittingPayment} className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50">
                                        {submittingPayment ? <Loader2 size={16} className="animate-spin" /> : editingPaymentId ? 'Save Changes' : 'Submit'}
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
