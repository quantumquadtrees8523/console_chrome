document.addEventListener('DOMContentLoaded', function () {
    const submitButton = document.getElementById('submitButton');
    const refreshButton = document.getElementById('refreshButton');
    const feedbackButton = document.getElementById('feedbackButton');
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

    let liveSummary = localStorage.getItem('live_summary');
    if (!liveSummary) {
        liveSummary = 'No summary available.'
    }
    
    summaryCanvas.innerHTML = marked.parse(liveSummary);
    
    // Load saved content and timestamp from localStorage
    const savedContentData = JSON.parse(localStorage.getItem('textContent') || '{"content":"", "timestamp":null}');
    const currentTime = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // Check if content is older than 24 hours
    if (savedContentData.content && savedContentData.timestamp && (currentTime - savedContentData.timestamp > ONE_DAY)) {
        // Content is old, submit it and clear
        const note = {
            human_note: { note: savedContentData.content },
            date_time: new Date().toUTCString(),
        };
        writeToFirestore(note).then(live_summary => {
            if (live_summary) {
                localStorage.setItem('live_summary', live_summary);
            }
            // Clear the editor and stored content
            quill.root.innerHTML = '';
            localStorage.setItem('textContent', JSON.stringify({content: '', timestamp: null}));
        });
    } else {
        // Load the saved content if it exists and isn't too old
        quill.root.innerHTML = savedContentData.content;
    }

    // Load submitted notes from localStorage
    const storedNotes = localStorage.getItem('submittedNotes');
    let submittedNotes;

    try {
        submittedNotes = storedNotes !== undefined && storedNotes !== null ? JSON.parse(storedNotes) : [];
    } catch (error) {
        console.error("Error parsing storedNotes:", error);
        submittedNotes = [];
    }
    
    // Optional chaining with nullish coalescing to make it more robust
    submittedNotes = Array.isArray(submittedNotes) ? submittedNotes : [];    

    // Save content from Quill editor to localStorage with timestamp
    quill.on('text-change', function () {
        localStorage.setItem('textContent', JSON.stringify({
            content: quill.root.innerHTML,
            timestamp: Date.now()
        }));
    });

    document.addEventListener('keydown', function (event) {
        if (event.metaKey && event.key === 's') {
            event.preventDefault();
        }
    });

    // // Submit a note
    submitButton.addEventListener('click', async function () {
        const noteText = String(quill.root.innerHTML).trim()
        if (noteText) {
            const note = {
                human_note: { note: noteText },
                date_time: new Date().toUTCString(),
            };
            submittedNotes.push(note);
            localStorage.setItem('submittedNotes', JSON.stringify(submittedNotes));
            quill.root.innerHTML = ''; // Clear editor after submission
            localStorage.setItem('textContent', JSON.stringify({content: '', timestamp: null}));
            addNoteToSidebar(note, submittedNotes.length - 1);
            localStorage.removeItem('textContent');
            const live_summary = await writeToFirestore(note);
            localStorage.setItem('live_summary', live_summary);
            window.location.reload();
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

    feedbackButton.addEventListener('click', function() {
        window.open("https://forms.gle/fNTzp3f6yy41GJLUA", "_blank")
    })

    // Add note to the sidebar
    function addNoteToSidebar(note, index) {
        const noteDiv = document.createElement('div');
        noteDiv.classList.add('note', 'noteHeadline'); // Apply both classes

        noteDiv.innerHTML = `<strong>${note.note_headline || 'New Note'}</strong><br>--------------------`;

        noteDiv.addEventListener('click', function () {
            console.log(note);
            localStorage.setItem('selectedNoteContent', note.human_note);
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
        return data.message;
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
