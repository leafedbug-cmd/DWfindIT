// src/utils/workOrderExport.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DITCH_WITCH_ORANGE = '#EA580C';

// UPDATED: The function now accepts the signature image as a base64 string
export function generateWorkOrderPDF(workOrder: any, signatureImage: string | null) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(DITCH_WITCH_ORANGE);
  doc.text('Work Order', 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Date Created: ${new Date().toLocaleDateString()}`, 14, 28);
  if (workOrder.id) {
    doc.text(`WO #: ${workOrder.id}`, 190, 22, { align: 'right' });
  }

  // Equipment Details
  autoTable(doc, {
    startY: 40,
    head: [['Equipment Details']],
    body: [
      ['Manufacturer', workOrder.manufacturer],
      ['Model', workOrder.model],
      ['Stock #', workOrder.stock],
      ['Serial #', workOrder.serial],
      ['Hourmeter', workOrder.hourmeter],
    ],
    theme: 'plain',
    headStyles: { fillColor: DITCH_WITCH_ORANGE, textColor: 255, fontStyle: 'bold' },
  });

  // Customer & Job Details
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Job & Customer Details']],
    body: [
      ['Customer #', workOrder.customer_number],
      ['Contact Name', workOrder.contact_name],
      ['Contact Phone', workOrder.contact_phone],
      ['Job Location', workOrder.job_location],
    ],
    theme: 'plain',
    headStyles: { fillColor: DITCH_WITCH_ORANGE, textColor: 255, fontStyle: 'bold' },
  });
  
  // Instructions
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Instructions']],
    body: [[workOrder.instructions]],
    theme: 'plain',
    headStyles: { fillColor: DITCH_WITCH_ORANGE, textColor: 255, fontStyle: 'bold' },
  });

  // ADDED: Authorization Text & Signature
  const finalY = (doc as any).lastAutoTable.finalY;
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text('Repair Authorization & Electronic Signature Agreement', 14, finalY + 15);

  const authText = doc.splitTextToSize(
    'I hereby authorize the repair work described above, including any additional work deemed necessary or incidental thereto, along with all required parts and labor. I understand that payment is due upon completion of the work unless alternative arrangements have been agreed to in advance. I acknowledge and consent to an express mechanic\'s lien on this equipment to secure payment for all repairs and any associated fees in the event of non-payment. Customer acknowledges that an unloading fee will be applied if the machine is not unloaded from trailers. Furthermore, if Ditch Witch of Arkansas is required to unload a machine, we are not responsible for any damages that may occur to the equipment or trailer during the loading or unloading process. Furthermore, by signing below, I consent to the use of an electronic signature, which shall have the same legal effect and enforceability as a handwritten signature.',
    180
  );
  doc.setFontSize(8);
  doc.text(authText, 14, finalY + 22);

  if (signatureImage) {
    doc.addImage(signatureImage, 'PNG', 14, doc.internal.pageSize.height - 70, 80, 40);
  }
  doc.setLineWidth(0.5);
  doc.line(14, doc.internal.pageSize.height - 30, 100, doc.internal.pageSize.height - 30);
  doc.setFontSize(10);
  doc.text('Customer Signature', 14, doc.internal.pageSize.height - 25);


  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
  }

  doc.save(`WorkOrder_${workOrder.stock || 'Manual'}.pdf`);
}
