document.addEventListener('DOMContentLoaded', function () {
    const HOSTNAME = 'https://us-central1-jarvis-8ce89.cloudfunctions.net';

    // Performance Utility Functions
    const throttle = (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

    const debounce = (func, delay) => {
        let debounceTimer;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    };

    // Advanced Caching Mechanism
    const CacheManager = {
        get: (key) => {
            const cached = localStorage.getItem(key);
            try {
                return cached ? JSON.parse(cached) : null;
            } catch {
                return null;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error('Cache write error:', error);
            }
        },
        clear: (key) => {
            localStorage.removeItem(key);
        }
    };

    // Optimized Network Request Manager
    const NetworkManager = {
        async request(url, options = {}) {
            const defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            try {
                const authToken = await getOAuthToken();
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

    // Optimized Background Sync Manager
    const BackgroundSync = {
        async syncData() {
            console.log("background sync data");
            try {
                const [notesFromFirestore, latestSummary] = await Promise.all([
                    NetworkManager.request(`${HOSTNAME}/get_from_firestore`),
                    NetworkManager.request(`${HOSTNAME}/get_latest_summary`)
                ]);
                console.log(1);
                CacheManager.set('submittedNotes', notesFromFirestore.notes || []);
                console.log(2);
                CacheManager.set('live_summary', latestSummary.summary || 'No summary available');
                console.log(3);
                return { notes: notesFromFirestore.notes, summary: latestSummary.summary };
            } catch (error) {
                console.error('Background sync failed:', error);
                return null;
            }
        },

        setupPeriodicSync() {
            let attempts = 0;
            const maxAttempts = 5;
            const baseDelay = 5000;

            const attemptSync = () => {
                this.syncData()
                    .catch(() => {
                        if (attempts < maxAttempts) {
                            const delay = baseDelay * Math.pow(2, attempts);
                            attempts++;
                            setTimeout(attemptSync, delay);
                        }
                    });
            };

            chrome.alarms.create('backgroundSync', {
                periodInMinutes: 30
            });

            chrome.alarms.onAlarm.addListener((alarm) => {
                if (alarm.name === 'backgroundSync') {
                    attemptSync();
                }
            });
        }
    };

    // Initialize key DOM elements
    const submitButton = document.getElementById('submitButton');
    const refreshButton = document.getElementById('refreshButton');
    const feedbackButton = document.getElementById('feedbackButton');
    const notesList = document.getElementById('notesList');
    const summaryCanvas = document.getElementById('summaryCanvas');
    
    // Initialize Quill editor with Markdown support
    const quill = new Quill('#editor-container', {
        theme: 'snow',
        modules: {
            toolbar: false
        }
    });

    // Markdown support for Quill
    const quillMarkdownOptions = {};
    new QuillMarkdown(quill, quillMarkdownOptions);

    // Initial data loading and setup
    function initializeApp() {
        // Load live summary
        console.log("HERE");
        let liveSummary = CacheManager.get('live_summary') || 'No summary available.';
        summaryCanvas.innerHTML = marked.parse(liveSummary);
        console.log("HERE");
        // Load and validate submitted notes
        let submittedNotes = CacheManager.get('submittedNotes') || [];
        submittedNotes = Array.isArray(submittedNotes) ? submittedNotes : [];
        submittedNotes.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));

        // Load saved content
        const savedContentData = CacheManager.get('textContent') || {content: '', timestamp: null};
        const currentTime = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;

        // Content management logic
        if (savedContentData.content && savedContentData.timestamp && 
            (currentTime - savedContentData.timestamp > ONE_DAY)) {
            // Old content handling
            const note = {
                human_note: { note: savedContentData.content },
                date_time: new Date().toUTCString(),
            };
            
            NetworkManager.request(`${HOSTNAME}/write_to_firestore`, {
                method: 'POST',
                body: JSON.stringify({
                    note: note.human_note.note,
                    timestamp: Date.now()
                })
            }).then(response => {
                console.log(response.live_summary);
                if (response.live_summary) {
                    CacheManager.set('live_summary', response.live_summary);
                }
                quill.root.innerHTML = '';
                CacheManager.set('textContent', {content: '', timestamp: null});
            }).catch(promptForAuth);
        } else {
            quill.root.innerHTML = savedContentData.content || '';
        }

        // Display notes with pagination
        function displayNotesPage(pageNumber) {
            const notesPerPage = 50;
            const startIndex = (pageNumber - 1) * notesPerPage;
            const endIndex = startIndex + notesPerPage;
            
            notesList.innerHTML = '';
            
            const paginatedNotes = submittedNotes.slice(startIndex, endIndex);
            paginatedNotes.forEach((note, index) => {
                const noteDiv = document.createElement('div');
                noteDiv.classList.add('note', 'noteHeadline');
                noteDiv.innerHTML = `<strong>${note.note_headline || 'New Note'}</strong><br>--------------------`;
                noteDiv.addEventListener('click', () => {
                    localStorage.setItem('selectedNoteContent', note.human_note);
                    window.location.href = 'noteView.html';
                });
                notesList.appendChild(noteDiv);
            });

            // Pagination controls
            const totalPages = Math.ceil(submittedNotes.length / notesPerPage);
            const paginationControls = createPaginationControls(totalPages, pageNumber);
            notesList.appendChild(paginationControls);
        }

        // Initial page display
        displayNotesPage(1);

        // Auto-save content
        quill.on('text-change', throttle(() => {
            CacheManager.set('textContent', {
                content: quill.root.innerHTML,
                timestamp: Date.now()
            });
        }, 500));
    }

    // Event Listeners with Performance Optimizations
    submitButton.addEventListener('click', debounce(async function () {
        const noteText = String(quill.root.innerHTML).trim();
        if (noteText) {
            const note = {
                human_note: { note: noteText },
                date_time: new Date().toUTCString(),
            };

            try {
                const result = await NetworkManager.request(`${HOSTNAME}/write_to_firestore`, {
                    method: 'POST',
                    body: JSON.stringify({
                        note: noteText,
                        timestamp: Date.now()
                    })
                });

                // Update local storage efficiently
                const submittedNotes = CacheManager.get('submittedNotes') || [];
                submittedNotes.push(note);
                CacheManager.set('submittedNotes', submittedNotes);
                
                // Clear editor and reset
                quill.root.innerHTML = '';
                CacheManager.clear('textContent');
                
                // Optionally handle summary
                if (result.live_summary) {
                    CacheManager.set('live_summary', result.live_summary);
                }

                window.location.reload();
            } catch (error) {
                if (error.message === 'OAuth token required') {
                    promptForAuth();
                }
            }
        }
    }, 300));

    refreshButton.addEventListener('click', debounce(async function () {
        await BackgroundSync.syncData();
        // window.location.reload()
    }, 300));

    feedbackButton.addEventListener('click', () => {
        window.open("https://forms.gle/fNTzp3f6yy41GJLUA", "_blank");
    });

    // Background Sync Initialization
    BackgroundSync.setupPeriodicSync();
    // Initialize the application
    initializeApp();
});

// OAuth and Authentication Utilities
function promptForAuth() {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
        if (chrome.runtime.lastError) {
            console.error('Auth error:', chrome.runtime.lastError);
        } else if (!token) {
            console.error('No token received');
        } else {
            window.location.reload();
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

// Utility: Pagination Controls
function createPaginationControls(totalPages, currentPage) {
    const paginationDiv = document.createElement('div');
    paginationDiv.classList.add('pagination');
    
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.addEventListener('click', () => displayNotesPage(currentPage - 1));
        paginationDiv.appendChild(prevButton);
    }
    
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => displayNotesPage(i));
        paginationDiv.appendChild(pageButton);
    }
    
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.addEventListener('click', () => displayNotesPage(currentPage + 1));
        paginationDiv.appendChild(nextButton);
    }
    
    return paginationDiv;
}