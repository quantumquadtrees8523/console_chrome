document.addEventListener('DOMContentLoaded', function () {
    const submitButton = document.getElementById('submitButton');
    const refreshButton = document.getElementById('refreshButton');
    const notesList = document.getElementById('notesList');
    
    // Initialize Quill editor with Markdown support
    const quill = new Quill('#editor-container', {
        theme: 'snow',
        modules: {
            toolbar: false  // Disables the toolbar
        }
    });

    // Enable Markdown in Quill
    const quillMarkdownOptions = {};
    new QuillMarkdown(quill, quillMarkdownOptions);

    const liveSummary = localStorage.getItem('live_summary') || 'No summary available';
    
    summaryCanvas.innerHTML = marked.parse(liveSummary);
    
    // Load saved content from localStorage and set it to Quill editor
    const savedContent = localStorage.getItem('textContent') || '';
    quill.root.innerHTML = savedContent;

    // Load submitted notes from localStorage
    const storedNotes = localStorage.getItem('submittedNotes');
    let submittedNotes;

    try {
        submittedNotes = storedNotes ? JSON.parse(storedNotes) : [];
    } catch (error) {
        console.error("Error parsing storedNotes:", error);
        submittedNotes = [];
    }
    
    // Optional chaining with nullish coalescing to make it more robust
    submittedNotes = Array.isArray(submittedNotes) ? submittedNotes : [];    

    // Save content from Quill editor to localStorage
    quill.on('text-change', function () {
        localStorage.setItem('textContent', quill.root.innerHTML);
    });

    document.addEventListener('keydown', function (event) {
        // Check if Command (metaKey) + S (key = 's') is pressed
        if (event.metaKey && event.key === 's') {
            event.preventDefault();  // Prevent the default save action
    
            // Place your custom save logic here, for example:
            console.log("Command + S was pressed - Default action prevented");
            
            // Call a custom save function if needed
            // customSaveFunction();
        }
    });

    // // Submit a note
    submitButton.addEventListener('click', async function () {
        const noteText = quill.root.innerHTML; // Get HTML from Quill
        if (noteText) {
            const note = {
                human_note: { note: noteText },
                date_time: new Date().toUTCString(),
            };
            submittedNotes.push(note);
            localStorage.setItem('submittedNotes', JSON.stringify(submittedNotes));
            quill.root.innerHTML = ''; // Clear editor after submission
            localStorage.setItem('textContent', '');
            const live_summary = await writeToFirestore(note);
            console.log(live_summary)
            localStorage.setItem('live_summary', live_summary);
            addNoteToSidebar(note, submittedNotes.length - 1);
            localStorage.removeItem('textContent');
            // window.location.reload();
        }
    });

    // Refresh button functionality
    refreshButton.addEventListener('click', async function () {
        console.log(localStorage.getItem('live_summary'));
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
        noteDiv.classList.add('note', 'noteHeadline'); // Apply both classes

        noteDiv.innerHTML = `<strong>${note.note_headline || 'New Note'}</strong><br>--------------------`;

        noteDiv.addEventListener('click', function () {
            localStorage.setItem('selectedNoteContent', JSON.stringify(note));
            window.location.href = 'noteView.html';
        });
        
        notesList.appendChild(noteDiv);
    }

    submittedNotes.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));
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
// const HOSTNAME = 'http://localhost:8080';

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

        if (!response.ok) {
            console.error('Failed to write to Firestore:', response.status, response.statusText);
            return null; // Return null or handle the error as needed
        }

        const data = await response.json();  // Correctly parse the JSON response
        console.log(data);
        console.log("TEST ")
        return data.message;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function readFromFirestore() {
    const authToken = await getOAuthToken();
    console.log(authToken);
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
