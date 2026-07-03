let currentDisciplina = null;
let currentBimestre = null;
let currentAtividadeId = null;

function renderDisciplinas() {
    const grid = document.getElementById('disciplinas-grid');
    grid.innerHTML = '';
    DISCIPLINAS.forEach(d => {
        const card = document.createElement('div');
        card.className = 'disciplina-card';
        card.onclick = () => openDisciplina(d);
        
        let bimestresFechados = 0;
        for (let b = 1; b <= 4; b++) {
             if (db.disciplinas[d][b].isLocked) bimestresFechados++;
        }
        
        card.innerHTML = `
            <h3>${d}</h3>
            <p>${CONFIG.schoolName}</p>
            <p>${CONFIG.turmaName} - ${CONFIG.ano}</p>
            <span class="lock-status ${bimestresFechados === 4 ? 'locked' : ''}">
                <i class="fas fa-lock${bimestresFechados === 4 ? '' : '-open'}"></i>
                ${bimestresFechados} / 4 bimestres fechados
            </span>
        `;
        grid.appendChild(card);
    });
}

function openDisciplina(disciplina) {
    currentDisciplina = disciplina;
    currentBimestre = 1; // Começar sempre no 1º
    document.getElementById('disciplina-nome-detalhe').textContent = disciplina;
    showSection('disciplina-detalhe');
    loadBimestre(currentBimestre);
}

function loadBimestre(bimestre) {
    currentBimestre = bimestre;
    document.querySelectorAll('.bimestre-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-bimestre="${bimestre}"]`).classList.add('active');
    
    const bData = db.disciplinas[currentDisciplina][bimestre];
    const lockStatus = document.getElementById('lock-status');
    const lockBtn = document.getElementById('lock-bimestre-btn');
    const addBtn = document.getElementById('add-atv-btn');
    const recBimArea = document.getElementById('recuperacao-bimestral');
    
    if (bData.isLocked) {
        lockStatus.textContent = `Fechado em: ${new Date(bData.lockedAt).toLocaleString('pt-BR')}`;
        lockStatus.className = 'lock-status locked';
        lockBtn.textContent = 'Reabrir Bimestre';
        lockBtn.onclick = unlockBimestre;
        addBtn.disabled = true;
        recBimArea.classList.remove('hidden');
        renderRecuperacaoBimestral();
    } else {
        lockStatus.textContent = 'Aberto para lançamento';
        lockStatus.className = 'lock-status open';
        lockBtn.textContent = 'Fechar Bimestre';
        lockBtn.onclick = lockBimestre;
        addBtn.disabled = false;
        recBimArea.classList.add('hidden');
    }
    
    // Verificar bloqueio do bimestre anterior
    const prevB = bimestre - 1;
    if (prevB >= 1 && !db.disciplinas[currentDisciplina][prevB].isLocked) {
         addBtn.disabled = true;
         addBtn.title = `Você deve fechar o ${prevB}º Bimestre antes de lançar notas no ${bimestre}º.`;
         lockStatus.textContent = `Bloqueado - ${prevB}º Bimestre aberto`;
         lockStatus.className = 'lock-status locked';
         document.getElementById('points-used').style.display = 'none'; // Esconder pontos
         document.getElementById('atividades-list').innerHTML = `<p class="message">Você deve fechar o ${prevB}º Bimestre antes de lançar notas neste.</p>`;
         return;
    } else {
         addBtn.title = '';
    }
    
    updatePointsProgress();
    renderAtividadesList();
}

function updatePointsProgress() {
    const bData = db.disciplinas[currentDisciplina][currentBimestre];
    const used = bData.atividades.reduce((sum, a) => sum + parseFloat(a.valor), 0);
    const available = CONFIG.pointsLimitPerBimestre - used;
    
    const usedEl = document.getElementById('points-used');
    const progressEl = document.getElementById('points-progress');
    const msgEl = document.getElementById('points-message');
    
    usedEl.textContent = formatScore(used, true);
    
    const percent = (used / CONFIG.pointsLimitPerBimestre) * 100;
    progressEl.style.width = `${percent}%`;
    
    if (percent <= 80) progressEl.className = 'progress-bar';
    else if (percent > 80 && percent < 95) progressEl.className = 'progress-bar warning';
    else progressEl.className = 'progress-bar danger';
    
    if (used >= CONFIG.pointsLimitPerBimestre) {
        msgEl.textContent = "Bimestre completo.";
        msgEl.className = "points-message full";
        document.getElementById('add-atv-btn').disabled = true;
    } else {
        msgEl.textContent = `Restam apenas ${formatScore(available, true)} pontos disponíveis neste bimestre.`;
        msgEl.className = "points-message remaining";
        if(!db.disciplinas[currentDisciplina][currentBimestre].isLocked) document.getElementById('add-atv-btn').disabled = false;
    }
}

// Atividades
function openAtividadeModal(atvId = null) {
    if (db.disciplinas[currentDisciplina][currentBimestre].isLocked) return;
    currentAtividadeId = atvId;
    const modal = document.getElementById('atividade-modal');
    const modalTitle = document.getElementById('atv-modal-title');
    const used = db.disciplinas[currentDisciplina][currentBimestre].atividades.reduce((sum, a) => sum + parseFloat(a.valor), 0);
    let available = CONFIG.pointsLimitPerBimestre - used;
    const form = document.getElementById('atividade-form');
    form.reset();
    
    if (atvId) {
        modalTitle.textContent = 'Editar Atividade';
        const atv = db.disciplinas[currentDisciplina][currentBimestre].atividades.find(a => a.id === atvId);
        document.getElementById('atv-id').value = atv.id;
        document.getElementById('atv-nome').value = atv.nome;
        document.getElementById('atv-valor').value = atv.valor;
        document.getElementById('atv-data').value = atv.data || '';
        document.getElementById('atv-obs').value = atv.obs || '';
        available += parseFloat(atv.valor); // Adicionar valor da própria atv na disponível ao editar
    } else {
        modalTitle.textContent = 'Nova Atividade';
        document.getElementById('atv-id').value = '';
    }
    document.getElementById('atv-restante').textContent = formatScore(available, true);
    modal.classList.add('active');
}

function closeAtividadeModal() {
    document.getElementById('atividade-modal').classList.remove('active');
}

function checkAtvValueLimit() {
    const valInput = document.getElementById('atv-valor');
    const val = parseFloat(valInput.value) || 0;
    const atvId = document.getElementById('atv-id').value;
    const bData = db.disciplinas[currentDisciplina][currentBimestre];
    const used = bData.atividades.filter(a => a.id !== atvId).reduce((sum, a) => sum + parseFloat(a.valor), 0);
    const available = CONFIG.pointsLimitPerBimestre - used;
    const modalMsg = document.getElementById('modal-points-message');
    const submitBtn = document.querySelector('#atividade-modal .submit-btn');

    if (val > available) {
        modalMsg.textContent = `Você não pode ultrapassar ${formatScore(available, true)} pontos.`;
        modalMsg.className = "points-message exceeded";
        submitBtn.disabled = true;
    } else {
        modalMsg.textContent = `Restam ${formatScore(available - val, true)} pontos disponíveis.`;
        modalMsg.className = "points-message remaining";
        submitBtn.disabled = false;
    }
}

function saveAtividade(event) {
    event.preventDefault();
    if (db.disciplinas[currentDisciplina][currentBimestre].isLocked) return;
    const atvId = document.getElementById('atv-id').value;
    const nome = document.getElementById('atv-nome').value;
    const valor = parseFloat(document.getElementById('atv-valor').value);
    const data = document.getElementById('atv-data').value;
    const obs = document.getElementById('atv-obs').value;
    
    const bData = db.disciplinas[currentDisciplina][currentBimestre];
    
    if (atvId) {
        // Editar
        const atv = bData.atividades.find(a => a.id === atvId);
        atv.nome = nome;
        atv.valor = valor;
        atv.data = data;
        atv.obs = obs;
    } else {
        // Nova
        const newAtv = {
            id: 'atv_' + new Date().getTime(),
            nome: nome,
            valor: valor,
            data: data,
            obs: obs,
            notas: {}
        };
        bData.atividades.push(newAtv);
    }
    
    saveDB();
    closeAtividadeModal();
    updatePointsProgress();
    renderAtividadesList();
}

function deleteAtividade(atvId) {
    if (db.disciplinas[currentDisciplina][currentBimestre].isLocked) return;
    if (confirm("TEM CERTEZA? Isso excluirá permanentemente esta atividade e TODAS as notas associadas.")) {
        const bData = db.disciplinas[currentDisciplina][currentBimestre];
        bData.atividades = bData.atividades.filter(a => a.id !== atvId);
        saveDB();
        updatePointsProgress();
        renderAtividadesList();
        closeLancamento();
    }
}

function renderAtividadesList() {
    const list = document.getElementById('atividades-list');
    list.innerHTML = '';
    const activities = db.disciplinas[currentDisciplina][currentBimestre].atividades;
    const isLocked = db.disciplinas[currentDisciplina][currentBimestre].isLocked;
    
    if (activities.length === 0) {
        list.innerHTML = '<p class="message">Nenhuma atividade cadastrada neste bimestre.</p>';
        return;
    }
    
    activities.forEach(a => {
        const card = document.createElement('div');
        card.className = `atv-card ${currentAtividadeId === a.id ? 'current' : ''}`;
        card.onclick = (e) => {
             // Ignorar cliques nos ícones de ação
             if(e.target.closest('.atv-actions')) return;
             openLancamentoNotas(a.id);
        };
        
        card.innerHTML = `
            <h4>${a.nome}</h4>
            <p>Valor: ${formatScore(a.valor, true)}</p>
            ${a.data ? `<p>Data: ${new Date(a.data).toLocaleDateString('pt-BR')}</p>` : ''}
            ${!isLocked ? `
                <div class="atv-actions">
                    <button class="icon-btn edit" onclick="openAtividadeModal('${a.id}')"><i class="fas fa-edit"></i></button>
                    <button class="icon-btn delete" onclick="deleteAtividade('${a.id}')"><i class="fas fa-trash-alt"></i></button>
                </div>
            ` : ''}
        `;
        list.appendChild(card);
    });
}

// Lançamento de Notas
function openLancamentoNotas(atvId) {
    currentAtividadeId = atvId;
    const atv = db.disciplinas[currentDisciplina][currentBimestre].atividades.find(a => a.id === atvId);
    document.getElementById('atv-nome-notas').textContent = atv.nome;
    document.getElementById('atv-valor-notas').textContent = formatScore(atv.valor, true);
    
    renderAtividadesList(); // Recarregar lista para destacar a atv atual
    document.getElementById('lancamento-notas').classList.remove('hidden');
    renderNotasTable(atv);
}

function closeLancamento() {
    currentAtividadeId = null;
    document.getElementById('lancamento-notas').classList.add('hidden');
    renderAtividadesList(); // Recarregar para remover destaque
}

function renderNotasTable(atv) {
    const tbody = document.getElementById('notas-body');
    tbody.innerHTML = '';
    const isLocked = db.disciplinas[currentDisciplina][currentBimestre].isLocked;
    
    ALUNOS.forEach(aluno => {
        const studentNotas = atv.notas[aluno] || { notaOrig: '', notaRec: '', notaFinal: 0 };
        const notaFinal = calculateAtividadeFinalScore(atv.valor, studentNotas.notaOrig, studentNotas.notaRec);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${aluno}</td>
            <td><input type="number" step="0.01" min="0" max="${atv.valor}" value="${studentNotas.notaOrig}" oninput="saveNotaAuto('${aluno}', 'notaOrig', this)" ${isLocked ? 'disabled' : ''}></td>
            <td><input type="number" step="0.01" min="0" max="${atv.valor}" value="${studentNotas.notaRec}" oninput="saveNotaAuto('${aluno}', 'notaRec', this)" ${isLocked ? 'disabled' : ''}></td>
            <td id="nota-final-${aluno.replace(/ /g, '-')}" class="nota-final ${notaFinal === (atv.valor * CONFIG.recPercent) ? 'max-rec' : ''}">${formatScore(notaFinal, true)}</td>
        `;
        tbody.appendChild(row);
    });
}

function saveNotaAuto(aluno, type, inputEl) {
    const atv = db.disciplinas[currentDisciplina][currentBimestre].atividades.find(a => a.id === currentAtividadeId);
    if (!atv.notas[aluno]) atv.notas[aluno] = { notaOrig: '', notaRec: '', notaFinal: 0 };
    
    // Validação
    let val = inputEl.value;
    if(val !== "") {
        val = parseFloat(val);
        if(val > atv.valor) {
            val = atv.valor;
            inputEl.value = atv.valor;
        } else if(val < 0) {
            val = 0;
            inputEl.value = 0;
        }
    }
    
    atv.notas[aluno][type] = val;
    
    // Recalcular e atualizar nota final
    const notaOrig = atv.notas[aluno].notaOrig;
    const notaRec = atv.notas[aluno].notaRec;
    const notaFinal = calculateAtividadeFinalScore(atv.valor, notaOrig, notaRec);
    atv.notas[aluno].notaFinal = notaFinal;
    
    const finalTd = document.getElementById(`nota-final-${aluno.replace(/ /g, '-')}`);
    finalTd.textContent = formatScore(notaFinal, true);
    if(notaFinal === (atv.valor * CONFIG.recPercent)) finalTd.classList.add('max-rec');
    else finalTd.classList.remove('max-rec');
    
    saveDB();
}

// Bloqueio de Bimestre e Recuperação Bimestral
function lockBimestre() {
     if (confirm(`TEM CERTEZA? Ao fechar o ${currentBimestre}º Bimestre, você não poderá mais editar atividades ou notas. Deseja prosseguir?`)) {
          const bData = db.disciplinas[currentDisciplina][currentBimestre];
          bData.isLocked = true;
          bData.lockedAt = new Date();
          saveDB();
          alert(`${currentBimestre}º Bimestre fechado com sucesso!`);
          loadBimestre(currentBimestre); // Recarregar para aplicar bloqueio
     }
}

function unlockBimestre() {
    // Somente admin (neste caso, simplificado para o professor) reabre
    if (confirm(`AVISO! A reabertura do bimestre só deve ocorrer em casos excepcionais. Você tem certeza?`)) {
        const bData = db.disciplinas[currentDisciplina][currentBimestre];
        bData.isLocked = false;
        bData.lockedAt = null;
        saveDB();
        alert(`${currentBimestre}º Bimestre reaberto.`);
        loadBimestre(currentBimestre);
    }
}

function renderRecuperacaoBimestral() {
    const tbody = document.getElementById('rec-bim-body');
    tbody.innerHTML = '';
    const isLocked = db.disciplinas[currentDisciplina][currentBimestre].isLocked;
    if(!isLocked) return; // Só mostra se fechado
    
    const bData = db.disciplinas[currentDisciplina][currentBimestre];
    const totVal = bData.atividades.reduce((sum, a) => sum + parseFloat(a.valor), 0);
    const recBData = bData.recuperacaoBimestral;
    
    ALUNOS.forEach(aluno => {
        let notaOrig = 0;
        bData.atividades.forEach(a => {
             notaOrig += (a.notas[aluno] ? a.notas[aluno].notaFinal : 0);
        });
        
        // Apenas quem tirou menos de 15 pontos faz recuperação
        if (notaOrig < 15) {
             const notaRec = recBData.notas[aluno] || '';
             const finalScore = calculateBimestreFinalScore(notaOrig, notaRec);
             
             const row = document.createElement('tr');
             row.innerHTML = `
                 <td>${aluno}</td>
                 <td>${formatScore(notaOrig, true)}</td>
                 <td><input type="number" step="0.01" min="0" max="25" value="${notaRec}" oninput="saveNotaRecBimAuto('${aluno}', this)"></td>
                 <td id="rec-bim-final-${aluno.replace(/ /g, '-')}" class="nota-final ${finalScore === 15 ? 'max-rec' : ''}">${formatScore(finalScore, true)}</td>
             `;
             tbody.appendChild(row);
        }
    });
}

function saveNotaRecBimAuto(aluno, inputEl) {
    const bData = db.disciplinas[currentDisciplina][currentBimestre];
    if(!bData.recuperacaoBimestral.notas[aluno]) bData.recuperacaoBimestral.notas[aluno] = '';
    
    // Validação
    let val = inputEl.value;
    if(val !== "") {
        val = parseFloat(val);
        if(val > 25) { val = 25; inputEl.value = 25; }
        else if(val < 0) { val = 0; inputEl.value = 0; }
    }
    
    bData.recuperacaoBimestral.notas[aluno] = val;
    
    let notaOrig = 0;
    bData.atividades.forEach(a => {
         notaOrig += (a.notas[aluno] ? a.notas[aluno].notaFinal : 0);
    });
    
    const finalScore = calculateBimestreFinalScore(notaOrig, val);
    const finalTd = document.getElementById(`rec-bim-final-${aluno.replace(/ /g, '-')}`);
    finalTd.textContent = formatScore(finalScore, true);
    if(finalScore === 15) finalTd.classList.add('max-rec');
    else finalTd.classList.remove('max-rec');
    
    saveDB();
}
