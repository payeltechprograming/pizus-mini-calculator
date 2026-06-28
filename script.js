(() => {
  "use strict";

  const STORAGE_KEYS = {
    history: "pizus.history",
    memory: "pizus.memory",
    theme: "pizus.theme",
    autoSave: "pizus.autoSave"
  };

  const state = {
    expression: "",
    currentResult: "0",
    memory: 0,
    history: [],
    mode: "basic",
    autoSave: true,
    theme: "dark",
    justCalculated: false
  };

  const elements = {
    root: document.documentElement,
    calculator: document.querySelector("[data-view='calculator']"),
    panels: document.querySelectorAll("[data-view]"),
    expression: document.getElementById("expressionPreview"),
    result: document.getElementById("resultDisplay"),
    status: document.getElementById("statusMessage"),
    memoryState: document.getElementById("memoryState"),
    memoryValue: document.getElementById("memoryValue"),
    historyList: document.getElementById("historyList"),
    historySearch: document.getElementById("historySearch"),
    themeSelect: document.getElementById("themeSelect"),
    autoSaveToggle: document.getElementById("autoSaveToggle")
  };

  const formatNumber = (value) => {
    if (!Number.isFinite(value)) return "Error";
    if (Object.is(value, -0)) value = 0;
    const rounded = Math.abs(value) < 1e-12 ? 0 : value;
    if (Math.abs(rounded) >= 1e12 || (Math.abs(rounded) > 0 && Math.abs(rounded) < 1e-8)) {
      return rounded.toExponential(8).replace(/\.?0+e/, "e");
    }
    return Number(rounded.toFixed(10)).toLocaleString("en-US", {
      maximumFractionDigits: 10,
      useGrouping: false
    });
  };

  const setStatus = (message = "") => {
    elements.status.textContent = message;
    if (message) window.setTimeout(() => {
      if (elements.status.textContent === message) elements.status.textContent = "";
    }, 1800);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEYS.memory, String(state.memory));
    localStorage.setItem(STORAGE_KEYS.theme, state.theme);
    localStorage.setItem(STORAGE_KEYS.autoSave, String(state.autoSave));
    if (state.autoSave) {
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
    } else {
      localStorage.removeItem(STORAGE_KEYS.history);
    }
  };

  const load = () => {
    state.memory = Number(localStorage.getItem(STORAGE_KEYS.memory) || 0);
    state.theme = localStorage.getItem(STORAGE_KEYS.theme) || "dark";
    state.autoSave = localStorage.getItem(STORAGE_KEYS.autoSave) !== "false";
    try {
      state.history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "[]");
    } catch {
      state.history = [];
    }
  };

  const applyTheme = () => {
    const resolved = state.theme === "system"
      ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : state.theme;
    elements.root.dataset.theme = resolved;
    elements.themeSelect.value = state.theme;
  };

  class Parser {
    constructor(input) {
      this.input = input.replace(/\s+/g, "");
      this.index = 0;
    }

    parse() {
      const value = this.parseExpression();
      if (this.index < this.input.length) throw new Error("Invalid expression");
      return value;
    }

    peek() {
      return this.input[this.index] || "";
    }

    consume(char) {
      if (this.peek() === char) {
        this.index += 1;
        return true;
      }
      return false;
    }

    parseExpression() {
      let value = this.parseTerm();
      while (this.peek() === "+" || this.peek() === "-") {
        const op = this.input[this.index++];
        const right = this.parseTerm();
        value = op === "+" ? value + right : value - right;
      }
      return value;
    }

    parseTerm() {
      let value = this.parsePower();
      while (this.peek() === "*" || this.peek() === "/") {
        const op = this.input[this.index++];
        const right = this.parsePower();
        if (op === "*") value *= right;
        if (op === "/") value /= right;
      }
      return value;
    }

    parsePower() {
      let value = this.parseUnary();
      if (this.consume("^")) {
        value = Math.pow(value, this.parsePower());
      }
      return value;
    }

    parseUnary() {
      if (this.consume("+")) return this.parseUnary();
      if (this.consume("-")) return -this.parseUnary();
      return this.parsePostfix();
    }

    parsePostfix() {
      let value = this.parsePrimary();
      while (this.peek() === "!" || this.peek() === "%") {
        if (this.consume("!")) value = factorial(value);
        if (this.consume("%")) value /= 100;
      }
      return value;
    }

    parsePrimary() {
      if (this.consume("(")) {
        const value = this.parseExpression();
        if (!this.consume(")")) throw new Error("Missing bracket");
        return value;
      }

      if (/^[0-9.]$/.test(this.peek())) return this.parseNumber();
      if (/^[a-zπ]$/i.test(this.peek())) return this.parseIdentifier();
      throw new Error("Invalid expression");
    }

    parseNumber() {
      const start = this.index;
      while (/^[0-9.]$/.test(this.peek())) this.index += 1;
      const raw = this.input.slice(start, this.index);
      if ((raw.match(/\./g) || []).length > 1 || raw === ".") throw new Error("Invalid number");
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error("Invalid number");
      return value;
    }

    parseIdentifier() {
      if (this.consume("π")) return Math.PI;
      const start = this.index;
      while (/^[a-z]$/i.test(this.peek())) this.index += 1;
      const name = this.input.slice(start, this.index).toLowerCase();
      if (name === "e") return Math.E;
      if (!this.consume("(")) throw new Error("Missing function bracket");
      const value = this.parseExpression();
      if (!this.consume(")")) throw new Error("Missing function bracket");
      const radians = value * Math.PI / 180;
      const functions = {
        sin: () => Math.sin(radians),
        cos: () => Math.cos(radians),
        tan: () => Math.tan(radians),
        log: () => Math.log10(value),
        ln: () => Math.log(value),
        sqrt: () => Math.sqrt(value),
        cbrt: () => Math.cbrt(value)
      };
      if (!functions[name]) throw new Error("Unknown function");
      return functions[name]();
    }
  }

  const factorial = (value) => {
    if (!Number.isInteger(value) || value < 0 || value > 170) throw new Error("Invalid factorial");
    let total = 1;
    for (let index = 2; index <= value; index += 1) total *= index;
    return total;
  };

  const normalizeExpression = (input) => input
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-")
    .replaceAll("√", "sqrt")
    .replaceAll("∛", "cbrt");

  const evaluate = (input) => {
    const value = new Parser(normalizeExpression(input)).parse();
    if (!Number.isFinite(value)) throw new Error("Math error");
    return value;
  };

  const updateDisplay = () => {
    elements.expression.textContent = state.expression || "0";
    elements.result.textContent = state.currentResult;
    elements.memoryState.hidden = state.memory === 0;
    elements.memoryValue.textContent = formatNumber(state.memory);
    elements.autoSaveToggle.checked = state.autoSave;
  };

  const refreshPreview = () => {
    if (!state.expression) {
      state.currentResult = "0";
      updateDisplay();
      return;
    }
    try {
      const last = state.expression.at(-1);
      if ("+-×÷^(".includes(last)) throw new Error("Incomplete");
      state.currentResult = formatNumber(evaluate(state.expression));
    } catch {
      state.currentResult = "";
    }
    updateDisplay();
  };

  const addHistory = (expression, result) => {
    state.history.unshift({
      id: globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      expression,
      result,
      createdAt: new Date().toISOString()
    });
    save();
    renderHistory();
  };

  const calculate = () => {
    if (!state.expression) return;
    try {
      const expression = state.expression;
      const result = formatNumber(evaluate(expression));
      state.currentResult = result;
      state.expression = result;
      state.justCalculated = true;
      addHistory(expression, result);
      setStatus("Saved to history");
    } catch (error) {
      state.currentResult = "Error";
      state.justCalculated = false;
      setStatus(error.message || "Math error");
    }
    updateDisplay();
  };

  const shouldImplicitMultiply = (value) => {
    const previous = state.expression.at(-1);
    return previous && /[0-9)πe!]/.test(previous) && /[πe(]|sin|cos|tan|log|ln|sqrt|cbrt/.test(value);
  };

  const isOperator = (value) => ["+", "-", "×", "÷", "^"].includes(value);
  const startsNewCalculation = (value) => /^[0-9.]$/.test(value) || ["π", "e"].includes(value) || /^[a-z]/i.test(value);

  const insert = (value) => {
    if (!value) return;
    if (state.currentResult === "Error") clearAll();
    if (state.justCalculated && startsNewCalculation(value)) {
      state.expression = "";
      state.currentResult = "0";
    }
    state.justCalculated = false;
    if (isOperator(value) && isOperator(state.expression.at(-1))) {
      state.expression = state.expression.slice(0, -1) + value;
      refreshPreview();
      return;
    }
    if (shouldImplicitMultiply(value)) state.expression += "×";
    state.expression += value;
    refreshPreview();
  };

  const insertFunction = (name) => {
    insert(`${name}(`);
  };

  const wrapSquare = () => {
    const value = state.expression || state.currentResult || "0";
    state.expression = `(${value})^2`;
    refreshPreview();
  };

  const insertDecimal = () => {
    const fragment = state.expression.split(/[+\-×÷%^()]/).pop() || "";
    insert(fragment.includes(".") ? "" : ".");
  };

  const clearAll = () => {
    state.expression = "";
    state.currentResult = "0";
    state.justCalculated = false;
    updateDisplay();
  };

  const deleteLast = () => {
    if (state.justCalculated) {
      clearAll();
      return;
    }
    state.expression = state.expression.slice(0, -1);
    refreshPreview();
  };

  const toggleSign = () => {
    state.justCalculated = false;
    if (!state.expression) {
      state.expression = "-";
    } else if (state.expression.startsWith("-(") && state.expression.endsWith(")")) {
      state.expression = state.expression.slice(2, -1);
    } else {
      state.expression = `-(${state.expression})`;
    }
    refreshPreview();
  };

  const insertBracket = () => {
    const open = (state.expression.match(/\(/g) || []).length;
    const close = (state.expression.match(/\)/g) || []).length;
    const last = state.expression.at(-1);
    insert(open > close && last && !"+-×÷^(".includes(last) ? ")" : "(");
  };

  const memoryAction = (action) => {
    const value = Number(state.currentResult || 0);
    if (action === "mc") state.memory = 0;
    if (action === "mr") insert(formatNumber(state.memory));
    if (action === "mplus" && Number.isFinite(value)) state.memory += value;
    if (action === "mminus" && Number.isFinite(value)) state.memory -= value;
    if (action === "ms" && Number.isFinite(value)) state.memory = value;
    save();
    updateDisplay();
  };

  const renderHistory = () => {
    const query = elements.historySearch.value.trim().toLowerCase();
    const items = state.history.filter((item) =>
      item.expression.toLowerCase().includes(query) || item.result.toLowerCase().includes(query)
    );
    elements.historyList.innerHTML = "";
    if (!items.length) {
      elements.historyList.innerHTML = `<p class="empty-state">${query ? "No matching calculations" : "No history yet"}</p>`;
      return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const row = document.createElement("article");
      row.className = "history-item";
      row.innerHTML = `
        <div class="history-expression"></div>
        <div class="history-result"></div>
        <div class="history-actions">
          <span class="history-time"></span>
          <button class="text-action" type="button" data-use-history="${item.id}">Use</button>
          <button class="text-action" type="button" data-delete-history="${item.id}">Delete</button>
        </div>
      `;
      row.querySelector(".history-expression").textContent = item.expression;
      row.querySelector(".history-result").textContent = `= ${item.result}`;
      row.querySelector(".history-time").textContent = new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(item.createdAt));
      fragment.append(row);
    });
    elements.historyList.append(fragment);
  };

  const navigate = (view) => {
    elements.panels.forEach((panel) => {
      panel.hidden = panel.dataset.view !== view;
    });
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.nav === view);
    });
    if (view === "history") renderHistory();
  };

  const setMode = (mode) => {
    state.mode = mode;
    elements.calculator.classList.toggle("scientific", mode === "scientific");
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(state.currentResult || "0");
      setStatus("Copied");
    } catch {
      setStatus("Copy unavailable");
    }
  };

  const pasteNumber = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const number = Number(text.replace(/,/g, ""));
      if (!Number.isFinite(number)) throw new Error();
      insert(formatNumber(number));
      setStatus("Pasted");
    } catch {
      setStatus("Paste a valid number");
    }
  };

  const createRipple = (event, button) => {
    const ripple = document.createElement("span");
    const rect = button.getBoundingClientRect();
    ripple.className = "ripple";
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    button.append(ripple);
    window.setTimeout(() => ripple.remove(), 540);
  };

  const handleButton = (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    createRipple(event, button);
    if (button.dataset.insert) insert(button.dataset.insert);
    if (button.dataset.fn) insertFunction(button.dataset.fn);
    if (button.dataset.postfix) insert(button.dataset.postfix);
    if (button.dataset.wrap === "square") wrapSquare();
    if (button.dataset.memory) memoryAction(button.dataset.memory);
    if (button.dataset.mode) setMode(button.dataset.mode);
    if (button.dataset.nav) navigate(button.dataset.nav);
    if (button.dataset.action === "clear") clearAll();
    if (button.dataset.action === "delete") deleteLast();
    if (button.dataset.action === "equals") calculate();
    if (button.dataset.action === "decimal") insertDecimal();
    if (button.dataset.action === "bracket") insertBracket();
    if (button.dataset.action === "toggle-sign") toggleSign();
    if (button.dataset.action === "copy") copyResult();
    if (button.dataset.action === "paste") pasteNumber();
    if (button.dataset.action === "clear-history") {
      state.history = [];
      save();
      renderHistory();
    }
    if (button.dataset.action === "focus-search") {
      navigate("history");
      elements.historySearch.focus();
    }
  };

  const handleHistoryClick = (event) => {
    const useId = event.target.dataset.useHistory;
    const deleteId = event.target.dataset.deleteHistory;
    if (useId) {
      const item = state.history.find((entry) => entry.id === useId);
      if (item) {
        state.expression = item.result;
        state.currentResult = item.result;
        state.justCalculated = true;
        navigate("calculator");
        updateDisplay();
      }
    }
    if (deleteId) {
      state.history = state.history.filter((entry) => entry.id !== deleteId);
      save();
      renderHistory();
    }
  };

  const handleKeyboard = (event) => {
    const keyMap = { "*": "×", "/": "÷", Enter: "=", Escape: "AC", Backspace: "⌫" };
    const key = keyMap[event.key] || event.key;
    if (/^[0-9+\-.%^()]$/.test(key)) {
      event.preventDefault();
      key === "." ? insertDecimal() : insert(key);
    }
    if (key === "×" || key === "÷") {
      event.preventDefault();
      insert(key);
    }
    if (key === "=") {
      event.preventDefault();
      calculate();
    }
    if (key === "AC") {
      event.preventDefault();
      clearAll();
    }
    if (key === "⌫") {
      event.preventDefault();
      deleteLast();
    }
  };

  document.addEventListener("click", handleButton);
  document.addEventListener("keydown", handleKeyboard);
  elements.historyList.addEventListener("click", handleHistoryClick);
  elements.historySearch.addEventListener("input", renderHistory);
  elements.themeSelect.addEventListener("change", (event) => {
    state.theme = event.target.value;
    applyTheme();
    save();
  });
  elements.autoSaveToggle.addEventListener("change", (event) => {
    state.autoSave = event.target.checked;
    save();
  });
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", applyTheme);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }

  load();
  applyTheme();
  updateDisplay();
  renderHistory();
})();
