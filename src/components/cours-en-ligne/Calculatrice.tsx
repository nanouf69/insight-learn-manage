import { useState } from "react";
import { Calculator, X } from "lucide-react";

export default function Calculatrice({ onClose }: { onClose: () => void }) {
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
  const btnOp = `${btnBase} text-white`;
  const btnOpStyle = { backgroundColor: "#00B4D8" };
  const btnEq = `${btnBase} text-white`;
  const btnEqStyle = { backgroundColor: "#0D2540" };
  const btnFunc = `${btnBase} bg-muted/50 hover:bg-muted/70 text-muted-foreground`;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl shadow-2xl border bg-card overflow-hidden" style={{ borderColor: "#00B4D8" }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: "#0D2540" }}>
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4" style={{ color: "#00B4D8" }} />
          <span className="text-sm font-semibold text-white">Calculatrice</span>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-4 py-3 text-right border-b border-border bg-background">
        <div className="text-xs text-muted-foreground h-4">
          {prevValue !== null && operator ? `${prevValue} ${operator}` : ""}
        </div>
        <div className="text-2xl font-mono font-bold text-foreground truncate">{display}</div>
      </div>
      <div className="grid grid-cols-4 gap-1 p-2">
        <button className={btnFunc} onClick={clear}>C</button>
        <button className={btnFunc} onClick={toggleSign}>±</button>
        <button className={btnOp} style={btnOpStyle} onClick={() => performOperation("%")}>%</button>
        <button className={btnOp} style={btnOpStyle} onClick={() => performOperation("÷")}>÷</button>

        {["7", "8", "9"].map((d) => (
          <button key={d} className={btnNum} onClick={() => inputDigit(d)}>{d}</button>
        ))}
        <button className={btnOp} style={btnOpStyle} onClick={() => performOperation("×")}>×</button>

        {["4", "5", "6"].map((d) => (
          <button key={d} className={btnNum} onClick={() => inputDigit(d)}>{d}</button>
        ))}
        <button className={btnOp} style={btnOpStyle} onClick={() => performOperation("-")}>−</button>

        {["1", "2", "3"].map((d) => (
          <button key={d} className={btnNum} onClick={() => inputDigit(d)}>{d}</button>
        ))}
        <button className={btnOp} style={btnOpStyle} onClick={() => performOperation("+")}>+</button>

        <button className={`${btnNum} col-span-2`} onClick={() => inputDigit("0")}>0</button>
        <button className={btnNum} onClick={inputDot}>.</button>
        <button className={btnEq} style={btnEqStyle} onClick={handleEquals}>=</button>
      </div>
    </div>
  );
}
