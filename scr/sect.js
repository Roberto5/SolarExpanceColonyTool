
// Global State & Database Structure
const DATABASE_NAME = 'solar_expanse_v4';
let database = {};
let activeColonyKey = "";
let depositModal;
let reductionPop = 0;
let reductionCost = 0;
let colonyActive;
const resourcesTypes = [
    "silicon",
    "iron",
    "carbon",
    "water",
    "noble",
    "nitrogen",
    "oxygen",
    "co2",
    "fuel",
    "hydrogen",
    "rareMetal",
    "fissile",
    "elio3"
];



// init application
window.onload = function () {
    depositModal = new deposit();
    // Load database from localStorage if available, otherwise initialize with default colony
    if (localStorage.getItem(DATABASE_NAME + '_db')) {
        let databaseTemp = JSON.parse(localStorage.getItem(DATABASE_NAME + '_db'));
        database.colonies = [];
        database.reduction = databaseTemp.reduction;
        for (const c of databaseTemp.colonies) {
            const newColony = new colony(c.name, c.buildings.map(b => new building(b)), c.depositRate);
            database.colonies.push(newColony);
        }
    } else {
        // Initialize clean demo dataset matching user's system constraints
        database = {
            colonies: [
                new colony("luna", [defaultBuilding.SiliconMine, defaultBuilding.GlassFactory], { silicon: 1 }),
            ],
            reduction: {
                p: 0,
                c: 0
            }
        };

        saveToLocalStorage();
    }
    // inizializzo i campi riduzione
    database.colonies.forEach(v => v.calcReduction());
    document.getElementById("laborReductionPercentage").value = database.reduction.p;
    document.getElementById("costReductionPercentage").value = database.reduction.c;
    // Determine active colony key
    const storedActiveColony = localStorage.getItem(DATABASE_NAME + '_active_colony');
    if (storedActiveColony && database.colonies.some(c => c.name === storedActiveColony)) {
        activeColonyKey = storedActiveColony;
    } else {
        activeColonyKey = database.colonies[0].name;
    }
    //ripopolo i selettori
    populateDefaultBuildingSelector();
    populateColonySelector();
    populateResourceList();
    //carico la colonia
    loadColonyDirectly(activeColonyKey);
    //avvio i calcoli
    calculateAll(true);
};

// Main orchestration driver. Pass rebuildDOM = true to rebuild HTML cards/sliders, false to preserve input focus
//@todo rifare i calcoli
function calculateAll(rebuildDOM = false) {
    //calculate free population
    const popTotale = parseInt(document.getElementById('popTotale').value) || 0;
    const popOccupata = parseInt(document.getElementById('popOccupata').value) || 0;
    const freePop = Math.max(0, popTotale - popOccupata);
    document.getElementById('popLiberaBadge').innerText = freePop;
    //calculate reduction from technology
    colonyActive.calcReduction();
    // Sync demographic inputs with model
    colonyActive.popTot = popTotale;
    colonyActive.popOcc = popOccupata;
    const buildings = colonyActive.buildings || [];
    // calcolo della produzione per ogni edificio
    const result = {
        production: {}, // ok
        occupiedPopulation: 0, //ok
        requiredResources: {},
        buildings: {}
    };

    buildings.forEach((building) => {
        const count = Number(colonyActive.planned?.[building.id] || 0);
        if (building.selected === false || count <= 0) return;

        const populationCost = (Number(building.popReq) || 0) * count;
        result.occupiedPopulation += populationCost;

        result.buildings[building.id] = {
            count,
            population: populationCost,
            production: 0,
            requiredResources: {}
        };

        // Include construction costs for every planned instance of the building.
        if (building.cost && typeof building.cost === 'object') {
            Object.entries(building.cost).forEach(([resourceType, unitCost]) => {
                const totalCost = (Number(unitCost) || 0) * count;
                result.requiredResources[resourceType] =
                    (result.requiredResources[resourceType] || 0) + totalCost;
                result.buildings[building.id].requiredResources[resourceType] =
                    (result.buildings[building.id].requiredResources[resourceType] || 0) + totalCost;
            });
        }
        // calcolo produzione 
        if (building.type === 'consumer') {
            for (const r in building.rate) {
                v = building.rate[r] * count;
                result.production[building.resourceType[r]] = (result.production[building.resourceType[r]] || 0) - v;
            }
        }
        else {
            result.production[building.resourceType] = (result.production[building.resourceType] || 0) + count * building.productionRate;
        }


        /*    const totalProduction = (Number(building.productionRate) || 0) * count;
            result.production[building.resourceType] = (result.production[building.resourceType] || 0) + totalProduction* (building.type === 'consumer' ? -1 : 1);
            result.buildings[building.id].production = totalProduction;
            result.buildings[building.id].resource = building.resourceType;
            return;*/



    });


    // Display each required resource with its quantity and icon.
    const budgetHUD = document.getElementById('budgetCostHUD');
    if (budgetHUD) {
        budgetHUD.innerHTML = Object.entries(result.requiredResources)
            .filter(([, amount]) => Number(amount) > 0)
            .map(([resource, amount]) => `
                <span class="inline-flex items-center gap-1.5 mr-2">
                    <span class="font-mono text-slate-200">${formatNum(amount)}</span>
                    <img src="img/${resource}.png" alt="${resource}" title="${resource}"
                        class="w-5 h-5 object-contain">
                </span>
            `)
            .join('');
    }
    // display the total production of each resource
    const productionHUD = document.getElementById('productionHUD');
    if (productionHUD) {
        const productionRows = Object.entries(result.production)
            .map(([resource, amount]) => {
                const value = Number(amount) || 0;
                const colorClass = value >= 0 ? 'text-emerald-400' : 'text-red-400';
                const formattedValue = value > 0 ? `+${formatNum(value)}` : formatNum(value);

                return `
                    <td class="w-1/2 sm:w-1/3 p-1">
                        <div class="flex items-center justify-center gap-1.5 rounded-lg bg-slate-950/60 px-2 py-1.5 ${colorClass}">
                            <span class="font-mono whitespace-nowrap">${formattedValue}</span>
                            <img src="img/${resource}.png" alt="${resource}" title="${resource}"
                                class="w-5 h-5 shrink-0 object-contain">
                        </div>
                    </td>
                `;
            });

        const tableRows = [];
        for (let index = 0; index < productionRows.length; index += 3) {
            tableRows.push(`<tr>${productionRows.slice(index, index + 3).join('')}</tr>`);
        }

        productionHUD.innerHTML = `
            <table class="w-full table-fixed text-xs">
                <tbody>${tableRows.join('')}</tbody>
            </table>
        `;
    }
    // display free pop
    const hudPopImpiegata = document.getElementById('hudPopImpiegata');
    const hudPopLiberaTot = document.getElementById('hudPopLiberaTot');
    const hudPopBar = document.getElementById('hudPopBar');
    const hudPopPercentage = document.getElementById('hudPopPercentage');
    // freepop:ocpop=100:x ocpop*100/freepop
    if (result.occupiedPopulation > freePop) {//from-blue-500 to-cyan-400
        hudPopBar.style.width = '100%';
        hudPopPercentage.textContent = `${(Math.round(result.occupiedPopulation * 100 / freePop))}%`;
        hudPopBar.classList.add('from-red-500','to-red-300');
        hudPopBar.classList.remove('from-blue-500','to-cyan-400');
        hudPopImpiegata.classList.add('text-red-400');
        hudPopImpiegata.classList.remove('text-blue-400');
    }
    else {
        hudPopBar.style.width = `${(result.occupiedPopulation * 100 / freePop)}%`;
        hudPopPercentage.textContent = `${(Math.round(result.occupiedPopulation * 100 / freePop))}%`;
        hudPopBar.classList.remove('from-red-500','to-red-300');
        hudPopBar.classList.add('from-blue-500','to-cyan-400');
        hudPopImpiegata.classList.remove('text-red-400');
        hudPopImpiegata.classList.add('text-blue-400');
    }
    hudPopImpiegata.textContent = ""+result.occupiedPopulation;
    hudPopLiberaTot.textContent = freePop;
    let width = 0;
    if (rebuildDOM) {
        renderBuildingList(buildings);
        renderSandboxSliders(buildings, freePop);
        populateResourceList();
    }
    saveToLocalStorage();
}

// Renders registry list of dynamic buildings in left column
function renderBuildingList(buildings) {
    const container = document.getElementById('buildingListContainer');
    container.innerHTML = '';

    if (buildings.length === 0) {
        container.innerHTML = `
                    <div class="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                        Nessun edificio registrato su questa colonia. Aggiungine uno per iniziare.
                    </div>
                `;
        return;
    }

    buildings.forEach(b => {
        const isProd = b.type === 'producer';
        const isChecked = b.selected !== false; // Default: true if not specified

        // Show dynamic planetary rate controls if building is a mine (producer)
        let planetSpecificHtml = "";
        let typeBadge = "";

        if (isProd) {
            typeBadge = `<span id="badge_rate_${b.id}" class="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded text-[9px] uppercase font-bold">Produttore (+${formatNum(b.productionRate)}) <img src="img/${b.resourceType}.png" alt="${b.resourceType}" title="${b.resourceType}" class="inline-flex w-4 h-4 object-contain"></span>`;


        } else {
            typeBadge = `<span class="inline-flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 text-purple-500 px-2 py-0.5 rounded text-[9px] uppercase font-bold">Consuma `;
            for (let i = 0; i < b.rate.length; i++) {
                typeBadge += `<span class="inline-flex items-center gap-0.5"><span>${b.rate[i]}</span><img src="img/${b.resourceType[i]}.png" alt="${b.resourceType[i]}" title="${b.resourceType[i]}"  class="w-4 h-4 object-contain"></span>`;
            }
            typeBadge += '</span>';
        }

        const card = document.createElement('div');
        card.className = `bg-slate-950 border ${isChecked ? 'border-slate-850' : 'border-slate-900 opacity-60'} p-3.5 rounded-xl space-y-2 relative overflow-hidden group hover:border-slate-700 transition-colors`;
        let costPanel = '';
        for (let k in b.cost) {
            costPanel += '<span class="inline-flex">' + b.cost[k] + '</span><img class="inline-flex w-4 h-4 object-contain" src="img/' + k + '.png" alt="' + k + '" title="' + k + '" style="margin: 0 0.5rem;">';
        }
        card.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="flex items-start space-x-2.5">
                            <!-- Styled selection checkbox -->
                            <div class="pt-0.5">
                                <input type="checkbox" id="check_${b.id}" ${isChecked ? 'checked' : ''}
                                       onchange="toggleBuildingSelection('${b.id}')"
                                       class="w-4 h-4 text-purple-600 bg-slate-900 border-slate-800 rounded focus:ring-purple-500 focus:ring-offset-slate-950 focus:ring-2 cursor-pointer transition">
                            </div>
                            <div>
                                <h4 class="font-semibold text-xs ${isChecked ? 'text-slate-200' : 'text-slate-500 line-through'}">${b.name}</h4>
                                <div class="mt-1 flex items-center space-x-2">
                                    ${typeBadge}
                                    <span class="text-[10px] text-slate-400">Pop: <strong class="font-mono text-slate-300">${b.popReq}</strong></span>
                                </div>
                            </div>
                        </div>
                        <div class="flex space-x-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button onclick="editBuilding('${b.id}')" class="p-1 hover:text-blue-400 rounded transition" title="Modifica Edificio">
                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                            <button onclick="deleteBuilding('${b.id}')" class="p-1 hover:text-red-400 rounded transition" title="Elimina Edificio">
                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    ${planetSpecificHtml}
                    <div class="gap-2 text-[10px] text-slate-400 pt-1.5 border-t border-slate-900 font-mono">
                        <span>Cost.</span>
                        ${costPanel}
                    </div>
                `;
        container.appendChild(card);
    });
}

// Toggle the selected state of a building
function toggleBuildingSelection(bId) {
    const colony = colonyActive;
    if (!colony) return;
    const b = colony.buildings.find(x => x.id === bId);
    if (!b) return;

    b.selected = (b.selected === false) ? true : false;

    saveToLocalStorage();
    calculateAll(true); // Re-render everything because selection affects optimizations and sandboxes
    triggerToast(`Stato edificio '${b.name}' aggiornato`, "blue");
}

// Generates inputs dynamically for the Sandbox Panel
function renderSandboxSliders(buildings, freePop) {
    const container = document.getElementById('sandboxSlidersContainer');
    container.innerHTML = '';

    if (buildings.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-center text-slate-500 text-xs py-4">Nessun edificio registrato. Creane uno per configurare il Sandbox.</div>`;
        return;
    }

    const colony = colonyActive;

    buildings.forEach(b => {
        let val = 0;
        if (colony.planned) val = colony.planned[b.id] || 0;
        const maxVal = Math.max(10, Math.floor(freePop / b.popReq));

        const block = document.createElement('div');
        block.className = "space-y-2 bg-slate-950/40 border border-slate-900 p-3 rounded-xl";
        block.innerHTML = `
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-semibold text-slate-200 flex items-center gap-1.5 truncate max-w-[170px]">
                            <span class="w-2 h-2 rounded-full ${b.type === 'producer' ? 'bg-amber-500' : 'bg-purple-500'}"></span>
                            ${b.name}
                        </span>
                        <input type="number" id="sandboxIn_${b.id}" value="${val}" min="0" class="w-14 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-center text-xs font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500" oninput="syncSandboxCounts('${b.id}', 'input')">
                    </div>
                    <input type="range" id="sandboxSl_${b.id}" min="0" max="${maxVal}" value="${val}" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" oninput="syncSandboxCounts('${b.id}', 'slider')">
                    <div class="flex justify-between text-[9px] text-slate-500">
                        <span id="spanTip">0</span>
                        <span>Max Calcolato: ${Math.floor(freePop / b.popReq)}</span>
                    </div>
                `;
        container.appendChild(block);
    });
}

// Sync visual sliders with the numerical value inputs
function syncSandboxCounts(bId, source) {

    if (!colonyActive) return;

    const slider = document.getElementById(`sandboxSl_${bId}`);
    const input = document.getElementById(`sandboxIn_${bId}`);

    let val = 0;
    if (source === 'slider') {
        val = parseInt(slider.value) || 0;
        input.value = val;
    } else {
        val = Math.max(0, parseInt(input.value) || 0);
        slider.value = val;
    }

    // Save inside local dynamic model and autosave instantly
    colonyActive.planned[bId] = val;
    saveToLocalStorage();
    calculateAll(false); // update HUD and recommendations smoothly
}

// Reset Sandbox parameters
function resetSandbox() {
    if (!colonyActive) return;

    Object.keys(colonyActive.planned).forEach(id => {
        colonyActive.planned[id] = 0;
    });
    calculateAll(true);
    triggerToast("Sandbox resettato a zero", "blue");
}


// Save current configurations back into the active colony database model
function saveCurrentColony() {
    if (!activeColonyKey) {
        triggerToast("Seleziona o crea una colonia prima di salvare", "red");
        return;
    }

    const colony = database.colonies.find(c => c.name === activeColonyKey);
    colony.popTot = parseInt(document.getElementById('popTotale').value) || 0;
    colony.popOcc = parseInt(document.getElementById('popOccupata').value) || 0;

    saveToLocalStorage();
    calculateAll(true);
    triggerToast(`Configurazioni di '${activeColonyKey}' salvate nel database!`, "emerald");
}

// Confirm new colony creation
function confirmCreateColony() {
    const name = document.getElementById('newColonyName').value.trim();
    if (!name) {
        triggerToast("Inserisci un nome valido per la colonia", "red");
        return;
    }
    if (database.colonies.find(c => c.name === name)) {
        triggerToast("Esiste già una colonia con questo nome!", "red");
        return;
    }

    // Create new template entry
    database.colonies.push(new colony(name));
    activeColonyKey = name;

    saveToLocalStorage();
    populateColonySelector();
    loadColonyDirectly(name);
    closeColonyModal();
    triggerToast(`Colonia '${name}' creata!`, "emerald");
}

// Confirm colony renaming action
function confirmRenameColony() {
    const newName = document.getElementById('renameColonyInput').value.trim();
    if (!newName) {
        triggerToast("Il nome della colonia non può essere vuoto", "red");
        return;
    }
    if (newName === activeColonyKey) {
        closeRenameColonyModal();
        return;
    }
    if (database.colonies.find(c => c.name === newName)) {
        triggerToast("Esiste già un'altra colonia con questo nome!", "red");
        return;
    }

    // Perform rename swap in JS Object
    const tempObject = database.colonies.find(c => c.name === activeColonyKey);
    tempObject.name = newName;
    activeColonyKey = newName;

    saveToLocalStorage();
    populateColonySelector();
    calculateAll(true);
    closeRenameColonyModal();
    triggerToast(`Colonia rinominata in '${newName}'!`, "emerald");
}

// Delete Colony from list
function deleteColony(name) {
    if (database.colonies.length <= 1) {
        triggerToast("Impossibile eliminare l'unica colonia rimasta!", "red");
        return;
    }

    const colonyIndex = database.colonies.findIndex(c => c.name === name);
    if (colonyIndex !== -1) {
        database.colonies.splice(colonyIndex, 1);
        saveToLocalStorage();


        activeColonyKey = database.colonies[0].name;

        populateColonySelector();
        loadColonyDirectly(activeColonyKey);
        triggerToast(`Colonia '${name}' rimossa definitivamente.`, "red");
    }
}

// ********************* Building Modals Logic ******************
function openBuildingModal() {
    const modal = document.getElementById('buildingModal');
    modal.classList.remove('hidden');
}
// Adds or updates a building in the current active colony
function saveBuilding() {
    const colony = database.colonies.find(c => c.name === activeColonyKey);
    const select = document.getElementById('defaultBuildingSelector');
    if (!colony) {
        triggerToast("Colonia non trovata", "red");
        return;
    }
    if (!select) {
        triggerToast("Selettore edificio non trovato", "red");
        return;
    }
    colony.addBuilding(defaultBuilding[select.value]);
    triggerToast("edificio aggiunto");
    /* @todo rimuovi se inutile
    const editId = document.getElementById('editBuildingId').value;
    const bName = document.getElementById('bName').value.trim();
    const bType = document.getElementById('bType').value;
    const bPopReq = parseInt(document.getElementById('bPopReq').value) || 1;

    const bCostMetal = parseInputFloat(document.getElementById('bCostMetal').value);
    const bCostAlloy = parseInputFloat(document.getElementById('bCostAlloy').value);

    let bRate = 0;
    let bProdTotale = undefined;
    let bNumMiniere = undefined;

    if (bType === 'producer') {
        bProdTotale = parseInputFloat(document.getElementById('bProdTotale').value);
        bNumMiniere = parseInt(document.getElementById('bNumMiniere').value) || 1;
        bRate = bNumMiniere > 0 ? (bProdTotale / bNumMiniere) : 0;
    } else {
        bRate = parseInputFloat(document.getElementById('bRate').value);
    }

    if (!bName) {
        triggerToast("Inserisci un nome per l'edificio", "red");
        return;
    }

    if (editId) {
        // Edit existing building inside array
        const index = colony.buildings.findIndex(b => b.id === editId);
        if (index !== -1) {
            colony.buildings[index] = {
                id: editId,
                name: bName,
                type: bType,
                popReq: bPopReq,
                rate: bRate,
                prodTotale: bProdTotale,
                numMiniere: bNumMiniere,
                costMetal: bCostMetal,
                costAlloy: bCostAlloy,
                selected: colony.buildings[index].selected !== false // preserve selection state
            };
        }
        triggerToast(`Edificio '${bName}' aggiornato!`, "emerald");
    } else {
        // Create unique ID
        const newId = "b_" + Date.now();
        colony.buildings.push({
            id: newId,
            name: bName,
            type: bType,
            popReq: bPopReq,
            rate: bRate,
            prodTotale: bProdTotale,
            numMiniere: bNumMiniere,
            costMetal: bCostMetal,
            costAlloy: bCostAlloy,
            selected: true // Enabled by default on creation
        });
        // Initialize default planned count
        colony.planned[newId] = 0;
        triggerToast(`Edificio '${bName}' inserito nel registro!`, "emerald");
    }
//*/
    saveToLocalStorage();
    closeBuildingModal();
    calculateAll(true);
}

// Opens dynamic building edit modal
function editBuilding(id) {
    openBuildingModal(id);
}

// Deletes building from colony registry and planned counts
function deleteBuilding(id) {
    const colony = database[activeColonyKey];
    if (!colony) return;

    const index = colony.buildings.findIndex(b => b.id === id);
    if (index !== -1) {
        const bName = colony.buildings[index].name;
        colony.buildings.splice(index, 1);
        // Clean planned count key
        delete colony.planned[id];

        saveToLocalStorage();
        calculateAll(true);
        triggerToast(`Edificio '${bName}' rimosso`, "red");
    }
}
