import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { List, ScanItem } from '../services/supabase';

// Type augmentation for jsPDF to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateCSV = (list: List, items: ScanItem[]): string => {
  const headers = ['Barcode', 'Part Number', 'Bin Location', 'Quantity', 'Notes', 'Date Added'];
  
  const rows = items.map(item => [
    item.barcode,
    item.part_number,
    item.bin_location,
    item.quantity.toString(),
    item.notes || '',
    new Date(item.created_at).toLocaleString()
  ]);
  
  // Add list metadata
  const metadata = [
    ['List Name:', list.name],
    ['Created:', new Date(list.created_at).toLocaleString()],
    ['Exported:', new Date().toLocaleString()],
    ['Total Items:', items.length.toString()],
    ['']  // Empty row before header
  ];
  
  // Combine all rows
  const allRows = [
    ...metadata,
    headers,
    ...rows
  ];
  
  // Convert to CSV
  return allRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
};

export const generatePDF = async (list: List, items: ScanItem[]): Promise<void> => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text(list.name, 14, 22);
  
  // Add metadata
  doc.setFontSize(10);
  doc.text(`Created: ${new Date(list.created_at).toLocaleString()}`, 14, 30);
  doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 35);
  doc.text(`Total Items: ${items.length}`, 14, 40);
  
  // Create table
  const tableData = items.map(item => [
    item.barcode,
    item.part_number,
    item.bin_location,
    item.quantity.toString(),
    item.notes || '',
    new Date(item.created_at).toLocaleString()
  ]);
  
  doc.autoTable({
    startY: 45,
    head: [['Barcode', 'Part Number', 'Bin Location', 'Quantity', 'Notes', 'Date Added']],
    body: tableData,
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 15 }
  });
  
  // Save the PDF
  doc.save(`${list.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};