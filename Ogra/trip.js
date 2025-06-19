// Select the fare input field
const input = document.querySelector('input[name="fare"]');
// Select all buttons to decrease amounts
const less_btns = document.querySelectorAll('.less');
// Select all buttons to increase amounts
const more_btns = document.querySelectorAll('.more');
// Select the menu element
const menu = document.querySelector('.menu');
// Select the backdrop overlay
const backdrop = document.querySelector('.backdrop');
// Select the close button
const close = document.querySelector('.close');
// Select all number elements in the modal body (excluding .close and .val)
const amounts = document.querySelectorAll(".menu-modal .content .modal-body>div:not(.close, .val, .info) .number");
// Select the add button
const add_btn = document.querySelector('.add');
// Select the collected amount button
const collected_amount_btn = document.querySelector('.collected-div');
// Select the collected amount display element
const collected_amount_display = document.querySelector('.collected-amount');
// Select the collected details div
const collected_details_div = document.querySelector(".collected-details");
// Select all displayed change details in the bill
const details_displayed = document.querySelectorAll(".bill .count");
// Select the add seat button
const add_seat = document.querySelector(".card-seat.add");
// Select the seat type select element
const select = document.querySelector("select");

let seats; // Will hold all seat elements
let hash = window.location.hash.substring(1); // Get hash from URL
let loadedFromTrip = false; // Flag for loading trip from storage

// --- CONSTANTS ---
const money_values = [0.25, 0.5, 1, 5, 10, 20, 50, 100, 200]; // Denominations

// --- STATE ---
let seat_change_needs = []; // How much change each seat needs
let suggestedSeats = new Set(); // Seats suggested for change
let tapTimeout = null; // For long press detection
let coins_to_give_per_seat = []; // Coins to give per seat
const imgs = ["quarter.png", "half.png", "1.png", "5.png", "10.png", "20.png", "50.png", "100.png", "200.png"]; // Images for denominations

let seats_num; // Number of seats

// Wait for the DOM to be fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    // --- DOM ELEMENTS ---
    let lastSelectedSeat = null; // Track last selected seat
    const seats_container = document.querySelector(".seats-container"); // Container for seats

    // --- LOAD TRIP FROM LOCALSTORAGE IF INDEX IN HASH ---
    function loadTripFromLocalStorageByIndex(tripIndex) {
        let trips = [];
        try {
            trips = JSON.parse(localStorage.getItem("ogra_trips")) || [];
        } catch (e) {
            trips = [];
        }
        const trip = trips.find(t => t.index === tripIndex);
        if (!trip) return false;

        // Remove existing seats except .add
        document.querySelectorAll('.seats-container div:not(.add)').forEach(seat => seat.remove());

        // Restore seats from trip data
        driver = document.createElement("div");
        driver.classList.add("card-seat", "driver", "disabled");
        driver.dataset.money = "0,0,0,0,0,0,0,0,0";
        seats_container.insertBefore(driver, document.querySelector('.add'));
        if (trip.selectedOption == '8') {
            space = document.createElement("div");
            seats_container.insertBefore(space, document.querySelector('.add'));
        }
        trip.seatData.forEach(seatInfo => {
            const new_seat = document.createElement("div");
            seatInfo.classes.forEach(cls => new_seat.classList.add(cls));
            new_seat.dataset.money = seatInfo.money;
            new_seat.dataset.val = seatInfo.val;
            const span = document.createElement("span");
            span.textContent = seatInfo.paid;
            new_seat.appendChild(span);
            seats_container.insertBefore(new_seat, document.querySelector('.add'));
        });

        // Restore fare
        input.value = trip.fare;

        // Restore collected amount (UI only)
        collected_amount_display.textContent = trip.collectedAmount;

        // Restore change details (UI only)
        details_displayed.forEach((el, i) => {
            el.textContent = trip.changeDetails[i] || "0";
        });

        // Restore select value
        select.value = trip.selectedOption;

        // Update the trip index in localStorage so it doesn't keep reloading
        localStorage.setItem("ogra_trip_index", trip.index);

        // Update seats and UI
        seats = document.querySelectorAll('.card-seat:not(.driver, .add, .explain)');
        update_seats();
        update(seats[1]);

        return true;
    }

    // --- LOCAL STORAGE SAVE/LOAD FUNCTIONS ---

    // Save the current trip state to localStorage
    function saveTripToLocalStorage() {
        // Gather seat data
        const seatData = Array.from(seats).map(seat => ({
            money: seat.dataset.money,
            classes: Array.from(seat.classList),
            paid: seat.childNodes[0]?.textContent || "0",
            val: seat.dataset.val,
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
        const date = new Date().toLocaleString("en-EG", {
            timeZone: "Africa/Cairo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });

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
        hash = window.location.hash.substring(1);
        let tripIndex = hash && hash.length > 0 ? hash : null;

        if (!tripIndex || isNaN(tripIndex) || tripIndex === "14" || tripIndex === "8") {
            tripIndex = Date.now().toString();
        }
        trip.index = tripIndex;

        // Check if trip with this index exists, update it, else push new
        let trips = [];
        try {
            trips = JSON.parse(localStorage.getItem("ogra_trips")) || [];
        } catch (e) {
            trips = [];
        }
        const existingIndex = trips.findIndex(t => t.index === tripIndex);
        if (existingIndex !== -1) {
            trips[existingIndex] = trip;
        } else {
            trips.push(trip);
        }
        window.location.hash = trip.index;

        // Save back to localStorage
        localStorage.setItem("ogra_trips", JSON.stringify(trips));
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

    // Setup seat event listeners and update seat UI
    function update_seats() {
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
                    update(seat);
                    return;
                }
                if (!suggestedSeats.has(i)) return;
                tapTimeout = setTimeout(() => {
                    confirmSuggestion(i);
                }, 600);
                update(seat);
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
                    update(seat);
                    return;
                }
                if (!suggestedSeats.has(i)) return;
                tapTimeout = setTimeout(() => {
                    confirmSuggestion(i);
                }, 600);
                update(seat);
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
                update(seat);
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
                update(seat);
            });

            // Open menu on click
            // Setup menu modal and get the show function
            const showMenuModal = setupMenuModal();

            seat.addEventListener('click', function () {
                // Wait 405ms before showing the menu modal and updating
                setTimeout(() => {
                    if (tap_difference) {
                        if (tap_difference > 400) {
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

    // Setup the menu modal for editing seat money/values
    function setupMenuModal() {
        const menuModal = document.querySelector('.menu-modal');
        if (!menuModal) return null;
        const menuOverlay = menuModal.querySelector('.menu-overlay');
        const menuContent = menuModal.querySelector('.content');
        const menuDragIcon = menuModal.querySelector('.drag-icon');

        let isDragging = false, startY, startHeight;

        // Show the menu modal
        const showMenuModal = () => {
            menuModal.classList.add("show");
            document.querySelector("html").classList.add("modal-shown");
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
            menuContent.style.height = "50vh";
            menuModal.classList.remove("fullscreen");
        };
        // Update the modal sheet height
        const updateMenuSheetHeight = (height) => {
            menuContent.style.height = `${height}vh`;
            menuModal.classList.toggle("fullscreen", height === 100);
        };
        // Hide the menu modal
        const hideMenuModal = () => {
            menuModal.classList.remove("show");
            document.querySelector("html").classList.remove("modal-shown");
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        };
        // Start dragging the modal
        const dragStart = (e) => {
            isDragging = true;
            startY = e.pageY || e.touches?.[0].pageY;
            startHeight = parseInt(menuContent.style.height) || 50;
            menuModal.classList.add("dragging");
        };
        // Handle dragging
        const dragging = (e) => {
            if (!isDragging) return;
            const delta = startY - (e.pageY || e.touches?.[0].pageY);
            const newHeight = startHeight + delta / window.innerHeight * 100;
            updateMenuSheetHeight(newHeight);
        };
        // Stop dragging and snap modal to position
        const dragStop = () => {
            isDragging = false;
            menuModal.classList.remove("dragging");
            const sheetHeight = parseInt(menuContent.style.height);
            sheetHeight < 25 ? hideMenuModal() : sheetHeight > 75 ? updateMenuSheetHeight(100) : updateMenuSheetHeight(50);
        };

        // Add drag event listeners
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
        // Log seat data for debugging
        console.log("Seats:", seats);
        seats.forEach((s, i) => {
            console.log(`Seat ${i}:`, s.dataset.money);
        });
        // Parse the seat's money data and update the menu amounts
        let money_array = seat.dataset.money.split(',').map(Number);

        let seat_value = parseInt(seat.dataset.val);
        amounts.forEach((amount, index) => {
            amount.textContent = money_array[index];
        });

        // Gather all seats' money arrays
        let money_arrays = Array.from(seats).map(s => s.dataset.money.split(',').map(Number));
        let total_change = new Array(money_arrays[0].length).fill(0);
        let value_input = document.querySelector(".val .number ");
        value_input.textContent = seat.dataset.val;
        // Calculate total coins/notes available for change
        money_arrays.forEach(array => {
            array.forEach((value, index) => {
                total_change[index] += value;
            });
        });
        console.log("Total change: " + total_change);

        // Update UI for change details
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
                let change_needed = paid - fare * parseInt(s.dataset.val);
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

    // Update the first seat whenever the input value changes
    input.addEventListener('input', () => {
        update(seats[0]);
    });

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
                }
            }

            // If full change can be given, mark as confirmed
            if (temp_amount + 1 < 0.01) {
                coins_to_give.forEach((val, i) => coins_available[i] -= val);
                coins_to_give_per_seat[seatIndex] = coins_to_give;
                seat.classList.remove('suggested');
                // -----------------------------seat.innerHTML= "<span class= ''>" + change_to_money(seat.dataset.money.split(',').map(Number)).total + "</span>"
                
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
                        img.draggable = false;

                        img.addEventListener('contextmenu', (e) => {
                            e.preventDefault(); // Prevent right-click and long-press menu
                        });

                        img.addEventListener('touchstart', (e) => {
                            e.preventDefault(); // Prevent long-press on touch devices
                        });

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
        let total_needed = Array.from(active_seats).reduce((sum, seat) => {
            return sum + (parseInt(seat.dataset.val) || 1);
        }, 0) * parseFloat(input.value || 0);
        // Show remaining money in the UI
        if (localStorage.getItem("ar") == "enabled") {
            collected_amount_display.textContent = "معاك: " + change_to_money(coins_available).total + "L.E / " + total_needed + "L.E";
        }
        else {
            collected_amount_display.textContent = "Collected: " + change_to_money(coins_available).total + "L.E / " + total_needed + "L.E";
        }
    }

    // Generate seat elements based on seat number
    function generate_seats() {
        if (seats_num > 8) {
            // 3 rows for more than 8 seats
            select.selectedIndex = 1;
            for (let i = 0; i < seats_num + 1; i++) {
                if (i != 0) {
                    if (i == 5) {
                        vacant = document.createElement("div");
                        vacant.dataset.money = "0,0,0,0,0,0,0,0,0";
                        vacant.dataset.val = "1";
                        vacant.classList.add("card-seat", "disabled", "layer1");
                        span = document.createElement("span");
                        vacant.appendChild(span);
                        seats_container.insertBefore(vacant, add_btn);
                        continue;
                    }
                    else {
                        span = document.createElement("span");
                        new_seat = document.createElement("div");
                        new_seat.appendChild(span);
                        new_seat.classList.add("card-seat", "layer1");
                        new_seat.dataset.money = "0,0,0,0,0,0,0,0,0";
                        new_seat.dataset.val = "1";
                        seats_container.insertBefore(new_seat, add_btn);
                    }
                }
                else {
                    new_seat = document.createElement("div");
                    new_seat.classList.add("card-seat", "driver", "disabled");
                    new_seat.dataset.money = "0,0,0,0,0,0,0,0,0";
                    new_seat.dataset.val = "1";
                    seats_container.insertBefore(new_seat, add_btn);
                }
            }
        }
        else {
            // 3 rows for 8 or fewer seats
            select.selectedIndex = 0;
            for (let i = 0; i < seats_num + 1; i++) {
                if (i != 0) {
                    if (i == 1) {
                        vacant = document.createElement("div");
                        seats_container.insertBefore(vacant, add_btn);
                        continue;
                    }
                    else {
                        new_seat = document.createElement("div");
                        new_seat.classList.add("card-seat", "layer1");
                        span = document.createElement("span");
                        new_seat.appendChild(span);
                        new_seat.dataset.money = "0,0,0,0,0,0,0,0,0";
                        new_seat.dataset.val = "1";
                        seats_container.insertBefore(new_seat, add_btn);
                    }
                }
                else {
                    new_seat = document.createElement("div");
                    new_seat.classList.add("card-seat", "driver", "disabled");
                    new_seat.dataset.money = "0,0,0,0,0,0,0,0,0";
                    new_seat.dataset.val = "1";
                    seats_container.insertBefore(new_seat, add_btn);
                }
            }
        }
        seats = document.querySelectorAll('.card-seat:not(.driver, .add, .explain)');
        update_seats();
    }

    // Toggle collected details display on click
    collected_amount_btn.addEventListener("click", () => {
        if (collected_details_div.classList.contains("show")) {
            collected_details_div.classList.remove("show");
            collected_amount_btn.querySelector("img").style.transform = "rotateZ(0deg)";
        }
        else {
            collected_details_div.classList.add("show");
            collected_amount_btn.querySelector("img").style.transform = "rotateZ(180deg)";
        }
        setTimeout(() => {
            collected_amount_btn.classList.remove("active");
        }, 200);
        collected_amount_btn.classList.add("active");
    });

    // Add a new seat when add_seat is clicked
    add_seat.addEventListener("click", () => {
        new_seat = document.createElement("div");
        new_seat.classList.add("card-seat", "layer1");
        new_seat.dataset.money = "0,0,0,0,0,0,0,0,0";
        span = document.createElement("span");
        new_seat.appendChild(span);
        seats_container.insertBefore(new_seat, add_btn);

        seats = document.querySelectorAll('.card-seat:not(.driver, .add, .explain)');
        update_seats();
    });

    // Check hash for trip index and load if found, else generate seats as usual
    let hash = window.location.hash.substring(1);
    let loadedFromTrip = false;
    if (hash && !isNaN(hash) && hash.length > 8) {
        loadedFromTrip = loadTripFromLocalStorageByIndex(hash);
    }
    else {
        type = window.location.hash.substring(1);
        if (type) {
            seats_num = parseInt(type);
        }
        else {
            seats_num = 14;
        }
        generate_seats();
    }

    update_seats();

    // --- AMOUNT BUTTON EVENTS ---
    // Decrease amount on less button click
    less_btns.forEach(btn => {
        btn.addEventListener('click', function () {
            let amount = btn.previousElementSibling;
            if (parseInt(amount.textContent) > 0) {
                amount.textContent = parseInt(amount.textContent) - 1;
                if (amount.parentElement.classList.contains("val")) {
                    lastSelectedSeat.dataset.val = parseInt(amount.textContent);
                }
                else {
                    let money_array = Array.from(amounts).map(a => parseInt(a.textContent));
                    lastSelectedSeat.dataset.money = money_array.join(',');
                }
                update(lastSelectedSeat);
            }
        });
    });

    // Increase amount on more button click
    more_btns.forEach(btn => {
        btn.addEventListener('click', function () {
            let amount = btn.nextElementSibling;
            amount.textContent = parseInt(amount.textContent) + 1;
            if (amount.parentElement.classList.contains("val")) {
                lastSelectedSeat.dataset.val = amount.textContent;
            }
            else {
                let money_array = Array.from(amounts).map(a => parseInt(a.textContent));
                lastSelectedSeat.dataset.money = money_array.join(',');
            }
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

    // Change seat layout when select changes
    select.addEventListener("change", (event) => {
        selected_val = event.target.value;
        window.location.hash = selected_val;
        seats_num = parseInt(selected_val);
        // Remove existing seats except driver, add, and explain
        document.querySelectorAll('.seats-container div:not(.add)').forEach(seat => seat.remove());
        generate_seats();
    });

    // --- HOW TO MODAL (BOTTOM SHEET) ---
    // Select DOM elements for how-to modal
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
        document.querySelector("html").classList.add("modal-shown");
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        updateSheetHeight(50);
    }
    // Update the height of the sheet content
    const updateSheetHeight = (height) => {
        modal_content.style.height = `${height}vh`;
        how_to_modal.classList.toggle("fullscreen", height === 100);
    }
    // Hide the bottom sheet and show body vertical scrollbar
    const hidehow_to_modal = () => {
        how_to_modal.classList.remove("show");
        document.querySelector("html").classList.remove("modal-shown");
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
        if (!isDragging) return;
        const delta = startY - (e.pageY || e.touches?.[0].pageY);
        const newHeight = startHeight + delta / window.innerHeight * 100;
        updateSheetHeight(newHeight);
    }
    // Determines whether to hide, set to fullscreen, or set to default height based on the current height of the sheet content
    const dragStop = () => {
        isDragging = false;
        how_to_modal.classList.remove("dragging");
        const sheetHeight = parseInt(modal_content.style.height);
        sheetHeight < 25 ? hidehow_to_modal() : sheetHeight > 75 ? updateSheetHeight(100) : updateSheetHeight(50);
    }
    // Add drag event listeners for how-to modal
    dragIcon.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", dragging);
    document.addEventListener("mouseup", dragStop);
    dragIcon.addEventListener("touchstart", dragStart);
    document.addEventListener("touchmove", dragging);
    document.addEventListener("touchend", dragStop);
    modal_overlay.addEventListener("click", hidehow_to_modal);
    how_to_btn.addEventListener("click", showhow_to_modal);

    // Save trip to localStorage on any click and update seat colors
    document.addEventListener("click", () => {
        saveTripToLocalStorage();
        if (localStorage.getItem('ogra_trips')) {
            console.log(localStorage.getItem('ogra_trips'));
        }
        seats.forEach(seat => {
            const span = seat.querySelector("span");
            if (!span) return;
            if (seat.textContent === "0") {
                span.style.color = "transparent";
            }
            else {
                span.style.color = "inherit";
            }
        });
    });
    // setInterval(() => {
    //     // update(seats[1]);
    // }, 500);
});
