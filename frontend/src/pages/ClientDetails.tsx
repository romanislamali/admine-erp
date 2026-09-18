import { Fragment, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Phone, Mail, MapPin, ArrowLeft, Loader2, FileText, CreditCard, Coins, AlertCircle, X,
    Wallet, ReceiptText, Pencil, Trash2, ShoppingCart, ChevronDown, Plus,
    CheckCircle2, Lock, MinusCircle
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
    total_advance: string | number;
    total_deduction: string | number;
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
    advance_amount: string | number;
    net_payable: string | number;
    total_received: string | number;
    total_deduction: string | number;
    bill_date: string;
    area: string | null;
    remarks: string | null;
}

// A milestone row IS the payment record now — single-shot: one receipt event fully
// settles it (received_amount + deduction_amount >= expected_amount flips status to PAID).
interface ClientBillSchedule {
    id: string;
    bill_id: string;
    installment_label: string;
    percentage: string | number | null;
    expected_amount: string | number;
    received_amount: string | number;
    deduction_amount: string | number;
    status: 'DUE' | 'PAID';
    due_date: string | null;
    payment_date: string | null;
    bank_name: string | null;
    advice_reference_number: string | null;
    check_no: string | null;
    check_date: string | null;
    remarks: string | null;
}

interface ScheduleRow {
    id?: string;
    installment_label: string;
    percentage: string;
    expected_amount: string;
    due_date: string;
    received_amount: number;
    deduction_amount: number;
}

const ordinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

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
    const [submittingBill, setSubmittingBill] = useState(false);
    const [billFormData, setBillFormData] = useState({
        po_id: '', project_id: '', bill_number: '', gross_amount: '', advance_amount: '', bill_date: '', area: '', remarks: ''
    });
    const [schedules, setSchedules] = useState<ScheduleRow[]>([
        { installment_label: 'Full Payment (100%)', percentage: '100', expected_amount: '', due_date: '', received_amount: 0, deduction_amount: 0 }
    ]);

    // Milestones — shown inline below each bill row (expand/collapse), also the
    // payment-recording surface. Keyed by bill id so any number of bills can be
    // expanded independently.
    const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
    const [milestonesByBill, setMilestonesByBill] = useState<Record<string, ClientBillSchedule[]>>({});
    const [milestonesLoadingByBill, setMilestonesLoadingByBill] = useState<Record<string, boolean>>({});

    // Receipt recording (inline within a milestone row)
    const [recordingReceiptFor, setRecordingReceiptFor] = useState<string | null>(null);
    const [receiptFormData, setReceiptFormData] = useState({
        received_amount: '', deduction_amount: '', payment_date: '', bank_name: '', advice_reference_number: '', check_no: '', check_date: '', remarks: ''
    });
    const [submittingReceipt, setSubmittingReceipt] = useState(false);

    const fetchClientData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError('');

            const [clientRes, projectsRes] = await Promise.all([
                fetch(`/api/clients/${id}`),
                fetch('/api/projects')
            ]);

            if (!clientRes.ok) throw new Error('Failed to load client details');

            const clientData = await clientRes.json();
            setClient(clientData);

            if (projectsRes.ok) setProjects(await projectsRes.json());
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

    useEffect(() => { fetchClientData(); }, [id]);
    useEffect(() => { fetchPOs(posLazyParams); }, [id, posLazyParams, posRefreshTrigger]);
    useEffect(() => { fetchBills(billsLazyParams); }, [id, billsLazyParams, billsRefreshTrigger]);

    const formatCurrency = (val: string | number | null | undefined) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (num === null || num === undefined || isNaN(num)) return '0';
        return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
    };

    // For populating an editable number input from a DB value: strips the insignificant
    // trailing zeros Postgres NUMERIC adds (e.g. "343434.00" -> "343434") without
    // rounding away a real fraction (e.g. "555.340" -> "555.34").
    const cleanNum = (val: string | number | null | undefined) => {
        if (val === null || val === undefined || val === '') return '';
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? '' : String(num);
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
            po_amount: cleanNum(po.po_amount),
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

    const netPayable = (Number(billFormData.gross_amount) || 0) - (Number(billFormData.advance_amount) || 0);
    const scheduleTotal = schedules.reduce((sum, r) => sum + (parseFloat(r.expected_amount) || 0), 0);
    const percentageTotal = schedules.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0);
    const isBalanced = netPayable > 0 && Math.abs(scheduleTotal - netPayable) < 0.01;
    const hasPaidRows = schedules.some((r) => r.received_amount > 0 || r.deduction_amount > 0);

    const recomputeFromNet = (newNet: number, rows: ScheduleRow[]) =>
        rows.map((r) => {
            const pct = parseFloat(r.percentage);
            if (isNaN(pct)) return r;
            return { ...r, expected_amount: newNet > 0 ? String(Number((newNet * pct / 100).toFixed(2))) : '' };
        });

    const handleGrossChange = (value: string) => {
        const gross = parseFloat(value) || 0;
        const advance = parseFloat(billFormData.advance_amount) || 0;
        setBillFormData({ ...billFormData, gross_amount: value });
        setSchedules((prev) => recomputeFromNet(gross - advance, prev));
    };

    const handleAdvanceChange = (value: string) => {
        const advance = parseFloat(value) || 0;
        const gross = parseFloat(billFormData.gross_amount) || 0;
        setBillFormData({ ...billFormData, advance_amount: value });
        setSchedules((prev) => recomputeFromNet(gross - advance, prev));
    };

    const computeLabel = (idx: number, pct: string) => {
        const label = `${ordinal(idx + 1)} Installment`;
        const p = parseFloat(pct);
        return !isNaN(p) && pct !== '' ? `${label} (${p}%)` : label;
    };

    const applyPreset = (splits: number[]) => {
        setSchedules(splits.map((pct, i) => ({
            installment_label: splits.length === 1 ? 'Full Payment (100%)' : computeLabel(i, String(pct)),
            percentage: String(pct),
            expected_amount: netPayable > 0 ? String(Number((netPayable * pct / 100).toFixed(2))) : '',
            due_date: '',
            received_amount: 0,
            deduction_amount: 0
        })));
    };

    const updateRow = (idx: number, field: keyof ScheduleRow, value: string) => {
        setSchedules((prev) => prev.map((r, i) => {
            if (i !== idx) return r;
            if (r.received_amount > 0 || r.deduction_amount > 0) return field === 'due_date' ? { ...r, due_date: value } : r;
            if (field === 'percentage') {
                const pct = parseFloat(value);
                return { ...r, percentage: value, installment_label: computeLabel(idx, value), expected_amount: !isNaN(pct) && netPayable > 0 ? String(Number((netPayable * pct / 100).toFixed(2))) : r.expected_amount };
            }
            return { ...r, [field]: value };
        }));
    };

    const addScheduleRow = () => setSchedules((prev) => [...prev, { installment_label: computeLabel(prev.length, ''), percentage: '', expected_amount: '', due_date: '', received_amount: 0, deduction_amount: 0 }]);
    const removeScheduleRow = (idx: number) => setSchedules((prev) => {
        if (prev.length === 1 || prev[idx].received_amount > 0 || prev[idx].deduction_amount > 0) return prev;
        return prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, installment_label: computeLabel(i, r.percentage) }));
    });

    const resetBillForm = () => {
        setBillFormData({ po_id: '', project_id: '', bill_number: '', gross_amount: '', advance_amount: '', bill_date: '', area: '', remarks: '' });
        setSchedules([{ installment_label: 'Full Payment (100%)', percentage: '100', expected_amount: '', due_date: '', received_amount: 0, deduction_amount: 0 }]);
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
            gross_amount: cleanNum(b.gross_amount),
            advance_amount: b.advance_amount ? cleanNum(b.advance_amount) : '0',
            bill_date: b.bill_date ? new Date(b.bill_date).toISOString().split('T')[0] : '',
            area: b.area || '',
            remarks: b.remarks || ''
        });

        try {
            const schedulesRes = await fetch(`/api/client-bill-schedules?bill_id=${b.id}`);
            const schedulesData: ClientBillSchedule[] = schedulesRes.ok ? await schedulesRes.json() : [];

            setSchedules(schedulesData.length > 0 ? schedulesData.map((s) => ({
                id: s.id,
                installment_label: s.installment_label,
                percentage: s.percentage !== null ? cleanNum(s.percentage) : '',
                expected_amount: cleanNum(s.expected_amount),
                due_date: s.due_date ? new Date(s.due_date).toISOString().split('T')[0] : '',
                received_amount: Number(s.received_amount) || 0,
                deduction_amount: Number(s.deduction_amount) || 0
            })) : [{ installment_label: 'Full Payment (100%)', percentage: '100', expected_amount: '', due_date: '', received_amount: 0, deduction_amount: 0 }]);
        } catch {
            setSchedules([{ installment_label: 'Full Payment (100%)', percentage: '100', expected_amount: '', due_date: '', received_amount: 0, deduction_amount: 0 }]);
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
        if (!isBalanced) return;

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
                remarks: billFormData.remarks || null,
                schedules: schedules.map((s) => ({
                    id: s.id,
                    installment_label: s.installment_label,
                    percentage: s.percentage ? parseFloat(s.percentage) : null,
                    expected_amount: parseFloat(s.expected_amount),
                    due_date: s.due_date || null
                }))
            };

            if (!hasPaidRows) {
                payload.gross_amount = parseFloat(billFormData.gross_amount);
                payload.advance_amount = parseFloat(billFormData.advance_amount) || 0;
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
            case 'DUE':
            default: return 'bg-amber-50 text-amber-700 border border-amber-250';
        }
    };

    const fetchMilestoneSchedules = async (billId: string) => {
        setMilestonesLoadingByBill((prev) => ({ ...prev, [billId]: true }));
        try {
            const res = await fetch(`/api/client-bill-schedules?bill_id=${billId}`);
            const data = res.ok ? await res.json() : [];
            setMilestonesByBill((prev) => ({ ...prev, [billId]: data }));
        } finally {
            setMilestonesLoadingByBill((prev) => ({ ...prev, [billId]: false }));
        }
    };

    const toggleBillExpand = (b: ClientBill) => {
        setExpandedBillId((prev) => {
            if (prev === b.id) return null;
            fetchMilestoneSchedules(b.id);
            return b.id;
        });
        setRecordingReceiptFor(null);
    };

    // ---------------- Milestone Receipts (milestone = payment) ----------------

    const handleOpenReceiptForm = (s: ClientBillSchedule) => {
        setRecordingReceiptFor(s.id);
        const hasReceipt = Number(s.received_amount) > 0 || Number(s.deduction_amount) > 0;
        const outstanding = (Number(s.expected_amount) || 0) - (Number(s.received_amount) || 0) - (Number(s.deduction_amount) || 0);
        setReceiptFormData({
            received_amount: hasReceipt ? cleanNum(s.received_amount) : (outstanding > 0 ? String(Number(outstanding.toFixed(2))) : ''),
            deduction_amount: hasReceipt ? cleanNum(s.deduction_amount) : '',
            payment_date: s.payment_date ? new Date(s.payment_date).toISOString().split('T')[0] : '',
            bank_name: s.bank_name || '',
            advice_reference_number: s.advice_reference_number || '',
            check_no: s.check_no || '',
            check_date: s.check_date ? new Date(s.check_date).toISOString().split('T')[0] : '',
            remarks: s.remarks || ''
        });
    };

    const handleCloseReceiptForm = () => {
        setRecordingReceiptFor(null);
        setReceiptFormData({ received_amount: '', deduction_amount: '', payment_date: '', bank_name: '', advice_reference_number: '', check_no: '', check_date: '', remarks: '' });
    };

    const submitReceipt = async (scheduleId: string, body: Record<string, any>) => {
        const res = await fetch(`/api/client-bill-schedules/${scheduleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to save receipt');
        if (data.bill_id) await fetchMilestoneSchedules(data.bill_id);
        refreshBills();
        fetchClientData();
        return data;
    };

    const handleReceiptSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recordingReceiptFor) return;
        try {
            setSubmittingReceipt(true);
            await submitReceipt(recordingReceiptFor, {
                received_amount: receiptFormData.received_amount ? parseFloat(receiptFormData.received_amount) : 0,
                deduction_amount: receiptFormData.deduction_amount ? parseFloat(receiptFormData.deduction_amount) : 0,
                payment_date: receiptFormData.payment_date || null,
                bank_name: receiptFormData.bank_name || null,
                advice_reference_number: receiptFormData.advice_reference_number || null,
                check_no: receiptFormData.check_no || null,
                check_date: receiptFormData.check_date || null,
                remarks: receiptFormData.remarks || null
            });
            setSubmittingReceipt(false);
            handleCloseReceiptForm();
            await Promise.race([
                showSuccess('Receipt Recorded', 'The milestone receipt has been saved.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        } catch (err: any) {
            setSubmittingReceipt(false);
            await Promise.race([
                showError('Operation Failed', err.message || 'Unable to save this receipt. Please try again.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        }
    };

    const handleClearReceipt = async (s: ClientBillSchedule) => {
        const confirmed = await confirmDelete('Clear Receipt?', 'This clears the received/deduction amounts and receipt details recorded on this milestone. This action is irreversible.');
        if (!confirmed) return;
        try {
            await submitReceipt(s.id, {
                received_amount: 0, deduction_amount: 0, payment_date: null, bank_name: null, advice_reference_number: null, check_no: null, check_date: null, remarks: null
            });
            await Promise.race([
                showSuccess('Receipt Cleared', 'The milestone receipt has been cleared.'),
                new Promise((resolve) => setTimeout(resolve, 1000))
            ]);
        } catch (err: any) {
            await Promise.race([
                showError('Operation Failed', err.message || 'Unable to clear this receipt. Please try again.'),
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
                    <button onClick={() => toggleBillExpand(b)} className="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-colors" title={expandedBillId === b.id ? 'Hide milestones' : 'Show milestones'}>
                        <ChevronDown size={14} className={`transition-transform ${expandedBillId === b.id ? 'rotate-180' : ''}`} />
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
            header: 'Deduction', key: 'total_deduction', align: 'right' as const, sortable: true, render: (b: ClientBill) => (
                <span className="font-semibold text-rose-600">{formatCurrency(b.total_deduction || 0)}</span>
            )
        },
        {
            header: 'Bill Amount', key: 'gross_amount', align: 'right' as const, sortable: true, render: (b: ClientBill) => (
                <span className="font-semibold text-slate-700">{formatCurrency(b.gross_amount)}</span>
            )
        },
        {
            header: 'Advance', key: 'advance_amount', align: 'right' as const, sortable: true, render: (b: ClientBill) => {
                const adv = Number(b.advance_amount) || 0;
                return adv > 0
                    ? <span className="font-semibold text-green-600">{formatCurrency(adv)}</span>
                    : <span className="font-semibold text-slate-400">0</span>;
            }
        },
        {
            header: 'Receivable', key: 'net_payable', align: 'right' as const, sortable: true, render: (b: ClientBill) => (
                <span className="font-bold text-amber-700">{formatCurrency(b.net_payable)}</span>
            )
        },
        {
            header: 'Received', key: 'total_received', align: 'right' as const, sortable: true, render: (b: ClientBill) => (
                <span className="font-semibold text-emerald-700">{formatCurrency(b.total_received || 0)}</span>
            )
        },
        {
            header: 'Due', key: 'total_due', align: 'right' as const, render: (b: ClientBill) => {
                const due = (Number(b.net_payable) || 0) - (Number(b.total_received) || 0) - (Number(b.total_deduction) || 0);
                return <span className="font-bold text-rose-700">{formatCurrency(due > 0 ? due : 0)}</span>;
            }
        }
    ];

    // Milestones panel shown inline below a bill row when expanded — a milestone row
    // IS the payment record, so this doubles as the receipt-recording surface.
    const renderMilestonesPanel = (b: ClientBill) => {
        const isLoading = !!milestonesLoadingByBill[b.id];
        const scheds = milestonesByBill[b.id] || [];
        return (
            <div className="border-l-4 border-primary bg-white">
                <div className="p-4 sm:p-5">
                {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
                ) : scheds.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No milestones found for this bill.</div>
                ) : (
                    <div className="border border-slate-200 bg-white rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
                                        <th className="px-4 py-3">Installment</th>
                                        <th className="px-4 py-3 text-right">Expected</th>
                                        <th className="px-4 py-3 text-right">Received</th>
                                        <th className="px-4 py-3 text-right">Deduction</th>
                                        <th className="px-4 py-3 text-right">Outstanding</th>
                                        <th className="px-4 py-3">Due Date</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {scheds.map((s) => {
                                        const received = Number(s.received_amount) || 0;
                                        const deduction = Number(s.deduction_amount) || 0;
                                        const outstanding = (Number(s.expected_amount) || 0) - received - deduction;
                                        const hasReceipt = received > 0 || deduction > 0;
                                        const isRecording = recordingReceiptFor === s.id;
                                        const expected = Number(s.expected_amount) || 0;
                                        // Received + deduction can never exceed the milestone's expected amount.
                                        // Two explicit auto-fill rules on top of that cap:
                                        //  - deduction goes to 0 -> received snaps to the full expected amount
                                        //  - received hits the full expected amount -> deduction snaps to 0
                                        // Anything else (a genuine partial receipt) just clamps the other field
                                        // down if the total would otherwise overflow.
                                        const handleReceivedChange = (value: string) => {
                                            const newReceived = parseFloat(value) || 0;
                                            let deduction_amount = receiptFormData.deduction_amount;
                                            if (newReceived === expected) {
                                                deduction_amount = '0';
                                            } else {
                                                const currentDeduction = parseFloat(receiptFormData.deduction_amount) || 0;
                                                const maxDeduction = Math.max(0, expected - newReceived);
                                                if (currentDeduction > maxDeduction) deduction_amount = String(maxDeduction);
                                            }
                                            setReceiptFormData({ ...receiptFormData, received_amount: value, deduction_amount });
                                        };
                                        const handleDeductionChange = (value: string) => {
                                            const newDeduction = parseFloat(value) || 0;
                                            let received_amount = receiptFormData.received_amount;
                                            if (newDeduction === 0) {
                                                received_amount = String(expected);
                                            } else {
                                                const currentReceived = parseFloat(receiptFormData.received_amount) || 0;
                                                const maxReceived = Math.max(0, expected - newDeduction);
                                                if (currentReceived > maxReceived) received_amount = String(maxReceived);
                                            }
                                            setReceiptFormData({ ...receiptFormData, deduction_amount: value, received_amount });
                                        };
                                        return (
                                            <Fragment key={s.id}>
                                                <tr className={`border-b border-slate-200 hover:bg-slate-50/60 transition-colors ${isRecording ? 'bg-primary/5' : ''}`}>
                                                    <td className={`px-4 py-3 ${isRecording ? 'border-l-4 border-primary' : ''}`}>
                                                        <div className="font-semibold text-slate-900">{s.installment_label}</div>
                                                        {(s.payment_date || s.bank_name || s.advice_reference_number || s.check_no || s.check_date) && (
                                                            <div className="text-[11px] text-slate-400 mt-0.5">
                                                                {s.payment_date && <>Paid {formatDate(s.payment_date)}</>}
                                                                {s.bank_name && <> &middot; {s.bank_name}</>}
                                                                {s.advice_reference_number && <> &middot; {s.advice_reference_number}</>}
                                                                {s.check_no && <> &middot; Chq #{s.check_no}</>}
                                                                {s.check_date && <> &middot; Chq {formatDate(s.check_date)}</>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatCurrency(s.expected_amount)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrency(s.received_amount)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold">
                                                        {deduction > 0 ? <span className="text-rose-600">{formatCurrency(deduction)}</span> : <span className="text-slate-300">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold">
                                                        {outstanding > 0 ? <span className="text-amber-700">{formatCurrency(outstanding)}</span> : <span className="text-slate-300">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{formatDate(s.due_date)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-lg ${getScheduleStatusBadgeClass(s.status)}`}>{s.status}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button onClick={() => (isRecording ? handleCloseReceiptForm() : handleOpenReceiptForm(s))} title={hasReceipt ? 'Edit Receipt' : 'Record Receipt'} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-colors">
                                                                {hasReceipt ? <Pencil size={14} /> : <Wallet size={14} />}
                                                            </button>
                                                            {isAdmin && hasReceipt && (
                                                                <button onClick={() => handleClearReceipt(s)} title="Clear Receipt" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isRecording && (
                                                    <tr className="bg-primary/5">
                                                        <td colSpan={8} className="px-4 py-3 border-l-4 border-primary">
                                                            <form onSubmit={handleReceiptSubmit} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[10px] font-semibold uppercase text-slate-400">Received</label>
                                                                    <input type="number" step="0.01" min="0" value={receiptFormData.received_amount} onChange={(e) => handleReceivedChange(e.target.value)} placeholder="0" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-primary text-slate-900" />
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[10px] font-semibold uppercase text-slate-400">Deduction</label>
                                                                    <input type="number" step="0.01" min="0" value={receiptFormData.deduction_amount} onChange={(e) => handleDeductionChange(e.target.value)} placeholder="0" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-primary text-slate-900" />
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[10px] font-semibold uppercase text-slate-400">Payment Date</label>
                                                                    <input type="date" value={receiptFormData.payment_date} onChange={(e) => setReceiptFormData({ ...receiptFormData, payment_date: e.target.value })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-primary text-slate-900" />
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[10px] font-semibold uppercase text-slate-400">Bank Name</label>
                                                                    <input type="text" value={receiptFormData.bank_name} onChange={(e) => setReceiptFormData({ ...receiptFormData, bank_name: e.target.value })} placeholder="e.g. HSBC" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-primary text-slate-900" />
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[10px] font-semibold uppercase text-slate-400">Advice Ref. No.</label>
                                                                    <input type="text" value={receiptFormData.advice_reference_number} onChange={(e) => setReceiptFormData({ ...receiptFormData, advice_reference_number: e.target.value })} placeholder="Optional" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-primary text-slate-900" />
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[10px] font-semibold uppercase text-slate-400">Check No.</label>
                                                                    <input type="text" value={receiptFormData.check_no} onChange={(e) => setReceiptFormData({ ...receiptFormData, check_no: e.target.value })} placeholder="Optional" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-primary text-slate-900" />
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[10px] font-semibold uppercase text-slate-400">Check Date</label>
                                                                    <input type="date" value={receiptFormData.check_date} onChange={(e) => setReceiptFormData({ ...receiptFormData, check_date: e.target.value })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-primary text-slate-900" />
                                                                </div>
                                                                <div className="flex gap-2 justify-end">
                                                                    <button type="button" onClick={handleCloseReceiptForm} className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg hover:bg-white transition-colors">Cancel</button>
                                                                    <button type="submit" disabled={submittingReceipt} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50">
                                                                        {submittingReceipt ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                </div>
            </div>
        );
    };

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

                        <div className="min-w-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 w-full">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between min-w-0">
                                <div className="text-[14px] font-semibold uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                                    <FileText size={14} className="shrink-0" /><span className="truncate">Billed</span>
                                </div>
                                <div className="text-sm sm:text-base lg:text-md font-bold text-slate-900 break-all leading-tight">{formatCurrency(client.total_billed)}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between min-w-0">
                                <div className="text-[14px] font-semibold uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                                    <Wallet size={14} className="shrink-0" /><span className="truncate">Advance</span>
                                </div>
                                <div className="text-sm sm:text-base lg:text-md font-bold text-slate-900 break-all leading-tight">{formatCurrency(client.total_advance)}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between min-w-0">
                                <div className="text-[14px] font-semibold uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                                    <MinusCircle size={14} className="shrink-0" /><span className="truncate">Deduction</span>
                                </div>
                                <div className="text-sm sm:text-base lg:text-md font-bold text-slate-900 break-all leading-tight">{formatCurrency(client.total_deduction)}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between min-w-0">
                                <div className="text-[14px] font-semibold uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                                    <Coins size={14} className="shrink-0" /><span className="truncate">Payment Received</span>
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
                        renderExpanded={renderMilestonesPanel}
                        isRowExpanded={(b) => expandedBillId === b.id}
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

                            {hasPaidRows && (
                                <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 rounded-xl">
                                    <Lock size={14} className="shrink-0" />
                                    A receipt is already recorded — billed amount is locked, and milestones with a receipt can no longer have their percentage/amount changed or be removed (due date can still be corrected).
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
                                        <input type="number" step="0.01" min="0.01" required disabled={hasPaidRows} value={billFormData.gross_amount} onChange={(e) => handleGrossChange(e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 disabled:opacity-60" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Advance Payment</label>
                                        <input type="number" step="0.01" min="0" disabled={hasPaidRows} value={billFormData.advance_amount} onChange={(e) => handleAdvanceChange(e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 disabled:opacity-60" />
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
                                        {!hasPaidRows && (
                                            <div className="flex items-center gap-1.5">
                                                {PRESETS.map((preset) => (
                                                    <button key={preset.key} type="button" onClick={() => applyPreset(preset.splits)} className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-colors">
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-12 gap-2 px-0.5 mb-1">
                                        <span className="col-span-3 text-[10px] font-semibold uppercase text-slate-400">Installment</span>
                                        <span className="col-span-2 text-[10px] font-semibold uppercase text-slate-400">Percentage (%)</span>
                                        <span className="col-span-3 text-[10px] font-semibold uppercase text-slate-400">Amount</span>
                                        <span className="col-span-3 text-[10px] font-semibold uppercase text-slate-400">Due Date</span>
                                        <span className="col-span-1"></span>
                                    </div>

                                    <div className="space-y-2">
                                        {schedules.map((row, idx) => {
                                            const rowLocked = row.received_amount > 0 || row.deduction_amount > 0;
                                            return (
                                                <div key={row.id || idx} className="grid grid-cols-12 gap-2 items-center">
                                                    <input
                                                        type="text" disabled value={row.installment_label}
                                                        readOnly
                                                        placeholder="Label" className="col-span-3 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-primary text-slate-900 disabled:opacity-60"
                                                    />
                                                    <div className="col-span-2 relative">
                                                        <input
                                                            type="number" step="0.01" disabled={rowLocked} value={row.percentage}
                                                            onChange={(e) => updateRow(idx, 'percentage', e.target.value)}
                                                            placeholder="%" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-primary text-slate-900 disabled:opacity-60"
                                                        />
                                                    </div>
                                                    <input
                                                        type="number" step="0.01" required disabled value={row.expected_amount === '' ? '' : Number(row.expected_amount)}
                                                        readOnly
                                                        placeholder="Amount" className="col-span-3 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-primary text-slate-900 disabled:opacity-60"
                                                    />
                                                    <input
                                                        type="date" value={row.due_date}
                                                        onChange={(e) => updateRow(idx, 'due_date', e.target.value)}
                                                        className="col-span-3 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-primary text-slate-900"
                                                    />
                                                    <div className="col-span-1 flex justify-center">
                                                        {rowLocked ? (
                                                            <span title="A receipt has been recorded against this milestone — cannot be removed" className="p-1 text-slate-300">
                                                                <Lock size={13} />
                                                            </span>
                                                        ) : (
                                                            <button type="button" onClick={() => removeScheduleRow(idx)} disabled={schedules.length === 1} className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed flex justify-center">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button type="button" onClick={addScheduleRow} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover">
                                        <Plus size={14} /> Add Installment
                                    </button>

                                    <div className={`mt-3 flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        <span className="flex items-center gap-1.5">
                                            {isBalanced ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                            Milestone Total: {formatCurrency(scheduleTotal)} ({Number(percentageTotal.toFixed(2))}%)
                                        </span>
                                        <span>Net Receivable: {formatCurrency(netPayable)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                    <button type="button" onClick={handleCloseBillModal} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button type="submit" disabled={submittingBill || !isBalanced} className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50">
                                        {submittingBill ? <Loader2 size={16} className="animate-spin" /> : editingBillId ? 'Save Changes' : 'Submit'}
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
