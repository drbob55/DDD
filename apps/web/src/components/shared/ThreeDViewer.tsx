"use client";
import React from 'react';

export default function ThreeDViewer({ fileUrl }: { fileUrl?: string }) {
  return (
    <div className="bg-gray-100 rounded-lg p-8 text-center">
      <div className="text-gray-500">
        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        <p>3D Viewer</p>
        {fileUrl && <p className="text-sm mt-2">File: {fileUrl}</p>}
      </div>
    </div>
  );
}
