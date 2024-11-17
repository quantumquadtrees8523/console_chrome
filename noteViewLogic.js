document.addEventListener('DOMContentLoaded', function () {
    const noteContentElement = document.getElementById('noteContent');
    const noteContent = localStorage.getItem('selectedNoteContent');

    if (noteContent) {
        noteContentElement.innerHTML = `
            <div class="note-section">${noteContent}</div>`;
    } else {
        noteContentElement.textContent = "No content found.";
    }
});
