import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logsService } from '../services/api';
import { Log } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';

const LogsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filters, setFilters] = useState({
    level: '' as '' | 'LOG' | 'ERROR' | 'WARN' | 'DEBUG' | 'VERBOSE',
    context: '',
    url: '',
    statusCode: '',
    search: '',
    startDate: '',
    endDate: '',
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filters.level) params.level = filters.level;
      if (filters.context) params.context = filters.context;
      if (filters.url) params.url = filters.url;
      if (filters.statusCode) params.statusCode = parseInt(filters.statusCode);
      if (filters.search) params.search = filters.search;
      if (filters.startDate) params.startDate = new Date(filters.startDate).toISOString();
      if (filters.endDate) params.endDate = new Date(filters.endDate).toISOString();

      const response = await logsService.getLogs(params);
      setLogs(response.logs || []);
      setPagination((prev) => ({
        ...prev,
        page: response.pagination?.page || prev.page,
        limit: response.pagination?.limit || prev.limit,
        total: response.pagination?.total || 0,
        totalPages: response.pagination?.totalPages || 0,
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت لاگ‌ها');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchStats = async () => {
    try {
      const statsData = await logsService.getLogStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [pagination.page, pagination.limit, fetchLogs]);

  // Fetch logs when filters change (debounced) - but not for search which has its own button
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!filters.search) { // Only auto-fetch if search is empty (search uses button)
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchLogs();
      }
    }, 500); // Debounce filter changes

    return () => clearTimeout(timer);
  }, [filters.level, filters.context, filters.url, filters.statusCode, filters.startDate, filters.endDate, fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchLogs();
        fetchStats();
      }, refreshInterval * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  useEffect(() => {
    if (logs.length > 0 && autoRefresh) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoRefresh]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      level: '',
      context: '',
      url: '',
      statusCode: '',
      search: '',
      startDate: '',
      endDate: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleLogClick = (log: Log) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'WARN':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DEBUG':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'VERBOSE':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading && !logs.length) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="سیستم لاگ‌ها"
        description="مشاهده و دیباگ لاگ‌های بکند، دیتابیس و فرانت"
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div 
            className="ios-card p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              handleFilterChange('level', '');
              handleFilterChange('context', '');
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            title="کلیک برای نمایش همه لاگ‌ها"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">کل لاگ‌ها</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total?.toLocaleString('fa-IR') || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div 
            className="ios-card p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              handleFilterChange('level', 'ERROR');
              handleFilterChange('context', '');
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            title="کلیک برای فیلتر خطاها"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">خطاها</p>
                <p className="text-2xl font-bold text-red-600">{stats.byLevel?.ERROR || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div 
            className="ios-card p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              handleFilterChange('level', 'WARN');
              handleFilterChange('context', '');
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            title="کلیک برای فیلتر هشدارها"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">هشدارها</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.byLevel?.WARN || 0}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div 
            className="ios-card p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              handleFilterChange('level', 'LOG');
              handleFilterChange('context', '');
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            title="کلیک برای فیلتر لاگ‌های عادی"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">لاگ‌های عادی</p>
                <p className="text-2xl font-bold text-green-600">{stats.byLevel?.LOG || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div 
            className="ios-card p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              handleFilterChange('level', '');
              // Filter by common database-related contexts
              const dbContexts = stats?.byContext?.filter((c: any) => {
                const ctx = (c?.context || '').toLowerCase();
                return ctx.includes('database') || ctx.includes('prisma') || ctx.includes('db') || ctx.includes('query');
              });
              if (dbContexts && dbContexts.length > 0 && dbContexts[0]?.context) {
                // Use the first database context found
                handleFilterChange('context', dbContexts[0].context);
              } else {
                // Fallback: search for database-related logs
                handleFilterChange('context', 'Prisma');
              }
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            title="کلیک برای فیلتر لاگ‌های دیتابیس"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">لاگ‌های دیتابیس</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(() => {
                    if (!stats?.byContext) return 0;
                    const dbContexts = stats.byContext.filter((c: any) => {
                      const ctx = (c?.context || '').toLowerCase();
                      return ctx.includes('database') || ctx.includes('prisma') || ctx.includes('db') || ctx.includes('query');
                    });
                    return dbContexts.reduce((sum: number, c: any) => sum + (c?.count || 0), 0);
                  })()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="ios-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">فیلترها</h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>به‌روزرسانی خودکار</span>
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="3">هر 3 ثانیه</option>
                <option value="5">هر 5 ثانیه</option>
                <option value="10">هر 10 ثانیه</option>
                <option value="30">هر 30 ثانیه</option>
                <option value="60">هر 1 دقیقه</option>
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">سطح لاگ</label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه</option>
              <option value="ERROR">خطا</option>
              <option value="WARN">هشدار</option>
              <option value="LOG">لاگ</option>
              <option value="DEBUG">دیباگ</option>
              <option value="VERBOSE">جزئیات</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">کانتکست</label>
            <input
              type="text"
              value={filters.context}
              onChange={(e) => handleFilterChange('context', e.target.value)}
              placeholder="مثال: HTTP, Database"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              type="text"
              value={filters.url}
              onChange={(e) => handleFilterChange('url', e.target.value)}
              placeholder="مثال: /api/users"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">کد وضعیت</label>
            <input
              type="number"
              value={filters.statusCode}
              onChange={(e) => handleFilterChange('statusCode', e.target.value)}
              placeholder="مثال: 200, 404, 500"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">جستجو در پیام</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              placeholder="جستجو..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">از تاریخ</label>
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تا تاریخ</label>
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              جستجو
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              پاک کردن
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="ios-card p-4 bg-red-50 border border-red-200">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Logs Table */}
      <div className="ios-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">زمان</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">سطح</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">کانتکست</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">پیام</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">متد</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">URL</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">کد وضعیت</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">مدت زمان</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    لاگی یافت نشد
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleLogClick(log)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.context || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate" title={log.message}>
                      {log.message}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.method || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={log.url}>
                      {log.url || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.statusCode ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.statusCode >= 500
                            ? 'bg-red-100 text-red-800'
                            : log.statusCode >= 400
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {log.statusCode}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(log.duration)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLogClick(log);
                        }}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        جزئیات
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              نمایش {((pagination.page - 1) * pagination.limit) + 1} تا {Math.min(pagination.page * pagination.limit, pagination.total)} از {pagination.total.toLocaleString('fa-IR')} لاگ
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                قبلی
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                صفحه {pagination.page} از {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                بعدی
              </button>
            </div>
          </div>
        )}
      </div>

      <div ref={logsEndRef} />

      {/* Log Detail Modal */}
      {isDetailModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={() => setIsDetailModalOpen(false)}>
          <div className="ios-card max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">جزئیات لاگ</h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سطح</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getLevelColor(selectedLog.level)}`}>
                    {selectedLog.level}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">زمان</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">کانتکست</label>
                  <p className="text-sm text-gray-900">{selectedLog.context || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">متد</label>
                  <p className="text-sm text-gray-900">{selectedLog.method || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <p className="text-sm text-gray-900 break-all">{selectedLog.url || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">کد وضعیت</label>
                  <p className="text-sm text-gray-900">{selectedLog.statusCode || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">مدت زمان</label>
                  <p className="text-sm text-gray-900">{formatDuration(selectedLog.duration)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP</label>
                  <p className="text-sm text-gray-900">{selectedLog.ip || '-'}</p>
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">پیام</label>
                  <button
                    onClick={() => copyToClipboard(selectedLog.message)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    کپی
                  </button>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap break-words">{selectedLog.message}</pre>
                </div>
              </div>

              {/* Error Stack */}
              {selectedLog.errorStack && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Stack Trace</label>
                    <button
                      onClick={() => copyToClipboard(selectedLog.errorStack || '')}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      کپی
                    </button>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-red-900 whitespace-pre-wrap break-words font-mono">{selectedLog.errorStack}</pre>
                  </div>
                </div>
              )}

              {/* Request Body */}
              {selectedLog.requestBody && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Request Body</label>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog.requestBody, null, 2))}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      کپی
                    </button>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-blue-900 whitespace-pre-wrap break-words font-mono">
                      {JSON.stringify(selectedLog.requestBody, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Response */}
              {selectedLog.response && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Response</label>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog.response, null, 2))}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      کپی
                    </button>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-green-900 whitespace-pre-wrap break-words font-mono">
                      {JSON.stringify(selectedLog.response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* User Agent */}
              {selectedLog.userAgent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-900 break-all">{selectedLog.userAgent}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;

