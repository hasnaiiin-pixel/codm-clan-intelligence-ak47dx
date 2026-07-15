"use client";

import { useEffect } from "react";

function parseValue(value: string): string | number {
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const percent = clean.match(/^(-?[\d.,]+)\s*%$/);
  if (percent) return Number(percent[1].replace(",", "."));
  const fraction = clean.match(/^(-?[\d.,]+)\s*\/\s*(-?[\d.,]+)/);
  if (fraction) return Number(fraction[1].replace(",", "."));
  const numeric = clean.match(/^-?[\d.,]+$/);
  if (numeric) return Number(clean.replace(/\./g, "").replace(",", "."));
  const date = Date.parse(clean);
  if (!Number.isNaN(date) && /[\/-]/.test(clean)) return date;
  return clean.toLocaleLowerCase("it");
}

export function GlobalTableSorter() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    const tables = Array.from(document.querySelectorAll<HTMLTableElement>("table.table"));

    tables.forEach((table) => {
      if (table.dataset.noSort === "true") return;
      const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
      headers.forEach((header, columnIndex) => {
        const label = header.textContent?.trim() || "colonna";
        if (!label || header.dataset.noSort === "true") return;
        header.classList.add("sortable-th-v1310");
        header.tabIndex = 0;
        header.setAttribute("role", "button");
        header.setAttribute("title", `Ordina per ${label}`);
        header.setAttribute("aria-label", `Ordina per ${label}`);

        const sort = () => {
          const tbody = table.tBodies[0];
          if (!tbody) return;
          const previous = header.dataset.sortDirection;
          const direction = previous === "asc" ? "desc" : "asc";
          headers.forEach((h) => {
            delete h.dataset.sortDirection;
            h.classList.remove("sort-asc-v1310", "sort-desc-v1310");
            h.removeAttribute("aria-sort");
          });
          header.dataset.sortDirection = direction;
          header.classList.add(direction === "asc" ? "sort-asc-v1310" : "sort-desc-v1310");
          header.setAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");

          const rows = Array.from(tbody.rows).map((row, originalIndex) => ({ row, originalIndex }));
          rows.sort((a, b) => {
            const av = parseValue(a.row.cells[columnIndex]?.innerText || "");
            const bv = parseValue(b.row.cells[columnIndex]?.innerText || "");
            let result = 0;
            if (typeof av === "number" && typeof bv === "number") result = av - bv;
            else result = String(av).localeCompare(String(bv), "it", { numeric: true, sensitivity: "base" });
            if (result === 0) result = a.originalIndex - b.originalIndex;
            return direction === "asc" ? result : -result;
          });
          rows.forEach(({ row }) => tbody.appendChild(row));
        };
        const onClick = () => sort();
        const onKey = (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            sort();
          }
        };
        header.addEventListener("click", onClick);
        header.addEventListener("keydown", onKey);
        cleanups.push(() => {
          header.removeEventListener("click", onClick);
          header.removeEventListener("keydown", onKey);
        });
      });
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return null;
}
