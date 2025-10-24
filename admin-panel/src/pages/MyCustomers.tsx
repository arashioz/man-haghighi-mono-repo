import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const MyCustomers: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  const PeopleIcon = () => (
    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  );

  return (
    <div>
      <PageHeader 
        title="مشتریان من" 
        description="لیست مشتریان شما"
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <EmptyState
          icon={<PeopleIcon />}
          title="مشتری یافت نشد"
          description="هنوز مشتریای ثبت نشده است."
        />
      </div>
    </div>
  );
};

export default MyCustomers;