const path = require("path"); 
const fs = require("fs");
const http = require("http"); 
const express = require("express"); 
const { Server } = require("socket.io"); 

const app = express(); 
const server = http.createServer(app); 
const io = new Server(server); 

const PORT = process.env.PORT || 3000;

const rooms = new Map(); 

const categoriesPath = path.join(__dirname, "data", "categories.json");

function loadCategories() {
    let data;

    try {
        const fileContent =
            fs.readFileSync(categoriesPath, "utf8");

        data = JSON.parse(fileContent);
    } catch (error) {
        throw new Error(
            `Could not read categories.json: ${error.message}`
        );
    }

    if (!data || !Array.isArray(data.categories)) {
        throw new Error(
            'categories.json must contain a "categories" array.'
        );
    }

    const usedIds = new Set();
    const usedNames = new Set();

    return data.categories.map(
        (category, categoryIndex) => {
            const categoryLabel =
                `Category ${categoryIndex + 1}`;

            if (
                !category ||
                typeof category !== "object"
            ) {
                throw new Error(
                    `${categoryLabel} must be an object.`
                );
            }

            const id =
                typeof category.id === "string"
                    ? category.id.trim()
                    : "";

            const name =
                typeof category.name === "string"
                    ? category.name.trim()
                    : "";

            if (!id) {
                throw new Error(
                    `${categoryLabel} needs an id.`
                );
            }

            if (!/^[a-z0-9-]+$/.test(id)) {
                throw new Error(
                    `Category id "${id}" may only contain lowercase letters, numbers and hyphens.`
                );
            }

            if (usedIds.has(id)) {
                throw new Error(
                    `Duplicate category id: "${id}".`
                );
            }

            usedIds.add(id);

            if (!name) {
                throw new Error(
                    `Category "${id}" needs a name.`
                );
            }

            const normalisedName =
                name.toLowerCase();

            if (usedNames.has(normalisedName)) {
                throw new Error(
                    `Duplicate category name: "${name}".`
                );
            }

            usedNames.add(normalisedName);

            if (!Array.isArray(category.words)) {
                throw new Error(
                    `Category "${name}" needs a words array.`
                );
            }

            const words = category.words.map(
                (word, wordIndex) => {
                    if (
                        typeof word !== "string" ||
                        !word.trim()
                    ) {
                        throw new Error(
                            `Word ${wordIndex + 1} in "${name}" is invalid.`
                        );
                    }

                    return word.trim();
                }
            );

            if (words.length < 16) {
                throw new Error(
                    `Category "${name}" needs at least 16 words. It currently has ${words.length}.`
                );
            }

            const usedWords = new Set();

            for (const word of words) {
                const normalisedWord =
                    word.toLowerCase();

                if (usedWords.has(normalisedWord)) {
                    throw new Error(
                        `Category "${name}" contains the duplicate word "${word}".`
                    );
                }

                usedWords.add(normalisedWord);
            }

            return {
                id,
                name,
                words
            };
        }
    );
}

let categories;

try {
    categories = loadCategories();

    console.log(
        `Loaded ${categories.length} valid categories.`
    );
} catch (error) {
    console.error(
        `Category data error: ${error.message}`
    );

    process.exit(1);
}

const validCategoryIds = new Set(
    categories.map(category => category.id)
);

app.get("/api/categories", (request, response) => {
    const publicCategories = categories.map(category => ({
        id: category.id,
        name: category.name
    }));

    response.json(publicCategories);
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

server.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Chameleon is running on port ${PORT}`
    );
});

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

    //Lobby-page, picking categories 
    socket.on(
        "toggle-category", 
        ({ code, playerToken, categoryId }, respond) => {
            const cleanCode = 
            String(code || "").trim().toUpperCase(); 

            const cleanCategoryId = String(categoryId || "").trim(); 

            const room = rooms.get(cleanCode); 

            if (!room) {
                respond({
                    ok: false, 
                    message: "Room not found."
                });

                return; 
            }

            if (room.phase != "lobby") {
                respond({
                    ok: false, 
                    message: "The game has already started."
                }); 

                return;
            }

            if (room.hostToken !== playerToken) {
                respond({
                    ok: false, 
                    message: "Only the host can select categories."
                });

                return; 
            }

            if (!validCategoryIds.has(cleanCategoryId)) {
                respond({
                    ok: false, 
                    message: "Category not found."
                })

                return; 
            }; 

            const categoryIndex = room.selectedCategories.indexOf(cleanCategoryId);
            
            //toggles: removes if already presents, adds if not
            if (categoryIndex === -1) {
                room.selectedCategories.push(cleanCategoryId); 
            } else {
                room.selectedCategories.splice(categoryIndex, 1); 
            }

            respond({
                ok: true
            }); 

            sendLobbyState(room); 
        }
    )

    //Lobby-page to Game-page
    socket.on(
        "start-game",
        ({ code, playerToken }, respond) => {
            const cleanCode =
                String(code || "").trim().toUpperCase();

            const room = rooms.get(cleanCode);

            if (!room) {
                respond({
                    ok: false,
                    message: "Room not found."
                });

                return;
            }

            if (room.hostToken !== playerToken) {
                respond({
                    ok: false,
                    message: "Only the host can start the game."
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

            const connectedPlayers =
                room.players.filter(
                    player => player.connected
                );

            if (connectedPlayers.length < 2) {
                respond({
                    ok: false,
                    message: "At least two players are required."
                });

                return;
            }

            if (room.selectedCategories.length === 0) {
                respond({
                    ok: false,
                    message: "Select at least one category."
                });

                return;
            }

            const selectedCategoryId = pickRandomItem(room.selectedCategories); 
            const selectedCategory = categories.find(category => category.id === selectedCategoryId); 

            if (!selectedCategory || !Array.isArray(selectedCategory.words)) {
                respond({
                    ok: false, 
                    message: "The selected category is invaled"
                });

                return; 
            }

            if (selectedCategory.words.length < 16) {
                respond({
                    ok: false, 
                    message: `${selectedCategory.name} needs at least 16 words.`
                })

                return; 
            }

            const boardWords = createBoardWords(selectedCategory.words); 
            const secretWord = pickSecretWord(boardWords); 
            const chameleon = pickRandomItem(connectedPlayers); 

            room.round = {
                categoryId: selectedCategory.id, 
                categoryName: selectedCategory.name, 
                boardWords, 
                secretWord, 
                chameleonToken: chameleon.token
            }; 

            room.phase = "playing"; 

            respond({
                ok: true
            }); 

            io.to(cleanCode).emit("game-started", {
                code: cleanCode
            })
        }
    );

    // Game-page
    socket.on(
        "enter-game", 
        ({ code, playerToken }, respond) => {
            const cleanCode = String(code || "").trim().toUpperCase(); 

            const room = rooms.get(cleanCode); 

            if (!room) {
                respond({
                    ok: false, 
                    message: "Room not found"
                }); 

                return; 
            }

            if (room.phase !== "playing" || !room.round) {
                respond({
                    ok: false, 
                    message: "The game has not started"
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

            const isChameleon = playerToken === room.round.chameleonToken; 

            const gameState = {
                code: room.code, 
                categoryName: room.round.categoryName, 
                boardWords: room.round.boardWords, 
                isChameleon,
                isHost: player.isHost
            };

            if (!isChameleon) {
                gameState.secretWord = room.round.secretWord; 
            }; 

            respond({
                ok:true,
                gameState
            })
        }
    )

        // Game-page to Lobby-page
    socket.on(
        "return-to-lobby",
        ({ code, playerToken }, respond) => {
            const cleanCode =
                String(code || "").trim().toUpperCase();

            const room = rooms.get(cleanCode);

            if (!room) {
                respond({
                    ok: false,
                    message: "Room not found."
                });

                return;
            }

            if (room.hostToken !== playerToken) {
                respond({
                    ok: false,
                    message:
                        "Only the host can return everyone to the lobby."
                });

                return;
            }

            if (room.phase !== "playing") {
                respond({
                    ok: false,
                    message: "The room is not currently playing."
                });

                return;
            }

            room.phase = "lobby";
            room.round = null;

            respond({
                ok: true
            });

            io.to(cleanCode).emit("returned-to-lobby", {
                code: cleanCode
            });
        }
    );

    //players should be able to reconnect when refreshing
    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);

        for (const room of rooms.values()) {
            const player = room.players.find(
                item => item.socketId === socket.id
            );

            if (!player) {
                continue;
            }

            player.connected = false;
            player.socketId = null;

            if (room.phase === "lobby") {
                sendLobbyState(room);
            }

            break;
        }
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
    return pickRandomItem(boardWords); 
}

function pickRandomItem(items) {
    return items[
        Math.floor(Math.random() * items.length)
    ];
}