import { useState, useEffect } from 'react';

export function useFunds(year) {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFunds();
  }, [year]);

  const fetchFunds = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/funds?year=${year}`);
      const data = await response.json();
      
      if (data.success) {
        setFunds(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch funds');
    } finally {
      setLoading(false);
    }
  };

  return { funds, loading, error, refetch: fetchFunds };
}