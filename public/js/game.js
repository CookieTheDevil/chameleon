const roleLine = document.querySelector("#role-line");
const categoryTitle = document.querySelector("#category-title");
const boardGrid = document.querySelector("#board-grid");

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

    renderBoard(state.boardWords);
}

/* Temporary test state */

const testState = {
    code: "XY2J7",
    categoryName: "Sandra",
    boardWords: [
        "Yippie", "Teknisk", "Blå", "Sjokolade",
        "IFI", "Tvilling", "FU-Koordinator", "Nerds",
        "Musikaler", "Kommandør", "Gaming", "Lørenskog",
        "IT", "Bøker", "Carl Berners", "Korrupsjon"
    ],
    secretWord: "Kommandør",
    isChameleon: false
};

renderGame(testState);