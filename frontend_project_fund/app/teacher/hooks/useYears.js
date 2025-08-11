import { useState, useEffect } from 'react';

export function useYears() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/years')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setYears(data.data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return { years, loading };
}