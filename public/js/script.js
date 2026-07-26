const APP_BASE =
    window.location.pathname === "/projects/chameleon" ||
    window.location.pathname.startsWith("/projects/chameleon/")
        ? "/projects/chameleon"
        : "";

const socket = io({
    path: `${APP_BASE}/socket.io`
});

const hostForm = document.querySelector("#host-form");
const joinForm = document.querySelector("#join-form");

const hostNameInput = document.querySelector("#host-name");
const playerNameInput = document.querySelector("#game-name");
const gameCodeInput = document.querySelector("#game-code");

const pageParams = new URLSearchParams(window.location.search);

const invitedRoomCode = pageParams.get("code");

if (invitedRoomCode) {
    gameCodeInput.value =
        invitedRoomCode.trim().toUpperCase();

    playerNameInput.focus();
}

function cleanPlayerName(value) {
    return value.trim().slice(0, 15); 
}

function isValidPlayerName(name) {
    return name.length >= 1 && name.length <= 15; 
}

// Server-handling

function getPlayerToken() {
    let token = sessionStorage.getItem("playerToken");

    if (!token) {
        token = crypto.randomUUID();
        sessionStorage.setItem("playerToken", token);
    }

    return token;
}

const playerToken = getPlayerToken();

hostForm.addEventListener("submit", event => {
    event.preventDefault(); 

    const playerName = cleanPlayerName(hostNameInput.value);

    if (!isValidPlayerName(playerName)) {
        alert("Please enter a name between 1 and 15 characters"); 
        hostNameInput.focus(); 
        return; 
    }

    socket.emit(
        "create-room",
        {
            name: playerName,
            playerToken
        },
        response => {
            if (!response.ok) {
                alert(response.message);
                return;
            }

            const params = new URLSearchParams({
                action: "host",
                code: response.code,
                name: playerName
            });

            window.location.href =
                `lobby.html?${params.toString()}`;
        }
    );
})

joinForm.addEventListener("submit", event => {
    event.preventDefault();

    const playerName = cleanPlayerName(playerNameInput.value);
    const roomCode = gameCodeInput.value.trim().toUpperCase();

    if (!isValidPlayerName(playerName)) {
        alert("Please enter a name between 1 and 15 characters.");
        playerNameInput.focus();
        return;
    }

    if (roomCode.length !== 5) {
        alert("Please enter a five-character game code.");
        gameCodeInput.focus();
        return;
    }

       socket.emit(
        "join-room",
        {
            code: roomCode,
            name: playerName,
            playerToken
        },
        response => {
            if (!response.ok) {
                alert(response.message);
                return;
            }

            const params = new URLSearchParams({
                action: "join",
                code: response.code,
                name: playerName
            });

            window.location.href =
                `lobby.html?${params.toString()}`;
        }
    );
});
