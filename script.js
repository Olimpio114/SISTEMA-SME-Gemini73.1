document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM completamente carregado e script.js iniciado.');

    // --- VARIÁVEIS DE ELEMENTOS DO DOM ---
    const sidebarLinks = document.querySelectorAll('aside nav ul li a');
    const initialMessageDiv = document.getElementById('initial-message');
    const systemDetailsSection = document.getElementById('system-details-section');
    const generalMessageDiv = document.getElementById('generalMessage'); // Elemento para mensagens
    const systemTitleContainer = document.getElementById('system-title-container'); // Container do título do sistema
    const systemTitleDisplay = document.getElementById('system-title-display'); // O h2 dentro do container
    const systemDetailsTableBody = document.getElementById('system-details-table-body'); // Corpo da tabela de detalhes
    const addNewRowBtn = document.getElementById('add-new-row-btn');
    const saveAllChangesBtn = document = document.getElementById('save-all-changes-btn'); // Novo botão de salvar
    const exportSystemCsvBtn = document.getElementById('export-system-csv-btn');
    const importCsvInput = document.getElementById('import-csv-input');
    const importCsvBtn = document.getElementById('import-csv-btn');
    const clearTableBtn = document.getElementById('clear-table-btn');

    let currentSystemName = null; // Variável para armazenar o sistema atualmente selecionado

    // Nomes dos sistemas para referência
    const systemNames = [
        "COPED", "COCEU", "CODAE", "COGEP", "COMPS",
        "COSERV", "COTIC", "NUTAC", "COMAPRE", "COPLAN", "ASCOM", "COGED"
    ];

    // --- FUNÇÕES DE MIGRAÇÃO DE LOCALSTORAGE PARA INDEXEDDB ---
    // Garante que a migração ocorra apenas uma vez ao carregar a página
    await migrateLocalStorageToIndexedDB();

    async function migrateLocalStorageToIndexedDB() {
        console.log("DEBUG: Tentando migrar dados do localStorage para o IndexedDB...");

        // Migração para systemDetails - Iterar sobre cada sistema nomeado
        for (const systemName of systemNames) {
            const localStorageSystemData = localStorage.getItem(`systemDetails_${systemName}`);
            if (localStorageSystemData) {
                try {
                    const systemData = JSON.parse(localStorageSystemData);
                    // Adiciona o systemName ao objeto antes de salvar no IndexedDB
                    await db.systemDetails.add({
                        ...systemData,
                        systemName: systemName, // Garante que systemName está presente
                    });
                    localStorage.removeItem(`systemDetails_${systemName}`); // Remove após a migração
                    console.log(`DEBUG: Dados do sistema ${systemName} migrados com sucesso do localStorage para o IndexedDB.`);
                    showMessage(`Dados do sistema ${systemName} migrados para o banco de dados.`, 'success');
                } catch (error) {
                    console.error(`DEBUG: Erro ao migrar dados do sistema ${systemName} do localStorage:`, error);
                    showMessage(`Erro ao migrar dados do sistema ${systemName}.`, 'error');
                }
            }
        }
        console.log("DEBUG: Verificação de migração do localStorage concluída.");
    }

    // Função para exibir mensagens na UI
    let messageTimeout;
    function showMessage(message, type = 'success') {
        clearTimeout(messageTimeout); // Limpa qualquer timeout anterior
        generalMessageDiv.textContent = message;
        generalMessageDiv.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700', 'bg-blue-100', 'text-blue-700');
        if (type === 'success') {
            generalMessageDiv.classList.add('bg-green-100', 'text-green-700');
        } else if (type === 'error') {
            generalMessageDiv.classList.add('bg-red-100', 'text-red-700');
        } else { // info
            generalMessageDiv.classList.add('bg-blue-100', 'text-blue-700');
        }
        generalMessageDiv.classList.remove('hidden');

        messageTimeout = setTimeout(() => {
            generalMessageDiv.classList.add('hidden');
        }, 5000); // Mensagem desaparece após 5 segundos
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO E MANIPULAÇÃO DE DADOS ---

    // Função para carregar dados do sistema
    async function loadSystemItems(systemName) {
        try {
            // Retorna todos os itens associados a este systemName
            return await db.systemDetails.where('systemName').equalsIgnoreCase(systemName).toArray();
        } catch (error) {
            console.error(`DEBUG: Erro ao carregar itens para o sistema ${systemName}:`, error);
            showMessage(`Erro ao carregar itens do sistema ${systemName}.`, 'error');
            return [];
        }
    }

    // Função para renderizar os detalhes do sistema na tabela
    function renderSystemDetailsTable(systemName, items) {
        systemDetailsTableBody.innerHTML = ''; // Limpa o corpo da tabela

        if (items.length === 0) {
            // Adiciona uma linha vazia se não houver itens
            addEmptyRowToTable(systemName);
        } else {
            items.forEach(item => {
                appendItemToTable(systemName, item);
            });
        }

        // Ajusta a altura das textareas existentes ao carregar
        document.querySelectorAll('.auto-height-textarea').forEach(textarea => {
            adjustTextareaHeight(textarea);
        });
    }

    // Função para adicionar uma linha vazia (para nova entrada)
    function addEmptyRowToTable(systemName) {
        const newRow = systemDetailsTableBody.insertRow();
        newRow.dataset.id = 'new'; // Marca a linha como nova
        newRow.innerHTML = `
          <td class="p-2"><textarea rows="1" maxlength="220" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="ordem"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="empresa"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="situacao"></textarea></td>
			 <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="sistema"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="coordenadoria"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="descricao"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="linguagens"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="links"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="acompanhamentoTecnico"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="fiscal"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="po"></textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="keyUser"></textarea></td>
            <td class="p-2 text-center">
                <button class="delete-row-btn bg-#8a2be2-400 hover:bg-#2c32b8-500 text-white px-2 py-1 rounded text-xs">Excluir</button>
            </td>
        `;
        // Adiciona listeners para salvar ao perder o foco e ajustar altura
        newRow.querySelectorAll('textarea').forEach(textarea => {
            textarea.addEventListener('blur', () => saveRowData(newRow, systemName));
            textarea.addEventListener('input', () => adjustTextareaHeight(textarea));
        });
        // Adiciona listener para o botão de excluir
        newRow.querySelector('.delete-row-btn').addEventListener('click', (event) => deleteSystemItem(event.target.closest('tr'), systemName));

        // Ajusta a altura das textareas recém-criadas
        newRow.querySelectorAll('.auto-height-textarea').forEach(textarea => {
            adjustTextareaHeight(textarea);
        });
    }

    // Função para adicionar um item existente à tabela
    function appendItemToTable(systemName, item) {
        const newRow = systemDetailsTableBody.insertRow();
        newRow.dataset.id = item.id; // Armazena o ID do Dexie na linha
        newRow.innerHTML = `
          <td class="p-2"><textarea rows="1" maxlength="220" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="ordem">${item.ordem || ''}</textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="empresa">${item.empresa || ''}</textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="situacao">${item.situacao || ''}</textarea></td>
			 <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="situacao">${item.sistema || ''}</textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="coordenadoria">${item.coordenadoria || ''}</textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="descricao">${item.descricao || ''}</textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="linguagens">${item.linguagens || ''}</textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="links">${item.links || ''}</textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="acompanhamentoTecnico">${item.acompanhamentoTecnico || ''}</textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="fiscal">${item.fiscal || ''}</textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="po">${item.po || ''}</textarea></td>
            <td class="p-2"><textarea rows="1" maxlength="120" class="auto-height-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="keyUser">${item.keyUser || ''}</textarea></td>
            <td class="p-2 text-center">
                <button class="delete-row-btn bg-#8a2be2-400 hover:bg-#2c32b8-500 text-white px-2 py-1 rounded text-xs">Excluir</button>
            </td>
        `;
        // Adiciona listeners para salvar ao perder o foco e ajustar altura
        newRow.querySelectorAll('textarea').forEach(textarea => {
            textarea.addEventListener('blur', () => saveRowData(newRow, systemName));
            textarea.addEventListener('input', () => adjustTextareaHeight(textarea));
        });
        // Adiciona listener para o botão de excluir
        newRow.querySelector('.delete-row-btn').addEventListener('click', (event) => deleteSystemItem(event.target.closest('tr'), systemName));

        // Ajusta a altura das textareas recém-criadas
        newRow.querySelectorAll('.auto-height-textarea').forEach(textarea => {
            adjustTextareaHeight(textarea);
        });
    }

    // Função para ajustar a altura da textarea
    function adjustTextareaHeight(textarea) {
        if (textarea && textarea.classList.contains('auto-height-textarea')) {
            textarea.style.height = 'auto'; // Reseta a altura para 'auto' para obter um scrollHeight preciso

            const computedStyle = window.getComputedStyle(textarea);
            const lineHeight = parseFloat(computedStyle.lineHeight); // Obtém a altura da linha computada
            const paddingTop = parseFloat(computedStyle.paddingTop);
            const paddingBottom = parseFloat(computedStyle.paddingBottom);
            const borderTop = parseFloat(computedStyle.borderTopWidth);
            const borderBottom = parseFloat(computedStyle.borderBottomWidth);

            // Calcula a altura mínima para uma linha (incluindo padding e bordas)
            const minHeight = lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
            // Calcula a altura máxima para 4 linhas (incluindo padding e bordas)
            const maxHeight = (lineHeight * 4) + paddingTop + paddingBottom + borderTop + borderBottom;

            // Se o scrollHeight for menor ou igual à altura de uma linha, define a altura mínima
            if (textarea.scrollHeight <= minHeight) {
                textarea.style.height = minHeight + 'px';
            } else {
                // Define a altura para o scrollHeight, mas limita à altura máxima de 4 linhas
                textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
            }
        }
    }

    // Função para salvar os dados de uma linha individualmente (no blur)
    async function saveRowData(rowElement, systemName) {
        const itemId = rowElement.dataset.id;
        const itemData = { systemName: systemName };
        const textareas = rowElement.querySelectorAll('textarea'); // Agora todos são textareas

        let isRowEmpty = true;
        textareas.forEach(textarea => {
            const field = textarea.dataset.field;
            itemData[field] = textarea.value;
            if (textarea.value.trim() !== '') {
                isRowEmpty = false;
            }
        });

        // Se a linha é nova e está completamente vazia, não faz nada
        if (itemId === 'new' && isRowEmpty) {
            return;
        }

        try {
            if (itemId === 'new') {
                // Adiciona um novo item
                const id = await db.systemDetails.add(itemData);
                rowElement.dataset.id = id; // Atualiza o ID da linha com o ID do banco de dados
               // showMessage('Nova linha adicionada e salva com sucesso!', 'success');
            } else {
                // Atualiza um item existente
                await db.systemDetails.update(parseInt(itemId), itemData);
                //showMessage('Linha atualizada com sucesso!', 'success');
            }
            console.log(`DEBUG: Item ${itemId === 'new' ? 'novo' : itemId} para ${systemName} salvo/atualizado.`);
        } catch (error) {
            console.error(`DEBUG: Erro ao salvar dados da linha ${itemId} para o sistema ${systemName}:`, error);
           // showMessage(`Erro ao salvar dados da linha.`, 'error');
        }
    }

    // NOVA FUNÇÃO: Salva todas as alterações na tabela do sistema atual
    async function saveAllChangesForCurrentSystem() {
        if (!currentSystemName) {
            //showMessage('Nenhum sistema selecionado para salvar.', 'info');
            return;
        }

        const rows = systemDetailsTableBody.querySelectorAll('tr');
        let changesMade = false;
        let savedCount = 0;
        let errorCount = 0;

        for (const rowElement of rows) {
            const itemId = rowElement.dataset.id;
            const itemData = { systemName: currentSystemName };
            const textareas = rowElement.querySelectorAll('textarea'); // Agora todos são textareas

            let isRowEmpty = true;
            textareas.forEach(textarea => {
                const field = textarea.dataset.field;
                itemData[field] = textarea.value;
                if (textarea.value.trim() !== '') {
                    isRowEmpty = false;
                }
            });

            try {
                if (itemId === 'new') {
                    if (!isRowEmpty) { // Apenas adiciona se for uma nova linha e não estiver completamente vazia
                        const id = await db.systemDetails.add(itemData);
                        rowElement.dataset.id = id; // Atualiza o ID da linha
                        savedCount++;
                        changesMade = true;
                    }
                } else {
                    // Verifica se houve alguma mudança real antes de atualizar
                    const existingItem = await db.systemDetails.get(parseInt(itemId));
                    let hasChanged = false;
                    for (const key in itemData) {
                        // Compara apenas os campos que podem ser editados
                        if (itemData[key] !== existingItem[key]) {
                            hasChanged = true;
                            break;
                        }
                    }
                    if (hasChanged) {
                        await db.systemDetails.update(parseInt(itemId), itemData);
                        savedCount++;
                        changesMade = true;
                    }
                }
            } catch (error) {
                console.error(`DEBUG: Erro ao salvar dados da linha (ID: ${itemId}) para o sistema ${currentSystemName}:`, error);
                errorCount++;
            }
        }

        if (changesMade) {
            showMessage(`Alterações salvas: ${savedCount} linhas atualizadas/adicionadas. Erros: ${errorCount}.`, 'success');
            // Re-renderiza a tabela para garantir que todos os IDs sejam atualizados e o estado seja fresco
            const updatedItems = await loadSystemItems(currentSystemName);
            renderSystemDetailsTable(currentSystemName, updatedItems);
        } else if (errorCount > 0) {
            //showMessage(`Ocorreram erros ao salvar algumas alterações. Erros: ${errorCount}.`, 'error');
        } else {
            //showMessage('Nenhuma alteração detectada para salvar.', 'info');
        }
    }


    // Função para excluir um item
    async function deleteSystemItem(rowElement, systemName) {
        if (!confirm('Tem certeza que deseja excluir esta linha?')) {
            return;
        }
        const itemId = rowElement.dataset.id;

        // Remove a linha da UI imediatamente
        rowElement.remove();
       // showMessage('Linha excluída da interface. Salvando alteração...', 'info');

        try {
            await db.systemDetails.delete(parseInt(itemId));
            //showMessage('Linha excluída com sucesso do banco de dados!', 'success');
            console.log(`DEBUG: Item ${itemId} para ${systemName} excluído.`);
        }
        catch (error) {
            console.error(`DEBUG: Erro ao excluir item ${itemId} para o sistema ${systemName}:`, error);
            //showMessage(`Erro ao excluir linha do banco de dados. Por favor, recarregue a página se a linha reaparecer.`, 'error');
            // Opcional: Se a exclusão falhar, você pode querer adicionar a linha de volta à UI
            // ou fornecer uma opção para o usuário tentar novamente.
        }
    }

    // Função para apagar toda a tabela de um sistema
    async function clearSystemTable(systemName) {
        if (!confirm(`Tem certeza que deseja apagar TODOS os dados para o sistema ${systemName}? Esta ação é irreversível!`)) {
            return;
        }
        try {
            await db.systemDetails.where('systemName').equalsIgnoreCase(systemName).delete();
            showMessage(`Todos os dados para ${systemName} foram apagados com sucesso!`, 'success');
            // Limpa a tabela na UI e adiciona uma linha vazia
            systemDetailsTableBody.innerHTML = '';
            addEmptyRowToTable(systemName);
            console.log(`DEBUG: Todos os dados para ${systemName} foram apagados.`);
        } catch (error) {
            console.error(`DEBUG: Erro ao apagar todos os dados para o sistema ${systemName}:`, error);
           // showMessage(`Erro ao apagar todos os dados para ${systemName}.`, 'error');
        }
    }

    // Função para exportar dados para CSV
    function exportToCsv(data, filename) {
        if (!data || data.length === 0) {
            showMessage('Nenhum dado para exportar.', 'info');
            return;
        }

        // Define a ordem dos cabeçalhos para exportação CSV
        const orderedHeaders = [
            'ordem', 'empresa', 'situacao','sistema', 'coordenadoria', 'descricao',
            'linguagens', 'links', 'acompanhamentoTecnico', 'fiscal', 'po', 'keyUser'
        ];

        const csvHeaders = orderedHeaders.map(header => {
            // Converte camelCase para "Camel Case" para os cabeçalhos
            const formattedHeader = header.replace(/([A-Z])/g, ' $1')
                                        .replace(/^./, str => str.toUpperCase())
                                        .trim();
            return `"${formattedHeader}"`; // Envolve cabeçalhos em aspas
        }).join(',');

        const csvRows = data.map(row => {
            return orderedHeaders.map(header => {
                let value = row[header];
                // Formata booleanos para "Sim" ou "Não"
                if (typeof value === 'boolean') {
                    value = value ? 'Sim' : 'Não';
                }
                // Envolve o valor em aspas se contiver vírgulas, aspas duplas ou quebras de linha
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`; // Escapa aspas duplas dentro do valor
                }
                // Se o valor é nulo ou indefinido, retorna string vazia para o CSV
                return value !== null && value !== undefined ? value : '';
            }).join(',');
        });

        const csvString = [csvHeaders, ...csvRows].join('\n');

        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showMessage(`Dados exportados para "${filename}" com sucesso!`, 'success');
        } else {
            showMessage('Seu navegador não suporta a funcionalidade de download de arquivos diretamente. Por favor, copie o conteúdo CSV do console.', 'info');
            console.log(csvString);
        }
    }

    // Função para importar CSV
    async function importFromCsv(file, systemName) {
        if (!file) {
            showMessage('Nenhum arquivo selecionado para importação.', 'info');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim() !== ''); // Filtra linhas vazias

            if (lines.length === 0) {
                showMessage('Arquivo CSV vazio ou inválido.', 'error');
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase().replace(/ /g, '')); // Limpa e formata cabeçalhos
            const expectedHeaders = [
                'ordem', 'empresa', 'situacao', 'sistema', 'coordenadoria', 'descricao',
                'linguagens', 'links', 'acompanhamentotecnico', 'fiscal', 'po', 'keyuser'
            ];

            // Verifica se todos os cabeçalhos esperados estão presentes
            const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                showMessage(`Erro: O arquivo CSV está faltando os seguintes cabeçalhos: ${missingHeaders.join(', ')}.`, 'error');
                return;
            }

            const itemsToImport = [];
            for (let i = 1; i < lines.length; i++) {
                const values = parseCsvLine(lines[i]); // Função auxiliar para lidar com vírgulas dentro de aspas
                if (values.length !== headers.length) {
                    console.warn(`DEBUG: Linha ${i + 1} ignorada devido a número incorreto de colunas.`);
                    continue; // Pula linhas malformadas
                }

                const item = { systemName: systemName };
                for (let j = 0; j < headers.length; j++) {
                    const header = headers[j];
                    const value = values[j];
                    // Mapeia para os nomes de campo corretos no banco de dados
                    if (header === 'acompanhamentotecnico') {
                        item['acompanhamentoTecnico'] = value;
                    } else if (header === 'keyuser') {
                        item['keyUser'] = value;
                    } else {
                        item[header] = value;
                    }
                }
                itemsToImport.push(item);
            }

            if (itemsToImport.length === 0) {
                showMessage('Nenhum dado válido encontrado no arquivo CSV para importação.', 'info');
                return;
            }

            try {
                // Adiciona todos os itens importados em uma única transação para melhor performance
                await db.systemDetails.bulkAdd(itemsToImport);
                //showMessage(`${itemsToImport.length} itens importados com sucesso para ${systemName}!`, 'success');
                // Recarrega a tabela para mostrar os novos dados
                const updatedItems = await loadSystemItems(systemName);
                renderSystemDetailsTable(systemName, updatedItems);
            } catch (error) {
                console.error('DEBUG: Erro ao importar dados do CSV:', error);
                showMessage('Erro ao importar dados do CSV. Verifique o formato do arquivo.', 'error');
            }
        };
        reader.onerror = () => {
            showMessage('Erro ao ler o arquivo CSV.', 'error');
        };
        reader.readAsText(file);
    }

    // Função auxiliar para parsear linha CSV, lidando com vírgulas dentro de aspas
    function parseCsvLine(line) {
        const result = [];
        let inQuote = false;
        let currentField = '';
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuote = !inQuote;
                if (!inQuote && line[i + 1] === '"') { // Handle escaped quotes ""
                    currentField += '"';
                    i++;
                }
            } else if (char === ',' && !inQuote) {
                result.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        result.push(currentField); // Add the last field
        return result;
    }


    // --- LISTENERS DE EVENTOS ---

    // Listener para os links da sidebar
    sidebarLinks.forEach(link => {
        link.addEventListener('click', async (event) => {
            event.preventDefault();

            // Remove a classe 'active' de todos os links
            sidebarLinks.forEach(l => l.classList.remove('active'));

            // Oculta todas as seções e a mensagem inicial
            initialMessageDiv.classList.add('hidden');
            systemDetailsSection.classList.add('hidden');
            systemTitleContainer.classList.add('hidden'); // Oculta o container do título do sistema

            // Adiciona a classe 'active' ao link clicado
            event.target.classList.add('active');

            const systemName = event.target.dataset.system; // Para links de sistema
            currentSystemName = systemName; // Define o sistema atual

            if (systemName) {
                if (systemDetailsSection) {
                    systemDetailsSection.classList.remove('hidden');
                    const currentSystemItems = await loadSystemItems(systemName);
                    renderSystemDetailsTable(systemName, currentSystemItems);
                    // Atualiza e mostra o título do sistema dentro do novo container
                    systemTitleDisplay.textContent = `SISTEMA DE ${systemName.toUpperCase()}`;
                    systemTitleContainer.classList.remove('hidden'); // Mostra o container do título
                }
            }
        });
    });

    // Listener para o botão "Adicionar Nova Linha"
    addNewRowBtn.addEventListener('click', () => {
        if (currentSystemName) {
            addEmptyRowToTable(currentSystemName);
            //showMessage('Nova linha adicionada para preenchimento.', 'info');
        } else {
            //showMessage('Selecione um sistema primeiro para adicionar uma nova linha.', 'info');
        }
    });

    // Listener para o novo botão "Salvar Alterações"
    saveAllChangesBtn.addEventListener('click', async () => {
        await saveAllChangesForCurrentSystem();
    });

    // Listener para o botão "Exportar CSV"
    exportSystemCsvBtn.addEventListener('click', async () => {
        if (currentSystemName) {
            const itemsToExport = await loadSystemItems(currentSystemName);
            if (itemsToExport.length > 0) {
                exportToCsv(itemsToExport, `detalhes_sistema_${currentSystemName}.csv`);
            } else {
                showMessage('Nenhum dado para exportar para este sistema.', 'info');
            }
        } else {
            showMessage('Selecione um sistema primeiro para exportar dados.', 'info');
        }
    });

    // Listener para o botão "Importar CSV" (aciona o input de arquivo)
    importCsvBtn.addEventListener('click', () => {
        if (currentSystemName) {
            importCsvInput.click(); // Simula o clique no input de arquivo oculto
        } else {
            showMessage('Selecione um sistema primeiro para importar dados.', 'info');
        }
    });

    // Listener para quando um arquivo é selecionado no input de importação
    importCsvInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && currentSystemName) {
            importFromCsv(file, currentSystemName);
        }
        event.target.value = ''; // Limpa o input file para permitir importar o mesmo arquivo novamente
    });

    // Listener para o botão "Apagar Toda a Tabela"
    clearTableBtn.addEventListener('click', async () => {
        if (currentSystemName) {
            await clearSystemTable(currentSystemName);
        } else {
            showMessage('Selecione um sistema primeiro para apagar a tabela.', 'info');
        }
    });
});
