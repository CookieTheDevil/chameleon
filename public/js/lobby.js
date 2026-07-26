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

const categoryList =
    document.querySelector("#category-list");

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

function createCategoryButton(category) {
    const button = document.createElement("button");

    button.type = "button";
    button.classList.add("category-button");
    button.dataset.category = category.id;
    button.textContent = category.name;

    button.addEventListener("click", () => {
        button.classList.toggle("selected");
    });

    return button;
}

function renderCategories(categories) {
    categoryList.replaceChildren();

    categories.forEach(category => {
        categoryList.appendChild(
            createCategoryButton(category)
        );
    });
}

async function loadCategories() {
    try {
        const response =
            await fetch("/api/categories");

        if (!response.ok) {
            throw new Error(
                `Request failed: ${response.status}`
            );
        }

        const categories = await response.json();

        renderCategories(categories);
    } catch (error) {
        console.error(
            "Could not load categories:",
            error
        );

        categoryList.textContent =
            "Could not load categories.";
    }
}

loadCategories();

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