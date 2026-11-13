import { useState } from "react";
import { Calculator, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Calculatrice({ onClose, inline = false }: { onClose: () => void; inline?: boolean }) {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  };

  const calculate = (a: number, op: string, b: number): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      case "%": return (a * b) / 100;
      default: return b;
    }
  };

  const performOperation = (nextOp: string) => {
    const current = parseFloat(display);
    if (prevValue !== null && operator && !waitingForOperand) {
      const result = calculate(prevValue, operator, current);
      const rounded = parseFloat(result.toFixed(10));
      setDisplay(String(rounded));
      setPrevValue(rounded);
    } else {
      setPrevValue(current);
    }
    setOperator(nextOp);
    setWaitingForOperand(true);
  };

  const handleEquals = () => {
    const current = parseFloat(display);
    if (prevValue !== null && operator) {
      const result = calculate(prevValue, operator, current);
      const rounded = parseFloat(result.toFixed(10));
      setDisplay(String(rounded));
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  };

  const clear = () => {
    setDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const toggleSign = () => {
    const val = parseFloat(display);
    if (val !== 0) setDisplay(String(-val));
  };

  const btnBase = "flex items-center justify-center rounded-lg text-base font-semibold h-12 transition-colors active:scale-95";
  const btnNum = `${btnBase} bg-muted hover:bg-muted/80 text-foreground`;
  const btnOp = `${btnBase} bg-primary text-primary-foreground hover:bg-primary/90`;
  const btnEq = `${btnBase} bg-secondary text-secondary-foreground hover:bg-secondary/80`;
  const btnFunc = `${btnBase} bg-muted/50 hover:bg-muted/70 text-muted-foreground`;

  return (
    <section aria-label="Calculatrice" className={`${inline ? "relative w-full max-w-72" : "fixed bottom-4 right-4 z-50 w-72"} rounded-lg shadow-lg border border-primary bg-card overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-2 bg-secondary text-secondary-foreground">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Calculatrice</span>
        </div>
        <Button onClick={onClose} variant="ghost" size="icon" aria-label="Fermer la calculatrice" title="Fermer la calculatrice">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="px-4 py-3 text-right border-b border-border bg-background">
        <div className="text-xs text-muted-foreground h-4">
          {prevValue !== null && operator ? `${prevValue} ${operator}` : ""}
        </div>
        <div className="text-2xl font-mono font-bold text-foreground truncate">{display}</div>
      </div>
      <div className="grid grid-cols-4 gap-1 p-2">
        <Button className={btnFunc} onClick={clear}>C</Button>
        <Button className={btnFunc} onClick={toggleSign}>±</Button>
        <Button className={btnOp} onClick={() => performOperation("%")}>%</Button>
        <Button className={btnOp} onClick={() => performOperation("÷")}>÷</Button>

        {["7", "8", "9"].map((d) => (
          <Button key={d} className={btnNum} onClick={() => inputDigit(d)}>{d}</Button>
        ))}
        <Button className={btnOp} onClick={() => performOperation("×")}>×</Button>

        {["4", "5", "6"].map((d) => (
          <Button key={d} className={btnNum} onClick={() => inputDigit(d)}>{d}</Button>
        ))}
        <Button className={btnOp} onClick={() => performOperation("-")}>−</Button>

        {["1", "2", "3"].map((d) => (
          <Button key={d} className={btnNum} onClick={() => inputDigit(d)}>{d}</Button>
        ))}
        <Button className={btnOp} onClick={() => performOperation("+")}>+</Button>

        <Button className={`${btnNum} col-span-2`} onClick={() => inputDigit("0")}>0</Button>
        <Button className={btnNum} onClick={inputDot}>.</Button>
        <Button className={btnEq} onClick={handleEquals}>=</Button>
      </div>
    </section>
  );
}
