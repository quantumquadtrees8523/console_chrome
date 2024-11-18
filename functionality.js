document.addEventListener('DOMContentLoaded', function () {
    const submitButton = document.getElementById('submitButton');
    const refreshButton = document.getElementById('refreshButton');
    const feedbackButton = document.getElementById('feedbackButton');
    const notesList = document.getElementById('notesList');

    const authButton = document.getElementById('authButton');
    const logoutButton = document.getElementById('logoutButton');

    // Attach event listeners
    authButton.addEventListener('click', handleLogin);
    logoutButton.addEventListener('click', handleLogout);

    async function checkAuthToken() {
        try {
            const token = await getOAuthToken();
            if (token) {
                // User is logged in
                authButton.style.display = 'none';
                logoutButton.style.display = 'inline-block';
            }
        } catch (error) {
            if (error.message === 'OAuth token required') {
                // User is not logged in
                authButton.style.display = 'inline-block';
                logoutButton.style.display = 'none';
            }
        }
    }

    async function handleLogin() {
        try {
            const token = await getOAuthToken();
            if (token) {
                console.log('Logged in successfully:', token);
                authButton.style.display = 'none';
                logoutButton.style.display = 'inline-block';
                window.location.reload(); // Optional: Reload to fetch data after login
            }
        } catch (error) {
            console.error('Login failed:', error);
        }
    }

    async function handleLogout() {
        chrome.identity.removeCachedAuthToken({ token: await getOAuthToken() }, function () {
            if (chrome.runtime.lastError) {
                console.error('Logout error:', chrome.runtime.lastError);
            } else {
                console.log('Logged out successfully');
                authButton.style.display = 'inline-block';
                logoutButton.style.display = 'none';
                window.location.reload(); // Optional: Reload to reset the app state
            }
        });
    }

    // Check initial authentication state
    checkAuthToken();
    
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
        }).catch(error => {
            if (error.message === 'OAuth token required') {
                promptForAuth();
            }
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
            try {
                submittedNotes.push(note);
                localStorage.setItem('submittedNotes', JSON.stringify(submittedNotes));
                quill.root.innerHTML = ''; // Clear editor after submission
                localStorage.setItem('textContent', JSON.stringify({content: '', timestamp: null}));
                displayNotesPage(1); // Reset to first page after new submission
                localStorage.removeItem('textContent');
                
                const live_summary = await writeToFirestore(note);
                if (live_summary === 'undefined' || live_summary.includes('429 Online prediction request quota exceeded for gemini-1.5-flash')) {
                    localStorage.setItem('live_summary', await getLatestSummary())
                } else {
                    localStorage.setItem('live_summary', live_summary);
                }
                window.location.reload();
            } catch (error) {
                if (error.message === 'OAuth token required') {
                    promptForAuth();
                }
            }
        }
    });

    authButton.addEventListener('click', function() {
        promptForAuth();
    });

    // Refresh button functionality
    refreshButton.addEventListener('click', async function () {
        try {
            const notesFromFirestore = await readFromFirestore();
            localStorage.setItem('submittedNotes', JSON.stringify(notesFromFirestore.notes));
            const latest_summary = await getLatestSummary();
            localStorage.setItem('live_summary', latest_summary);
            notesList.innerHTML = ''; // Clear current notes
            displayNotesPage(1); // Reset to first page after refresh
            window.location.reload();
        } catch (error) {
            if (error.message === 'OAuth token required') {
                promptForAuth();
            }
        }
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
            localStorage.setItem('selectedNoteContent', note.human_note);
            window.location.href = 'noteView.html';
        });
        notesList.appendChild(noteDiv);
    }

    // Pagination functions
    function createPaginationControls(totalPages, currentPage) {
        const paginationDiv = document.createElement('div');
        paginationDiv.classList.add('pagination');
        
        // Previous button
        if (currentPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Previous';
            prevButton.addEventListener('click', () => displayNotesPage(currentPage - 1));
            paginationDiv.appendChild(prevButton);
        }
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', () => displayNotesPage(i));
            paginationDiv.appendChild(pageButton);
        }
        
        // Next button
        if (currentPage < totalPages) {
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Next';
            nextButton.addEventListener('click', () => displayNotesPage(currentPage + 1));
            paginationDiv.appendChild(nextButton);
        }
        
        return paginationDiv;
    }

    function displayNotesPage(pageNumber) {
        const notesPerPage = 50;
        const startIndex = (pageNumber - 1) * notesPerPage;
        const endIndex = startIndex + notesPerPage;
        
        notesList.innerHTML = ''; // Clear current notes
        
        const paginatedNotes = submittedNotes.slice(startIndex, endIndex);
        paginatedNotes.forEach((note, index) => {
            addNoteToSidebar(note, startIndex + index);
        });
        
        // Add pagination controls
        const totalPages = Math.ceil(submittedNotes.length / notesPerPage);
        const paginationControls = createPaginationControls(totalPages, pageNumber);
        notesList.appendChild(paginationControls);
    }

    submittedNotes.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));
    // Initial display of first page
    displayNotesPage(1);

    // Refresh the page when it becomes visible
    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
            try {
                localStorage.setItem('submittedNotes', []);
                const notesFromFirestore = await readFromFirestore();
                localStorage.setItem('submittedNotes', JSON.stringify(notesFromFirestore.notes));
                window.location.reload();
            } catch (error) {
                if (error.message === 'OAuth token required') {
                    promptForAuth();
                }
            }
        }
    });
});

const HOSTNAME = 'https://us-central1-jarvis-8ce89.cloudfunctions.net';
// const HOSTNAME = 'http://localhost:8080';

async function getLatestSummary() {
    try {
        const authToken = await getOAuthToken();
        const response = await fetch(`${HOSTNAME}/get_latest_summary`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Failed to read latest summary:', response.status, response.statusText);
            return null;
        }
        const data = await response.json();
        return data.summary;
    } catch (error) {
        console.error('Error:', error);
        if (error.message === 'OAuth token required') {
            throw error;
        }
    }
}

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
            return null;
        }
        const data = await response.json();
        return data.message;
    } catch (error) {
        console.error('Error:', error);
        if (error.message === 'OAuth token required') {
            throw error;
        }
    }
}

async function readFromFirestore() {
    try {
        const authToken = await getOAuthToken();
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
        if (error.message === 'OAuth token required') {
            throw error;
        }
        return [];
    }
}

function promptForAuth() {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
        if (chrome.runtime.lastError) {
            console.error('Auth error:', chrome.runtime.lastError);
            // Handle auth error (e.g., show error message to user)
        } else if (!token) {
            console.error('No token received');
            // Handle missing token
        } else {
            window.location.reload(); // Refresh page after successful auth
        }
    });
}

function getOAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, function(token) {
            if (chrome.runtime.lastError || !token) {
                reject(new Error('OAuth token required'));
            } else {
                resolve(token);
            }
        });
    });
}
