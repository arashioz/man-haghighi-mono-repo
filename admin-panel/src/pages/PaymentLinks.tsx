import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import MobileModal from '../components/MobileModal';
import { MobileFormField, MobileInput, MobileSelect, MobileButton } from '../components/MobileForm';
import MobileCard from '../components/MobileCard';
import { paymentsService, usersService, workshopsService, coursesService, settingsService, API_ORIGIN } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatPersianDateTime } from '../utils/dateUtils';
import { formatAmountInToman, formatAmountInRial, parseTomanAmount } from '../utils/currencyUtils';
import { Workshop, Course } from '../types';
import { getImageUrl } from '../utils/imageUtils';

interface PaymentLink {
  id: string;
  linkCode: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  description?: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName?: string;
    lastName?: string;
    username: string;
  };
  invoices?: Array<{
    id: string;
    status: string;
    paidAt?: string;
    transactions?: Array<{
      id: string;
      status: string;
      createdAt: string;
    }>;
  }>;
}

const PaymentLinks: React.FC = () => {
  const { user } = useAuth();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'paid'>('all');
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string>('');
  const [customerLinks, setCustomerLinks] = useState<PaymentLink[]>([]);
  const [isCustomerLinksModalOpen, setIsCustomerLinksModalOpen] = useState(false);
  const [expandedPhones, setExpandedPhones] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<any>(null);
  const [existingCustomerLinks, setExistingCustomerLinks] = useState<PaymentLink[]>([]);
  const [loadingCustomerLinks, setLoadingCustomerLinks] = useState(false);

  // Loading states for operations
  const [toggleLinkLoading, setToggleLinkLoading] = useState<string | null>(null);
  const [copyLoading, setCopyLoading] = useState<string | null>(null);
  const [createLinkLoading, setCreateLinkLoading] = useState(false);

  const [newLink, setNewLink] = useState({
    customerName: '',
    customerMobile: '',
    amount: '',
    description: '',
    workshopId: '',
    courseId: '',
  });

  // Aggregate payment link fields
  const [isAggregateLink, setIsAggregateLink] = useState(false);
  const [aggregateCount, setAggregateCount] = useState('');

  // Customer history state
  const [customerHistory, setCustomerHistory] = useState<any>(null);
  const [loadingCustomerHistory, setLoadingCustomerHistory] = useState(false);

  // Formatted amount for display
  const [formattedAmount, setFormattedAmount] = useState('');
  const [availableWorkshops, setAvailableWorkshops] = useState<Workshop[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [linkType, setLinkType] = useState<'manual' | 'workshop' | 'course'>('manual');

  // Validation states
  const [nameError, setNameError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');

  // New customer creation
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [phoneCheckLoading, setPhoneCheckLoading] = useState(false);
  const [customerExists, setCustomerExists] = useState<boolean | null>(null);
  const [newCustomerData, setNewCustomerData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchPaymentLinks();
    fetchAvailableItems();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchAvailableItems = async () => {
    try {
      if (user?.role === 'SALES_PERSON') {
        // For sales persons, get only accessible workshops
        const workshops = await workshopsService.getSalesPersonAccessible();
        setAvailableWorkshops(workshops);
      } else if (user?.role === 'SALES_MANAGER' || user?.role === 'ADMIN') {
        // For managers and admins, get all active workshops and published courses
        const [workshops, courses] = await Promise.all([
          workshopsService.getActive(),
          coursesService.getPublished(),
        ]);
        setAvailableWorkshops(workshops);
        setAvailableCourses(courses);
      }
    } catch (err: any) {
      console.error('Error fetching available items:', err);
    }
  };

  const fetchPaymentLinks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await paymentsService.getPaymentLinks();
      setPaymentLinks(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت لینک‌های پرداخت');
    } finally {
      setLoading(false);
    }
  };

  const checkPhoneExists = async (phone: string) => {
    if (!phone || !/^09[0-9]{9}$/.test(phone)) return null;

    try {
      setPhoneCheckLoading(true);
      const response = await usersService.checkPhoneExists(phone);
      setCustomerExists(response.exists);

      // If customer exists, fetch their payment links
      if (response.exists) {
        setLoadingCustomerLinks(true);
        try {
          const links = await paymentsService.getCustomerPaymentLinks(phone);
          setExistingCustomerLinks(links);
        } catch (error) {
          console.error('Error fetching customer links:', error);
          setExistingCustomerLinks([]);
        } finally {
          setLoadingCustomerLinks(false);
        }
      } else {
        setExistingCustomerLinks([]);
      }

      return response.exists;
    } catch (error) {
      console.error('Error checking phone:', error);
      setCustomerExists(null);
      setExistingCustomerLinks([]);
      return null;
    } finally {
      setPhoneCheckLoading(false);
    }
  };

  const handlePhoneChange = async (phone: string) => {
    setNewLink({...newLink, customerMobile: phone});

    if (phone.length === 11 && /^09[0-9]{9}$/.test(phone)) {
      const exists = await checkPhoneExists(phone);
      if (exists === true) {
        // Phone exists, try to get customer info and auto-fill name
        try {
          const customer = await usersService.getUserByPhone(phone);
          if (customer && customer.firstName) {
            // Auto-fill customer name from existing user data
            const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();
            setNewLink(prev => ({
              ...prev,
              customerMobile: phone,
              customerName: fullName
            }));
            console.log(`Auto-filled customer name: ${fullName}`);
          }

          // Fetch customer payment history
          setLoadingCustomerHistory(true);
          try {
            const history = await paymentsService.getCustomerPaymentHistory(phone);
            setCustomerHistory(history);
          } catch (error) {
            console.error('Error fetching customer history:', error);
            setCustomerHistory(null);
          } finally {
            setLoadingCustomerHistory(false);
          }
        } catch (error) {
          console.error('Error fetching customer info:', error);
          // Even if we can't fetch customer info, keep the phone number
          setNewLink(prev => ({
            ...prev,
            customerMobile: phone
          }));
          // Show a warning that name couldn't be auto-filled
          console.warn('Could not auto-fill customer name. User may need to enter it manually.');
        }
      } else if (exists === false) {
        // Phone doesn't exist, clear name and show new customer modal
        setNewLink(prev => ({...prev, customerMobile: phone, customerName: ''}));
        setIsNewCustomerModalOpen(true);
        setCustomerHistory(null);
      }
    } else {
      // Invalid phone, clear name and customer data
      setNewLink(prev => ({...prev, customerMobile: phone, customerName: ''}));
      setCustomerExists(null);
      setExistingCustomerLinks([]);
      setCustomerHistory(null);
    }
  };

  const handleCreateNewCustomer = async () => {
    if (!newLink.customerMobile || !newCustomerData.firstName || !newCustomerData.password) {
      setError('تمام فیلدها را پر کنید');
      return;
    }

    if (newCustomerData.password !== newCustomerData.confirmPassword) {
      setError('رمز عبور و تأیید آن یکسان نیستند');
      return;
    }

    try {
      await usersService.createCustomer({
        firstName: newCustomerData.firstName,
        lastName: newCustomerData.lastName,
        phone: newLink.customerMobile,
        password: newCustomerData.password,
        confirmPassword: newCustomerData.confirmPassword,
        role: 'USER',
      });

      setIsNewCustomerModalOpen(false);
      setCustomerExists(true);
      setNewCustomerData({
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '',
      });

      // Show success message
      alert('مشتری جدید با موفقیت ایجاد شد!');
    } catch (error: any) {
      setError(error.response?.data?.message || 'خطا در ایجاد مشتری جدید');
    }
  };

  // Format amount with thousand separators
  const formatAmountInput = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return Number(numericValue).toLocaleString('fa-IR');
  };

  

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreateLinkLoading(true);

    try {
      // Parse amount as Toman and validate
      let amountInRial: number;
      try {
        amountInRial = parseTomanAmount(newLink.amount);
      } catch (error) {
        setError('مبلغ وارد شده معتبر نیست');
        return;
      }

      if (amountInRial < 1000) { // 100 Toman = 1000 Rial
        setError('مبلغ باید حداقل 100 تومان باشد');
        return;
      }

      if (!/^09[0-9]{9}$/.test(newLink.customerMobile)) {
        setError('شماره موبایل نامعتبر است');
        return;
      }

      let description = newLink.description || '';
      if (linkType === 'workshop' && newLink.workshopId) {
        const workshop = availableWorkshops.find(w => w.id === newLink.workshopId);
        description = `پرداخت کارگاه: ${workshop?.title}${description ? ` - ${description}` : ''}`;
      } else if (linkType === 'course' && newLink.courseId) {
        const course = availableCourses.find(c => c.id === newLink.courseId);
        description = `پرداخت دوره: ${course?.title}${description ? ` - ${description}` : ''}`;
      }

      await paymentsService.createPaymentLink({
        customerName: newLink.customerName,
        customerMobile: newLink.customerMobile,
        amount: amountInRial, // Amount is already in Rial for API
        description: description || undefined,
        workshopTitle: linkType === 'workshop' && newLink.workshopId ?
          availableWorkshops.find(w => w.id === newLink.workshopId)?.title : undefined,
        isAggregate: isAggregateLink,
        aggregateCount: isAggregateLink ? parseInt(aggregateCount) : undefined,
      });

      setIsCreateModalOpen(false);
      setNewLink({
        customerName: '',
        customerMobile: '',
        amount: '',
        description: '',
        workshopId: '',
        courseId: '',
      });
      setLinkType('manual');
      await fetchPaymentLinks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در ایجاد لینک پرداخت');
    } finally {
      setCreateLinkLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return formatAmountInToman(amount);
  };

  const getPaymentUrl = (linkCode: string) => {
    // Use main site URL instead of admin panel URL
    // Convert admin.manehaghighi.com or api.manehaghighi.com to manehaghighi.com
    let siteUrl = API_ORIGIN;
    if (siteUrl.includes('admin.manehaghighi.com')) {
      siteUrl = siteUrl.replace('admin.manehaghighi.com', 'manehaghighi.com');
    } else if (siteUrl.includes('api.manehaghighi.com')) {
      siteUrl = siteUrl.replace('api.manehaghighi.com', 'manehaghighi.com');
    } else if (siteUrl.includes('api.')) {
      // For other domains, remove api. subdomain
      siteUrl = siteUrl.replace(/api\./, '');
    }

    return `${siteUrl}/api/payments/pay/${linkCode}`;
  };

  const copyToClipboard = async (link: string, customerName: string, amount: number, linkId: string, message: string = 'کپی شد!') => {
    setCopyLoading(linkId);
    let textToCopy = link;

    // Use message template if enabled
    if (settings?.messageTemplateEnabled && settings?.messageTemplateText) {
      textToCopy = settings.messageTemplateText
        .replace(/\{name\}/g, customerName)
        .replace(/\{amount\}/g, formatAmountInToman(amount))
        .replace(/\{link\}/g, link);
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      alert(message);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(message);
    } finally {
      setCopyLoading(null);
    }
  };

  const sendWhatsApp = (phone: string, name: string, amount: number, link: string) => {
    const cleanPhone = phone.startsWith('0') ? phone.substring(1) : phone;
    const whatsappPhone = `98${cleanPhone}`;

    let message = `سلام ${name}\nمبلغ پرداختی: ${formatAmountInToman(amount)} تومان (${formatAmountInRial(amount)} ریال)\nلینک پرداخت:\n${link}`;

    // Use WhatsApp template if enabled
    if (settings?.messageTemplateEnabled && settings?.whatsappTemplateText) {
      message = settings.whatsappTemplateText
        .replace(/\{name\}/g, name)
        .replace(/\{amount\}/g, formatAmountInToman(amount))
        .replace(/\{link\}/g, link);
    }

    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const getPaymentStatus = (link: PaymentLink): 'paid' | 'pending' | 'failed' => {
    // Check if invoice has PAID status
    const paidInvoice = link.invoices?.find(inv => inv.status === 'PAID');
    if (paidInvoice) {
      return 'paid';
    }

    // Check if there's a transaction with PAID status
    const paidTransaction = link.invoices?.some(inv => 
      inv.transactions?.some((t: any) => t.status === 'PAID')
    );
    if (paidTransaction) {
      return 'paid';
    }

    // Check if there's a pending transaction
    const pendingTransaction = link.invoices?.some(inv => 
      inv.transactions?.some((t: any) => t.status === 'PENDING')
    );
    if (pendingTransaction) {
      return 'pending';
    }

    return 'pending';
  };

  const openCustomerLinksModal = async (phone: string, name: string) => {
    try {
      setLoading(true);
      const links = await paymentsService.getCustomerPaymentLinks(phone);
      setCustomerLinks(links);
      setSelectedCustomerPhone(phone);
      setIsCustomerLinksModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت لینک‌های مشتری');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLink = async (linkId: string) => {
    setToggleLinkLoading(linkId);
    try {
      await paymentsService.togglePaymentLink(linkId);
      await fetchPaymentLinks();
      // Also refresh customer links if modal is open
      if (isCustomerLinksModalOpen && selectedCustomerPhone) {
        const links = await paymentsService.getCustomerPaymentLinks(selectedCustomerPhone);
        setCustomerLinks(links);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در تغییر وضعیت لینک');
    } finally {
      setToggleLinkLoading(null);
    }
  };

  const togglePhoneExpansion = (phone: string) => {
    const newExpanded = new Set(expandedPhones);
    if (newExpanded.has(phone)) {
      newExpanded.delete(phone);
    } else {
      newExpanded.add(phone);
    }
    setExpandedPhones(newExpanded);
  };

  // Validation functions
  const validateName = (name: string): string => {
    if (!name.trim()) return '';

    // Check if name contains numbers or phone-like patterns
    const hasNumbers = /\d/.test(name);
    const looksLikePhone = /^(\+98|0)?9\d{9}$/.test(name.replace(/\s/g, ''));

    if (hasNumbers || looksLikePhone) {
      return 'نام و نام خانوادگی نمی‌تواند شامل عدد یا شماره تلفن باشد';
    }

    // Check for very short names (less than 2 characters)
    if (name.trim().length < 2) {
      return 'نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد';
    }

    return '';
  };

  const handleNameChange = (name: string) => {
    const error = validateName(name);
    setNameError(error);
    setNewLink({...newLink, customerName: name});
  };

  const handleFirstNameChange = (firstName: string) => {
    const error = validateName(firstName);
    setFirstNameError(error);
    setNewCustomerData({...newCustomerData, firstName});
  };

  const handleLastNameChange = (lastName: string) => {
    const error = validateName(lastName);
    setLastNameError(error);
    setNewCustomerData({...newCustomerData, lastName});
  };

  const getGroupedLinks = () => {
    let filtered = Array.isArray(paymentLinks) ? paymentLinks : [];

    if (searchTerm) {
      filtered = filtered.filter(
        link =>
          link.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.customerPhone.includes(searchTerm) ||
          link.linkCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (filterStatus) {
      case 'active':
        filtered = filtered.filter(link => link.isActive);
        break;
      case 'inactive':
        filtered = filtered.filter(link => !link.isActive);
        break;
      case 'paid':
        filtered = filtered.filter(link => getPaymentStatus(link) === 'paid');
        break;
    }

    // Group links by phone number
    const grouped = filtered.reduce((acc, link) => {
      const phone = link.customerPhone;
      if (!acc[phone]) {
        acc[phone] = {
          phone,
          customerName: link.customerName,
          links: [],
          totalAmount: 0,
          activeLinks: 0,
          paidLinks: 0,
          lastCreated: link.createdAt,
        };
      }

      acc[phone].links.push(link);
      acc[phone].totalAmount += link.amount;
      if (link.isActive) acc[phone].activeLinks++;
      if (getPaymentStatus(link) === 'paid') acc[phone].paidLinks++;
      if (new Date(link.createdAt) > new Date(acc[phone].lastCreated)) {
        acc[phone].lastCreated = link.createdAt;
      }

      return acc;
    }, {} as Record<string, {
      phone: string;
      customerName: string;
      links: PaymentLink[];
      totalAmount: number;
      activeLinks: number;
      paidLinks: number;
      lastCreated: string;
    }>);

    return Object.values(grouped).sort((a, b) => new Date(b.lastCreated).getTime() - new Date(a.lastCreated).getTime());
  };

  const getStats = () => {
    const links = Array.isArray(paymentLinks) ? paymentLinks : [];
    const total = links.length;
    const active = links.filter(l => l.isActive).length;
    const paid = links.filter(l => l.invoices?.some(inv => inv.status === 'PAID')).length;
    const totalAmount = links.reduce((sum, link) => sum + link.amount, 0);
    const paidAmount = links
      .filter(l => l.invoices?.some(inv => inv.status === 'PAID'))
      .reduce((sum, link) => sum + link.amount, 0);

    return { total, active, paid, totalAmount, paidAmount };
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const stats = getStats();

  const isInDashboard = window.location.pathname.includes('sales-dashboard');

  return (
    <div>
      {!isInDashboard && (
        <PageHeader
          title="لینک‌های پرداخت"
          description="مدیریت و ایجاد لینک‌های پرداخت برای مشتریان"
          action={
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              ایجاد لینک پرداخت
            </button>
          }
        />
      )}
      
      {isInDashboard && (
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">لینک‌های پرداخت</h2>
            <p className="text-gray-600 mt-1">مدیریت و ایجاد لینک‌های پرداخت برای مشتریان</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            ایجاد لینک پرداخت
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 animate-fade-in">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* آمار کلی - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <h3 className="text-xs sm:text-sm font-medium opacity-90">کل لینک‌ها</h3>
            <svg className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <p className="text-xl sm:text-3xl font-bold">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <h3 className="text-xs sm:text-sm font-medium opacity-90">فعال</h3>
            <svg className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl sm:text-3xl font-bold">{stats.active}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <h3 className="text-xs sm:text-sm font-medium opacity-90">پرداخت شده</h3>
            <svg className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-xl sm:text-3xl font-bold">{stats.paid}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <h3 className="text-xs sm:text-sm font-medium opacity-90">کل فروش</h3>
            <svg className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg sm:text-3xl font-bold break-all">{formatAmountInToman(stats.paidAmount)}</p>
        </div>
      </div>

      {/* فیلتر و جستجو */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="جستجو بر اساس نام، موبایل یا کد لینک..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="md:w-64">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
              <option value="paid">پرداخت شده</option>
            </select>
          </div>
        </div>
      </div>

      {/* لیست لینک‌ها */}
      {(() => {
        const groupedLinks = getGroupedLinks();
        return groupedLinks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
            <EmptyState
              icon={
                <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              }
              title="لینک پرداختی یافت نشد"
              description={searchTerm ? 'نتیجه‌ای برای جستجوی شما یافت نشد' : 'هنوز لینک پرداختی ایجاد نشده است'}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">مشتری</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">تعداد لینک</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">مجموع مبلغ</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">آمار لینک‌ها</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">آخرین فعالیت</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">عملیات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupedLinks.map((group) => (
                    <tr key={group.phone} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <button
                            onClick={() => togglePhoneExpansion(group.phone)}
                            className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <svg
                              className={`w-4 h-4 transform transition-transform ${expandedPhones.has(group.phone) ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {group.customerName?.[0] || '?'}
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">{group.customerName}</div>
                            <div className="text-sm text-gray-500">{group.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                          {group.links.length} لینک
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{formatAmountInToman(group.totalAmount)} تومان</div>
                        <div className="text-sm text-gray-500">{formatAmountInRial(group.totalAmount)} ریال</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {group.activeLinks} فعال
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              {group.paidLinks} پرداخت شده
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPersianDateTime(group.lastCreated)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openCustomerLinksModal(group.phone, group.customerName)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="مشاهده همه لینک‌ها"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* لینک‌های گسترده شده */}
      {getGroupedLinks().map((group) => {
        if (!expandedPhones.has(group.phone)) return null;

        return (
          <div key={`expanded-${group.phone}`} className="bg-white rounded-2xl shadow-lg border border-gray-200 mt-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">
                  لینک‌های پرداخت {group.customerName} ({group.phone})
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">مبلغ</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">وضعیت لینک</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">وضعیت پرداخت</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">تاریخ ایجاد</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">عملیات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.links.map((link) => {
                    const paymentUrl = getPaymentUrl(link.linkCode);
                    const isPaid = link.invoices?.some(inv => inv.status === 'PAID');

                    return (
                      <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{formatAmountInToman(link.amount)} تومان</div>
                          <div className="text-sm text-gray-500">{formatAmountInRial(link.amount)} ریال</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            link.isActive
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {link.isActive ? '🟢 فعال' : '⚫ غیرفعال'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const paymentStatus = getPaymentStatus(link);
                            return (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                paymentStatus === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : paymentStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {paymentStatus === 'paid' ? '✅ پرداخت شده' : paymentStatus === 'pending' ? '⏳ در انتظار' : '❌ ناموفق'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPersianDateTime(link.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleLink(link.id)}
                          disabled={toggleLinkLoading === link.id}
                          className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                            link.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={link.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                        >
                          {toggleLinkLoading === link.id && (
                            <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                          )}
                          {link.isActive ? 'غیرفعال' : 'فعال'}
                        </button>
                        <button
                          onClick={() => copyToClipboard(paymentUrl, link.customerName, link.amount, link.id, 'پیام کپی شد!')}
                          disabled={copyLoading === link.id}
                          className="text-purple-600 hover:text-purple-900 p-2 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="کپی پیام"
                        >
                          {copyLoading === link.id && (
                            <div className="animate-spin rounded-full h-4 w-4 border border-current border-t-transparent"></div>
                          )}
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                            <button
                              onClick={() => sendWhatsApp(link.customerPhone, link.customerName, link.amount, paymentUrl)}
                              className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors"
                              title="ارسال واتساپ"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* مودال ایجاد لینک */}
      <MobileModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewLink({
            customerName: '',
            customerMobile: '',
            amount: '',
            description: '',
            workshopId: '',
            courseId: '',
          });
          setFormattedAmount('');
          setLinkType('manual');
          setIsAggregateLink(false);
          setAggregateCount('');
          setError('');
          setCustomerExists(null);
          setExistingCustomerLinks([]);
          setCustomerHistory(null);
        }}
        title="ایجاد لینک پرداخت جدید"
      >
        <form onSubmit={handleCreateLink} className="space-y-4">
          {/* شماره موبایل - اول */}
          <MobileFormField label="شماره موبایل مشتری" required>
            <MobileInput
              type="text"
              value={newLink.customerMobile}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, '');
                if (value.length <= 11) {
                  handlePhoneChange(value);
                }
              }}
              icon={phoneCheckLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              ) : customerExists !== null ? (
                customerExists ? (
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )
              ) : undefined}
              placeholder="09123456789"
              pattern="09[0-9]{9}"
              required
            />
            {customerExists === false && (
              <p className="text-sm text-orange-600 mt-1 flex items-center">
                <svg className="h-4 w-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                این شماره در سیستم وجود ندارد. مشتری جدید ایجاد خواهد شد.
              </p>
            )}
            {customerExists === true && (
              <div className="mt-1">
                <p className="text-sm text-green-600 flex items-center mb-2">
                <svg className="h-4 w-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                  مشتری موجود در سیستم {newLink.customerName ? `(${newLink.customerName})` : ''}
              </p>

getImageUrl                {/* Customer History */}
                {loadingCustomerHistory ? (
                  <div className="text-xs text-gray-500 flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-gray-500 ml-2"></div>
                    در حال دریافت سابقه مشتری...
                  </div>
                ) : customerHistory && customerHistory.exists ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-medium text-green-800">
                          💰 سابقه پرداخت مشتری
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          مجموع پرداخت شده: {formatAmount(customerHistory.summary.totalPaid)} تومان
                        </p>
                      </div>
                    </div>

                    {/* Workshops Summary */}
                    {customerHistory.workshops.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-green-800 mb-1">🏢 کارگاه‌های شرکت کرده:</p>
                        <div className="space-y-1">
                          {customerHistory.workshops.slice(0, 2).map((workshop: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-xs bg-green-100 rounded p-2">
                              <div>
                                <span className="font-medium">{workshop.workshop.title}</span>
                                <div className="text-gray-600 mt-1">
                                  قیمت: {formatAmount(workshop.fullPrice)} تومان |
                                  پرداخت شده: {formatAmount(workshop.paidAmount)} تومان |
                                  باقیمانده: {formatAmount(workshop.remainingAmount)} تومان
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                workshop.status === 'completed'
                                  ? 'bg-green-200 text-green-800'
                                  : workshop.status === 'partial'
                                  ? 'bg-yellow-200 text-yellow-800'
                                  : 'bg-gray-200 text-gray-800'
                              }`}>
                                {workshop.status === 'completed' ? 'تکمیل شده' :
                                 workshop.status === 'partial' ? 'نصفه پرداخت' : 'در انتظار'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment Links Summary */}
                    {customerHistory.paymentLinks.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-green-800 mb-1">
                          🔗 لینک‌های پرداخت ({customerHistory.summary.totalLinks} لینک):
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-green-100 rounded p-2 text-center">
                            <div className="font-medium">{customerHistory.summary.paidLinks}</div>
                            <div className="text-gray-600">پرداخت شده</div>
                          </div>
                          <div className="bg-gray-100 rounded p-2 text-center">
                            <div className="font-medium">{customerHistory.summary.unpaidLinks}</div>
                            <div className="text-gray-600">پرداخت نشده</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Wallet Balance */}
                    <div className="flex items-center justify-between text-xs bg-blue-100 rounded p-2">
                      <span className="text-blue-800">💳 موجودی کیف پول:</span>
                      <span className="font-medium text-blue-900">
                        {formatAmount(customerHistory.customer.walletBalance / 10)} تومان
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </MobileFormField>

          {/* نام مشتری */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نام و نام خانوادگی مشتری
              {customerExists === true && newLink.customerName && (
                <span className="text-xs text-green-600 mr-2">(به طور خودکار پر شد)</span>
              )}
            </label>
            <input
              type="text"
              value={newLink.customerName}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                nameError
                  ? 'border-red-300 focus:ring-red-500'
                  : customerExists === true && newLink.customerName
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
              }`}
              required
              placeholder={customerExists === true ? "نام مشتری به طور خودکار پر می‌شود..." : "مثال: علی احمدی"}
            />
            {nameError && (
              <p className="text-sm text-red-600 mt-1">{nameError}</p>
            )}
          </div>

          {/* نوع لینک */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع لینک</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLinkType('manual');
                  setNewLink({...newLink, workshopId: '', courseId: '', amount: ''});
                  setFormattedAmount('');
                }}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  linkType === 'manual'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                دستی
              </button>
              {availableWorkshops.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                  setLinkType('workshop');
                  setNewLink({...newLink, courseId: '', amount: ''});
                  setFormattedAmount('');
                  }}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    linkType === 'workshop'
                      ? 'bg-purple-50 border-purple-500 text-purple-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  کارگاه
                </button>
              )}
              {availableCourses.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                  setLinkType('course');
                  setNewLink({...newLink, workshopId: '', amount: ''});
                  setFormattedAmount('');
                  }}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    linkType === 'course'
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  دوره
                </button>
              )}
            </div>
          </div>

          {/* انتخاب کارگاه */}
          {linkType === 'workshop' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">انتخاب کارگاه</label>
              <select
                value={newLink.workshopId}
                onChange={(e) => {
                  const workshopId = e.target.value;
                  const workshop = availableWorkshops.find(w => w.id === workshopId);
                  const amountValue = workshop ? Math.round(workshop.price / 10).toString() : '';
                  setNewLink({
                    ...newLink,
                    workshopId,
                    amount: amountValue,
                  });
                  setFormattedAmount((amountValue));
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">انتخاب کارگاه...</option>
                {availableWorkshops.map((workshop) => (
                  <option key={workshop.id} value={workshop.id}>
                    {workshop.title} - {Math.round(workshop.price / 10).toLocaleString('fa-IR')} تومان
                  </option>
                ))}
              </select>
              {newLink.workshopId && (
                <p className="text-sm text-gray-500 mt-1">
                  مبلغ: {formatAmountInToman(availableWorkshops.find(w => w.id === newLink.workshopId)?.price || 0)} تومان
                  ({formatAmountInRial(availableWorkshops.find(w => w.id === newLink.workshopId)?.price || 0)} ریال)
                </p>
              )}
            </div>
          )}

          {/* انتخاب دوره */}
          {linkType === 'course' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">انتخاب دوره</label>
              <select
                value={newLink.courseId}
                onChange={(e) => {
                  const courseId = e.target.value;
                  const course = availableCourses.find(c => c.id === courseId);
                  const amountValue = course ? Math.round(course.price / 10).toString() : '';
                  setNewLink({
                    ...newLink,
                    courseId,
                    amount: amountValue,
                  });
                  setFormattedAmount((amountValue));
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">انتخاب دوره...</option>
                {availableCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} - {Math.round(course.price / 10).toLocaleString('fa-IR')} تومان
                  </option>
                ))}
              </select>
              {newLink.courseId && (
                <p className="text-sm text-gray-500 mt-1">
                  مبلغ: {formatAmountInToman(availableCourses.find(c => c.id === newLink.courseId)?.price || 0)} تومان
                  ({formatAmountInRial(availableCourses.find(c => c.id === newLink.courseId)?.price || 0)} ریال)
                </p>
              )}
            </div>
          )}

          {/* Aggregate Link Option */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isAggregateLink}
                onChange={(e) => {
                  setIsAggregateLink(e.target.checked);
                  if (!e.target.checked) {
                    setAggregateCount('');
                  }
                }}
                className="ml-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">ساخت لینک تجمیعی</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              برای ثبت نام چندین نفر با پنل یک نفر از این گزینه استفاده کنید
            </p>
          </div>

          {/* Aggregate Count */}
          {isAggregateLink && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تعداد افراد *
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={aggregateCount}
                onChange={(e) => setAggregateCount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مثال: ۴"
                required={isAggregateLink}
              />
              <p className="text-xs text-gray-500 mt-1">
                تعداد افرادی که با این لینک ثبت نام می‌کنند
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">مبلغ (تومان)</label>
            <input
              type="text"
              inputMode="numeric"
              value={formattedAmount}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setNewLink((prev) => ({ ...prev, amount: value }));
                setFormattedAmount(value);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
              required
              placeholder="مثال: 100000"
              dir="ltr"
            />
            {newLink.amount && (
              <p className="text-sm text-gray-500 mt-1">
                معادل: {formatAmountInRial(parseInt(newLink.amount) * 10)} ریال
              </p>
            )}
            {(linkType === 'workshop' && newLink.workshopId) || (linkType === 'course' && newLink.courseId) ? (
              <p className="text-sm text-blue-600 mt-1">
                💡 مبلغ کارگاه/دوره فقط برای نمایش است. می‌توانید هر مبلغی که می‌خواهید وارد کنید.
              </p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">توضیحات (اختیاری)</label>
            <textarea
              value={newLink.description}
              onChange={(e) => setNewLink({...newLink, description: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="توضیحات سفارش..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewLink({
                  customerName: '',
                  customerMobile: '',
                  amount: '',
                  description: '',
                  workshopId: '',
                  courseId: '',
                });
                setLinkType('manual');
                setError('');
              }}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={createLinkLoading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createLinkLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent"></div>
              )}
              {createLinkLoading ? 'در حال ایجاد...' : 'ایجاد لینک'}
            </button>
          </div>
        </form>
      </MobileModal>

      {/* مودال جزئیات */}
      {selectedLink && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedLink(null);
          }}
          title="جزئیات لینک پرداخت"
        >
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedLink.customerName}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">شماره موبایل</p>
                  <p className="text-base font-medium text-gray-900">{selectedLink.customerPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">مبلغ</p>
                  <p className="text-base font-medium text-gray-900">
                    {formatAmount(selectedLink.amount / 10)} تومان ({formatAmount(selectedLink.amount)} ریال)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">کد لینک</p>
                  <p className="text-base font-medium text-gray-900 font-mono">{selectedLink.linkCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">وضعیت</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    selectedLink.invoices?.some(inv => inv.status === 'PAID')
                      ? 'bg-green-100 text-green-800'
                      : selectedLink.isActive
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedLink.invoices?.some(inv => inv.status === 'PAID') ? '✅ پرداخت شده' : selectedLink.isActive ? '🟢 فعال' : '⚫ غیرفعال'}
                  </span>
                </div>
              </div>
              {selectedLink.description && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">توضیحات</p>
                  <p className="text-base text-gray-900">{selectedLink.description}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">لینک پرداخت</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getPaymentUrl(selectedLink.linkCode)}
                  readOnly
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(getPaymentUrl(selectedLink.linkCode), selectedLink.customerName, selectedLink.amount, 'پیام کپی شد!')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  کپی
                </button>
              </div>
            </div>

            {selectedLink.invoices && selectedLink.invoices.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">فاکتورها</h4>
                <div className="space-y-2">
                  {selectedLink.invoices.map((invoice) => (
                    <div key={invoice.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm text-gray-700">فاکتور #{invoice.id.slice(0, 8)}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status === 'PAID' ? 'پرداخت شده' : 'در انتظار'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => sendWhatsApp(selectedLink.customerPhone, selectedLink.customerName, selectedLink.amount, getPaymentUrl(selectedLink.linkCode))}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                ارسال واتساپ
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* مودال لینک‌های مشتری */}
      <Modal
        isOpen={isCustomerLinksModalOpen}
        onClose={() => {
          setIsCustomerLinksModalOpen(false);
          setSelectedCustomerPhone('');
          setCustomerLinks([]);
        }}
        title={`لینک‌های پرداخت: ${customerLinks[0]?.customerName || ''}`}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>شماره موبایل:</strong> {selectedCustomerPhone}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <strong>تعداد لینک‌ها:</strong> {customerLinks.length}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <strong>مجموع مبلغ:</strong> {formatAmount(customerLinks.reduce((sum, link) => sum + link.amount, 0) / 10)} تومان
              ({formatAmount(customerLinks.reduce((sum, link) => sum + link.amount, 0))} ریال)
            </p>
          </div>

          {customerLinks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">لینکی برای این مشتری یافت نشد</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {customerLinks.map((link) => {
                const paymentStatus = getPaymentStatus(link);
                const paymentUrl = getPaymentUrl(link.linkCode);
                return (
                  <div
                    key={link.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            مبلغ: {formatAmount(link.amount / 10)} تومان ({formatAmount(link.amount)} ریال)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            link.isActive
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {link.isActive ? '🟢 فعال' : '⚫ غیرفعال'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : paymentStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {paymentStatus === 'paid' ? '✅ پرداخت شده' : paymentStatus === 'pending' ? '⏳ در انتظار' : '❌ ناموفق'}
                          </span>
                        </div>
                        {link.description && (
                          <p className="text-sm text-gray-600 mt-1">{link.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          ایجاد شده: {formatPersianDateTime(link.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleToggleLink(link.id)}
                          disabled={toggleLinkLoading === link.id}
                          className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                            link.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {toggleLinkLoading === link.id && (
                            <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                          )}
                          {link.isActive ? 'غیرفعال' : 'فعال'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLink(link);
                            setIsDetailsModalOpen(true);
                            setIsCustomerLinksModalOpen(false); // Close previous modal
                          }}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          جزئیات
                        </button>
                        <button
                          onClick={() => copyToClipboard(paymentUrl, link.customerName, link.amount, link.id, 'پیام کپی شد!')}
                          disabled={copyLoading === link.id}
                          className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {copyLoading === link.id && (
                            <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                          )}
                          کپی
                        </button>
                        <button
                          onClick={() => sendWhatsApp(link.customerPhone, link.customerName, link.amount, paymentUrl)}
                          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        >
                          واتس‌اپ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* مودال ایجاد مشتری جدید */}
      <Modal
        isOpen={isNewCustomerModalOpen}
        onClose={() => {
          setIsNewCustomerModalOpen(false);
          setNewCustomerData({
            firstName: '',
            lastName: '',
            password: '',
            confirmPassword: '',
          });
        }}
        title="ایجاد مشتری جدید"
      >
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="mr-3">
                <h3 className="text-sm font-medium text-orange-800">
                  مشتری جدید شناسایی شد
                </h3>
                <div className="mt-2 text-sm text-orange-700">
                  <p>شماره موبایل <strong>{newLink.customerMobile}</strong> در سیستم وجود ندارد.</p>
                  <p>برای ایجاد مشتری جدید، اطلاعات زیر را تکمیل کنید:</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نام</label>
              <input
                type="text"
                value={newCustomerData.firstName}
                onChange={(e) => handleFirstNameChange(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  firstNameError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                required
                placeholder="مثال: علی"
              />
              {firstNameError && (
                <p className="text-sm text-red-600 mt-1">{firstNameError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نام خانوادگی</label>
              <input
                type="text"
                value={newCustomerData.lastName}
                onChange={(e) => handleLastNameChange(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  lastNameError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                required
                placeholder="مثال: احمدی"
              />
              {lastNameError && (
                <p className="text-sm text-red-600 mt-1">{lastNameError}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رمز عبور</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={newCustomerData.password}
                onChange={(e) => setNewCustomerData({...newCustomerData, password: e.target.value, confirmPassword: e.target.value})}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="حداقل 6 کاراکتر"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setNewCustomerData({...newCustomerData, password: 'user123', confirmPassword: 'user123'})}
                className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
              >
                رمز پیش‌فرض
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">رمز پیش‌فرض: user123</p>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsNewCustomerModalOpen(false);
                setNewCustomerData({
                  firstName: '',
                  lastName: '',
                  password: '',
                  confirmPassword: '',
                });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleCreateNewCustomer}
              disabled={!newCustomerData.firstName || !newCustomerData.lastName || !newCustomerData.password || newCustomerData.password !== newCustomerData.confirmPassword}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              ایجاد مشتری جدید
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PaymentLinks;

