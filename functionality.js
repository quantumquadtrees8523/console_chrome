document.addEventListener('DOMContentLoaded', function () {
    const textarea = document.getElementById('markdown');
    const submitButton = document.getElementById('submitButton');
    const sidebar = document.getElementById('sidebar');
    const notesList = document.getElementById('notesList');

    // Load saved content from local storage
    textarea.value = localStorage.getItem('textContent') || '';
    const submittedNotes = JSON.parse(localStorage.getItem('submittedNotes')) || [];

    // Save content to local storage every time it changes
    textarea.addEventListener('input', function () {
        localStorage.setItem('textContent', textarea.value);
    });

    // Functionality to submit a note
    submitButton.addEventListener('click', function () {
        const noteText = textarea.value.trim();
        if (noteText) {
            submittedNotes.push(noteText);
            localStorage.setItem('submittedNotes', JSON.stringify(submittedNotes));
            addNoteToSidebar(noteText, submittedNotes.length - 1);
            textarea.value = ''; // Clear the textarea after submission
            localStorage.removeItem('textContent');
        }
    });

    // Add notes to the sidebar
    function addNoteToSidebar(noteText, index) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note';
        noteDiv.textContent = 'Note ' + (index + 1);
        noteDiv.addEventListener('click', function () {
            // Store selected note's content in localStorage
            localStorage.setItem('selectedNoteContent', noteText);
            // Open a new tab to display the selected note in read-only mode
            window.open('noteView.html', '_blank');
        });
        notesList.appendChild(noteDiv);
    }

    // Load submitted notes on page load
    submittedNotes.forEach((note, index) => {
        addNoteToSidebar(note, index);
    });
});
