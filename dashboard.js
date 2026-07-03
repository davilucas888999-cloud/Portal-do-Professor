// Lógica para o Dashboard Geral

function loadDashboard() {
    renderGlobalStats();
    renderClassAverageChart();
    renderScoreDistributionChart();
}

function getGlobalTotals() {
    let totAlunosAtivos = ALUNOS.length;
    let totDisciplinas = DISCIPLINAS.length;
    let totBimestresFechados = 0;
    let totRecuperacoesRealizadas = 0;
    let notaAcumuladaGlobal = 0;
    let bimestresLançadosGlobal = 0;
    let maxNotaGlobal = 0;
    let minNotaGlobal = 100;
    let alunosAbaixoDe15 = 0;
    let alunosAcimaDe20 = 0;

    DISCIPLINAS.forEach(d => {
        for (let b = 1; b <= 4; b++) {
            const bData = db.disciplinas[d][b];
            if (bData.isLocked) totBimestresFechados++;
            
            ALUNOS.forEach(aluno => {
                 let notaOrigBim = 0;
                 bData.atividades.forEach(a => { notaOrigBim += (a.notas[aluno] ? a.notas[aluno].notaFinal : 0); });
                 
                 let finalScore = notaOrigBim;
                 if (bData.isLocked && notaOrigBim < 15) {
                      finalScore = calculateBimestreFinalScore(notaOrigBim, bData.recuperacaoBimestral.notas[aluno]);
                      if(bData.recuperacaoBimestral.notas[aluno] !== undefined) totRecuperacoesRealizadas++;
                 }
                 
                 notaAcumuladaGlobal += finalScore;
                 if(bData.atividades.length > 0) bimestresLançadosGlobal++;
                 
                 if(finalScore > maxNotaGlobal) maxNotaGlobal = finalScore;
                 if(bData.atividades.length > 0 && finalScore < minNotaGlobal) minNotaGlobal = finalScore;
                 
                 if(bData.atividades.length > 0 && finalScore < 15) alunosAbaixoDe15++;
                 if(bData.atividades.length > 0 && finalScore > 20) alunosAcimaDe20++;
            });
        }
    });

    const totBimestresPossiveis = totDisciplinas * 4;
    const progressoLançamento = bimestresLançadosGlobal > 0 ? (bimestresLançadosGlobal / (totBimestresPossiveis * totAlunosAtivos)) * 100 : 0;
    const mediaGeralGlobal = bimestresLançadosGlobal > 0 ? (notaAcumuladaGlobal / bimestresLançadosGlobal) : 0;

    return { totAlunosAtivos, totBimestresFechados, totRecuperacoesRealizadas, mediaGeralGlobal, maxNotaGlobal, minNotaGlobal, alunosAbaixoDe15, alunosAcimaDe20, progressoLançamento };
}

function renderGlobalStats() {
    const stats = getGlobalTotals();
    const statsContainer = document.getElementById('global-stats');
    statsContainer.innerHTML = '';
    
    const cards = [
        { value: stats.totAlunosAtivos, desc: "Alunos Ativos" },
        { value: formatScore(stats.mediaGeralGlobal), desc: "Média Geral" },
        { value: formatScore(stats.maxNotaGlobal), desc: "Maior Nota Bimestral" },
        { value: (stats.minNotaGlobal === 100 ? "---" : formatScore(stats.minNotaGlobal)), desc: "Menor Nota Bimestral" },
        { value: stats.totBimestresFechados, desc: "Bimestres Fechados" },
        { value: stats.totRecuperacoesRealizadas, desc: "Recuperações Realizadas" },
        { value: `${formatScore(stats.progressoLançamento)}%`, desc: "Progresso Lançamentos" }
    ];
    
    cards.forEach(card => {
        const div = document.createElement('div');
        div.className = 'stat-card';
        div.innerHTML = `
            <h3>${card.value}</h3>
            <p>${card.desc}</p>
        `;
        statsContainer.appendChild(div);
    });
}

function renderClassAverageChart() {
    const ctx = document.getElementById('classAvgChart').getContext('2d');
    const chart = document.getElementById('classAvgChart');
    if(window.classAvgChartInstance) window.classAvgChartInstance.destroy();
    
    const avgs = [];
    DISCIPLINAS.forEach(d => {
         let notaTotal = 0;
         let lancamentosCount = 0;
         for (let b = 1; b <= 4; b++) {
             const bData = db.disciplinas[d][b];
             ALUNOS.forEach(aluno => {
                 let notaOrigBim = 0;
                 bData.atividades.forEach(a => { notaOrigBim += (a.notas[aluno] ? a.notas[aluno].notaFinal : 0); });
                 
                 let finalScore = notaOrigBim;
                 if (bData.isLocked && notaOrigBim < 15) finalScore = calculateBimestreFinalScore(notaOrigBim, bData.recuperacaoBimestral.notas[aluno]);
                 
                 notaTotal += finalScore;
                 if(bData.atividades.length > 0) lancamentosCount++;
             });
         }
         avgs.push(lancamentosCount > 0 ? (notaTotal / lancamentosCount) : 0);
    });

    window.classAvgChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: DISCIPLINAS,
            datasets: [{
                label: 'Média da Turma (Bimestral)',
                data: avgs,
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: 25 }
            }
        }
    });
}

function renderScoreDistributionChart() {
    const ctx = document.getElementById('scoreDistributionChart').getContext('2d');
    if(window.scoreDistributionChartInstance) window.scoreDistributionChartInstance.destroy();
    
    const stats = getGlobalTotals();
    
    window.scoreDistributionChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Abaixo de 15', 'Entre 15 e 20', 'Acima de 20'],
            datasets: [{
                data: [
                    stats.alunosAbaixoDe15,
                    (stats.totAlunosAtivos * DISCIPLINAS.length * 4) - stats.alunosAbaixoDe15 - stats.alunosAcimaDe20, // Aproximado, simplificado
                    stats.alunosAcimaDe20
                ],
                backgroundColor: ['rgba(231, 76, 60, 0.7)', 'rgba(241, 196, 15, 0.7)', 'rgba(46, 204, 113, 0.7)'],
                borderColor: ['rgba(231, 76, 60, 1)', 'rgba(241, 196, 15, 1)', 'rgba(46, 204, 113, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            title: { display: true, text: 'Distribuição de Notas Bimestrais' }
        }
    });
}
