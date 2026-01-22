import { useState, useEffect } from 'react';
import { systemAPI } from '../../lib/api';

export function useYears() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    systemAPI
      .getYears()
      .then((data) => {
        const yearsData = Array.isArray(data?.years)
          ? data.years
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];
        setYears(yearsData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return { years, loading };
}