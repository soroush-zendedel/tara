        // Export the current canvas views as a paginated PDF booklet.
        function downloadPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210;
            const margin = 10;
            let currentY = 20;

            doc.setFontSize(22);
            doc.text("Interactive Guitar Studio", pageWidth/2, currentY, { align: 'center' });
            currentY += 10;
            doc.setFontSize(14);
            doc.setTextColor(100);
            doc.text(`Scale: ${getNoteName(selectedRootIndex)} ${selectedScaleName}`, pageWidth/2, currentY, { align: 'center' });
            currentY += 20;

            function addCanvasToDoc(canvasObj, title) {
                if (currentY > 250) { doc.addPage(); currentY = 20; }
                
                doc.setFontSize(12); doc.setTextColor(0);
                doc.text(title, margin, currentY);
                currentY += 5;

                const imgData = canvasObj.toDataURL('image/png');
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = pageWidth - (margin * 2);
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                doc.addImage(imgData, 'PNG', margin, currentY, pdfWidth, pdfHeight);
                currentY += pdfHeight + 15;
            }

            addCanvasToDoc(circleCanvas, "Circle of Fifths");
            addCanvasToDoc(theoryCanvas, "Theory & Chords");
            
            doc.addPage(); currentY = 20;
            addCanvasToDoc(fretboardCanvas, "Fretboard");
            addCanvasToDoc(pianoCanvas, "Piano");
            addCanvasToDoc(notationCanvas, "Notation & Tabs");

            const pageCount = doc.internal.getNumberOfPages();
            for(let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text(`Page ${i} of ${pageCount} - Tara, GuitarLab`, pageWidth/2, 290, { align: 'center' });
            }

            doc.save(`Tara_${getNoteName(selectedRootIndex)}_${selectedScaleName}.pdf`);
        }
