document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM completamente carregado e script.js iniciado.');

    // --- VARIÁVEIS DE ELEMENTOS DO DOM ---
    const sidebarLinks = document.querySelectorAll('aside nav ul li a');
    const initialMessageDiv = document.getElementById('initial-message');
    const systemDetailsSection = document.getElementById('system-details-section');
    const systemTitleContainer = document.getElementById('system-title-container');
    const systemTitleDisplay = document.getElementById('system-title-display');
    const systemDetailsTableBody = document.getElementById('system-details-table-body');
    const addNewRowBtn = document.getElementById('add-new-row-btn');
    const saveAllChangesBtn = document.getElementById('save-all-changes-btn');
    const exportSystemCsvBtn = document.getElementById('export-system-csv-btn');
    const importCsvInput = document.getElementById('import-csv-input');
    const importCsvBtn = document.getElementById('import-csv-btn');

    let currentSystemName = null; // Variável para armazenar o sistema atualmente selecionado

    // Nomes dos sistemas para referência
    const systemNames = [
        "COPED", "COCEU", "CODAE", "COGEP", "COMPS",
        "COSERV", "COTIC", "NUTAC", "COMAPRE", "COPLAN", "ASCOM", "COGED"
    ];

    // --- FUNÇÃO DE MIGRAÇÃO DE LOCALSTORAGE PARA INDEXEDDB ---
    // Esta função só será executada uma vez para migrar dados antigos, se existirem.
    await migrateLocalStorageToIndexedDB();

    async function migrateLocalStorageToIndexedDB() {
        console.log("DEBUG: Tentando migrar dados do localStorage para o IndexedDB...");

        for (const systemName of systemNames) {
            const localStorageSystemData = localStorage.getItem(`systemDetails_${systemName}`);
            if (localStorageSystemData) {
                try {
                    const systemData = JSON.parse(localStorageSystemData);
                    // Certifica-se de que systemName está presente no objeto a ser adicionado
                    await db.systemDetails.add({
                        ...systemData,
                        systemName: systemName,
                    });
                    localStorage.removeItem(`systemDetails_${systemName}`); // Remove após a migração
                    console.log(`DEBUG: Dados do sistema ${systemName} migrados com sucesso do localStorage para o IndexedDB.`);
                } catch (error) {
                    console.error(`DEBUG: Erro ao migrar dados do sistema ${systemName} do localStorage:`, error);
                }
            }
        }
        console.log("DEBUG: Verificação de migração do localStorage concluída.");
    }

    /**
     * Retorna a classe CSS para a linha da tabela com base no valor da situação.
     * @param {string} situacaoValue O valor da situação (ex: "transversal", "descontinuado").
     * @returns {string} A classe CSS correspondente para a linha.
     */
    function getSituacaoRowClass(situacaoValue) {
        const lowerCaseSituacao = String(situacaoValue || '').toLowerCase();
        if (lowerCaseSituacao.includes('transversal')) {
            return 'situacao-transversal-row';
        } else if (lowerCaseSituacao.includes('descontinuado')) {
            return 'situacao-descontinuado-row';
        } else if (lowerCaseSituacao.includes('aguardando')) {
            return 'situacao-aguardando-row';
        } else if (lowerCaseSituacao.includes('descoberta')) {
            return 'situacao-descoberta-row';
        } else if (lowerCaseSituacao.includes('suspenso')) {
            return 'situacao-suspenso-row';
        }
        return ''; // Nenhuma classe se nenhuma palavra-chave for encontrada
    }

    // Exporta dados para CSV
    function exportToCsv(data, filename) {
        if (!data || data.length === 0) {
            alert('Nenhum dado para exportar.');
            return;
        }

        const orderedHeaders = [
            'ordem', 'empresa', 'situacao', 'systemName', 'coordenadoria', 'descricao',
            'linguagens', 'links', 'acompanhamentoTecnico', 'fiscal', 'po', 'keyUser'
        ];

        const csvRows = [];
        csvRows.push(orderedHeaders.map(header => {
            const formattedHeader = header.replace(/([A-Z])/g, ' $1')
                                        .replace(/^./, str => str.toUpperCase())
                                        .trim();
            return `"${formattedHeader}"`;
        }).join(';'));


        for (const row of data) {
            const values = orderedHeaders.map(header => {
                let value = row[header];
                if (typeof value === 'boolean') {
                    value = value ? 'Sim' : 'Não';
                }
                if (typeof value === 'string' && (value.includes(';') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value !== null && value !== undefined ? value : '';
            });
            csvRows.push(values.join(';'));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert('Dados exportados com sucesso para CSV!');
    }

    // Importa dados de CSV
    async function importFromCsv(file, systemName, dbCollection) {
        if (!file) {
            alert('Nenhum arquivo selecionado.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim() !== '');
                if (lines.length === 0) {
                    alert('O arquivo CSV está vazio.');
                    return;
                }

                const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, '').toLowerCase().replace(/ /g, ''));
                const newItems = [];

                const expectedHeaders = [
                    'ordem', 'empresa', 'situacao', 'systemname', 'coordenadoria', 'descricao',
                    'linguagens', 'links', 'acompanhamentotecnico', 'fiscal', 'po', 'keyuser'
                ];

                const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    alert(`Erro: O arquivo CSV está faltando os seguintes cabeçalhos: ${missingHeaders.join(', ')}.`);
                    return;
                }

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(';').map(v => v.trim().replace(/"/g, ''));
                    if (values.length !== headers.length) {
                        console.warn(`Linha ${i + 1} ignorada devido a número inconsistente de colunas.`);
                        continue;
                    }

                    const rowData = {};
                    headers.forEach((header, index) => {
                        let mappedHeader = header;
                        if (header === 'acompanhamentotecnico') mappedHeader = 'acompTecnico';
                        if (header === 'keyuser') mappedHeader = 'keyUser';
                        if (header === 'systemname') mappedHeader = 'systemName';

                        rowData[mappedHeader] = values[index];
                    });

                    if (rowData.systemName !== systemName) {
                        console.warn(`Linha ignorada: O systemName '${rowData.systemName}' no CSV não corresponde ao sistema selecionado '${systemName}'.`);
                        continue;
                    }

                    newItems.push(rowData);
                }

                if (newItems.length > 0) {
                    await dbCollection.where('systemName').equals(systemName).delete();
                    await dbCollection.bulkAdd(newItems);
                    alert(`${newItems.length} itens importados com sucesso para ${systemName}!`);
                    await renderSystemDetailsTable(systemName, await dbCollection.where('systemName').equals(systemName).toArray());
                } else {
                    alert('Nenhum dado válido para importação encontrado no CSV.');
                }

            } catch (error) {
                console.error('ERRO: Erro ao processar CSV:', error);
                alert(`Erro ao importar o CSV: ${error.message}. Verifique o formato do arquivo.`);
            }
        };

        reader.onerror = () => {
            console.error("ERRO: Erro ao ler o arquivo.");
            alert('Erro ao ler o arquivo. Tente novamente.');
        };

        reader.readAsText(file);
    }

    // --- FUNÇÕES DE CARREGAMENTO E RENDERIZAÇÃO DE DADOS ---

    // Carrega os detalhes de um sistema específico
    async function loadSystemData(systemName) {
        return await db.systemDetails.where('systemName').equals(systemName).toArray();
    }

    // Renderiza a tabela de detalhes do sistema
    async function renderSystemDetailsTable(systemName, systemDetails) {
        systemTitleDisplay.textContent = `SISTEMA DE ${systemName.toUpperCase()}`;
        systemDetailsTableBody.innerHTML = ''; // Limpa a tabela

        // Se não houver detalhes, exibe uma mensagem na tabela.
        if (!systemDetails || systemDetails.length === 0) {
            const row = systemDetailsTableBody.insertRow();
           // row.innerHTML = `<td colspan="13" class="text-center py-4">Nenhum detalhe cadastrado para ${systemName}.</td>`;
            return;
        }

        systemDetails.forEach(detail => {
            const row = systemDetailsTableBody.insertRow();
            row.dataset.id = detail.id;
            const situacaoClass = getSituacaoRowClass(detail.situacao);
            if (situacaoClass) { // Correção aplicada aqui
                row.classList.add(situacaoClass);
            }

            row.innerHTML = `
                <td class="p-2"><textarea rows="1" maxlength="220" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="ordem">${detail.ordem || ''}</textarea></td>
                <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="empresa">${detail.empresa || ''}</textarea></td>
                <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="situacao">${detail.situacao || ''}</textarea></td>
                <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="systemName">${detail.systemName || ''}</textarea></td>
                <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="coordenadoria">${detail.coordenadoria || ''}</textarea></td>
                <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="descricao">${detail.descricao || ''}</textarea></td>
                <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="linguagens">${detail.linguagens || ''}</textarea></td>
                <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="links">${detail.links || ''}</textarea></td>
                <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="acompTecnico">${detail.acompTecnico || ''}</textarea></td>
                <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="fiscal">${detail.fiscal || ''}</textarea></td>
                <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="po">${detail.po || ''}</textarea></td>
                <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="keyUser">${detail.keyUser || ''}</textarea></td>
                <td class="p-2 text-center">
                    <button class="delete-row-btn button-delete">Excluir</button>
                </td>
            `;

            const situacaoTextarea = row.querySelector('[data-field="situacao"]');
            if (situacaoTextarea) {
                situacaoTextarea.addEventListener('input', (event) => {
                    row.classList.remove('situacao-transversal-row', 'situacao-descontinuado-row', 'situacao-aguardando-row', 'situacao-descoberta-row', 'situacao-suspenso-row');
                    const newClass = getSituacaoRowClass(event.target.value);
                    if (newClass) { // Correção aplicada aqui
                        row.classList.add(newClass);
                    }
                });
            }

            row.querySelectorAll('.auto-height-textarea').forEach(textarea => {
                textarea.style.height = 'auto';
                textarea.style.height = (textarea.scrollHeight) + 'px';
            });
        });

        systemDetailsTableBody.querySelectorAll('.delete-row-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const row = event.target.closest('tr');
                const id = parseInt(row.dataset.id);
                if (confirm('Tem certeza que deseja excluir este registro?')) {
                    await db.systemDetails.delete(id);
                    alert('Registro excluído com sucesso!');
                    await renderSystemDetailsTable(systemName, await loadSystemData(systemName));
                }
            });
        });
    }

    // --- FUNÇÕES DE EDIÇÃO E SALVAMENTO ---

    // Adiciona uma nova linha vazia à tabela de detalhes do sistema
    addNewRowBtn.addEventListener('click', () => {
        if (!currentSystemName) {
            alert('Selecione um sistema primeiro para adicionar uma nova linha.');
            return;
        }

        const row = systemDetailsTableBody.insertRow();
        row.dataset.id = 'new'; // Marca como nova linha para salvar depois
        row.innerHTML = `
            <td class="p-2"><textarea rows="1" maxlength="220" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="ordem"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="empresa"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="situacao"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="systemName">${currentSystemName || ''}</textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="coordenadoria"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="descricao"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="linguagens"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="links"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="acompTecnico"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="fiscal"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="po"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="keyUser"></textarea></td>
            <td class="p-2 text-center">
                <button class="delete-row-btn button-delete">Excluir</button>
            </td>
        `;

        const situacaoTextarea = row.querySelector('[data-field="situacao"]');
        if (situacaoTextarea) {
            situacaoTextarea.addEventListener('input', (event) => {
                row.classList.remove('situacao-transversal-row', 'situacao-descontinuado-row', 'situacao-aguardando-row', 'situacao-descoberta-row', 'situacao-suspenso-row');
                const newClass = getSituacaoRowClass(event.target.value);
                if (newClass) { // Correção aplicada aqui
                    row.classList.add(newClass);
                }
            });
        }

        row.querySelectorAll('.auto-height-textarea').forEach(textarea => {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
        });

        row.querySelector('.delete-row-btn').addEventListener('click', async (event) => {
            const rowToDelete = event.target.closest('tr');
            const id = rowToDelete.dataset.id === 'new' ? undefined : parseInt(rowToDelete.dataset.id);
            if (id && confirm('Tem certeza que deseja excluir este registro?')) {
                await db.systemDetails.delete(id);
                alert('Registro excluído com sucesso!');
                await renderSystemDetailsTable(currentSystemName, await loadSystemData(currentSystemName));
            } else if (!id) {
                rowToDelete.remove(); // Remove a linha nova (ainda não salva) do DOM
            }
        });
    });

    // Salva todas as alterações na tabela de detalhes do sistema
    saveAllChangesBtn.addEventListener('click', async () => {
        console.log('DEBUG: Botão "Salvar Alterações" clicado.');
        if (!currentSystemName) {
            alert('Selecione um sistema primeiro para salvar alterações.');
            console.log('DEBUG: currentSystemName não está definido.');
            return;
        }

        const rows = systemDetailsTableBody.querySelectorAll('tr');
        const updates = [];
        const adds = [];

        console.log('DEBUG: Iniciando processo de salvamento para o sistema:', currentSystemName);
        console.log('DEBUG: Total de linhas encontradas na tabela:', rows.length);

        for (const row of rows) {
            const id = row.dataset.id === 'new' ? undefined : parseInt(row.dataset.id);
            
            const data = {
                systemName: currentSystemName,
                ordem: row.querySelector('[data-field="ordem"]')?.value?.trim() || '', // Correção aplicada aqui
                empresa: row.querySelector('[data-field="empresa"]')?.value?.trim() || '', // Correção aplicada aqui
                situacao: row.querySelector('[data-field="situacao"]')?.value?.trim() || '', // Correção aplicada aqui
                coordenadoria: row.querySelector('[data-field="coordenadoria"]')?.value?.trim() || '', // Correção aplicada aqui
                descricao: row.querySelector('[data-field="descricao"]')?.value?.trim() || '', // Correção aplicada aqui
                linguagens: row.querySelector('[data-field="linguagens"]')?.value?.trim() || '', // Correção aplicada aqui
                links: row.querySelector('[data-field="links"]')?.value?.trim() || '', // Correção aplicada aqui
                acompTecnico: row.querySelector('[data-field="acompTecnico"]')?.value?.trim() || '', // Correção aplicada aqui
                fiscal: row.querySelector('[data-field="fiscal"]')?.value?.trim() || '', // Correção aplicada aqui
                po: row.querySelector('[data-field="po"]')?.value?.trim() || '', // Correção aplicada aqui
                keyUser: row.querySelector('[data-field="keyUser"]')?.value?.trim() || '', // Correção aplicada aqui
            };

            const isNewRow = row.dataset.id === 'new';
            // Verifica se há conteúdo em qualquer campo, exceto systemName, para considerar uma nova linha "válida"
            const otherFieldsHaveContent = Object.keys(data).some(key =>
                key !== 'systemName' && data[key] !== ''
            );

            if (id) { // Linha existente: prepara para atualização
                console.log(`DEBUG: Preparando para atualizar ID: ${id}, Dados:`, data);
                updates.push(db.systemDetails.update(id, data));
            } else if (isNewRow && otherFieldsHaveContent) { // Nova linha com conteúdo: prepara para adição
                console.log('DEBUG: Preparando para adicionar nova linha, Dados:', data);
                adds.push(data);
            } else if (isNewRow && !otherFieldsHaveContent) {
                console.log('DEBUG: Nova linha vazia ou sem dados significativos, removendo do DOM e ignorando adição:', data);
                row.remove(); // Remove a linha vazia do DOM
            }
        }

        console.log('DEBUG: Total de atualizações a serem executadas:', updates.length);
        console.log('DEBUG: Total de adições a serem executadas:', adds.length);

        try {
            if (updates.length > 0) {
                await Promise.all(updates);
                console.log('DEBUG: Atualizações em massa concluídas.');
            }
            if (adds.length > 0) {
                await db.systemDetails.bulkAdd(adds);
                console.log('DEBUG: Adições em massa concluídas.');
            }
            alert('Alterações salvas com sucesso!');
            // Recarrega a tabela para refletir as mudanças e obter novos IDs para as linhas adicionadas
            await renderSystemDetailsTable(currentSystemName, await loadSystemData(currentSystemName));
        } catch (error) {
            console.error('ERRO: Falha ao salvar alterações:', error);
            alert(`Erro ao salvar alterações: ${error.message}. Verifique o console do navegador (F12) para mais detalhes.`);
        }
    });

    // --- LISTENERS DE EVENTOS GLOBAIS ---

    // Listener para os links da sidebar
    sidebarLinks.forEach(link => {
        link.addEventListener('click', async (event) => {
            event.preventDefault();

            sidebarLinks.forEach(l => l.classList.remove('active'));

            initialMessageDiv.classList.add('hidden');
            systemDetailsSection.classList.add('hidden');
            systemTitleContainer.classList.add('hidden'); // Oculta o título antes de mostrar o novo

            event.target.classList.add('active');

            const systemName = event.target.dataset.system;

            if (systemName) {
                currentSystemName = systemName;
                systemDetailsSection.classList.remove('hidden');
                const currentSystemDetails = await loadSystemData(systemName);
                await renderSystemDetailsTable(systemName, currentSystemDetails);
                systemTitleContainer.classList.remove('hidden'); // Torna o título visível
            }
        });
    });

    // Listener para o botão "Exportar CSV"
    exportSystemCsvBtn.addEventListener('click', async () => {
        if (currentSystemName) {
            const itemsToExport = await loadSystemData(currentSystemName);
            if (itemsToExport.length > 0) {
                exportToCsv(itemsToExport, `detalhes_sistema_${currentSystemName}.csv`);
            } else {
                alert('Nenhum dado para exportar para este sistema.');
            }
        } else {
            alert('Selecione um sistema primeiro para exportar dados.');
        }
    });

    // Listener para o botão "Importar CSV"
    importCsvBtn.addEventListener('click', () => {
        if (currentSystemName) {
            importCsvInput.click();
        } else {
            alert('Selecione um sistema primeiro para importar dados.');
        }
    });

    importCsvInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && currentSystemName) {
            importFromCsv(file, currentSystemName, db.systemDetails);
        }
        event.target.value = '';
    });

    // Ajusta a altura inicial das textareas existentes ao carregar
    document.querySelectorAll('.auto-height-textarea').forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    });
});