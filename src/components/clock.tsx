"use client";

import { useState, useEffect } from 'react';

export function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial time on client mount
    setTime(new Date());

    // Update time every second
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(timerId);
  }, []);

  const formatTime = (date: Date | null) => {
    if (!date) {
      return '00:00:00';
    }
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="text-sm text-muted-foreground font-mono">
      {formatTime(time)}
    </div>
  );
}
