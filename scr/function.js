

// Helper function to format decimal numbers beautifully
function formatNum(num) {
    return Number(num).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// Helper to safely parse localized decimal strings (accepts dot or comma)
function parseInputFloat(value) {
    if (value === undefined || value === null) return 0;
    const normalized = value.toString().replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
}
// Utility: Template generator
function createColonyTemplate() {
    return {
        //popolazione iniziale di default, ma può essere modificata dall'utente
        popTot: 500,
        popOcc: 100,
        buildings: [
            defaultBuilding.iron,
            defaultBuilding.alloy
        ],
        planned: { //@todo: controllare il funzionamento
            [defaultBuilding.iron.id]: 0,
            [defaultBuilding.alloy.id]: 0
        }
    };
}
// Populate Colony Switcher select dropdown
function populateColonySelector() {
    const selector = document.getElementById('colonySelector');
    selector.innerHTML = '';

    Object.keys(database.colonies).forEach(c => {
        let name = database.colonies[c].name;
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === activeColonyKey) opt.selected = true;
        selector.appendChild(opt);
    });
}
/**
 * 
 * @param {string} name 
 * @returns 
 */
function loadColonyDirectly(name) {
    const data = database.colonies.find(c => c.name === name);
    if (!data) return;
    activeColonyKey = name;
    colonyActive=database.colonies.find(c=>c.name===name);
    saveToLocalStorage();



    // Set Demographic inputs
    document.getElementById('popTotale').value = data.popTot;
    document.getElementById('popOccupata').value = data.popOcc;

    // Keep Colony selector in sync
    document.getElementById('colonySelector').value = name;
    
    calculateAll(true);// TODO rifare i calcoli
    triggerToast(`Colonia caricata: ${name}`, "blue");
}

// Handler linked to select element change event
function loadColony() {
    const selector = document.getElementById('colonySelector');
    const selectedVal = selector.value;
    if (selectedVal) {
        loadColonyDirectly(selectedVal);
    }
}
// Save State inside Browser Cache
function saveToLocalStorage() {
    localStorage.setItem(DATABASE_NAME + '_db', JSON.stringify(database));
    localStorage.setItem(DATABASE_NAME + '_active_colony', activeColonyKey);
}
// Populate Default Building Selector
function populateDefaultBuildingSelector() {
    const selector = document.getElementById('defaultBuildingSelector');
    selector.innerHTML = '<option value="">Seleziona un edificio predefinito</option>';

    Object.keys(defaultBuilding).forEach(key => {
        const option = document.createElement('option');
        option.value = defaultBuilding[key].id;
        option.textContent = defaultBuilding[key].name;
        selector.appendChild(option);
    });
}
// Open Dialog/Modal to Create Colony
function openCreateColonyModal() {
    document.getElementById('newColonyName').value = '';
    document.getElementById('colonyModal').classList.remove('hidden');
}
// Close Colony Creation Modal
function closeColonyModal() {
    document.getElementById('colonyModal').classList.add('hidden');
}// Open Dialog/Modal to Rename Colony
function openRenameColonyModal() {
    if (!activeColonyKey) {
        triggerToast("Seleziona prima una colonia da rinominare", "red");
        return;
    }
    document.getElementById('renameColonyInput').value = activeColonyKey;
    document.getElementById('renameColonyModal').classList.remove('hidden');
}
function closeRenameColonyModal() {
    document.getElementById('renameColonyModal').classList.add('hidden');
}
function closeBuildingModal() {
    document.getElementById('buildingModal').classList.add('hidden');
}

// Popola il selettore di tipi di risorsa 
function populateResourceselector() {
    const selector = document.getElementById('resourceTypeSelector');
    selector.innerHTML = '<option value="">Seleziona un tipo di risorsa</option>';

    Object.keys(resourcesTypes).forEach(key => {
        const option = document.createElement('option');
        option.value = resourcesTypes[key];
        option.textContent = resourcesTypes[key];
        selector.appendChild(option);
    });
}   

function populateResourceList() {
    activeColony = database.colonies.find(c => c.name === activeColonyKey);
    const resourceListContainer = document.getElementById('resourceListContainer');
    resourceListContainer.innerHTML = ''; // Clear existing items
    for (const [type, rate] of Object.entries(activeColony.depositRate)) {
        const resourceItem = document.createElement('div');
        resourceItem.className = 'flex w-14 shrink-0 cursor-pointer flex-col items-center justify-center bg-slate-800 rounded-lg p-2';
        resourceItem.innerHTML = `
            <img src="img/${type}.png" alt="${type}" title="${type}"  class="w-10 h-10 object-contain">
            <span class="text-slate-400 text-xs mt-1">${rate}</span>
        `;
        resourceItem.addEventListener('click', () => {

            //remove item from depositRate
            // prendo il type dal attributo alt dell'immagine
            let img = resourceItem.querySelector('img');
            let type = img.getAttribute('alt'); 
            depositModal.open(true, type);
        });
        resourceListContainer.appendChild(resourceItem);
    }

}

// Toast visual feedback notifier
function triggerToast(message, type = 'blue') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMessage');
    const dot = document.getElementById('toastStatusDot');
    msgEl.innerText = message;

    toast.className = toast.className.replace(/border-(blue|emerald|red)-500/, `border-${type}-500`);
    dot.className = `w-2.5 h-2.5 rounded-full bg-${type}-500 animate-ping`;

    toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3000);
}