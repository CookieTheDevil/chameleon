const hostButton = document.querySelector(".host-button"); 

hostButton.addEventListener("click", () => {
    window.location.href="lobby.html"; 
}); 

const joinForm = document.querySelector("#join-form"); 
const gameCodeInput = document.querySelector("#game-code"); 

joinForm.addEventListener("submit", event => {
    event.preventDefault(); 

    const code = gameCodeInput.value.trim().toUpperCase(); 

    if (code.length !== 5) {
        alert("Please enter a five-character game code."); 
        return; 
    }

    window.location.href = `lobby.html?code=${encodeURIComponent(code)}`; 

    
})