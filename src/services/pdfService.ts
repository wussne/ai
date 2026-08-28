import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportElementToPdf(
  element: HTMLElement,
  processName: string,
) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const imageData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const imageProperties = pdf.getImageProperties(imageData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imageProperties.height * pdfWidth) / imageProperties.width;

  pdf.addImage(imageData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`Регламент_${processName || "процесса"}.pdf`);
}
