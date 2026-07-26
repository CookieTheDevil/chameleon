const path = require("path"); 
const fs = require("fs");
const http = require("http"); 
const express = require("express"); 
const { Server } = require("socket.io"); 

const app = express(); 
const server = http.createServer(app); 
const io = new Server(server); 

const PORT = 3000; 

const rooms = new Map(); 

const categoriesPath = path.join(__dirname, "data", "categories.json");

app.get("/api/categories", (request, response) => {
    fs.readFile(
        categoriesPath,
        "utf8",
        (error, fileContent) => {
            if (error) {
                console.error(
                    "Could not read categories:",
                    error
                );

                response.status(500).json({
                    message: "Could not load categories."
                });

                return;
            }

            try {
                const data = JSON.parse(fileContent);

                const categories = data.categories.map(
                    category => ({
                        id: category.id,
                        name: category.name
                    })
                );

                response.json(categories);
            } catch (error) {
                console.error(
                    "Invalid categories JSON:",
                    error
                );

                response.status(500).json({
                    message: "Category data is invalid."
                });
            }
        }
    );
});

app.use(express.static(path.join(__dirname, "public"))); 

// Simple (but not foolproof!) way of creating room code
function createRoomCode() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = ""; 

    for (let index = 0; index < 5; index += 1) {
        code += characters[
            Math.floor(Math.random()*characters.length) 
        ]; 
    }

    return code; 
}

// Foolproofing the previous method.
function createUniqueRoomCode() {
    let code; 

    do {
        code = createRoomCode();
    } while (rooms.has(code));

    return code; 
}

function cleanPlayerName(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim().slice(0, 15);
}

function sendLobbyState(room) {
    for (const player of room.players) {
        if (!player.connected || !player.socketId) {
            continue; 
        }

        if (player.isHost) {
            io.to(player.socketId).emit("lobby-state", {
                code: room.code,
                isHost: true, 
                players: room.players.map(item => ({
                    name: item.name, 
                    isHost: item.isHost,
                    connected: item.connected
                })),
                selectedCategories: room.selectedCategories

            });
        } else {
            io.to(player.socketId).emit("lobby-state", {
                code: room.code, 
                isHost: false,
                playerName: player.name,
                playerCount: room.players.length
            })
        }
    }
}

server.listen(PORT, () => {
    console.log(`Chameleon is running at http://localhost:${PORT}`)
})

io.on("connection", socket => {
    console.log("Player connected:", socket.id);

    //Home-Socket
    socket.on(
        "create-room", 
        ({ name, playerToken}, respond) => {
            const cleanName = cleanPlayerName(name); 

            if (!cleanName || !playerToken) {
                respond({
                    ok: false, 
                    message: "Invalid player details."
                }); 

                return; 
            }

            const code = createUniqueRoomCode(); 

            const host = {
                token: playerToken,
                socketId: socket.id, 
                name: cleanName,
                isHost: true,
                connected: true
            }; 

            rooms.set(code, {
                code, 
                phase: "lobby", 
                hostToken: playerToken, 
                players: [host], 
                selectedCategories: []
            }); 

            socket.join(code); 

            respond({
                ok: true,
                code
            })
        }
    )

    //Home-Socket
    socket.on(
        "join-room",
        ({ code, name, playerToken }, respond) => {
            const cleanCode = String(code).trim().toUpperCase(); 
            const cleanName = cleanPlayerName(name); 
            const room = rooms.get(cleanCode); 

            if (!room) {
                respond({
                    ok: false,
                    message: "Room not found."
                });

                return; 
            }

            if (room.phase !== "lobby") {
                respond({
                    ok: false, 
                    message: "The game has already started."
                }); 

                return; 
            }

            if (room.players.length >= 8) {
                respond({
                    ok: false, 
                    message: "The room is full."
                }); 

                return; 
            }

            //should handle players falling out of session
            const existingPlayer = room.players.find(
                player => player.token === playerToken
            ); 

            if (existingPlayer) {
                existingPlayer.socketId = socket.id; 
                existingPlayer.connected = true; 
            } else {
                room.players.push({
                    token: playerToken, 
                    socketId: socket.id, 
                    name: cleanName,
                    isHost: false, 
                    connected: true
                });
            }

            socket.join(cleanCode); 

            respond({
                ok: true, 
                code: cleanCode
            }); 

            sendLobbyState(room); 
        }
    ); 

    //Lobby-Socket, arriving from Home-Socket
    socket.on(
        "enter-lobby", 
        ({ code, playerToken }, respond) => {
            const cleanCode = String(code || "").trim().toUpperCase(); 
            
            const room = rooms.get(cleanCode); 

            if (!room) {
                respond({
                    ok: false, 
                    message: "Room not found."
                });

                return;
            }

            const player = room.players.find(
                item => item.token === playerToken
            ); 

            if (!player) {
                respond({
                    ok: false, 
                    message: "Player not found."
                }); 

                return;
            }

            player.socketId = socket.id; 
            player.connected = true; 

            socket.join(cleanCode); 

            respond({
                ok: true,
                isHost: player.isHost
            }); 

            sendLobbyState(room); 
        }
    )

    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
    });
});

// ------------- GAME METHODS -------------

function shuffleArray(array) {
    const copy = [...array];

    for (let index = copy.length - 1; index > 0; index -= 1) {
        const randomIndex =
            Math.floor(Math.random() * (index + 1));

        [copy[index], copy[randomIndex]] =
            [copy[randomIndex], copy[index]];
    }

    return copy;
}

function createBoardWords(words) {
    return shuffleArray(words).slice(0, 16);
}

function pickSecretWord(boardWords) {
    return boardWords[
        Math.floor(Math.random() * boardWords.length)
    ];
}