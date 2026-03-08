import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE = 60 * 1000; // Show warning 1 minute before logout

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

export function useInactivityLogout() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasWarnedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    hasWarnedRef.current = false;
  }, []);

  const handleLogout = useCallback(async () => {
    clearTimers();
    toast.info("You've been signed out due to inactivity.");
    await signOut();
    window.location.href = "/";
  }, [signOut, clearTimers]);

  const resetTimer = useCallback(() => {
    if (!user) return;
    clearTimers();

    warningRef.current = setTimeout(() => {
      hasWarnedRef.current = true;
      toast.warning("You'll be signed out in 1 minute due to inactivity.", { duration: 10000 });
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    timeoutRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
  }, [user, handleLogout, clearTimers]);

  useEffect(() => {
    if (!user) {
      clearTimers();
      return;
    }

    resetTimer();

    const handler = () => resetTimer();
    ACTIVITY_EVENTS.forEach((event) => document.addEventListener(event, handler, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((event) => document.removeEventListener(event, handler));
    };
  }, [user, resetTimer, clearTimers]);
}
