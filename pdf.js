// Geração de PDF usando jsPDF e jspdf-autotable

function getBase64Image(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
}

async function exportStudentIndividualPDF(aluno = null) {
    if (!aluno) aluno = document.getElementById('student-select').value;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Carregar imagem em base64 (síncrono)
    const imgLogo = getBase64Image(document.querySelector('.school-logo'));
    
    // Cabeçalho
    doc.addImage(imgLogo, 'PNG', 15, 10, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(CONFIG.schoolName, 40, 15);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`${CONFIG.turmaName} - ${CONFIG.ano}`, 40, 21);
    doc.text(`ALUNO: ${aluno}`, 40, 27);
    doc.setFontSize(10);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 150, 15);
    
    let yPos = 40;
    let totalAnualTurma = 0;
    let disciplinasCount = 0;

    DISCIPLINAS.forEach(disciplina => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(disciplina, 15, yPos);
        doc.setFont("helvetica", "normal");
        yPos += 7;
        
        const tableData = [];
        let totalDisciplinaAnual = 0;
        
        for (let b = 1; b <= 4; b++) {
            const bData = db.disciplinas[disciplina][b];
            let notaBimOrig = 0;
            
            bData.atividades.forEach(a => {
                const n = (a.notas[aluno] ? a.notas[aluno].notaFinal : 0);
                notaBimOrig += n;
                tableData.push([
                    `Atividade: ${a.nome}`,
                    b + "º Bimestre",
                    formatScore(a.valor),
                    (a.notas[aluno] ? formatScore(a.notas[aluno].notaOrig) : "0,0"),
                    (a.notas[aluno] && a.notas[aluno].notaRec ? formatScore(a.notas[aluno].notaRec) : "---"),
                    formatScore(n)
                ]);
            });
            
            // Recuperação Bimestral (se fechado)
            if(bData.isLocked && notaBimOrig < 15) {
                 const nRecBim = calculateBimestreFinalScore(notaBimOrig, bData.recuperacaoBimestral.notas[aluno]);
                 tableData.push([
                    { content: `Recuperação Bimestral (Max: 25.0)`, colSpan: 2, styles: { fillColor: [240, 240, 240] } },
                    "", "---", formatScore(bData.recuperacaoBimestral.notas[aluno]),
                    formatScore(nRecBim)
                 ]);
                 totalDisciplinaAnual += nRecBim;
            } else {
                 tableData.push([
                    { content: `${b}º Bimestre (Max: 25.0)`, colSpan: 2, styles: { fillColor: [245, 245, 245] } },
                    "", "---", "---",
                    formatScore(notaBimOrig)
                 ]);
                 totalDisciplinaAnual += notaBimOrig;
            }
        }
        
        totalAnualTurma += totalDisciplinaAnual;
        disciplinasCount++;

        doc.autoTable({
            startY: yPos,
            head: [['Descrição', 'Bim.', 'Val.', 'Nota', 'Rec.', 'Final']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [52, 152, 219], textColor: 255 },
            columnStyles: {
                0: { cellWidth: 70 }, 1: { cellWidth: 15 }, 2: { cellWidth: 20 },
                3: { cellWidth: 20 }, 4: { cellWidth: 20 }, 5: { cellWidth: 20 }
            }
        });
        
        yPos = doc.lastAutoTable.finalY + 7;
        doc.setFont("helvetica", "bold");
        doc.text(`Total Anual Disciplina: ${formatScore(totalDisciplinaAnual)} / 100.0 (Percentual: ${formatScore((totalDisciplinaAnual/100)*100)}%)`, 15, yPos);
        yPos += 15;
        
        // Quebra de página se necessário
        if (yPos > 250) { doc.addPage(); yPos = 20; }
    });

    // Totais Anuais
    if (yPos > 200) { doc.addPage(); yPos = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO ANUAL", 15, yPos);
    yPos += 10;
    
    const mediaGeral = totalAnualTurma / disciplinasCount;
    doc.setFontSize(12);
    doc.text(`Total Acumulado das Disciplinas (Anual): ${formatScore(totalAnualTurma, true)} / ${DISCIPLINAS.length * 100}`, 15, yPos);
    yPos += 7;
    doc.text(`Média Geral de Aproveitamento (Anual): ${formatScore(mediaGeral, true)}`, 15, yPos);
    yPos += 15;
    
    // Espaços para assinaturas
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text("________________________", 40, yPos);
    doc.text("Professores", 60, yPos + 6);
    
    doc.text("________________________", 130, yPos);
    doc.text("Direção", 150, yPos + 6);
    
    doc.save(`boletim_individual_${aluno}_${CONFIG.ano}.pdf`);
}

async function exportDisciplinaBimestrePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Carregar imagem em base64 (síncrono)
    const imgLogo = getBase64Image(document.querySelector('.school-logo'));
    
    // Cabeçalho
    doc.addImage(imgLogo, 'PNG', 15, 10, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(CONFIG.schoolName, 40, 15);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`${CONFIG.turmaName} - ${CONFIG.ano}`, 40, 21);
    doc.text(`DISCIPLINA: ${currentDisciplina} - ${currentBimestre}º Bimestre`, 40, 27);
    doc.setFontSize(10);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 150, 15);
    
    let yPos = 40;
    const bData = db.disciplinas[currentDisciplina][currentBimestre];
    const isLocked = bData.isLocked;
    
    if(isLocked) { doc.text(`Fechado em: ${new Date(bData.lockedAt).toLocaleString('pt-BR')}`, 15, yPos); yPos += 10; }
    
    // Tabela de Atividades (se houver)
    if(bData.atividades.length > 0) {
        doc.setFont("helvetica", "bold"); doc.text("Atividades Avaliativas", 15, yPos); yPos += 7;
        const atvData = [];
        bData.atividades.forEach(a => { atvData.push([a.nome, formatScore(a.valor, true), (a.data ? new Date(a.data).toLocaleDateString('pt-BR') : "---")]); });
        
        doc.autoTable({
            startY: yPos,
            head: [['Atividade', 'Valor', 'Data']],
            body: atvData,
            theme: 'striped',
            headStyles: { fillColor: [52, 152, 219] }
        });
        yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // Tabela de Notas de todos os alunos
    doc.setFont("helvetica", "bold"); doc.text("Relatório de Notas Bimestrais", 15, yPos); yPos += 7;
    const studentData = [];
    
    ALUNOS.forEach(aluno => {
        let notaOrig = 0;
        bData.atividades.forEach(a => { notaOrig += (a.notas[aluno] ? a.notas[aluno].notaFinal : 0); });
        
        let notaRecInput = "";
        let finalScore = notaOrig;
        
        if (isLocked && notaOrig < 15) {
             notaRecInput = (bData.recuperacaoBimestral.notas[aluno] !== undefined) ? formatScore(bData.recuperacaoBimestral.notas[aluno]) : "---";
             finalScore = calculateBimestreFinalScore(notaOrig, bData.recuperacaoBimestral.notas[aluno]);
        }
        
        studentData.push([aluno, formatScore(notaOrig), notaRecInput, formatScore(finalScore)]);
    });

    doc.autoTable({
        startY: yPos,
        head: [['Aluno', 'Nota Original', 'Nota Rec.', 'Final Bimestre']],
        body: studentData,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80], textColor: 255 },
        columnStyles: { 0: { cellWidth: 80 } }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Espaços para assinaturas
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text("________________________", 40, yPos);
    doc.text("Professor", 60, yPos + 6);
    
    doc.text("________________________", 130, yPos);
    doc.text("Direção", 150, yPos + 6);

    doc.save(`relatorio_${currentDisciplina}_${currentBimestre}B_${CONFIG.ano}.pdf`);
}
