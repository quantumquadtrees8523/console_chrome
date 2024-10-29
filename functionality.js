document.addEventListener('DOMContentLoaded', function () {
    const textarea = document.getElementById('markdown');
    const submitButton = document.getElementById('submitButton');
    const refreshButton = document.getElementById('refreshButton');
    const notesList = document.getElementById('notesList');

    // Load saved content from localStorage
    textarea.value = localStorage.getItem('textContent') || '';
    const storedNotes = localStorage.getItem('submittedNotes');
    const submittedNotes = storedNotes ? JSON.parse(storedNotes) : [];

    // Save content to localStorage every time it changes
    textarea.addEventListener('input', function () {
        localStorage.setItem('textContent', textarea.value);
    });

    // Submit a note
    submitButton.addEventListener('click', function () {
        const noteText = textarea.value.trim();
        if (noteText) {
            const note = {
                human_note: { note: noteText },
                date_time: new Date().toUTCString(),
            };
            submittedNotes.push(note);
            localStorage.setItem('submittedNotes', JSON.stringify(submittedNotes));
            writeToFirestore(note);
            addNoteToSidebar(note, submittedNotes.length - 1);
            textarea.value = ''; // Clear textarea after submission
            localStorage.removeItem('textContent');
        }
    });

    // Refresh button
    refreshButton.addEventListener('click', async function () {
        const notesFromFirestore = await readFromFirestore();
        localStorage.setItem('submittedNotes', JSON.stringify(notesFromFirestore.notes));
        notesList.innerHTML = ''; // Clear current notes
        notesFromFirestore.notes.forEach((note, index) => {
            addNoteToSidebar(note, index);
        });
    });

    // Add note to the sidebar
    function addNoteToSidebar(note, index) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note';
        noteDiv.textContent = `${note.note_headline}`;
        noteDiv.addEventListener('click', function () {
            localStorage.setItem('selectedNoteContent', JSON.stringify(note));
            window.open('noteView.html', '_blank');
        });
        notesList.appendChild(noteDiv);
    }

    // Load submitted notes on page load
    submittedNotes.forEach((note, index) => {
        addNoteToSidebar(note, index);
    });

    textarea.addEventListener('keydown', function (event) {
        if (event.key === 'Tab') {
            event.preventDefault();  // Prevent default tab behavior

            // Get the current cursor position
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            // Insert the tab character
            textarea.value = textarea.value.substring(0, start) + '\t' + textarea.value.substring(end);

            // Move the cursor after the tab character
            textarea.selectionStart = textarea.selectionEnd = start + 1;
        }
    });

    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
            localStorage.setItem('submittedNotes', []);
            const notesFromFirestore = await readFromFirestore();
            localStorage.setItem('submittedNotes', JSON.stringify(notesFromFirestore.notes));
            location.reload();  // Refresh the page when it becomes visible
        }
    });

});

const HOSTNAME = 'https://us-central1-jarvis-8ce89.cloudfunctions.net';
// const HOSTNAME = 'http://localhost:8080'

async function writeToFirestore(note) {
    try {
        const authToken = await getOAuthToken();
        const response = await fetch(`${HOSTNAME}/write_to_firestore`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                note: note.human_note.note,
                timestamp: Date.now()
            }),
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function readFromFirestore() {
    const authToken = await getOAuthToken();
    try {
        const response = await fetch(`${HOSTNAME}/get_from_firestore`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            return [];
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Fetch error:', error);
        return [];
    }
}

function getOAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, function(token) {
            if (chrome.runtime.lastError || !token) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(token);
            }
        });
    });
}

