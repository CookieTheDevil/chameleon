const params = new URLSearchParams(window.location.search);

const action = params.get("action");
const playerName = params.get("name");
const joinedRoomCode = params.get("code");

const hostLobby = document.querySelector("#host-lobby");
const playerLobby = document.querySelector("#player-lobby");
const playerNameElement = document.querySelector("#player-name");
const roomCodeElement = document.querySelector("#room-code");

const copyRoomLinkButton =
    document.querySelector("#copy-link-button");

const playerList = document.querySelector("#player-list");

const categoryButtons =
    document.querySelectorAll(".category-button");

function createPlayerRow(player, index) {
    const playerRow = document.createElement("div"); 

    playerRow.classList.add("player-row"); 

    playerRow.textContent =
        `${index + 1}. ${player.name}${player.isHost ? " (Host)" : ""}`;
    
    return playerRow; 
}

function renderPlayers(players) {
    playerList.replaceChildren();

    players.forEach((player, index) => {
        playerList.appendChild(
            createPlayerRow(player, index)
        );
    });
}

// Category Selection --------------------------------------------

categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
        button.classList.toggle("selected");
    });
});

// Copy link --------------------------------------------

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

// ---------------- SERVER HANDLING ----------------

const socket = io(); 

const code = params.get("code")?.toUpperCase(); 
const playerToken = sessionStorage.getItem("playerToken"); 

socket.emit(
    "enter-lobby", 
    {
        code, 
        playerToken
    }, 
    response => {
        if (!response.ok) {
            alert(response.message); 
            window.location.href = "index.html"; 
        }
    }
); 

socket.on("lobby-state", state => {
    roomCodeElement.textContent = state.code; 

    hostLobby.hidden = !state.isHost; 
    playerLobby.hidden = state.isHost;

    if (state.isHost) {
        renderPlayers(state.players); 
    } else {
        playerNameElement.textContent = state.playerName; 
    }
})