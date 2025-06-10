"use client";

import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Case, CaseStatus, CaseStatusColors, CaseStatusLabels } from '@/types/case.types';
import { Pagination, TableSkeleton } from '@/components/shared';
import { useTimezone } from '@/hooks';

interface CaseListProps {
  cases: Case[];
  appointments: any[];
  loading?: boolean;
  searchQuery?: string;
  filterStatus?: string;
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onViewCase: (caseData: Case) => void;
  onStatusChange: (caseId: string, status: string) => void;
  onArchiveCase: (caseId: string) => void;
  onScheduleAppointment?: (caseData: Case) => void;
  isArchiveView?: boolean;
}

export const CaseList: React.FC<CaseListProps> = ({
  cases,
  appointments,
  loading = false,
  searchQuery = '',
  filterStatus = '',
  currentPage = 1,
  itemsPerPage = 20,
  onPageChange = () => {},
  onViewCase,
  onStatusChange,
  onArchiveCase,
  onScheduleAppointment,
  isArchiveView = false
}) => {
  const { timezone, formatInUserTimezone } = useTimezone();

  // Filter cases
  const filteredCases = useMemo(() => {
    let filtered = [...cases];
    
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.patient.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterStatus) {
      filtered = filtered.filter(c => c.status === filterStatus);
    }
    
    return filtered;
  }, [cases, searchQuery, filterStatus]);

  // Paginate cases
  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredCases.slice(start, end);
  }, [filteredCases, currentPage, itemsPerPage]);

  // Get next appointment for a case
  const getNextAppointment = (caseId: string) => {
    const caseAppointments = appointments
      .filter(apt => apt.caseId === caseId && apt.status !== 'CANCELLED')
      .filter(apt => new Date(apt.date) > new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return caseAppointments[0];
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (filteredCases.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 mt-4">
            {searchQuery ? 'No cases found matching your search' : 
             isArchiveView ? 'No archived cases' : 'No cases yet'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Case Number</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Patient</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Submitted</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Next Appointment</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 w-64">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedCases.map((caseItem) => {
              const nextAppointment = getNextAppointment(caseItem.id);
              
              return (
                <tr key={caseItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {caseItem.caseNumber || caseItem.id}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {caseItem.id}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {caseItem.patient.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {caseItem.patient.userId}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      CaseStatusColors[caseItem.status as CaseStatus] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {CaseStatusLabels[caseItem.status as CaseStatus] || caseItem.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {format(parseISO(caseItem.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {nextAppointment ? (
                      <div>
                        <p>{formatInUserTimezone(nextAppointment.date, 'MMM d, yyyy')}</p>
                        <p className="text-xs text-gray-500">
                          {nextAppointment.clinicName}
                        </p>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        onClick={() => onViewCase(caseItem)}
                      >
                        View
                      </button>
                      
                      {!isArchiveView && caseItem.status === CaseStatus.IN_TREATMENT && (
                        <button
                          className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                          onClick={() => {
                            if (confirm("Mark this case as completed?")) {
                              onStatusChange(caseItem.id, CaseStatus.COMPLETED);
                            }
                          }}
                        >
                          Complete
                        </button>
                      )}
                      
                      {!isArchiveView && caseItem.status === CaseStatus.COMPLETED && (
                        <button
                          className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                          onClick={() => {
                            if (confirm("Reopen this case for treatment?")) {
                              onStatusChange(caseItem.id, CaseStatus.IN_TREATMENT);
                            }
                          }}
                        >
                          Reopen
                        </button>
                      )}
                      
                      <button
                        className={`px-3 py-1.5 text-white text-sm font-medium rounded-lg transition-colors ${
                          isArchiveView
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                        onClick={() => {
                          if (confirm(isArchiveView ? "Restore this case to active cases?" : "Archive this case?")) {
                            onArchiveCase(caseItem.id);
                          }
                        }}
                      >
                        {isArchiveView ? 'Restore' : 'Archive'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalItems={filteredCases.length}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
      />
    </div>
  );
};