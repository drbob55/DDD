import { useState, useEffect, useCallback } from 'react';

interface Activity {
  id: string;
  action: string;
  userId: string;
  userName: string;
  targetType: string;
  targetId: string;
  details: any;
  createdAt: string;
}

interface UseCaseActivitiesReturn {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useCaseActivities = (caseId: string | null): UseCaseActivitiesReturn => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!caseId) {
      setActivities([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/cases/${caseId}/activities`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch activities: ${response.status}`);
      }
      
      const data = await response.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching case activities:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activities';
      setError(errorMessage);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return { 
    activities, 
    loading, 
    error, 
    refetch: fetchActivities 
  };
};