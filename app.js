// document.addEventListener("DOMContentLoaded", () => {
//     const choose = document.querySelector('.choose');
//     const chooseVehicle = document.querySelector('.choose-vehicle');

//     // Initial state: hidden and off-screen
//     choose.classList.remove('show');

//     function showChoose() {
//         choose.classList.add('show');
//     }

//     function hideChoose() {
//         choose.classList.remove('show');
//         // Remove #choose from URL without reloading
//         if (window.location.hash === "#choose") {
//             history.pushState("", document.title, window.location.pathname + window.location.search);
//         }
//     }

//     function handleHash() {
//         if (window.location.hash === "#choose") {
//             showChoose();
//         } else {
//             hideChoose();
//         }
//     }

//     window.addEventListener('hashchange', handleHash);
//     window.addEventListener('popstate', handleHash);
//     handleHash();

//     // Hide when clicking outside choose-vehicle
//     choose.addEventListener('mousedown', (e) => {
//         if (!chooseVehicle.contains(e.target)) {
//             hideChoose();
//         }
//     });
// });