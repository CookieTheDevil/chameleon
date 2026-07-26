const params =
    new URLSearchParams(window.location.search);

const code =
    params.get("code")?.toUpperCase();

const playerToken =
    sessionStorage.getItem("playerToken");

const socket = io();

const roleLine = document.querySelector("#role-line");
const categoryTitle = document.querySelector("#category-title");
const boardGrid = document.querySelector("#board-grid");
const returnToLobbyButton = document.querySelector("#return-to-lobby-button"); 

const columnLabels = ["A", "B", "C", "D"];
const rowLabels = ["1", "2", "3", "4"];

function createCell(text, className) {
    const cell = document.createElement("div");
    cell.className = `board-cell ${className}`;
    cell.textContent = text;
    return cell;
}

function renderBoard(boardWords) {
    boardGrid.replaceChildren();

    boardGrid.appendChild(createCell("", "board-corner"));

    columnLabels.forEach(label => {
        boardGrid.appendChild(
            createCell(label, "board-col-header")
        );
    });

    for (let row = 0; row < 4; row += 1) {
        boardGrid.appendChild(
            createCell(rowLabels[row], "board-row-header")
        );

        for (let col = 0; col < 4; col += 1) {
            const index = row * 4 + col;
            boardGrid.appendChild(
                createCell(boardWords[index], "board-word")
            );
        }
    }
}

function renderGame(state) {
    categoryTitle.textContent =
        `Category: ${state.categoryName}`;

    if (state.isChameleon) {
        roleLine.textContent =
            "You are the Chameleon 🦎";
    } else {
        roleLine.textContent =
            `Secret Word: ${state.secretWord}`;
    }

    returnToLobbyButton.hidden = !state.isHost; 

    renderBoard(state.boardWords);
}

// Return to Lobby --------------------------------------------

returnToLobbyButton.addEventListener("click", () => {
    returnToLobbyButton.disabled = true; //prevent double return

    socket.emit(
        "return-to-lobby",
        {
            code,
            playerToken
        },
        response => {
            if (!response.ok) {
                alert(response.message);
                returnToLobbyButton.disabled = false;
            }
        }
    );
});

// ---------------- SERVER HANDLING ----------------

socket.emit(
    "enter-game",
    {
        code,
        playerToken
    },
    response => {
        if (!response.ok) {
            alert(response.message);
            window.location.href = "index.html";
            return;
        }

        renderGame(response.gameState);
    }
);

socket.on("returned-to-lobby", state => {
    window.location.href =
        `lobby.html?code=${encodeURIComponent(state.code)}`;
});