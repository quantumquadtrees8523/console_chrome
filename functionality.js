document.addEventListener('DOMContentLoaded', function () {
    const submitButton = document.getElementById('submitButton');
    const refreshButton = document.getElementById('refreshButton');
    const notesList = document.getElementById('notesList');
    
    // Initialize Quill editor without a toolbar
    const quill = new Quill('#editor-container', {
        theme: 'snow',
        modules: {
            toolbar: false  // Disables the toolbar
        }
    });


    // Load saved content from localStorage and set it to Quill editor
    const savedContent = localStorage.getItem('textContent') || '';
    quill.root.innerHTML = savedContent;

    // Load submitted notes from localStorage
    const storedNotes = localStorage.getItem('submittedNotes');
    const submittedNotes = storedNotes ? JSON.parse(storedNotes) : [];

    // Save content from Quill editor to localStorage
    quill.on('text-change', function () {
        localStorage.setItem('textContent', quill.root.innerHTML);
    });

    // Submit a note
    submitButton.addEventListener('click', function () {
        const noteText = quill.root.innerHTML; // Get HTML from Quill
        if (noteText) {
            const note = {
                human_note: { note: noteText },
                date_time: new Date().toUTCString(),
            };
            submittedNotes.push(note);
            localStorage.setItem('submittedNotes', JSON.stringify(submittedNotes));
            writeToFirestore(note);
            addNoteToSidebar(note, submittedNotes.length - 1);
            quill.root.innerHTML = ''; // Clear editor after submission
            localStorage.removeItem('textContent');
        }
    });

    // Refresh button functionality
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
        noteDiv.textContent = note.note_headline;
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

    // Refresh the page when it becomes visible
    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
            localStorage.setItem('submittedNotes', []);
            const notesFromFirestore = await readFromFirestore();
            localStorage.setItem('submittedNotes', JSON.stringify(notesFromFirestore.notes));
            location.reload();
        }
    });
});

const HOSTNAME = 'https://us-central1-jarvis-8ce89.cloudfunctions.net';

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
