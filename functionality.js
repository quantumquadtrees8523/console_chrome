document.addEventListener('DOMContentLoaded', function () {
    const HOSTNAME = 'http://localhost:8080' //https://us-central1-jarvis-8ce89.cloudfunctions.net';

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
            try {
                const [notesFromFirestore, latestSummary] = await Promise.all([
                    NetworkManager.request(`${HOSTNAME}/get_from_firestore`),
                    NetworkManager.request(`${HOSTNAME}/get_latest_summary`)
                ]);
                CacheManager.set('submittedNotes', notesFromFirestore.notes || []);
                CacheManager.set('live_summary', latestSummary.summary || 'No summary available');
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


    const submitButton = document.getElementById('submitButton');
    const refreshButton = document.getElementById('refreshButton');
    const feedbackButton = document.getElementById('feedbackButton');
    const notesList = document.getElementById('notesList');
    const summaryCanvas = document.getElementById('summaryCanvas');
    const dailyDigestButton = document.getElementById('dailyDigestButton');
    // const calendarEventsButton = document.getElementById('calendarEventsButton');
    // const amazonPurchasesButton = document.getElementById('amazonPurchasesButton');
    // const financialSummariesButton = document.getElementById('financialSummariesButton');
    
    // Add click handlers for new buttons
    dailyDigestButton.addEventListener('click', async () => {
        console.log("SENDING REQUEST");
        localStorage.setItem('pageTitle', 'Daily Digest');
        localStorage.setItem('selectedNoteContent', 'loading daily digest...');
        window.location.href = 'noteView.html';
    });

    // calendarEventsButton.addEventListener('click', () => {
    //     localStorage.setItem('pageTitle', 'Created Calendar Events');
    //     window.location.href = 'contentPage.html';
    // });

    // amazonPurchasesButton.addEventListener('click', () => {
    //     localStorage.setItem('pageTitle', 'Suggested Amazon Purchases');
    //     window.location.href = 'contentPage.html';
    // });

    // financialSummariesButton.addEventListener('click', () => {
    //     localStorage.setItem('pageTitle', 'Financial Summaries');
    //     window.location.href = 'contentPage.html';
    // });
    
    // Submission Status
    const loadingState = document.createElement('div');
    loadingState.id = 'loadingState';
    loadingState.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 10px; border-radius: 5px; display: none; background-color: black; color: white;';
    document.body.appendChild(loadingState);

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
        let liveSummary = CacheManager.get('live_summary') || 'No summary available.';
        summaryCanvas.innerHTML = marked.parse(liveSummary);
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
            const notesPerPage = 10;
            const startIndex = (pageNumber - 1) * notesPerPage;
            const endIndex = startIndex + notesPerPage;
            
            notesList.innerHTML = '';
            
            const paginatedNotes = submittedNotes.slice(startIndex, endIndex);
            paginatedNotes.forEach((note, index) => {
                const noteDiv = document.createElement('div');
                noteDiv.classList.add('note', 'noteHeadline');
                const truncatedNote = (note.note_headline || note.human_note.note).substring(0, 100);
                noteDiv.innerHTML = `<strong>${truncatedNote}${truncatedNote.length === 100 ? '...' : ''}</strong><br>--------------------`;
                noteDiv.addEventListener('click', () => {
                    localStorage.setItem('selectedNoteContent', note.human_note.note ? note.human_note.note : note.human_note);
                    localStorage.setItem('pageTitle', note.note_headline);
                    window.location.href = 'noteView.html';
                });
                notesList.appendChild(noteDiv);
            });

            // Pagination controls
            const totalPages = Math.ceil(submittedNotes.length / notesPerPage);
            const paginationControls = createPaginationControls(pageNumber, totalPages, displayNotesPage);
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
        }, 100));
    }

    // Modify submit button handler
    submitButton.addEventListener('click', debounce(async function () {
        const noteText = String(quill.root.innerHTML).trim();
        if (noteText) {
            const note = {
                human_note: { note: noteText },
                date_time: new Date().toUTCString(),
            };
            try {
                loadingState.style.display = 'block';
                loadingState.style.backgroundColor = '#ffd700';
                loadingState.style.color = 'black';
                loadingState.textContent = 'Sending note...';
    
                quill.root.innerHTML = '';
                CacheManager.clear('textContent');
                
                const submittedNotes = CacheManager.get('submittedNotes') || [];
                submittedNotes.push(note);
                CacheManager.set('submittedNotes', submittedNotes);
                
                const result = await NetworkManager.request(`${HOSTNAME}/write_to_firestore`, {
                    method: 'POST',
                    body: JSON.stringify({
                        note: noteText,
                        timestamp: Date.now()
                    })
                });
    
                loadingState.style.backgroundColor = '#90EE90';
                loadingState.textContent = 'Note saved!';
                
                const latestSummary = await NetworkManager.request(`${HOSTNAME}/get_latest_summary`);
                if (latestSummary) {
                    CacheManager.set('live_summary', latestSummary.summary || 'No summary available');
                }
                
                setTimeout(() => {
                    loadingState.style.display = 'none';
                    window.location.reload();
                }, 1000);
    
            } catch (error) {
                console.error(error);
                loadingState.style.backgroundColor = '#FF0000';
                loadingState.textContent = 'Error saving note';
                
                if (error.message === 'OAuth token required') {
                    promptForAuth();
                }
                
                setTimeout(() => loadingState.style.display = 'none', 3000);
            }
        }
    }, 300));

    refreshButton.addEventListener('click', debounce(async function () {
        await BackgroundSync.syncData();
        window.location.reload()
    }, 300));

    feedbackButton.addEventListener('click', () => {
        window.open("https://forms.gle/fNTzp3f6yy41GJLUA", "_blank");
    });

    // Background Sync Initialization
    BackgroundSync.setupPeriodicSync();
    // Initialize the application
    initializeApp();

    document.addEventListener('visibilitychange', async function() {
        if (document.visibilityState === 'visible') {
            window.location.reload();
        }
    });
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
function createPaginationControls(currentPage, totalPages, onPageChange) {
    const paginationContainer = document.createElement('div');
    paginationContainer.style.position = 'fixed';
    paginationContainer.style.bottom = '20px';
    // paginationContainer.style.left = '20px';
    // paginationContainer.style.width = '360px'; // 400px sidebar - 40px padding
    // paginationContainer.style.backgroundColor = 'var(--bg-secondary)';
    // paginationContainer.style.padding = '10px';
    // paginationContainer.style.borderTop = '1px solid var(--border-color)';
    
    const paginationDiv = document.createElement('div');
    paginationDiv.classList.add('pagination');
    
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    if (currentPage > 1) {
        prevButton.addEventListener('click', () => onPageChange(currentPage - 1));
    } else {
        prevButton.disabled = true;
        prevButton.style.opacity = '0.5';
        prevButton.style.cursor = 'not-allowed';
    }
    paginationDiv.appendChild(prevButton);

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    if (currentPage < totalPages) {
        nextButton.addEventListener('click', () => onPageChange(currentPage + 1));
    } else {
        nextButton.disabled = true;
        nextButton.style.opacity = '0.5';
        nextButton.style.cursor = 'not-allowed';
    }
    paginationDiv.appendChild(nextButton);

    const pageText = document.createElement('span');
    pageText.id = 'paginationText';
    pageText.textContent = `p ${currentPage} / ${totalPages}`;
    paginationDiv.appendChild(pageText);
    
    paginationContainer.appendChild(paginationDiv);
    return paginationContainer;
}