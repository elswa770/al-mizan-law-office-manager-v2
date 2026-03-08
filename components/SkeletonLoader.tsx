import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const SkeletonLoader: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'text', 
  width, 
  height, 
  lines = 1 
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-none';
      case 'rounded':
        return 'rounded-lg';
      default:
        return 'rounded';
    }
  };

  const getWidthClass = () => {
    if (!width) return '';
    if (typeof width === 'number') return 'w-' + width;
    return width;
  };

  const getHeightClass = () => {
    if (!height) return '';
    if (typeof height === 'number') return 'h-' + height;
    return height;
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`
              bg-slate-200 dark:bg-slate-700 animate-pulse rounded
              ${index === lines - 1 ? 'w-3/4' : 'w-full'}
              h-4
            `}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`
        bg-slate-200 dark:bg-slate-700 animate-pulse
        ${getVariantClasses()}
        ${className}
        ${getWidthClass()}
        ${getHeightClass()}
      `}
    />
  );
};

// Card skeleton for dashboard items
export const CardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
      <div className="flex-1 space-y-2">
        <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        <div className="w-2/5 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        <div className="w-1/3 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
      </div>
    </div>
  </div>
);

// Table skeleton for data tables
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <div className="w-1/5 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          <div className="w-3/10 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          <div className="w-1/4 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          <div className="w-1/6 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          <div className="flex gap-2 mr-auto">
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// List skeleton for sidebar items
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 4 }) => (
  <div className="space-y-2">
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 p-2">
        <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
        <div className="w-4/5 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
      </div>
    ))}
  </div>
);

// Dashboard skeleton for main page
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 pb-20">
    {/* Search Bar Skeleton */}
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-4">
        <div className="relative w-full md:w-80">
          <div className="w-full h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </div>

    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Content Grid Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content Skeleton */}
      <div className="lg:col-span-2 space-y-6">
        {/* Recent Cases Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-32 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 space-y-2">
                    <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  </div>
                  <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
                <div className="w-2/3 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Hearings Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-36 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="w-2/3 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="w-20 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
                <div className="flex gap-4">
                  <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Skeleton */}
      <div className="space-y-6">
        {/* Quick Actions Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <div className="w-28 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4"></div>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Cases Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-32 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="w-12 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
                <div className="w-2/3 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <div className="w-24 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4"></div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
            <div className="flex justify-between items-center">
              <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="w-14 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default SkeletonLoader;
