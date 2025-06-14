// Wait for the DOM to be fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    // --- DOM ELEMENTS ---
    let lastSelectedSeat = null;
    const seats_container = document.querySelector(".seats-container");
    // let seats = document.querySelectorAll('.card-seat:not(.driver, .add)');
    const input = document.querySelector('input[name="fare"]');
    const less_btns = document.querySelectorAll('.less');
    const more_btns = document.querySelectorAll('.more');
    const menu = document.querySelector('.menu');
    const backdrop = document.querySelector('.backdrop');
    const close = document.querySelector('.close');
    const amounts = document.querySelectorAll(".menu-modal .content .modal-body>div:not(.close) .number");
    const add_btn = document.querySelector('.add');
    const collected_amount_btn = document.querySelector('.collected-div');
    const collected_amount_display = document.querySelector('.collected-amount');
    const collected_details_div = document.querySelector(".collected-details");
    const details_displayed = document.querySelectorAll(".bill .count");
    const add_seat = document.querySelector(".card-seat.add");
    const select = document.querySelector("select");
    let seats;
    
    // --- CONSTANTS ---
    const money_values = [0.25, 0.5, 1, 5, 10, 20, 50, 100, 200];

    // --- STATE ---
    let seat_change_needs = [];
    let suggestedSeats = new Set();
    let tapTimeout = null;
    let coins_to_give_per_seat = [];
    const imgs = ["quarter.png", "half.png", "1.png", "5.png", "10.png", "20.png", "50.png", "100.png", "200.png"]
    // --- LOCAL STORAGE SAVE/LOAD FUNCTIONS ---

    // Save the current trip state to localStorage
    function saveTripToLocalStorage() {
        // Gather seat data
        const seatData = Array.from(seats).map(seat => ({
            money: seat.dataset.money, // e.g. "0,1,0,0,0,0,0,0,0"
            classes: Array.from(seat.classList), // to know enabled/disabled
            paid: seat.childNodes[0]?.textContent || "0", // amount paid
        }));

        // Get fare value
        const fare = input.value;
        
        // Get collected amount (from UI)
        const collectedAmount = collected_amount_display.textContent;

        // Get change details (from UI)
        const changeDetails = Array.from(details_displayed).map(el => el.textContent);

        // Get trip type (number of seats)
        const tripType = seats.length;

        // Get selected option in select element
        const selectedOption = select.value;

        // Get date
        const date = new Date().toISOString();

        // Get total collected change in denominations
        const totalChangeArray = get_total_available_change();
        const totalChange = {
            total: change_to_money(totalChangeArray).total,
            denominations: totalChangeArray
        };

        // Compose trip object
        let trip = {
            seatData,
            fare,
            collectedAmount,
            changeDetails,
            tripType,
            selectedOption,
            date,
            totalChange
        };

        // Use an index to identify the current trip (based on a unique key)
        let tripIndex = localStorage.getItem("ogra_trip_index");
        if (!tripIndex) {
            tripIndex = Date.now().toString();
            localStorage.setItem("ogra_trip_index", tripIndex);
        }
        trip.index = tripIndex;

        // Get existing trips from localStorage
        let trips = [];
        try {
            trips = JSON.parse(localStorage.getItem("ogra_trips")) || [];
        } catch (e) {
            trips = [];
        }

        // Check if trip with this index exists, update it, else push new
        const existingIndex = trips.findIndex(t => t.index === tripIndex);
        if (existingIndex !== -1) {
            trips[existingIndex] = trip;
        } else {
            trips.push(trip);
        }

        // Save back to localStorage
        localStorage.setItem("ogra_trips", JSON.stringify(trips));
    }

    // // Load a trip from localStorage by index (for use in index page)
    // function loadTripFromLocalStorage(index) {
    //     let trips = [];
    //     try {
    //         trips = JSON.parse(localStorage.getItem("ogra_trips")) || [];
    //     } catch (e) {
    //         trips = [];
    //     }
    //     if (!trips[index]) return;

    //     const trip = trips[index];

    //     // Remove existing seats except driver, add, and explain
    //     document.querySelectorAll('.seats-container div:not(.add)').forEach(seat => seat.remove());

    //     // Restore seats
    //     trip.seatData.forEach(seatInfo => {
    //         const new_seat = document.createElement("div");
    //         seatInfo.classes.forEach(cls => new_seat.classList.add(cls));
    //         new_seat.dataset.money = seatInfo.money;
    //         const span = document.createElement("span");
    //         new_seat.appendChild(span);
    //         seats_container.insertBefore(new_seat, add_btn);
    //     });

    //     // Restore fare
    //     input.value = trip.fare;

    //     // Restore collected amount (UI only)
    //     collected_amount_display.textContent = trip.collectedAmount;

    //     // Restore change details (UI only)
    //     details_displayed.forEach((el, i) => {
    //         el.textContent = trip.changeDetails[i] || "0";
    //     });

    //     seats = document.querySelectorAll('.card-seat:not(.driver, .add, .explain)');
    //     update_seats();
    // }

    // Optionally, call saveTripToLocalStorage() after any major change
    // For example, after updating seats or fare:
    // saveTripToLocalStorage();

    // Example: Save trip when user clicks a "Save Trip" button (add this button in your HTML)
    // document.querySelector("#save-trip-btn").addEventListener("click", saveTripToLocalStorage);

    // You can also call saveTripToLocalStorage() automatically after certain actions if desired.
    // --- UTILITY FUNCTIONS ---

    // Hide the menu and backdrop
    function hide_menu() {
        menu.classList.remove('show');
        backdrop.classList.remove('show');
    }

    // Calculate the total money value from a money array and return both total and breakdown
    function change_to_money(money_array) {
        let total = money_array.reduce((sum, count, index) => sum + count * money_values[index], 0);
        return { total, breakdown: money_array.map((count, index) => ({ count, value: money_values[index] })) };
    }

    // Get the total available change from all seats
    function get_total_available_change() {
        let money_arrays = Array.from(seats).map(s => s.dataset.money.split(',').map(Number));
        let total = new Array(money_values.length).fill(0);
        money_arrays.forEach(array => {
            array.forEach((val, i) => total[i] += val);
        });
        return total;
    }
    function update_seats()
    {
        // --- SEAT EVENTS ---
        seats.forEach((seat, i) => {

            // Remove all previous event listeners by cloning (quick workaround)
            const newSeat = seat.cloneNode(true);
            if (seat.parentNode) {
                seat.parentNode.replaceChild(newSeat, seat);
                seat = newSeat;
            }

            // Long press to confirm suggestion (mouse)
            seat.addEventListener('mousedown', function () {
                if (seat.classList.contains('disabled')) {
                    tapTimeout = setTimeout(() => {
                        seat.remove();
                        seats = document.querySelectorAll('.card-seat:not(.driver, .add, .explain)');
                        update_seats();
                    }, 600);
                    return;
                }
                if (!suggestedSeats.has(i)) return;
                tapTimeout = setTimeout(() => {
                    confirmSuggestion(i);
                }, 600);
            });
            seat.addEventListener('mouseup', () => {
                clearTimeout(tapTimeout);
            });
            seat.addEventListener('mouseleave', () => {
                clearTimeout(tapTimeout);
            });

            // Long press to confirm suggestion (touch)
            seat.addEventListener('touchstart', function () {
                if (seat.classList.contains('disabled')) {
                    tapTimeout = setTimeout(() => {
                        seat.remove();
                        seats = document.querySelectorAll('.card-seat:not(.driver, .add, .explain)');
                        update_seats();
                    }, 600);
                    return;
                }
                if (!suggestedSeats.has(i)) return;
                tapTimeout = setTimeout(() => {
                    confirmSuggestion(i);
                }, 600);
            });
            seat.addEventListener('touchend', () => {
                clearTimeout(tapTimeout);
            });
            seat.addEventListener('touchcancel', () => {
                clearTimeout(tapTimeout);
            });

            // Double click to enable/disable seat
            seat.addEventListener('dblclick', function () {
                if (seat.classList.contains('disabled')) {
                    seat.classList.remove('disabled');
                } else {
                    seat.classList.add('disabled');
                }
            });

            // Double tap to enable/disable seat (using a timer)
            let lastTap = 0;
            let db_tap;
            let tap_difference;
            seat.addEventListener('touchend', function (e) {
                const currentTime = new Date().getTime();
                tap_difference = currentTime - lastTap;
                if (currentTime - lastTap < 400) {
                    if (seat.classList.contains('disabled')) {
                        seat.classList.remove('disabled');
                    } else {
                        seat.classList.add('disabled');
                    }
                    e.preventDefault();
                    db_tap = true;
                }
                lastTap = currentTime;
            });

            // Open menu on click
            // Setup menu modal and get the show function
            const showMenuModal = setupMenuModal();

            seat.addEventListener('click', function () {

                // Wait 405ms before showing the menu modal and updating
                setTimeout(() => {
                if(tap_difference)
                {
                    if(tap_difference > 400)
                    {
                                                            if (seat.classList.contains('disabled')) return;

                seats.forEach(s => s.classList.remove('selected'));
                seat.classList.add('selected');
                lastSelectedSeat = seat;
                    if (showMenuModal && !seat.classList.contains("disabled")) showMenuModal();
                    update(seat);
                    }
                }

                }, 405);
            });

        });
        seats = document.querySelectorAll('.card-seat:not(.driver, .add, .explain)');
    }

 function setupMenuModal() {
    const menuModal = document.querySelector('.menu-modal');
    if (!menuModal) return null;
    const menuOverlay = menuModal.querySelector('.menu-overlay');
    const menuContent = menuModal.querySelector('.content');
    const menuDragIcon = menuModal.querySelector('.drag-icon');

    let isDragging = false, startY, startHeight;

    const showMenuModal = () => {
        menuModal.classList.add("show");
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
        menuContent.style.height = "50vh";
        menuModal.classList.remove("fullscreen");
    };
    const updateMenuSheetHeight = (height) => {
        menuContent.style.height = `${height}vh`;
        menuModal.classList.toggle("fullscreen", height === 100);
    };
    const hideMenuModal = () => {
        menuModal.classList.remove("show");
          document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
    };
    const dragStart = (e) => {
        isDragging = true;
        startY = e.pageY || e.touches?.[0].pageY;
        startHeight = parseInt(menuContent.style.height) || 50;
        menuModal.classList.add("dragging");
    };
    const dragging = (e) => {
        if (!isDragging) return;
        const delta = startY - (e.pageY || e.touches?.[0].pageY);
        const newHeight = startHeight + delta / window.innerHeight * 100;
        updateMenuSheetHeight(newHeight);
    };
    const dragStop = () => {
        isDragging = false;
        menuModal.classList.remove("dragging");
        const sheetHeight = parseInt(menuContent.style.height);
        sheetHeight < 25 ? hideMenuModal() : sheetHeight > 75 ? updateMenuSheetHeight(100) : updateMenuSheetHeight(50);
    };

    if (menuDragIcon) {
        menuDragIcon.addEventListener("mousedown", dragStart);
        menuDragIcon.addEventListener("touchstart", dragStart);
    }
    document.addEventListener("mousemove", dragging);
    document.addEventListener("mouseup", dragStop);
    document.addEventListener("touchmove", dragging);
    document.addEventListener("touchend", dragStop);
    if (menuOverlay) menuOverlay.addEventListener("click", hideMenuModal);

    return showMenuModal;
}

    // --- CONFIRM SUGGESTION FUNCTION ---
    function confirmSuggestion(index) {
        let seat = seats[index];
        seat.classList.remove('suggested');
        seat.classList.add('confirmed');
        seat_change_needs[index] = 0;

        // Subtract the given coins from the seat's dataset.money
        let current_money = seat.dataset.money.split(',').map(Number);
        let given = coins_to_give_per_seat[index];
        let new_money = current_money.map((val, i) => val - given[i]);
        seat.dataset.money = new_money.join(',');

        // Update the seat's display
        seat.childNodes[0].textContent = change_to_money(new_money).total;
        seat.childNodes[0].style.display = "initial";
        
            if (seat.childNodes[1] && seat.childNodes[1].nodeType === Node.ELEMENT_NODE) {
                seat.removeChild(seat.childNodes[1]);
            }
        

        // Recalculate with updated data
        calculate(get_total_available_change());
    }

    // --- MAIN UPDATE FUNCTION ---
    function update(seat) {
        console.log("Seats:", seats);
seats.forEach((s, i) => {
    console.log(`Seat ${i}:`, s.dataset.money);
});
        // Parse the seat's money data and update the menu amounts
        let money_array = seat.dataset.money.split(',').map(Number);
        amounts.forEach((amount, index) => {
            amount.textContent = money_array[index];
        });

        // Gather all seats' money arrays
        let money_arrays = Array.from(seats).map(s => s.dataset.money.split(',').map(Number));
        let total_change = new Array(money_arrays[0].length).fill(0);

        // Calculate total coins/notes available for change
        money_arrays.forEach(array => {
            array.forEach((value, index) => {
                total_change[index] += value;
            });
        });
        console.log("Total change: " + total_change);

        
        details_displayed.forEach((number, index) => {
            number.textContent = total_change[index];
            
        });
        // Update seat display with total paid
        let seat_payed = change_to_money(money_array).total;
        seat.childNodes[0].textContent = seat_payed;

        // Calculate how much change each seat needs
        seat_change_needs = new Array(seats.length).fill(0);
        if (input.value !== "") {
            let fare = parseFloat(input.value);
            seats.forEach((s, i) => {
                let paid = parseFloat(s.childNodes[0].innerText) || 0;
                let change_needed = paid - fare;
                seat_change_needs[i] = change_needed < 0 ? 0 : change_needed;
            });
            console.log("Seat change needs: " + seat_change_needs);
            calculate(total_change); // Run greedy calculation
        } else {
            input.classList.add('error');
            input.addEventListener('input', function () {
                input.classList.remove('error');
            });
        }
        
    }

    // --- GREEDY CHANGE DISTRIBUTION ---
    function calculate(total_change_array) {
        let coins_available = [...total_change_array];
        let seat_needs = [...seat_change_needs];
        suggestedSeats.clear();

        seats.forEach((seat, seatIndex) => {
            let amount_needed = seat_needs[seatIndex];
            let coins_to_give = new Array(money_values.length).fill(0);
            let temp_coins_available = [...coins_available];
            let temp_amount = amount_needed;

            // Try to give the largest denominations first
            for (let i = money_values.length - 1; i >= 0; i--) {
                let max_coins = Math.floor(temp_amount / money_values[i]);
                let coins = Math.min(max_coins, temp_coins_available[i]);
                if (coins > 0) {
                    coins_to_give[i] = coins;
                    temp_amount -= coins * money_values[i];
                    temp_coins_available[i] -= coins;
                    console.log(temp_amount + " aaaaaaaaaaaa " + Math.round(temp_amount * 100) / 100);
                }
            }

            // If full change can be given, mark as confirmed
            if (temp_amount + 1 < 0.01) {
                coins_to_give.forEach((val, i) => coins_available[i] -= val);
                coins_to_give_per_seat[seatIndex] = coins_to_give;
                seat.classList.remove('suggested');
                seat.classList.add('confirmed');
            } else if (change_to_money(coins_to_give).total > 0) {
                // Partial change is possible — suggest
                suggestedSeats.add(seatIndex);
                seat.classList.add('suggested');
                seat.classList.remove('confirmed');
                seat.childNodes[1]?.remove(); // Remove previous give div if exists
                
                let give_div = document.createElement('div');
                // denomination
                console.log(change_to_money(coins_to_give).breakdown);
                // Clear previous content
                seat.childNodes[0].style.display = "none";
                give_div.innerHTML = "";

                // For each denomination, if count > 0, show image and count
                change_to_money(coins_to_give).breakdown.forEach((item, index) => {
                    if (item.count > 0) {
                        const img = document.createElement('img');
                        img.src = "images/bills/" + imgs[index];
                        img.alt = item.value + " L.E";
                        img.style.width = "24px";
                        img.style.verticalAlign = "middle";
                        img.style.marginRight = "4px";
                        give_div.appendChild(img);

                        const span = document.createElement('span');
                        span.textContent = `x${item.count} `;
                        give_div.appendChild(span);
                    }
                });
                seat.appendChild(give_div);
            } else {
                // No change possible
                seat.classList.remove('suggested');
                seat.classList.remove('confirmed');
            }
            coins_to_give_per_seat[seatIndex] = coins_to_give;
        });

        // Log suggestions for debugging
        console.log("Suggestions:", [...suggestedSeats]);
        active_seats = seats_container.querySelectorAll(".card-seat:not(.driver, .add, .disabled")
        // Show remaining money in the UI
        collected_amount_display.textContent = "Collected: " + change_to_money(coins_available).total + "L.E / " + active_seats.length*parseFloat(input.value) + "L.E";
    }
    function generate_seats()
    {
        if(seats_num > 8)
        {
            // 3 rows
            select.selectedIndex = 1;
            for (let i = 0; i < seats_num+1; i++) {
                
                if(i != 0)
                {
                    if( i == 5)
                    {
                        
                        vacant = document.createElement("div");
                        vacant.dataset.money = "0,0,0,0,0,0,0,0,0";

                        vacant.classList.add("card-seat");
                        vacant.classList.add("disabled");
                        vacant.classList.add("layer1");
                        span = document.createElement("span");
                        vacant.appendChild(span);
                         seats_container.insertBefore(vacant, add_btn);
                         continue;
                    }
                    else
                    {
                        span = document.createElement("span");
                                            new_seat = document.createElement("div");
                                            new_seat.appendChild(span);
                    new_seat.classList.add("card-seat");
                    new_seat.classList.add("layer1");
                    new_seat.dataset.money = "0,0,0,0,0,0,0,0,0";
                    seats_container.insertBefore(new_seat, add_btn);
                    }
                }
                else
                {
                new_seat = document.createElement("div");
                new_seat.classList.add("card-seat");
                new_seat.classList.add("driver");
                new_seat.classList.add("disabled");
                new_seat.dataset.money = "0,0,0,0,0,0,0,0,0";
                seats_container.insertBefore(new_seat, add_btn);
                }

        
                
            
            }
        }
        else
        {
                        // 3 rows
                        select.selectedIndex = 0;
            for (let i = 0; i < seats_num+1; i++) {
                
                if(i != 0)
                {
if (i == 1) {
    vacant = document.createElement("div");
    // vacant.dataset.money = "0,0,0,0,0,0,0,0,0";
    // vacant.classList.add("card-seat");
    // vacant.classList.add("disabled");
    // span = document.createElement("span");
    // vacant.appendChild(span);
    seats_container.insertBefore(vacant, add_btn);
    continue;
}
                    else
                    {
                                            new_seat = document.createElement("div");
                    new_seat.classList.add("card-seat");
                    new_seat.classList.add("layer1");
                         span = document.createElement("span");
                        new_seat.appendChild(span);
                    new_seat.dataset.money = "0,0,0,0,0,0,0,0,0";
                    seats_container.insertBefore(new_seat, add_btn);
                    }


                }
                else
                {
                new_seat = document.createElement("div");
                new_seat.classList.add("card-seat");
                new_seat.classList.add("driver");
                new_seat.classList.add("disabled");
                new_seat.dataset.money = "0,0,0,0,0,0,0,0,0";
                seats_container.insertBefore(new_seat, add_btn);
                }

        
                
               
            }
            
            
        }
        seats = document.querySelectorAll('.card-seat:not(.driver, .add, .explain)');
        update_seats();
    }

    // // --- MENU/BACKDROP EVENTS ---
    // [backdrop, close, add_btn].forEach(e => {
    //     e.addEventListener('click', function () {
    //         hide_menu();
    //     });
    // });

    collected_amount_btn.addEventListener("click", () => {
        if(collected_details_div.classList.contains("show"))
        {
            collected_details_div.classList.remove("show");
            collected_amount_btn.querySelector("img").style.transform = "rotateZ(0deg)";
            

        }
        else
        {
            collected_details_div.classList.add("show");
            
            collected_amount_btn.querySelector("img").style.transform = "rotateZ(180deg)";

        }
                                setTimeout(() => {
                collected_amount_btn.classList.remove("active");
            }, 200);
            collected_amount_btn.classList.add("active");
    });

    add_seat.addEventListener("click", ()=>{
    
        new_seat = document.createElement("div");
        new_seat.classList.add("card-seat");
        new_seat.classList.add("layer1");
        new_seat.dataset.money = "0,0,0,0,0,0,0,0,0";
                                span = document.createElement("span");
                        new_seat.appendChild(span);
        seats_container.insertBefore(new_seat, add_btn);
        
        seats = document.querySelectorAll('.card-seat:not(.driver, .add, .explain)');
        update_seats();
    
    });

    type = window.location.hash.substring(1);
    let seats_num;
    if(type)
    {
        seats_num = parseInt(type);

    }
    else
    {
        seats_num = 14;
    }
    generate_seats();

    update_seats();
        // --- AMOUNT BUTTON EVENTS ---
    less_btns.forEach(btn => {
        btn.addEventListener('click', function () {
            let amount = btn.previousElementSibling;
            if (parseInt(amount.textContent) > 0) {
                amount.textContent = parseInt(amount.textContent) - 1;
                let money_array = Array.from(amounts).map(a => parseInt(a.textContent));
                lastSelectedSeat.dataset.money = money_array.join(',');
                update(lastSelectedSeat);
            }
        });
    });

    more_btns.forEach(btn => {
        btn.addEventListener('click', function () {
            let amount = btn.nextElementSibling;
            amount.textContent = parseInt(amount.textContent) + 1;
            let money_array = Array.from(amounts).map(a => parseInt(a.textContent));
            lastSelectedSeat.dataset.money = money_array.join(',');
            update(lastSelectedSeat);
        });
    });

    // --- TOGGLE DISABLED STATE (OPTIONAL) ---
    function toggleSeatDisabled(seat) {
        if (seat.classList.contains('disabled')) {
            seat.classList.remove('disabled');
            seat.textContent = '';
        } else {
            seat.classList.add('disabled');
            seat.classList.remove('selected');
            seat.textContent = '';
        }
    }

    select.addEventListener("change", (event) => {
        selected_val = event.target.value;
        window.location.hash = selected_val;
        // Optionally, re-generate seats if needed:
        seats_num = parseInt(selected_val);
        // Remove existing seats except driver, add, and explain
        document.querySelectorAll('.seats-container div:not(.add)').forEach(seat => seat.remove());
        
        generate_seats();
    });

    // modallllllllllll
                // Select DOM elements
const how_to_btn = document.querySelector(".how-to");
const how_to_modal = document.querySelector(".bottom-modal");
const modal_overlay = how_to_modal.querySelector(".modal-overlay");
const modal_content = how_to_modal.querySelector(".content");
const dragIcon = how_to_modal.querySelector(".drag-icon");
// Global variables for tracking drag events
let isDragging = false, startY, startHeight;
// Show the bottom sheet, hide body vertical scrollbar, and call updateSheetHeight
const showhow_to_modal = () => {
    how_to_modal.classList.add("show");
      document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
    updateSheetHeight(50);
}
const updateSheetHeight = (height) => {
    modal_content.style.height = `${height}vh`; //updates the height of the sheet content
    // Toggles the fullscreen class to how_to_modal if the height is equal to 100
    how_to_modal.classList.toggle("fullscreen", height === 100);
}
// Hide the bottom sheet and show body vertical scrollbar
const hidehow_to_modal = () => {
    how_to_modal.classList.remove("show");
      document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
}
// Sets initial drag position, modal_content height and add dragging class to the bottom sheet
const dragStart = (e) => {
    isDragging = true;
    startY = e.pageY || e.touches?.[0].pageY;
    startHeight = parseInt(modal_content.style.height);
    how_to_modal.classList.add("dragging");
}
// Calculates the new height for the sheet content and call the updateSheetHeight function
const dragging = (e) => {
    if(!isDragging) return;
    const delta = startY - (e.pageY || e.touches?.[0].pageY);
    const newHeight = startHeight + delta / window.innerHeight * 100;
    updateSheetHeight(newHeight);
}
// Determines whether to hide, set to fullscreen, or set to default 
// height based on the current height of the sheet content
const dragStop = () => {
    isDragging = false;
    how_to_modal.classList.remove("dragging");
    const sheetHeight = parseInt(modal_content.style.height);
    sheetHeight < 25 ? hidehow_to_modal() : sheetHeight > 75 ? updateSheetHeight(100) : updateSheetHeight(50);
}
dragIcon.addEventListener("mousedown", dragStart);
document.addEventListener("mousemove", dragging);
document.addEventListener("mouseup", dragStop);
dragIcon.addEventListener("touchstart", dragStart);
document.addEventListener("touchmove", dragging);
document.addEventListener("touchend", dragStop);
modal_overlay.addEventListener("click", hidehow_to_modal);
how_to_btn.addEventListener("click", showhow_to_modal);


    saveTripToLocalStorage();
    if (localStorage.getItem('ogra_trips'))
    {
        console.log(localStorage.getItem('ogra_trips'));
    }


setInterval(() => {
    all_images = document.querySelectorAll("img");
    all_images.forEach(image => {
        image.draggable = false;
       

image.addEventListener('contextmenu', (e) => {
  e.preventDefault(); // Prevent right-click and long-press menu
});

image.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent long-press on touch devices
});
    });
}, 500);
// --------------------------------

});