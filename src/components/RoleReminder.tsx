import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Periodic reminder popup that surfaces the role's checklist every 3 minutes.
 * Skipped when the queue is empty.
 */
export default function RoleReminder({
  role,
  tasks,
  pendingCount,
  intervalMs = 3 * 60 * 1000,
}: {
  role: string;
  tasks: string[];
  pendingCount: number;
  intervalMs?: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Open shortly after mount so the user is reminded on arrival.
    const first = setTimeout(() => {
      if (pendingCount > 0) setOpen(true);
    }, 8000);
    const id = setInterval(() => {
      if (pendingCount > 0) setOpen(true);
    }, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [intervalMs, pendingCount]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            {role} reminder
          </DialogTitle>
          <DialogDescription>
            You have <strong>{pendingCount}</strong> application
            {pendingCount === 1 ? "" : "s"} waiting in your queue. Please complete
            the items below.
          </DialogDescription>
        </DialogHeader>
        <ul className="text-sm space-y-2 list-disc pl-5 text-foreground">
          {tasks.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}