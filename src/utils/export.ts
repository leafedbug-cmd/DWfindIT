// src/utils/export.ts
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ListItem } from '../store/listItemStore';
import { ListWithCount } from '../store/listStore';

// Extend the jsPDF interface to include the autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const DITCH_WITCH_ORANGE = '#EA580C'; // Ditch Witch brand orange for theme

// --- CSV Generation ---
export function generateCSV(list: ListWithCount, items: ListItem[]): string {
  const headers = ['Type', 'Identifier', 'Details', 'Quantity'];
  const rows = items.map(item => {
    if (item.item_type === 'equipment' && item.equipment) {
      const { make, model, stock_number, serial_number } = item.equipment;
      return [
        'Equipment',
        stock_number,
        `${make || ''} ${model || ''} (S/N: ${serial_number || 'N/A'})`,
        item.quantity
      ];
    }
    if (item.item_type === 'part' && item.parts) {
      const { part_number, bin_location } = item.parts;
      return [
        'Part',
        part_number,
        `Bin: ${bin_location || 'N/A'}`,
        item.quantity
      ];
    }
    return ['Unknown', '', '', item.quantity];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

// --- PDF Generation ---
export function generatePDF(list: ListWithCount, items: ListItem[]): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(DITCH_WITCH_ORANGE);
  doc.text('Ditch Witch Inventory List', 14, 22);
  
  // List Details
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text(`List Name: ${list.name}`, 14, 32);
  doc.text(`Date Created: ${new Date(list.created_at).toLocaleDateString()}`, 14, 38);

  // Table
  const tableColumn = ["Type", "Identifier", "Details", "Qty"];
  const tableRows: (string | number)[][] = [];

  items.forEach(item => {
    if (item.item_type === 'equipment' && item.equipment) {
      const { make, model, stock_number, serial_number } = item.equipment;
      const row = [
        'Equipment',
        stock_number,
        `${make || ''} ${model || ''} (S/N: ${serial_number || 'N/A'})`,
        item.quantity
      ];
      tableRows.push(row);
    }
    if (item.item_type === 'part' && item.parts) {
      const { part_number, bin_location } = item.parts;
      const row = [
        'Part',
        part_number,
        `Bin: ${bin_location || 'N/A'}`,
        item.quantity
      ];
      tableRows.push(row);
    }
  });

  doc.autoTable({
    startY: 50,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: DITCH_WITCH_ORANGE,
      textColor: 255,
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [245, 245, 245], // A light gray
    },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(10);
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
    }
  });

  const fileName = `${list.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fileName);
}