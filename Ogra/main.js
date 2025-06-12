        
        
        
        //storage check for dark mode
        // document.addEventListener('DOMContentLoaded', () => {
            if (localStorage.getItem('darkMode') === 'enabled') {
                document.querySelector("html").classList.add('dark-mode');
                // document.querySelector("html").classList.add("no-transition");
                // document.querySelector("html").classList.remove("no-transition");
                
            } else {
                document.querySelector("html").classList.remove('dark-mode');
                
            }
        //     // creating routes
        // if(window.location.pathname === '/Ogra/'){
        
        //     // load index.html
        //     fetch('index.html')
        //         .then(response => response.text())
        //         .then(html => {
        //             document.querySelector('.content').innerHTML = html;
        //         })
        //         .catch(error => console.error('Error loading index.html:', error));
        // }
        // else if(window.location.pathname === '/Ogra/trip'){
        //     // load trip.html
        //     fetch('trip.html')
        //         .then(response => response.text())
        //         .then(html => {
        //             document.querySelector('.content').innerHTML = html;
        //         })
        //         .catch(error => console.error('Error loading trip.html:', error));
        // }
        // });

        