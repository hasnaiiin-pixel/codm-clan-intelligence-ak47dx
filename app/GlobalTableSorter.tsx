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

function getHeaderLabel(header: HTMLTableCellElement) {
  const clone = header.cloneNode(true) as HTMLTableCellElement;
  clone.querySelectorAll(".sort-indicator-v1312").forEach((node) => node.remove());
  return clone.textContent?.trim().replace(/\s+/g, " ") || "colonna";
}

export function GlobalTableSorter() {
  useEffect(() => {
    const cleanupMap = new Map<HTMLTableCellElement, () => void>();

    const enhanceTable = (table: HTMLTableElement) => {
      if (table.dataset.noSort === "true") return;
      const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
      if (!headers.length) return;

      headers.forEach((header, columnIndex) => {
        if (header.dataset.noSort === "true" || header.dataset.sortReadyV1312 === "true") return;
        if (header.colSpan > 1) return;

        const label = getHeaderLabel(header);
        if (!label) return;

        header.dataset.sortReadyV1312 = "true";
        header.classList.add("sortable-th-v1310", "sortable-th-v1312");
        header.tabIndex = 0;
        header.setAttribute("role", "button");
        header.setAttribute("title", `Tocca per ordinare ${label}`);
        header.setAttribute("aria-label", `Ordina la tabella per ${label}`);
        header.setAttribute("aria-sort", "none");

        const indicator = document.createElement("span");
        indicator.className = "sort-indicator-v1312";
        indicator.setAttribute("aria-hidden", "true");
        indicator.textContent = "↕";
        header.appendChild(indicator);

        const sort = () => {
          const tbody = table.tBodies[0];
          if (!tbody) return;

          const previous = header.dataset.sortDirection;
          const direction = previous === "asc" ? "desc" : "asc";

          headers.forEach((otherHeader) => {
            delete otherHeader.dataset.sortDirection;
            otherHeader.classList.remove("sort-asc-v1310", "sort-desc-v1310");
            otherHeader.setAttribute("aria-sort", "none");
            const otherIndicator = otherHeader.querySelector<HTMLElement>(".sort-indicator-v1312");
            if (otherIndicator) otherIndicator.textContent = "↕";
          });

          header.dataset.sortDirection = direction;
          header.classList.add(direction === "asc" ? "sort-asc-v1310" : "sort-desc-v1310");
          header.setAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");
          indicator.textContent = direction === "asc" ? "↑" : "↓";
          header.setAttribute(
            "title",
            direction === "asc"
              ? `${label}: ordine crescente. Tocca di nuovo per decrescente`
              : `${label}: ordine decrescente. Tocca di nuovo per crescente`,
          );

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

        const onClick = (event: MouseEvent) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("button, a, input, select, textarea")) return;
          sort();
        };
        const onKey = (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            sort();
          }
        };

        header.addEventListener("click", onClick);
        header.addEventListener("keydown", onKey);
        cleanupMap.set(header, () => {
          header.removeEventListener("click", onClick);
          header.removeEventListener("keydown", onKey);
        });
      });
    };

    const enhanceAllTables = () => {
      document.querySelectorAll<HTMLTableElement>("table").forEach(enhanceTable);
    };

    enhanceAllTables();
    const observer = new MutationObserver(() => enhanceAllTables());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanupMap.forEach((cleanup) => cleanup());
      cleanupMap.clear();
    };
  }, []);

  return null;
}
