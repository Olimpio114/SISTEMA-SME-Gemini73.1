// db.js - Definição do banco de dados Dexie.js

const db = new Dexie('SystemManagementDB');

// Definição do schema do banco de dados
// Aumente a versão do banco de dados sempre que fizer alterações no schema
// para que o Dexie possa rodar as migrações (upgrade)

// Versão 1 (mantida para compatibilidade com dados antigos, se existirem)
db.version(1).stores({
    // Schema original da V1 (mantido apenas para fins de histórico de migração)
    systemDetails: '++id, systemName, empresa, coordenadoria, descricao, links, acompTecnico, linguagens, fiscal, po, keyUser, ordem, situacao, dataCriacao',
});

// Versão 2 - Removendo 'itensCadastro' e 'situacoes' (se existissem)
db.version(2).upgrade(async (trans) => {
    console.log("DEBUG: Executando upgrade do banco de dados para a versão 2. Tabelas 'itensCadastro' e 'situacoes' (se existiam) foram removidas do schema.");
});

// Versão 3 - Removendo 'dataCriacao' da tabela 'systemDetails'
db.version(3).upgrade(async (trans) => {
    console.log("DEBUG: Executando upgrade do banco de dados para a versão 3. Campo 'dataCriacao' removido do schema 'systemDetails'.");
});

// Versão 4 - Mudança do schema 'systemDetails' para suportar múltiplos itens por sistema
// E migração de dados da V3 para V4
db.version(4).stores({
    // Novo schema para systemDetails: 'systemName' se torna um campo indexado para buscas,
    // mas 'id' continua sendo a chave primária única para cada item.
    systemDetails: '++id, systemName, ordem, empresa, situacao, coordenadoria, descricao, linguagens, links, acompanhamentoTecnico, fiscal, po, keyUser',
}).upgrade(async (trans) => {
    console.log("DEBUG: Executando upgrade do banco de dados para a versão 4. Reestruturando 'systemDetails' para múltiplos itens por sistema.");

    // Migração de dados da V3 (single record per system) para V4 (multiple records per system)
    // Itera sobre os registros existentes na versão anterior da tabela systemDetails
    const oldSystemDetails = await trans.table('systemDetails').toArray();

    for (const oldDetail of oldSystemDetails) {
        // Verifica se o registro já tem um systemName válido e é um registro "completo"
        // para evitar migrar entradas vazias ou incompletas da V3 para V4
        if (oldDetail.systemName && oldDetail.systemName.trim() !== '') {
            // Cria um novo objeto para o novo schema
            const newDetail = {
                systemName: oldDetail.systemName,
                ordem: oldDetail.ordem || '',
                empresa: oldDetail.empresa || '',
                situacao: oldDetail.situacao || '',
                coordenadoria: oldDetail.coordenadoria || '',
                descricao: oldDetail.descricao || '',
                linguagens: oldDetail.linguagens || '',
                links: oldDetail.links || '',
                acompanhamentoTecnico: oldDetail.acompanhamentoTecnico || '',
                fiscal: oldDetail.fiscal || '',
                po: oldDetail.po || '',
                keyUser: oldDetail.keyUser || '',
            };
            // Adiciona o item ao novo store. O '++id' garantirá um novo ID.
            await trans.table('systemDetails').add(newDetail);
            console.log(`DEBUG: Migrado registro único de '${oldDetail.systemName}' para o novo formato de múltiplos itens.`);
        }
        // O Dexie automaticamente remove os registros antigos da versão anterior da tabela
        // se eles não forem re-adicionados ou se o schema for alterado de forma que os force a serem removidos.
        // Neste caso, como o schema mudou para '++id, systemName, ...', os antigos IDs não são mais relevantes
        // para a estrutura de chave primária, e estamos adicionando novos registros.
    }
    console.log("DEBUG: Migração para a versão 4 concluída.");
});


// Conecta ao banco de dados (necessário para que as migrações sejam aplicadas)
db.open().catch((err) => {
    console.error("DEBUG: Erro ao abrir o banco de dados Dexie:", err);
});
