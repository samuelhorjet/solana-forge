// FILE: components/countdown-timer.tsx

"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Lock } from "lucide-react";

export function CountdownTimer({ 
  targetDate, 
  onExpire 
}: { 
  targetDate: Date; 
  onExpire?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState("");
  // Don't rely on isExpired state for rendering null, let parent handle layout
  
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        setTimeLeft("00m 00s");
        if (onExpire) onExpire(); // Trigger parent update
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      let timeString = "";
      if (days > 0) timeString += `${days}d `;
      if (hours > 0 || days > 0) timeString += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) timeString += `${minutes}m `;
      timeString += `${seconds}s`;

      setTimeLeft(timeString);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  return (
    <div className="font-mono text-sm flex items-center gap-2">
      <Clock className="h-3 w-3 text-muted-foreground" /> {timeLeft}
    </div>
  );
}