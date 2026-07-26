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

