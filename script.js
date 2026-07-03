// Lógica Principal e Navegação

document.addEventListener('DOMContentLoaded', () => {
    // Inicialização
    renderDisciplinas();
    populateStudentSelect();
    loadDashboard();
    
    // Theme Switch
    const themeCheckbox = document.getElementById('checkbox');
    const body = document.body;
    
    // Verificar tema salvo
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        themeCheckbox.checked = true;
    }

    themeCheckbox.addEventListener('change', () => {
        body.classList.toggle('dark-mode');
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });
});

// Navegação entre seções
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    // Atualizar menu lateral
    document.querySelectorAll('.sidebar nav ul li').forEach(li => li.classList.remove('active'));
    const menuItem = document.querySelector(`.sidebar nav ul li[onclick="showSection('${sectionId}')"]`);
    if(menuItem) menuItem.classList.add('active');
    
    // Fechar lançamentos ao mudar de seção
    closeLancamento();
    
    // Atualizar dashboard ou boletim se necessário
    if (sectionId === 'dashboard') loadDashboard();
    else if (sectionId === 'aluno') loadStudentBoletim();
}

// Pesquisa de Aluno
function searchStudent() {
    const input = document.getElementById('search-student');
    const filter = input.value.toUpperCase();
    const table = document.querySelector('#lancamento-notas .notas-table, #recuperacao-bimestral .notas-table');
    if(!table) return;
    const tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        const td = tr[i].getElementsByTagName('td')[0];
        if (td) {
            const txtValue = td.textContent || td.innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}

// Formatação de Notas
function formatScore(score, withTwoDecimals = false) {
    if (score === null || score === undefined || score === "" || score === "---") return "0,0";
    score = parseFloat(score);
    if (withTwoDecimals) return score.toFixed(2).replace('.', ',');
    return score.toFixed(1).replace('.', ',');
}
