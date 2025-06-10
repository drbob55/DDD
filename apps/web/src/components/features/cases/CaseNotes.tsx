// src/components/cases/CaseNotes.tsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks';
import { useSession } from 'next-auth/react';
import { ROLES } from '@/lib/constants';

interface CaseNote {
  id: string;
  content: string;
  category: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

interface CaseNotesProps {
  caseId: string;
  isArchiveView?: boolean;
}

export const CaseNotes: React.FC<CaseNotesProps> = ({ caseId, isArchiveView = false }) => {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('clinical');
  const [isInternal, setIsInternal] = useState(true);

  const categories = [
    { value: 'clinical', label: 'Clinical', color: 'blue' },
    { value: 'administrative', label: 'Administrative', color: 'purple' },
    { value: 'general', label: 'General', color: 'gray' },
    { value: 'appointment', label: 'Appointment', color: 'green' },
  ];

  // Fetch notes
  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      showToast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [caseId]);

  // Add note
  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      showToast.error('Please enter note content');
      return;
    }

    try {
      const response = await fetch(`/api/cases/${caseId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: noteContent,
          category: noteCategory,
          isInternal
        }),
      });

      if (response.ok) {
        const newNote = await response.json();
        setNotes([newNote, ...notes]);
        setNoteContent('');
        setShowAddNote(false);
        showToast.success('Note added successfully');
      } else {
        const error = await response.json();
        showToast.error(error.error || 'Failed to add note');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      showToast.error('Failed to add note');
    }
  };

  // Update note
  const handleUpdateNote = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    try {
      const response = await fetch(`/api/cases/${caseId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId,
          content: noteContent,
          category: noteCategory,
          isInternal
        }),
      });

      if (response.ok) {
        const updatedNote = await response.json();
        setNotes(notes.map(n => n.id === noteId ? updatedNote : n));
        setEditingNote(null);
        setNoteContent('');
        showToast.success('Note updated successfully');
      } else {
        const error = await response.json();
        showToast.error(error.error || 'Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      showToast.error('Failed to update note');
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/cases/${caseId}/notes?noteId=${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotes(notes.filter(n => n.id !== noteId));
        showToast.success('Note deleted successfully');
      } else {
        const error = await response.json();
        showToast.error(error.error || 'Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast.error('Failed to delete note');
    }
  };

  const canAddNotes = session?.user?.role === ROLES.ADMIN || session?.user?.role === ROLES.DENTIST;
  const canEdit = (note: CaseNote) => 
    session?.user?.role === ROLES.ADMIN || session?.user?.id === note.user.id;

  const getCategoryStyle = (category: string) => {
    const cat = categories.find(c => c.value === category);
    const colors = {
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return colors[cat?.color as keyof typeof colors] || colors.gray;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Case Notes
        </h3>
        {canAddNotes && !isArchiveView && !showAddNote && (
          <button
            onClick={() => setShowAddNote(true)}
            className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Note
          </button>
        )}
      </div>

      {/* Add Note Form */}
      {showAddNote && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note Content
              </label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-none"
                placeholder="Enter your note here..."
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Internal note (not visible to patient)
                  </span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddNote(false);
                  setNoteContent('');
                }}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No notes added yet
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              {editingNote === note.id ? (
                // Edit mode
                <div className="space-y-3">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex gap-3">
                      <select
                        value={noteCategory}
                        onChange={(e) => setNoteCategory(e.target.value)}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Internal</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingNote(null);
                          setNoteContent('');
                        }}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateNote(note.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryStyle(note.category)}`}>
                        {categories.find(c => c.value === note.category)?.label || note.category}
                      </span>
                      {note.isInternal && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          Internal
                        </span>
                      )}
                    </div>
                    {canEdit(note) && !isArchiveView && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingNote(note.id);
                            setNoteContent(note.content);
                            setNoteCategory(note.category);
                            setIsInternal(note.isInternal);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">
                    {note.content}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <span>By {note.user.name}</span>
                      <span>•</span>
                      <span>{note.user.role}</span>
                    </div>
                    <div>
                      {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                      {note.updatedAt !== note.createdAt && (
                        <span className="ml-2">(edited)</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};