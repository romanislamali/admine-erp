import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
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
  emptyMessage = 'No records found.'
}: TableProps<T>) {
  const { user } = useAuth();
  
  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Authorization helper
  const isAuthorized = (action: 'view' | 'edit' | 'delete') => {
    if (!user) return false;
    const allowed = roles?.[action];
    if (!allowed) return true; // default to true if no role restrictions are defined
    return allowed.includes(user.role);
  };

  // 1. Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    
    return data.filter((row: any) => {
      const targets = searchKeys || Object.keys(row);
      return targets.some((k) => {
        const val = row[k];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(searchQuery.toLowerCase().trim());
      });
    });
  }, [data, searchQuery, searchKeys]);

  // 2. Sort filtered data
  const sortedData = useMemo(() => {
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
  }, [filteredData, sortConfig]);

  // 3. Segment for Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

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

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // reset to first page on search
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
          />
        </div>
        
        {/* Right side page size selector */}
        <div className="flex gap-2 w-full sm:w-auto items-center justify-end">
          <span className="text-slate-400 text-xs font-semibold uppercase shrink-0 whitespace-nowrap">Page Size:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-xs bg-slate-50 focus:bg-white transition-all text-slate-900"
          >
            <option value={5}>5 records</option>
            <option value={10}>10 records</option>
            <option value={20}>20 records</option>
            <option value={50}>50 records</option>
          </select>
        </div>
      </div>

      {/* Main Table Card wrapper */}
      <div className="bg-white border border-slate-200/95 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-slate-50/50 text-slate-500 text-xs font-extrabold uppercase tracking-wider select-none">
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
                {showActions && (
                  <th className="px-6 py-4 text-center font-semibold text-slate-500 text-xs w-32 border-l border-slate-100/60 bg-slate-50/20">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              <AnimatePresence mode="popLayout">
                {paginatedData.length === 0 ? (
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

                      {/* Action buttons with custom styles and role authorization locks */}
                      {showActions && (
                        <td className="px-6 py-3.5 text-center border-l border-slate-100/40 bg-slate-50/10">
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
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-all border border-transparent hover:border-indigo-100/50 active:scale-95"
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
                      )}
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
            Showing <span className="text-slate-700 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="text-slate-700 font-bold">
              {Math.min(currentPage * itemsPerPage, sortedData.length)}
            </span>{' '}
            of <span className="text-slate-700 font-bold">{sortedData.length}</span> records
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    currentPage === page
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
              disabled={currentPage === totalPages}
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
