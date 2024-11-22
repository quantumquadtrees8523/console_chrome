// Shape of notes: 
// date_time: 'Sun, 17 Nov 2024 02:04:04 GMT', google_user_id: '102049077090928333881', human_note: '<p>test </p>', note_headline: 'This is a short test.\n'}
// date_time
// : 
// "Sun, 17 Nov 2024 02:04:04 GMT"
// google_user_id
// : 
// "102049077090928333881"
// human_note
// : 
// "<p>test </p>"
// note_headline
// : 
// "This is a short test.\n"

const HOSTNAME = 'http://localhost:8080'
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

document.addEventListener('DOMContentLoaded', async function () {
    const noteContentElement = document.getElementById('noteContent');
    const noteContent = localStorage.getItem('selectedNoteContent');
    const pageTitle = localStorage.getItem('pageTitle');
    
    console.log(noteContent);
    
    if (pageTitle === 'Daily Digest') {
        noteContentElement.innerHTML = `
            <div class="note-section">Loading daily digest...</div>`;
            
        try {
            // Check if we have a cached digest from today
            const cachedDigest = localStorage.getItem('dailyDigest');
            const lastDigestDate = localStorage.getItem('dailyDigestDate');
            const today = new Date().toDateString();

            let digestMessage;
            
            if (cachedDigest && lastDigestDate === today) {
                // Use cached digest if from today
                digestMessage = cachedDigest;
            } else {
                // Fetch new digest and cache it
                const daily_digest = await NetworkManager.request(`${HOSTNAME}/get_daily_digest`);
                digestMessage = daily_digest['message'];
                localStorage.setItem('dailyDigest', digestMessage);
                localStorage.setItem('dailyDigestDate', today);
            }

            localStorage.setItem('selectedNoteContent', digestMessage);
            const htmlContent = marked.parse(digestMessage);
            noteContentElement.innerHTML = `
                <div class="note-section">${htmlContent}</div>`;
        } catch (error) {
            console.error('Error fetching daily digest:', error);
            noteContentElement.innerHTML = `
                <div class="note-section">Error loading daily digest</div>`;
        }
    } else if (noteContent) {
        const htmlContent = marked.parse(noteContent);
        noteContentElement.innerHTML = `
            <div class="note-section">${htmlContent}</div>`;
    } else {
        noteContentElement.textContent = "No content found.";
    }
});

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
