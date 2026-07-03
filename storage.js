const CONFIG = {
    schoolName: "EM DR CUSTÓDIO DE PAULA RODRIGUES",
    turmaName: "8º ANO 800",
    ano: 2026,
    pointsLimitPerBimestre: 25.0,
    recPercent: 0.60,
    bimestresTotalPoints: 100.0
};

const ALUNOS = [
    "ADRIELE APARECIDA MENDES ARAUJO", "ANA JULIA SILVA DE LAIA", "DAVI LUCAS PAULINO DA COSTA",
    "EMANUELLY CRISTINA DA COSTA LEVINO", "FABIELLY HIGINO DIAS", "GABRIEL COTTA QUEIROZ",
    "GLENO HENRIQUE MARTINS GOMES DE MIRANDA", "HANIELE PEREIRA ALVES", "IKARO EMANUEL DE LIMA MIRANDA",
    "JONATAS PASSOS BRAGA", "JÚLIA DA SILVA LOBATO", "LAYANE APARECIDA MENDES FERNANDES",
    "LUAN FERNANDO SILVA FIALHO", "LUIS OTAVIO DA COSTA VITOR", "MARIA EDUARDA CHAVES LIMA",
    "MARIA EDUARDA PEREIRA DE LIMA", "MARIA LUISA MENDES OLIVEIRA", "MARIA OLIVIA SILVA CHAVES",
    "MARIA SOPHIA FERNANDES DE SOUZA", "NATHAN MIRANDA ALVES", "NICOLE DE OLIVEIRA LIMA",
    "WESLEY COTA BERNARDES", "YASMIN DOS SANTOS FERREIRA"
];

const DISCIPLINAS = [
    "Arte", "Ensino Religioso", "Língua Portuguesa", "Matemática", "História",
    "Ciências", "Língua Inglesa", "Geografia", "Educação Física"
];

const DB_KEY = "sigenotas_db";

// Estrutura do Banco de Dados
let db = {
    config: CONFIG,
    disciplinas: {},
    alunos: ALUNOS
};

// Inicializar banco de dados se não existir
function initDB() {
    const data = localStorage.getItem(DB_KEY);
    if (!data) {
        db.disciplinas = {};
        DISCIPLINAS.forEach(d => {
            db.disciplinas[d] = {};
            for (let b = 1; b <= 4; b++) {
                db.disciplinas[d][b] = {
                    atividades: [],
                    isLocked: false,
                    lockedAt: null,
                    nextLocked: b > 1, // Bloquear próximos por padrão
                    recuperacaoBimestral: { value: 25.0, notas: {} }
                };
            }
        });
        saveDB();
    } else {
        db = JSON.parse(data);
    }
}

// Salvar no LocalStorage
function saveDB() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Lógica de Recuperação Automática das Atividades
function calculateAtividadeFinalScore(valorTotal, notaOrig, notaRec) {
    notaOrig = parseFloat(notaOrig) || 0;
    if (notaRec === null || notaRec === undefined || notaRec === "") return notaOrig;
    notaRec = parseFloat(notaRec);
    
    const maxRec = valorTotal * CONFIG.recPercent;
    
    if (notaRec >= maxRec) {
        return maxRec;
    } else {
        return Math.max(notaOrig, notaRec);
    }
}

// Lógica de Recuperação Bimestral (automática)
function calculateBimestreFinalScore(notaOrig, notaRec) {
    notaOrig = parseFloat(notaOrig) || 0;
    if (notaOrig >= 15 || notaRec === null || notaRec === undefined || notaRec === "") return notaOrig; // Apenas quem tirou menos de 15 faz recuperação
    notaRec = parseFloat(notaRec);
    
    const maxRec = CONFIG.pointsLimitPerBimestre * CONFIG.recPercent; // 15
    
    if (notaRec >= maxRec) {
        return maxRec; // Fica exatamente 15
    } else {
        return Math.max(notaOrig, notaRec); // Fica a maior nota
    }
}

// Backup Functions
function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `backup_sigenotas_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.config && importedData.disciplinas) {
                db = importedData;
                saveDB();
                alert("Dados importados com sucesso! O sistema será reiniciado.");
                location.reload();
            } else {
                alert("Arquivo JSON inválido.");
            }
        } catch (err) {
            alert("Erro ao ler o arquivo JSON.");
        }
    };
    reader.readAsText(file);
}

function resetData() {
    if (confirm("TEM CERTEZA? Isso apagará permanentemente TODAS as notas, atividades e registros. Esta ação não pode ser desfeita.")) {
        localStorage.removeItem(DB_KEY);
        alert("Sistema redefinido com sucesso! O sistema será reiniciado.");
        location.reload();
    }
}

// Inicializar
initDB();
