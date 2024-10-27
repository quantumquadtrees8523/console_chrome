// Load the selected note's content from localStorage
document.addEventListener('DOMContentLoaded', function () {
    const noteContentElement = document.getElementById('noteContent');
    const noteContent = localStorage.getItem('selectedNoteContent');
    if (noteContent) {
        console.log(noteContent);
        noteContentElement.textContent = noteContent;
    } else {
        noteContentElement.textContent = "No content found.";
    }
});