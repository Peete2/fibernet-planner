import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";

/**
 * Lightweight bot-deterrent: simple math challenge.
 * Parent passes `onValidChange(isValid)` and we only allow submit when valid.
 */
export default function MathCaptcha({
  onValidChange,
}: {
  onValidChange: (valid: boolean) => void;
}) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [answer, setAnswer] = useState("");

  const refresh = () => {
    setA(Math.floor(Math.random() * 9) + 1);
    setB(Math.floor(Math.random() * 9) + 1);
    setAnswer("");
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    onValidChange(parseInt(answer, 10) === a + b);
  }, [answer, a, b, onValidChange]);

  return (
    <div>
      <Label className="text-xs">Verify you're human</Label>
      <div className="flex items-center gap-2 mt-1">
        <span className="px-3 py-2 rounded-md bg-muted text-sm font-mono select-none">
          {a} + {b} = ?
        </span>
        <Input
          type="number"
          inputMode="numeric"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-24"
          placeholder="?"
        />
        <button
          type="button"
          onClick={refresh}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground"
          aria-label="Refresh challenge"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}