// foodmeta/server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    // Configuração CORS CRUCIAL para permitir que seu CPanel se conecte
    cors: {
        origin: "*", // Permite a conexão de qualquer domínio (Para desenvolvimento)
        methods: ["GET", "POST"]
    }
});

// A porta é lida de uma variável de ambiente (PORT) fornecida pelo Railway
const port = process.env.PORT || 3000; 

// Mapa para rastrear todos os jogadores conectados (ID do Socket -> Dados do Jogador)
const players = {}; 

io.on('connection', (socket) => {
    console.log(`⚡ Novo jogador conectado! ID: ${socket.id}`);

    // --- 1. Lógica de Entrada de Jogador ---
    socket.on('playerJoined', (nickname) => {
        // Inicializa o novo jogador no mapa
        players[socket.id] = {
            nickname: nickname,
            // Posição inicial (ex: no centro do pub)
            position: { x: 0, y: 0, z: 0 }, 
            rotation: { y: 0 }
        };

        // Envia o estado atual de TODOS os jogadores para o novo jogador
        socket.emit('currentPlayers', players);

        // Notifica TODOS os outros jogadores sobre a chegada do novo jogador
        socket.broadcast.emit('newPlayer', players[socket.id]);
        console.log(`[${nickname}] entrou no pub.`);
    });
    
    // --- 2. Lógica do Chat ---
    socket.on('chat message', (msgData) => {
        // Reenvia a mensagem para TODOS os clientes conectados
        io.emit('chat message', msgData);
    });

    // --- 3. Lógica de Sincronização de Posição (O coração do .io) ---
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            // Atualiza a posição e rotação do jogador no mapa do servidor
            players[socket.id].position = movementData.position;
            players[socket.id].rotation = movementData.rotation;

            // Envia a posição atualizada DESTE jogador para TODOS os outros
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                position: players[socket.id].position,
                rotation: players[socket.id].rotation
            });
        }
    });

    // --- 4. Lógica de Desconexão ---
    socket.on('disconnect', () => {
        console.log(`🚫 Jogador desconectou: ${socket.id}`);
        // Remove o jogador do mapa
        delete players[socket.id];
        // Notifica todos os outros jogadores sobre a saída
        io.emit('playerLeft', socket.id);
    });
});

// Inicia o Servidor
http.listen(port, () => {
  console.log(`Servidor de tempo real rodando na porta ${port}`);
});
