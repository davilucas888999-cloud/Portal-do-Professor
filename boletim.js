// Lógica para a Ficha Individual do Aluno e Boletim

function populateStudentSelect() {
    const select = document.getElementById('student-select');
    select.innerHTML = '';
    ALUNOS.forEach(aluno => {
        const option = document.createElement('option');
        option.value = aluno;
        option.textContent = aluno;
        select.appendChild(option);
    });
}

function loadStudentBoletim() {
    const aluno = document.getElementById('student-select').value;
    renderBoletimHeader(aluno);
    renderBoletimEvolutionChart(aluno);
    renderBoletimDisciplinas(aluno);
}

function renderBoletimHeader(aluno) {
    const header = document.getElementById('boletim-header');
    header.innerHTML = `
        <img src="brasao.png" alt="Logo Escola">
        <h3>${CONFIG.schoolName}</h3>
        <p>${CONFIG.turmaName} - ${CONFIG.ano}</p>
        <h4>BOLETIM INDIVIDUAL - ${aluno}</h4>
    `;
}

function renderBoletimDisciplinas(aluno) {
    const container = document.getElementById('disciplinas-boletim');
    container.innerHTML = '';
    let totalAcumuladoAnual = 0;
    
    DISCIPLINAS.forEach(d => {
        const card = document.createElement('div');
        card.className = 'disciplina-boletim-card';
        let totalAnualDisciplina = 0;
        
        let bimestresHtml = '<div class="notas-boletim-grid">';
        for (let b = 1; b <= 4; b++) {
            const bData = db.disciplinas[d][b];
            let notaBimOrig = 0;
            bData.atividades.forEach(a => { notaBimOrig += (a.notas[aluno] ? a.notas[aluno].notaFinal : 0); });
            
            let finalScore = notaBimOrig;
            if (bData.isLocked && notaBimOrig < 15) {
                finalScore = calculateBimestreFinalScore(notaBimOrig, bData.recuperacaoBimestral.notas[aluno]);
            }
            
            totalAnualDisciplina += finalScore;
            
            bimestresHtml += `
                <div class="bimestre-boletim-item">
                    <span>${b}º Bimestre:</span>
                    <strong>${formatScore(finalScore)}</strong>
                </div>
            `;
        }
        bimestresHtml += '</div>';
        
        const percentAcumulado = (totalAnualDisciplina / 100) * 100;
        
        card.innerHTML = `
            <h4>${d}</h4>
            ${bimestresHtml}
            <div class="total-anual-item">Total Anual: ${formatScore(totalAnualDisciplina)} / 100.0 (Percentual: ${formatScore(percentAcumulado)}%)</div>
        `;
        container.appendChild(card);
        totalAcumuladoAnual += totalAnualDisciplina;
    });
    
    const mediaAnualGlobal = totalAcumuladoAnual / DISCIPLINAS.length;
    document.getElementById('totais-anuais').innerHTML = `
        Média Geral de Aproveitamento (Anual): <strong>${formatScore(mediaAnualGlobal)} / 100</strong>
    `;
}

function renderBoletimEvolutionChart(aluno) {
    const ctx = document.getElementById('studentEvolutionChart').getContext('2d');
    if(window.studentEvolutionChartInstance) window.studentEvolutionChartInstance.destroy();
    
    const bimestreTotals = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
    DISCIPLINAS.forEach(d => {
        for (let b = 1; b <= 4; b++) {
            const bData = db.disciplinas[d][b];
            let notaBimOrig = 0;
            bData.atividades.forEach(a => { notaBimOrig += (a.notas[aluno] ? a.notas[aluno].notaFinal : 0); });
            
            let finalScore = notaBimOrig;
            if (bData.isLocked && notaBimOrig < 15) finalScore = calculateBimestreFinalScore(notaBimOrig, bData.recuperacaoBimestral.notas[aluno]);
            
            bimestreTotals[b] += finalScore;
        }
    });

    window.studentEvolutionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'],
            datasets: [{
                label: 'Total de Pontos Acumulados',
                data: [bimestreTotals[1], bimestreTotals[2], bimestreTotals[3], bimestreTotals[4]],
                fill: false,
                borderColor: 'rgba(52, 152, 219, 1)',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: DISCIPLINAS.length * 25 }
            }
        }
    });
}
