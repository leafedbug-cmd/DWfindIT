// src/utils/workOrderExport.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DITCH_WITCH_ORANGE = '#EA580C';

// A helper function to generate the PDF
export function generateWorkOrderPDF(workOrderData: any, equipmentData: any) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(DITCH_WITCH_ORANGE);
  doc.text('Work Order', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Date Created: ${new Date().toLocaleDateString()}`, 14, 28);
  if (workOrderData.id) {
    doc.text(`WO #: ${workOrderData.id}`, 190, 22, { align: 'right' });
  }


  // Equipment Details Section
  autoTable(doc, {
    startY: 40,
    head: [['Equipment Details']],
    body: [
      ['Manufacturer', equipmentData.manufacturer],
      ['Model', equipmentData.model],
      ['Stock #', equipmentData.stock],
      ['Serial #', equipmentData.serial],
      ['Hourmeter', equipmentData.hourmeter],
    ],
    theme: 'plain',
    headStyles: {
      fillColor: DITCH_WITCH_ORANGE,
      textColor: 255,
      fontStyle: 'bold',
    },
  });

  // Customer & Job Details Section
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Job & Customer Details']],
    body: [
      ['Customer #', workOrderData.customer_number],
      ['Contact Name', workOrderData.contact_name],
      ['Contact Phone', workOrderData.contact_phone],
      ['Job Location', workOrderData.job_location],
    ],
    theme: 'plain',
    headStyles: {
      fillColor: DITCH_WITCH_ORANGE,
      textColor: 255,
      fontStyle: 'bold',
    },
  });
  
  // Instructions Section
    autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Instructions']],
    body: [[workOrderData.instructions]],
    theme: 'plain',
    headStyles: {
      fillColor: DITCH_WITCH_ORANGE,
      textColor: 255,
      fontStyle: 'bold',
    },
  });


  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
  }

  // Save the PDF to the user's device
  doc.save(`WorkOrder_${equipmentData.stock || 'Manual'}.pdf`);
}
