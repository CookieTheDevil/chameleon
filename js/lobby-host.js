const params = new URLSearchParams(window.location.search);

const action = params.get("action");
const playerName = params.get("name");
const joinedRoomCode = params.get("code");

const hostLobby = document.querySelector("#host-lobby");
const playerLobby = document.querySelector("#player-lobby");
const playerNameElement = document.querySelector("#player-name");
const roomCodeElement = document.querySelector("#room-code");

function generateRoomCode(length = 5) {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let index = 0; index < length; index += 1) {
        code += characters[
            Math.floor(Math.random() * characters.length)
        ];
    }

    return code;
}

let roomCode;

if (action === "host") {
    roomCode = sessionStorage.getItem("hostRoomCode");

    if (!roomCode) {
        roomCode = generateRoomCode();
        sessionStorage.setItem("hostRoomCode", roomCode);
    }

    hostLobby.hidden = false;
    playerLobby.hidden = true;
} else {
    roomCode = joinedRoomCode?.toUpperCase() || "-----";

    hostLobby.hidden = true;
    playerLobby.hidden = false;

    playerNameElement.textContent =
        playerName || "Player";
}

roomCodeElement.textContent = roomCode;

// Copy link --------------------------------------------

const copyRoomLinkButton =
    document.querySelector("#copy-link-button");

copyRoomLinkButton.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(window.location.href);

        const originalHTML = copyRoomLinkButton.innerHTML;

        setTimeout(() => {
            copyRoomLinkButton.innerHTML = originalHTML;
        }, 1500);
    } catch {
        alert("Could not copy the link.");
    }
});

// Player List --------------------------------------------
const players = [
    { 
        name: "Sandra", 
        isHost: true }
];

const playerList = document.querySelector("#player-list");

function createPlayerRow(player, index) {
    const playerRow = document.createElement("div"); 

    playerRow.classList.add("player-row"); 

    playerRow.textContent =
        `${index + 1}. ${player.name}${player.isHost ? " (Host)" : ""}`;
    
    return playerRow; 
}

function renderPlayers() {
    playerList.innerHTML = "";

    players.forEach((player, index) => {
        playerList.appendChild(
            createPlayerRow(player, index)
        );
    });
}

function addPlayer(name) {
    const player = {
        name,
        isHost: false
    };

    players.push(player);

    const newRow = createPlayerRow(
        player,
        players.length - 1
    );

    playerList.appendChild(newRow);
}

renderPlayers();

addPlayer("Sebastian");
addPlayer("Ka");
addPlayer("Anniken");
addPlayer("Sebastian");
addPlayer("Ka");
addPlayer("Anniken");
addPlayer("Anniken");

// Category Selection --------------------------------------------

const categoryButtons =
    document.querySelectorAll(".category-button");

categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
        button.classList.toggle("selected");
    });
});

