// src/utils/workOrderExport.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DITCH_WITCH_ORANGE = '#EA580C';

export function generateWorkOrderPDF(workOrderData: any, equipmentData: any) {
  const doc = new jsPDF();

  const formatValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') return value.toString();
    const trimmed = value.toString().trim();
    return trimmed.length > 0 ? trimmed : 'N/A';
  };

  const createdDate = workOrderData.created_at
    ? new Date(workOrderData.created_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  doc.setFontSize(22);
  doc.setTextColor(DITCH_WITCH_ORANGE);
  doc.text('Work Order', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Date Created: ${createdDate}`, 14, 28);
  if (workOrderData.id) {
    doc.text(`WO #: ${workOrderData.id}`, 190, 22, { align: 'right' });
  }

  autoTable(doc, {
    startY: 40,
    head: [['Equipment Details']],
    body: [
      ['Manufacturer', formatValue(equipmentData.manufacturer)],
      ['Model', formatValue(equipmentData.model)],
      ['Stock #', formatValue(equipmentData.stock)],
      ['Serial #', formatValue(equipmentData.serial)],
      ['Hourmeter', formatValue(equipmentData.hourmeter)],
    ],
    theme: 'plain',
    headStyles: { fillColor: DITCH_WITCH_ORANGE, textColor: 255, fontStyle: 'bold' },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Job & Customer Details']],
    body: [
      ['Customer #', formatValue(workOrderData.customer_number)],
      ['Contact Name', formatValue(workOrderData.contact_name)],
      ['Contact Phone', formatValue(workOrderData.contact_phone)],
      ['Store Location', formatValue(workOrderData.store_location)],
      ['Job Location', formatValue(workOrderData.job_location)],
    ],
    theme: 'plain',
    headStyles: { fillColor: DITCH_WITCH_ORANGE, textColor: 255, fontStyle: 'bold' },
  });
  
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Instructions']],
    body: [[formatValue(workOrderData.instructions)]],
    theme: 'plain',
    headStyles: { fillColor: DITCH_WITCH_ORANGE, textColor: 255, fontStyle: 'bold' },
  });
  
  // ADDED: Winterization section for the PDF
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Winterization Required?*']],
    body: [
      [`${workOrderData.winterization_required ? 'YES' : 'NO'}`],
      [{
          content: `*If machine is marked as winterized above, Ditch Witch of Arkansas will not be responsible for any damage to machine from freezing. If Ditch Witch Of Arkansas is required to winterize machine an extra charge will be applied to Work Order.`,
          styles: { fontSize: 8, textColor: 100 }
      }]
    ],
    theme: 'plain',
    headStyles: { fillColor: DITCH_WITCH_ORANGE, textColor: 255, fontStyle: 'bold' },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
  }

  if (workOrderData.signature) {
    const signatureStartY = ((doc as any).lastAutoTable?.finalY || 80) + 20;
    doc.setFontSize(10);
    doc.text('Authorized Signature', 14, signatureStartY);
    try {
      doc.addImage(workOrderData.signature, 'PNG', 14, signatureStartY + 4, 60, 24);
      doc.line(14, signatureStartY + 30, 74, signatureStartY + 30);
    } catch (error) {
      doc.text('[Signature unavailable]', 14, signatureStartY + 12);
    }
  }

  const timestamp = new Date().getTime();
  const fileName = `WorkOrder_${equipmentData.stock || 'Manual'}_${timestamp}.pdf`;
  doc.save(fileName);
}
