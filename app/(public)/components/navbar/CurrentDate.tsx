'use client';

import { useState, useEffect } from 'react';

export default function CurrentDate() {
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      });
      setDateStr(formatter.format(now));
    } catch {
      setDateStr('Hari ini');
    }
  }, []);

  return (
    <span className="text-gray-500 font-medium whitespace-nowrap">
      {dateStr || 'Hari ini'} • WIB
    </span>
  );
}
