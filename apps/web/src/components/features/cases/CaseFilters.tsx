"use client";

import React from 'react';
import { CaseStatus, CaseStatusLabels } from '@/types/case.types';

interface CaseFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: string;
  onStatusChange: (status: string) => void;
  showArchived: boolean;
  onArchiveToggle: (show: boolean) => void;
  totalCases: number;
  filteredCases: number;
}

export const CaseFilters: React.FC<CaseFiltersProps> = ({
  searchQuery,
  onSearchChange,
  filterStatus,
  onStatusChange,
  showArchived,
  onArchiveToggle,
  totalCases,
  filteredCases
}) => {
  return (
    <div className="mb-6 space-y-4">
      {/* Search and Status Filter */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search cases by number, patient name, or email..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-4 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(CaseStatus).map(([key, value]) => (
            <option key={key} value={value}>
              {CaseStatusLabels[value]}
            </option>
          ))}
        </select>
      </div>

      {/* Archive Toggle and Results Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onArchiveToggle(false)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !showArchived
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Active Cases
          </button>
          <button
            onClick={() => onArchiveToggle(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showArchived
                ? 'bg-gray-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Archived Cases
          </button>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {searchQuery || filterStatus ? (
            <>
              Showing {filteredCases} of {totalCases} cases
            </>
          ) : (
            <>
              {totalCases} {showArchived ? 'archived' : 'active'} case{totalCases !== 1 ? 's' : ''}
            </>
          )}
        </p>
      </div>
    </div>
  );
};

// Quick Stats Component
interface CaseStatsProps {
  cases: any[];
  showArchived: boolean;
}

export const CaseStats: React.FC<CaseStatsProps> = ({ cases, showArchived }) => {
  const stats = React.useMemo(() => {
    const statusCounts = cases.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: cases.length,
      byStatus: statusCounts,
      inProgress: statusCounts[CaseStatus.IN_TREATMENT] || 0,
      completed: statusCounts[CaseStatus.COMPLETED] || 0,
      pending: statusCounts[CaseStatus.PENDING_REVIEW] || 0
    };
  }, [cases]);

  if (showArchived) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Archived Cases</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
        <p className="text-sm text-blue-700 dark:text-blue-300">Total Cases</p>
      </div>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.pending}</p>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">Pending Review</p>
      </div>
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.inProgress}</p>
        <p className="text-sm text-purple-700 dark:text-purple-300">In Treatment</p>
      </div>
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
        <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.completed}</p>
        <p className="text-sm text-green-700 dark:text-green-300">Completed</p>
      </div>
    </div>
  );
};