// components/cases/UploadAdditionalFilesModal.tsx
import React, { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks';
import { 
  validateFiles, 
  formatFileSize, 
  getFileTypeInfo,
  MAX_ADDITIONAL_FILES,
  ALLOWED_EXTENSIONS 
} from '@/utils/fileUtils';

interface UploadAdditionalFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseNumber: string;
  onFilesUploaded: () => void;
  currentFileCount?: number;
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export const UploadAdditionalFilesModal: React.FC<UploadAdditionalFilesModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseNumber,
  onFilesUploaded,
  currentFileCount = 0
}) => {
  const { showToast } = useToast();
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const remainingSlots = MAX_ADDITIONAL_FILES - currentFileCount;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [currentFileCount, files.length, remainingSlots]);

  const handleFiles = (newFiles: File[]) => {
    const currentTotal = currentFileCount + files.length;
    const { validFiles, errors } = validateFiles(newFiles, currentTotal);
    
    // Show errors
    errors.forEach(error => showToast.error(error));
    
    // Add valid files
    if (validFiles.length > 0) {
      const maxToAdd = Math.min(validFiles.length, remainingSlots - files.length);
      if (maxToAdd < validFiles.length) {
        showToast.warning(`Only adding first ${maxToAdd} files due to limit`);
      }
      
      const filesToAdd = validFiles.slice(0, maxToAdd).map(file => ({
        file,
        progress: 0,
        status: 'pending' as const
      }));
      
      setFiles(prev => [...prev, ...filesToAdd]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      showToast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    abortControllerRef.current = new AbortController();
    
    // Update all files to uploading status
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })));
    
    try {
      const formData = new FormData();
      files.forEach(({ file }) => {
        formData.append('files', file);
      });

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => ({
          ...f,
          progress: f.status === 'uploading' ? Math.min(f.progress + 10, 90) : f.progress
        })));
      }, 200);

      const response = await fetch(`/api/cases/${caseId}/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: abortControllerRef.current.signal
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload files');
      }

      const result = await response.json();
      
      // Update files with success status
      setFiles(prev => prev.map(f => ({ ...f, progress: 100, status: 'success' })));
      
      showToast.success(`Successfully uploaded ${result.filesUploaded} file(s)`);
      
      // Show any partial errors
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((error: string) => showToast.error(error));
      }
      
      // Wait a moment to show success state
      setTimeout(() => {
        setFiles([]);
        onFilesUploaded();
        onClose();
      }, 1000);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      
      if (error.name === 'AbortError') {
        showToast.info('Upload cancelled');
        setFiles(prev => prev.map(f => ({ 
          ...f, 
          status: f.status === 'uploading' ? 'pending' : f.status,
          progress: f.status === 'uploading' ? 0 : f.progress
        })));
      } else {
        showToast.error(error.message || 'Failed to upload files');
        setFiles(prev => prev.map(f => ({ 
          ...f, 
          status: f.status === 'uploading' ? 'error' : f.status,
          error: error.message
        })));
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const getStatusIcon = (status: FileWithProgress['status']) => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'uploading':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={uploading ? undefined : onClose}
      />
      
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Upload Additional Files</h2>
                  <p className="text-sm text-blue-100 mt-1">
                    Case #{caseNumber} • {remainingSlots} slots available
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  disabled={uploading}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  uploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                } ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  {dragActive ? 'Drop files here' : 'Drag and drop files here, or click to select'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Supported formats: {ALLOWED_EXTENSIONS.join(', ')} (max 100MB each)
                </p>
                
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Select Files
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_EXTENSIONS.join(',')}
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFiles(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                  disabled={uploading}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Selected Files ({files.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {files.map((fileItem, index) => {
                      const fileInfo = getFileTypeInfo(fileItem.file.name.split('.').pop() || '');
                      
                      return (
                        <div 
                          key={index} 
                          className="relative flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden"
                        >
                          {/* Progress overlay */}
                          {fileItem.status === 'uploading' && (
                            <div 
                              className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 transition-all duration-300"
                              style={{ width: `${fileItem.progress}%` }}
                            />
                          )}
                          
                          <div className="relative flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex-shrink-0">
                              <div className={`w-8 h-8 ${fileInfo.bgColor} rounded flex items-center justify-center`}>
                                <span className={`text-xs font-medium ${fileInfo.color}`}>
                                  {fileInfo.label}
                                </span>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {fileItem.file.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(fileItem.file.size)}
                                {fileItem.error && (
                                  <span className="text-red-600 dark:text-red-400 ml-2">
                                    • {fileItem.error}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          
                          <div className="relative flex items-center gap-2 ml-2">
                            {getStatusIcon(fileItem.status)}
                            {fileItem.status === 'pending' && !uploading && (
                              <button
                                onClick={() => removeFile(index)}
                                className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {remainingSlots === 0 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    This case has reached the maximum of {MAX_ADDITIONAL_FILES} additional files.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 rounded-b-xl">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {uploading ? 'Uploading files...' : `${files.length} file(s) selected`}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={uploading ? cancelUpload : onClose}
                    disabled={uploading && files.some(f => f.status === 'success')}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Cancel' : 'Close'}
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading || files.length === 0 || remainingSlots === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {uploading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};