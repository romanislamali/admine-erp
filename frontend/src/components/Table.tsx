import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Edit2,
  Trash2,
  Lock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox
} from 'lucide-react';

export interface Column<T> {
  header: string;
  key: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
}

interface RoleRestrictedActions {
  view?: ('ADMIN' | 'MANAGER' | 'EMPLOYEE')[];
  edit?: ('ADMIN' | 'MANAGER' | 'EMPLOYEE')[];
  delete?: ('ADMIN' | 'MANAGER' | 'EMPLOYEE')[];
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T | string)[];
  searchPlaceholder?: string;
  initialItemsPerPage?: number;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  roles?: RoleRestrictedActions;
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;

  // Lazy loading props
  lazy?: boolean;
  totalRecords?: number;
  loading?: boolean;
  onLazyLoad?: (params: {
    page: number;
    limit: number;
    search: string;
    sortField: string | null;
    sortOrder: 'asc' | 'desc' | null;
  }) => void;
  actionsPosition?: 'first' | 'last';
}

export default function Table<T>({
  data,
  columns,
  searchKeys,
  searchPlaceholder = 'Search records...',
  initialItemsPerPage = 10,
  onView,
  onEdit,
  onDelete,
  roles,
  keyExtractor,
  emptyMessage = 'No records found.',
  lazy = false,
  totalRecords = 0,
  loading = false,
  onLazyLoad,
  actionsPosition = 'last'
}: TableProps<T>) {
  const { user } = useAuth();

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when search or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, itemsPerPage]);

  // Keep track of the last lazy load params to prevent duplicate calls and infinite loops.
  // Seeded with the table's own initial state (page 1, default page size, no search/sort) so the
  // mount-time effect below doesn't echo those same defaults back to the parent as a "change" —
  // the parent already fetches with its own matching initial state, so that echo was a pure duplicate.
  const lastParamsRef = useRef<{
    page: number;
    limit: number;
    search: string;
    sortField: string | null;
    sortOrder: 'asc' | 'desc' | null;
  } | null>({
    page: 1,
    limit: initialItemsPerPage,
    search: '',
    sortField: null,
    sortOrder: null
  });

  // Trigger onLazyLoad when table parameters change
  useEffect(() => {
    if (lazy && onLazyLoad) {
      const currentParams = {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchQuery,
        sortField: sortConfig?.key || null,
        sortOrder: (sortConfig?.direction || null) as 'asc' | 'desc' | null
      };

      const hasChanged = !lastParamsRef.current ||
        lastParamsRef.current.page !== currentParams.page ||
        lastParamsRef.current.limit !== currentParams.limit ||
        lastParamsRef.current.search !== currentParams.search ||
        lastParamsRef.current.sortField !== currentParams.sortField ||
        lastParamsRef.current.sortOrder !== currentParams.sortOrder;

      if (hasChanged) {
        lastParamsRef.current = currentParams;
        onLazyLoad(currentParams);
      }
    }
  }, [currentPage, itemsPerPage, debouncedSearchQuery, sortConfig, lazy, onLazyLoad]);

  // Authorization helper
  const isAuthorized = (action: 'view' | 'edit' | 'delete') => {
    if (!user) return false;
    const allowed = roles?.[action];
    if (!allowed) return true; // default to true if no role restrictions are defined
    return allowed.includes(user.role);
  };

  // Render actions cell (supports view, edit, delete, with RBAC rules)
  const renderActionsCell = (row: T) => {
    if (!showActions) return null;
    return (
      <td className={`px-6 py-3.5 text-center bg-slate-50/10 ${actionsPosition === 'first' ? 'border-r' : 'border-l'} border-slate-100/40`}>
        <div className="flex gap-1.5 justify-center items-center">
          {onView && (
            isAuthorized('view') ? (
              <button
                onClick={() => onView(row)}
                title="View details"
                className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-all border border-transparent hover:border-slate-100 active:scale-95"
              >
                <Eye size={15} />
              </button>
            ) : (
              <kbd
                title="Deauthorized (View permission required)"
                className="p-1.5 text-slate-300 cursor-not-allowed flex items-center justify-center relative group"
              >
                <Eye size={15} className="opacity-40" />
                <Lock size={8} className="absolute bottom-0.5 right-0.5 text-rose-500" />
              </kbd>
            )
          )}

          {onEdit && (
            isAuthorized('edit') ? (
              <button
                onClick={() => onEdit(row)}
                title="Edit record"
                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-slate-50 rounded transition-colors"
              >
                <Edit2 size={15} />
              </button>
            ) : (
              <kbd
                title="Deauthorized (Edit permission required)"
                className="p-1.5 text-slate-300 cursor-not-allowed flex items-center justify-center relative"
              >
                <Edit2 size={15} className="opacity-40" />
                <Lock size={8} className="absolute bottom-0.5 right-0.5 text-rose-500" />
              </kbd>
            )
          )}

          {onDelete && (
            isAuthorized('delete') ? (
              <button
                onClick={() => onDelete(row)}
                title="Delete record"
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100 active:scale-95"
              >
                <Trash2 size={15} />
              </button>
            ) : (
              <kbd
                title="Deauthorized (Delete permission required)"
                className="p-1.5 text-slate-300 cursor-not-allowed flex items-center justify-center relative"
              >
                <Trash2 size={15} className="opacity-40" />
                <Lock size={8} className="absolute bottom-0.5 right-0.5 text-rose-500" />
              </kbd>
            )
          )}
        </div>
      </td>
    );
  };

  // 1. Filter data based on search (only client-side)
  const filteredData = useMemo(() => {
    if (lazy) return data;
    if (!searchQuery.trim()) return data;

    return data.filter((row: any) => {
      const targets = searchKeys || Object.keys(row);
      return targets.some((k) => {
        const val = row[k];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(searchQuery.toLowerCase().trim());
      });
    });
  }, [data, searchQuery, searchKeys, lazy]);

  // 2. Sort filtered data (only client-side)
  const sortedData = useMemo(() => {
    if (lazy) return data;
    const sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Resolve nested renders or customized string conversions if any
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig, lazy]);

  // 3. Segment for Pagination (only client-side)
  const paginatedData = useMemo(() => {
    if (lazy) return data;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage, lazy, data]);

  const totalPages = lazy
    ? Math.ceil(totalRecords / itemsPerPage)
    : Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (key: string, sortable?: boolean) => {
    if (sortable === false) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handlePageChange = (pageNum: number) => {
    setCurrentPage(Math.max(1, Math.min(pageNum, totalPages)));
  };

  // Determine alignment tailwind classes
  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'right') return 'text-right justify-end';
    if (align === 'center') return 'text-center justify-center';
    return 'text-left justify-start';
  };

  // Render sorting indicators
  const renderSortIndicator = (key: string, sortable?: boolean) => {
    if (sortable === false) return null;
    const isCurrent = sortConfig?.key === key;

    return (
      <span className="p-0.5 ml-1 inline-flex text-slate-400 group-hover:text-slate-600 transition-colors">
        {!isCurrent ? (
          <ArrowUpDown size={13} className="opacity-40" />
        ) : sortConfig.direction === 'asc' ? (
          <ArrowUp size={13} className="text-primary font-bold animate-pulse" />
        ) : (
          <ArrowDown size={13} className="text-primary font-bold animate-pulse" />
        )}
      </span>
    );
  };

  // Check if we need to show actions column
  const showActions = !!(onView || onEdit || onDelete);

  const recordCount = lazy ? totalRecords : sortedData.length;

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full sm:w-100">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
          />
        </div>

        {/* Right side page size selector */}
        <div className="flex gap-2 w-full sm:w-auto items-center justify-end">
          <span className="text-slate-400 text-xs font-semibold uppercase shrink-0 whitespace-nowrap">Page Size:</span>
          <div className="relative">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
              }}
              className="appearance-none pl-3 pr-8 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-xs bg-slate-50 focus:bg-white transition-all text-slate-900"
            >
              <option value={5}>5 records</option>
              <option value={10}>10 records</option>
              <option value={15}>15 records</option>
              <option value={20}>20 records</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Main Table Card wrapper */}
      <div className="bg-white border border-slate-200/95 rounded-2xl overflow-hidden shadow-xs relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-slate-50/50 text-slate-500 text-xs font-extrabold uppercase tracking-wider select-none">
                {showActions && actionsPosition === 'first' && (
                  <th className="px-6 py-4 text-center font-semibold text-slate-500 text-xs w-32 border-r border-slate-100/60 bg-slate-50/20">
                    Actions
                  </th>
                )}
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    onClick={() => handleSort(col.key, col.sortable)}
                    className={`px-6 py-4 font-semibold text-slate-500 text-xs ${col.sortable !== false ? 'cursor-pointer hover:bg-slate-100/50 group transition-colors' : ''} ${col.headerClassName || ''}`}
                  >
                    <div className={`flex items-center ${getAlignClass(col.align)}`}>
                      <span>{col.header}</span>
                      {renderSortIndicator(col.key, col.sortable)}
                    </div>
                  </th>
                ))}
                {showActions && actionsPosition === 'last' && (
                  <th className="px-6 py-4 text-center font-semibold text-slate-500 text-xs w-32 border-l border-slate-100/60 bg-slate-50/20">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  Array.from({ length: itemsPerPage }).map((_, rIdx) => (
                    <tr key={`sk-${rIdx}`} className="animate-pulse">
                      {showActions && actionsPosition === 'first' && (
                        <td className="px-6 py-4 border-r border-slate-100/40">
                          <div className="h-4 bg-slate-200/60 rounded w-1/2 mx-auto"></div>
                        </td>
                      )}
                      {columns.map((_, cIdx) => (
                        <td key={`sk-col-${cIdx}`} className="px-6 py-4">
                          <div className="h-4 bg-slate-200/60 rounded w-2/3"></div>
                        </td>
                      ))}
                      {showActions && actionsPosition === 'last' && (
                        <td className="px-6 py-4 border-l border-slate-100/40">
                          <div className="h-4 bg-slate-200/60 rounded w-1/2 mx-auto"></div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (showActions ? 1 : 0)} className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Inbox size={36} className="text-slate-300 stroke-[1.5]" />
                        <span className="font-medium text-slate-500">{emptyMessage}</span>
                        <span className="text-xs text-slate-400">Try modifying your query or filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row) => (
                    <motion.tr
                      key={keyExtractor(row)}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-100/60 border-b border-slate-200 transition-colors"
                      transition={{ duration: 0.15 }}
                    >
                      {actionsPosition === 'first' && renderActionsCell(row)}
                      {columns.map((col, idx) => (
                        <td
                          key={idx}
                          className={`px-6 py-3.5 text-slate-600 font-medium ${col.className || ''}`}
                        >
                          <div className={`flex items-center ${getAlignClass(col.align)}`}>
                            {col.render ? col.render(row) : (row as any)[col.key] ?? '—'}
                          </div>
                        </td>
                      ))}
                      {actionsPosition === 'last' && renderActionsCell(row)}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white border border-slate-200/90 px-4 py-3 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Showing <span className="text-slate-700 font-bold">{recordCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="text-slate-700 font-bold">
              {Math.min(currentPage * itemsPerPage, recordCount)}
            </span>{' '}
            of <span className="text-slate-700 font-bold">{recordCount}</span> records
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Sliding window of visible pages for premium design feel
              const isStart = page === 1;
              const isEnd = page === totalPages;
              const isWithinRange = Math.abs(page - currentPage) <= 1;

              if (!isStart && !isEnd && !isWithinRange) {
                if (page === 2 || page === totalPages - 1) {
                  return (
                    <span key={page} className="px-1 text-slate-400 text-xs">
                      ...
                    </span>
                  );
                }
                return null;
              }

              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${currentPage === page
                    ? 'bg-primary text-white shadow-md shadow-primary/10'
                    : 'border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                    }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
