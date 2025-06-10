// src/components/shared/FilePreview.tsx
"use client";

import React, { useState, useEffect, memo } from 'react';
import ThreeDViewer from './ThreeDViewer';
import { normalizeFilePath } from '@/utils/fileUtils';
import { useSession } from 'next-auth/react';

interface FilePreviewProps {
  file: string | File;
  type?: string;
  height?: string;
  className?: string;
  showDownload?: boolean;
  showFullscreen?: boolean;
  showDelete?: boolean;
  caseId?: string;
  fileId?: string;
  onDelete?: () => void;
  onClick?: () => void;
}

export const FilePreview = memo(({
  file,
  type = '',
  height = 'h-48',
  className = '',
  showDownload = false,
  showFullscreen = true,
  showDelete = false,
  caseId,
  fileId,
  onDelete,
  onClick
}: FilePreviewProps) => {
  const { data: session } = useSession();
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileExtension, setFileExtension] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [preview3DError, setPreview3DError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (file instanceof File) {
      // Handle File object
      setFileName(file.name);
      setFileExtension(file.name.split('.').pop()?.toLowerCase() || '');
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      
      return () => URL.revokeObjectURL(url);
    } else if (typeof file === 'string') {
      // Handle string URL/path
      const pathParts = file.split('/');
      const fullFileName = pathParts[pathParts.length - 1] || file;
      setFileName(fullFileName);
      setFileExtension(fullFileName.split('.').pop()?.toLowerCase() || '');
      
      // Use the normalization utility
      const normalizedUrl = normalizeFilePath(file);
      setFileUrl(normalizedUrl);
    }
  }, [file]);

  const is3DFile = ['stl', 'obj', 'ply'].includes(fileExtension);
  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension);
  const isPdfFile = fileExtension === 'pdf';
  const isZipFile = fileExtension === 'zip';

  // Check if user can delete files
  const canDelete = session?.user?.role === 'ADMIN' || session?.user?.role === 'DENTIST';

  const getFileIcon = () => {
    const iconClass = "w-16 h-16";
    
    if (is3DFile) {
      return (
        <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
        </svg>
      );
    } else if (isZipFile) {
      return (
        <svg className={`${iconClass} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else if (isPdfFile) {
      return (
        <svg className={`${iconClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg className={`${iconClass} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // For better download experience, fetch the file first
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to simple download
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.target = '_blank';
      link.click();
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!caseId || !fileId || !canDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/cases/${caseId}/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete file');
      }

      // Call parent callback if provided
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete file');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleMainClick = () => {
    if (onClick) {
      onClick();
    } else if (showFullscreen && (is3DFile || isImageFile || isPdfFile) && !preview3DError) {
      setIsFullscreen(true);
    }
  };

  const renderPreview = () => {
    if (is3DFile && !preview3DError) {
      return (
        <ThreeDViewer
          fileUrl={fileUrl}
          fileType={fileExtension as 'stl' | 'obj' | 'ply'}
          height="100%"
          onError={() => setPreview3DError(true)}
        />
      );
    } else if (isImageFile) {
      return (
        <img
          src={fileUrl}
          alt={`${type} preview`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            console.error('Image load error:', fileUrl);
            setPreview3DError(true);
          }}
        />
      );
    } else if (isPdfFile) {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full"
          title={`${type} PDF preview`}
        />
      );
    }

    // Default icon view
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        {getFileIcon()}
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
          {fileExtension.toUpperCase()} File
        </p>
        {is3DFile && preview3DError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            3D preview unavailable
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <div 
        className={`relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden ${height} ${className} group`}
        onClick={handleMainClick}
        style={{ cursor: onClick || (showFullscreen && (is3DFile || isImageFile || isPdfFile) && !preview3DError) ? 'pointer' : 'default' }}
      >
        {renderPreview()}
        
        {/* File type badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded pointer-events-none">
          {fileExtension.toUpperCase()}
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {showFullscreen && (is3DFile || isImageFile || isPdfFile) && !preview3DError && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(true);
              }}
              className="p-1.5 bg-black/70 text-white rounded hover:bg-black/80 transition-colors"
              title="Fullscreen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
          {showDownload && (
            <button
              onClick={handleDownload}
              className="p-1.5 bg-black/70 text-white rounded hover:bg-black/80 transition-colors"
              title="Download"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
          {showDelete && canDelete && caseId && fileId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              disabled={isDeleting}
              className="p-1.5 bg-red-600/80 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              title="Delete"
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div 
            className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-xs w-full">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Are you sure you want to delete this file? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="w-full h-full max-w-7xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            {is3DFile && !preview3DError ? (
              <ThreeDViewer
                fileUrl={fileUrl}
                fileType={fileExtension as 'stl' | 'obj' | 'ply'}
                height="100%"
                onError={() => setPreview3DError(true)}
              />
            ) : isImageFile ? (
              <img
                src={fileUrl}
                alt={`${type} fullscreen`}
                className="w-full h-full object-contain"
              />
            ) : isPdfFile ? (
              <iframe
                src={fileUrl}
                className="w-full h-full"
                title={`${type} PDF fullscreen`}
              />
            ) : null}
          </div>
          
          {/* File info and actions */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div className="bg-black/70 text-white px-4 py-2 rounded">
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-xs opacity-75">{type} • {fileExtension.toUpperCase()}</p>
            </div>
            
            <div className="flex gap-2">
              {showDownload && (
                <button
                  onClick={handleDownload}
                  className="p-2 bg-black/70 text-white rounded hover:bg-black/80 transition-colors"
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if important props change
  return (
    prevProps.file === nextProps.file &&
    prevProps.type === nextProps.type &&
    prevProps.height === nextProps.height &&
    prevProps.showDownload === nextProps.showDownload &&
    prevProps.showFullscreen === nextProps.showFullscreen &&
    prevProps.showDelete === nextProps.showDelete &&
    prevProps.caseId === nextProps.caseId &&
    prevProps.fileId === nextProps.fileId &&
    prevProps.className === nextProps.className
  );
});

FilePreview.displayName = 'FilePreview';