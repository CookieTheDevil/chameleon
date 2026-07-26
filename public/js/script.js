const hostForm = document.querySelector("#host-form");
const joinForm = document.querySelector("#join-form");

const hostNameInput = document.querySelector("#host-name");
const playerNameInput = document.querySelector("#game-name");
const gameCodeInput = document.querySelector("#game-code");

function cleanPlayerName(value) {
    return value.trim().slice(0, 15); 
}

function isValidPlayerName(name) {
    return name.length >= 1 && name.length <= 15; 
}

hostForm.addEventListener("submit", event => {
    event.preventDefault(); 

    const playerName = cleanPlayerName(hostNameInput.value);

    if (!isValidPlayerName(playerName)) {
        alert("Please enter a name between 1 and 15 characters"); 
        hostNameInput.focus(); 
        return; 
    }

    const params = new URLSearchParams({
        action: "host",
        name: playerName
    }); 

    window.location.href= `lobby.html?${params.toString()}`;
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

    const params = new URLSearchParams({
        action: "join",
        name: playerName,
        code: roomCode
    });

    window.location.href = `lobby.html?${params.toString()}`;
});