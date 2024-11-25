const HOSTNAME = 'https://us-central1-jarvis-8ce89.cloudfunctions.net';
// const HOSTNAME = 'https://localhost:8080';

document.addEventListener("mouseup", (e) => {
    const selection = window.getSelection();
    // Don't clear selection if clicking inside popup
    const popup = document.getElementById("highlight-popup");
    if (popup && popup.contains(e.target)) {
        return;
    }
    
    if (selection && selection.toString().trim().length > 0) {
        const selectedText = selection.toString();
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        showPopup(selectedText, rect);
    }
});


document.addEventListener("keydown", (event) => {
    // Check if Command (metaKey) and 'K' are pressed
    if (event.metaKey && event.key.toLowerCase() === "k") {
        event.preventDefault(); // Prevent default browser behavior (e.g., search)
        // When using CMD+K, create popup at mouse position
        showPopup("", {
            right: window.innerWidth / 2,
            top: window.innerHeight / 2
        });
    }
});

function showPopup(selectedText, rect) {
    // Remove any existing popup
    removePopup();

    const popup = document.createElement("div");
    popup.id = "highlight-popup";
    // Create entryway button first
    const entryButton = document.createElement("div");
    entryButton.id = "highlight-entry";
    entryButton.style.position = "fixed";
    entryButton.style.zIndex = "999999";
    entryButton.style.width = "12px";
    entryButton.style.height = "12px";
    entryButton.style.borderRadius = "50%";
    entryButton.style.backgroundColor = "#0a99f5";
    entryButton.style.cursor = "pointer";
    entryButton.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
    entryButton.style.display = "flex";
    entryButton.style.alignItems = "center";
    entryButton.style.justifyContent = "center";
    entryButton.style.left = `${rect.right + 5}px`;
    entryButton.style.top = `${rect.top}px`;

    // Add hover effect
    entryButton.addEventListener("mouseenter", () => {
        entryButton.style.transform = "scale(1.1)";
    });
    entryButton.addEventListener("mouseleave", () => {
        entryButton.style.transform = "scale(1)";
    });

    // Add click handler to show main popup
    entryButton.addEventListener("click", () => {
        // Essential positioning styles
        popup.style.position = "fixed";
        popup.style.zIndex = "999999";
        popup.style.backgroundColor = "#2E2E2E";
        popup.style.color = "#E0E0E0";
        popup.style.borderRadius = "8px";
        popup.style.padding = "12px";
        popup.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";
        popup.style.border = "1px solid #555555";
        popup.style.width = "300px";

        // Position relative to selection or mouse position
        popup.style.left = `${rect.right + 10}px`; // 10px offset from selection/mouse
        popup.style.top = `${rect.top}px`;

        // Create close button
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "×";
        closeBtn.style.position = "absolute";
        closeBtn.style.right = "8px";
        closeBtn.style.top = "8px";
        closeBtn.style.backgroundColor = "transparent";
        closeBtn.style.border = "none";
        closeBtn.style.color = "#E0E0E0";
        closeBtn.style.fontSize = "20px";
        closeBtn.style.cursor = "pointer";
        closeBtn.style.padding = "0";
        closeBtn.style.width = "24px";
        closeBtn.style.height = "24px";
        closeBtn.style.display = "flex";
        closeBtn.style.alignItems = "center";
        closeBtn.style.justifyContent = "center";
        closeBtn.addEventListener("click", removePopup);

        // Create selected text display
        const selectedTextDisplay = document.createElement("div");
        selectedTextDisplay.style.fontSize = "14px";
        selectedTextDisplay.style.marginBottom = "8px";
        selectedTextDisplay.style.wordBreak = "break-word";
        selectedTextDisplay.textContent = selectedText ? `"${selectedText}"` : "Quick Note";
        selectedTextDisplay.style.fontSize = "20px";

        // Create input field
        const noteInput = document.createElement("input");
        noteInput.type = "text";
        noteInput.placeholder = "Add your notes...";
        noteInput.style.width = "calc(100% - 16px)";
        noteInput.style.marginTop = "8px";
        noteInput.style.marginBottom = "8px";
        noteInput.style.padding = "8px";
        noteInput.style.border = "1px solid #555555";
        noteInput.style.borderRadius = "4px";
        noteInput.style.backgroundColor = "#333333";
        noteInput.style.color = "#E0E0E0";
        noteInput.style.fontSize = "14px";

        // Create submit button
        const submitBtn = document.createElement("button");
        submitBtn.textContent = "Save";
        submitBtn.style.padding = "8px 16px";
        submitBtn.style.backgroundColor = "#BB86FC";
        submitBtn.style.color = "#121212";
        submitBtn.style.border = "none";
        submitBtn.style.borderRadius = "4px";
        submitBtn.style.cursor = "pointer";
        submitBtn.style.width = "100%";
        submitBtn.addEventListener("click", () => {
            const note = noteInput.value;
            if (note) {
                noteText = selectedText ? `"${selectedText}"\n\n ${note}` : note;
                NetworkManager.request(`${HOSTNAME}/write_to_firestore`, {
                    method: 'POST',
                    body: JSON.stringify({
                        note: noteText,
                        timestamp: Date.now()
                    })
                }).then(response => {
                    if (response.status === 200) {
                        return "true";
                    } else {
                        return "false";
                    }
                });

                noteInput.value = "";
            }
            removePopup();
        });

        // Add elements to popup
        popup.appendChild(closeBtn);
        popup.appendChild(selectedTextDisplay);
        popup.appendChild(noteInput);
        popup.appendChild(submitBtn);

        // Append popup to body
        document.body.appendChild(popup);
        // Adjust popup position if it goes out of viewport
        const popupRect = popup.getBoundingClientRect();
        if (rect.right + 10 + popupRect.width > window.innerWidth) {
            popup.style.left = `${rect.left - popupRect.width - 10}px`;
        }
        if (rect.top + popupRect.height > window.innerHeight) {
            popup.style.top = `${window.innerHeight - popupRect.height - 10}px`;
        }


        // Remove the entry button
        entryButton.remove();
    });

    // Add entry button to page
    document.body.appendChild(entryButton);
    // Add event listener for outside clicks
    // Adjust entry button position if it goes out of viewport
    const entryRect = entryButton.getBoundingClientRect();
    if (rect.right + 5 + entryRect.width > window.innerWidth) {
        entryButton.style.left = `${rect.left - entryRect.width - 5}px`;
    }
    document.addEventListener("mousedown", handleOutsideClick);
}

function handleOutsideClick(e) {
    const popup = document.getElementById("highlight-popup");
    const entryButton = document.getElementById("highlight-entry");

    // Check if the click is outside the popup and entry button
    const clickedOutsidePopup = popup && !popup.contains(e.target);
    const clickedOutsideEntryButton = entryButton && !entryButton.contains(e.target);

    // If clicked outside both, remove popup and cleanup listener
    if (clickedOutsidePopup || clickedOutsideEntryButton) {
        removePopup();
        document.removeEventListener("mousedown", handleOutsideClick); // Clean up listener
    }
}

function removePopup() {
    document.getElementById("highlight-entry")?.remove();
    document.getElementById("highlight-popup")?.remove();
}

function promptForAuth() {
    chrome.runtime.sendMessage({ action: "getOAuthToken" }, (response) => {
        if (response && response.success) {
            window.location.reload(); // Reload to use the token
        } else {
            console.error("Auth error:", response.error);
        }
    });
}


const NetworkManager = {
    async request(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        try {
            const authToken = await requestOAuthToken(); // Await token retrieval
            options.headers = {
                ...defaultOptions.headers,
                ...options.headers,
                'Authorization': `Bearer ${authToken}`
            };

            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Network request failed:', error);
            if (error.message === 'OAuth token required') {
                promptForAuth();
            }
            throw error;
        }
    }
};


function requestOAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "getOAuthToken" }, (response) => {
            if (response && response.success) {
                resolve(response.token); // Resolve with the token
            } else {
                console.error("Failed to get OAuth token:", response.error);
                reject(new Error(response.error));
            }
        });
    });
}
