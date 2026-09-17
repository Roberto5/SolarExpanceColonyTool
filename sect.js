        // Global State & Database Structure
        let database = {};
        let activeColonyKey = "";

        let defaultBuilding={
            silicon:{ 
                id: "b1", 
                name: "Miniera di silicio", 
                type: "producer", popReq: 5,
                rate: 1, 
                costMetal: 125, 
                costAlloy: 0, 
                prodTotale: 1,
                selected: true,
                numMiniere: 1
            },
            glass :{ 
                id: "b2", 
                name: "Fonderia di vetro", 
                type: "consumer", 
                popReq: 10, 
                rate: 0.1, 
                costMetal: 0, 
                selected: true,
                costAlloy: 300
            },
            iron :{
                id: "b3", 
                name: "Miniera di metallo", 
                type: "producer", popReq: 5,
                rate: 1, 
                costMetal: 125, 
                costAlloy: 0, 
                prodTotale: 1,
                selected: true,
                numMiniere: 1
            },
            alloy : {
                id: "b4", 
                name: "Fonderia di metallo", 
                type: "consumer", 
                popReq: 10, 
                rate: 0.15, 
                costMetal: 300, 
                selected: true,
                costAlloy: 0
            },
            carbon : {
                id: "b5", 
                name: "Miniera di carbonio", 
                type: "producer", popReq: 5,
                rate: 1, 
                costMetal: 125, 
                costAlloy: 0, 
                prodTotale: 1,
                selected: true,
                numMiniere: 1
            },
            poly : {
                id: "b4", 
                name: "Fonderia di polimery", 
                type: "consumer", 
                popReq: 10, 
                rate: 0.05, 
                costMetal: 0, 
                selected: true,
                costAlloy: 200
            }
        };

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

        // Default seeds inside initialization
        window.onload = function() {
            if (localStorage.getItem('solar_expanse_v3_db')) {
                database = JSON.parse(localStorage.getItem('solar_expanse_v3_db'));
            } else {
                // Initialize clean demo dataset matching user's system constraints
                database = {
                    "luna": {
                        popTot: 500,
                        popOcc: 0,
                        buildings: [
                            defaultBuilding.silicon,
                            defaultBuilding.glass
                        ],
                        planned: {
                            "b1": 18,
                            "b2": 10,
                        }
                    },
                };
                saveToLocalStorage();
            }

            const storedActiveColony = localStorage.getItem('solar_expanse_v3_active_colony');
            const keys = Object.keys(database);
            if (storedActiveColony && database[storedActiveColony]) {
                activeColonyKey = storedActiveColony;
            } else if (keys.length > 0) {
                activeColonyKey = keys[0];
            } else {
                activeColonyKey = "Terra Nuova";
                database[activeColonyKey] = createColonyTemplate();
                saveToLocalStorage();
            }

            // Sync dynamic state of building type select inside Modal
            document.getElementById('bType').addEventListener('change', function() {
                const rateFieldCont = document.getElementById('rateFieldContainer');
                const producerFields = document.getElementById('producerFields');
                const label = document.getElementById('bRateLabel');

                if (this.value === 'producer') {
                    rateFieldCont.classList.add('hidden');
                    producerFields.classList.remove('hidden');
                } else {
                    rateFieldCont.classList.remove('hidden');
                    producerFields.classList.add('hidden');
                    label.innerText = "Consumo Ciclo";
                }
            });

            populateDefaultBuildingSelector();
            populateColonySelector();
            loadColonyDirectly(activeColonyKey);
        };

        // Utility: Template generator
        function createColonyTemplate() {
            return {
                popTot: 1000,
                popOcc: 300,
                buildings: [
                    defaultBuilding.iron,
                    defaultBuilding.alloy
                ],
                planned: {
                    "b3": 0,
                    "b4": 0
                }
            };
        }

        // Save State inside Browser Cache
        function saveToLocalStorage() {
            localStorage.setItem('solar_expanse_v3_db', JSON.stringify(database));
            localStorage.setItem('solar_expanse_v3_active_colony', activeColonyKey);
        }

        // Populate Colony Switcher select dropdown
        function populateColonySelector() {
            const selector = document.getElementById('colonySelector');
            selector.innerHTML = '';

            Object.keys(database).forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                if (name === activeColonyKey) opt.selected = true;
                selector.appendChild(opt);
            });
        }

        /**
         * Generic combination solver. Finds combinations of counts of dynamic buildings
         * that use up to freePop of workers without rendering resources balance < 0.
         */
        function solveCombinations(buildings, freePop) {
            let solutions = [];
            let iterations = 0;
            const maxIterations = 20000; // Keep recursion bounded to prevent page lock-up

            function search(bIndex, currentCounts, usedPop, netBalance, totalMetal, totalAlloy) {
                iterations++;
                if (iterations > maxIterations) return; // safety halt

                if (bIndex === buildings.length) {
                    if (netBalance >= 0 && usedPop <= freePop) {
                        solutions.push({
                            counts: { ...currentCounts },
                            employed: usedPop,
                            unemployed: freePop - usedPop,
                            balance: netBalance,
                            metal: totalMetal,
                            alloy: totalAlloy,
                            utilizationRate: freePop > 0 ? (usedPop / freePop) * 100 : 0
                        });
                    }
                    return;
                }

                const b = buildings[bIndex];
                const maxUnits = Math.floor((freePop - usedPop) / b.popReq);

                for (let count = 0; count <= maxUnits; count++) {
                    currentCounts[b.id] = count;
                    const nextPop = usedPop + (count * b.popReq);
                    const effect = b.type === 'producer' ? (count * b.rate) : -(count * b.rate);
                    const nextBalance = netBalance + effect;
                    const nextMetal = totalMetal + (count * b.costMetal);
                    const nextAlloy = totalAlloy + (count * b.costAlloy);

                    search(bIndex + 1, currentCounts, nextPop, nextBalance, nextMetal, nextAlloy);
                }
            }

            if (buildings.length > 0) {
                search(0, {}, 0, 0, 0, 0);
            }
            return solutions;
        }

        // Main orchestration driver. Pass rebuildDOM = true to rebuild HTML cards/sliders, false to preserve input focus
        function calculateAll(rebuildDOM = false) {
            const popTotale = parseInt(document.getElementById('popTotale').value) || 0;
            const popOccupata = parseInt(document.getElementById('popOccupata').value) || 0;
            const freePop = Math.max(0, popTotale - popOccupata);
            document.getElementById('popLiberaBadge').innerText = freePop;

            const colony = database[activeColonyKey];
            if (!colony) return;

            // Sync demographic inputs with model
            colony.popTot = popTotale;
            colony.popOcc = popOccupata;

            saveToLocalStorage();

            // Dynamic building array
            const buildings = colony.buildings || [];

            // Refresh building manager view only when requested (prevents input focus loss)
            if (rebuildDOM) {
                renderBuildingList(buildings);
                renderSandboxSliders(buildings, freePop);
            }

            // Retrieve current manual values from the rendered sliders
            let popImpiegata = 0;
            let prodRisorse = 0;
            let consRisorse = 0;
            let costTotalMetal = 0;
            let costTotalAlloy = 0;

            buildings.forEach(b => {
                const count = colony.planned[b.id] || 0;
                popImpiegata += count * b.popReq;
                if (b.type === 'producer') {
                    prodRisorse += count * b.rate;
                } else {
                    consRisorse += count * b.rate;
                }
                costTotalMetal += count * b.costMetal;
                costTotalAlloy += count * b.costAlloy;
            });

            const bilancioRisorse = prodRisorse - consRisorse;

            // Render Demographics Bar
            document.getElementById('hudPopImpiegata').innerText = popImpiegata;
            document.getElementById('hudPopLiberaTot').innerText = `/ ${freePop}`;
            const popPercentage = freePop > 0 ? Math.min(100, Math.round((popImpiegata / freePop) * 100)) : 0;
            document.getElementById('hudPopBar').style.width = `${popPercentage}%`;
            document.getElementById('hudPopPercentage').innerText = `${popPercentage}% Impiegata`;

            // Balance indicator box styling
            const balanceHUD = document.getElementById('hudResourceBalance');
            const hudCard = document.getElementById('hudResourceCard');
            document.getElementById('hudResProd').innerText = formatNum(prodRisorse);
            document.getElementById('hudResCons').innerText = formatNum(consRisorse);

            if (bilancioRisorse < 0) {
                balanceHUD.innerText = formatNum(bilancioRisorse);
                balanceHUD.className = "text-3xl font-orbitron font-bold text-red-500 animate-pulse";
                hudCard.className = "bg-slate-900/40 border border-red-950/50 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.05)]";
            } else if (bilancioRisorse === 0) {
                balanceHUD.innerText = "0 (Pari)";
                balanceHUD.className = "text-3xl font-orbitron font-bold text-sky-400";
                hudCard.className = "bg-slate-900/40 border border-sky-950/50 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300";
            } else {
                balanceHUD.innerText = `+${formatNum(bilancioRisorse)}`;
                balanceHUD.className = "text-3xl font-orbitron font-bold text-emerald-400";
                hudCard.className = "bg-slate-900/40 border border-emerald-950/50 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.05)]";
            }

            // HUD costs (metal/alloy only)
            document.getElementById('hudCostMet').innerText = formatNum(costTotalMetal);
            document.getElementById('hudCostLeg').innerText = formatNum(costTotalAlloy);

            // Status feedback bar
            const statusInd = document.getElementById('feedbackStatusIndicator');
            const feedbackText = document.getElementById('feedbackText');

            if (popImpiegata === 0) {
                statusInd.className = "w-2.5 h-2.5 rounded-full bg-slate-500";
                feedbackText.innerText = "Nessun edificio programmato nel piano Sandbox attuale.";
            } else if (popImpiegata > freePop) {
                statusInd.className = "w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse";
                feedbackText.innerHTML = `<strong>Over-Allocazione Demografica!</strong> Servono altri <span class="text-red-400 font-bold font-mono">${popImpiegata - freePop}</span> cittadini liberi.`;
            } else if (bilancioRisorse < 0) {
                statusInd.className = "w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse";
                feedbackText.innerHTML = `<strong>Deficit di Risorse!</strong> Sovraccarico dei consumi industriali di <span class="text-red-400 font-bold font-mono">${formatNum(Math.abs(bilancioRisorse))}</span> unità/ciclo.`;
            } else {
                statusInd.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
                feedbackText.innerHTML = `<strong>Impianti Stabili!</strong> Cittadini rimasti inattivi: <span class="text-emerald-400 font-bold font-mono">${freePop - popImpiegata}</span>. Accumulo: <span class="text-emerald-400 font-bold font-mono">+${formatNum(bilancioRisorse)}</span>.`;
            }

            // Trigger recommendations
            runOptimizationEngine(buildings, freePop);
            renderDatabaseTable();
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
                    typeBadge = `<span id="badge_rate_${b.id}" class="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded text-[9px] uppercase font-bold">Produttore (+${formatNum(b.rate)})</span>`;

                    const prodTotVal = b.prodTotale !== undefined ? b.prodTotale : 100;
                    const numMiniereVal = b.numMiniere !== undefined ? b.numMiniere : 10;

                    planetSpecificHtml = `
                        <div class="mt-2.5 p-2 bg-slate-900/60 rounded-lg border border-slate-800/40 space-y-1.5">
                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Calcolo Resa Planetaria</span>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="text-[8px] text-slate-500 block uppercase font-semibold">Prod. Totale</label>
                                    <input type="number" step="any" value="${prodTotVal}"
                                           oninput="updateMineProduction('${b.id}', this.value, 'prodTotale')"
                                           class="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500">
                                </div>
                                <div>
                                    <label class="text-[8px] text-slate-500 block uppercase font-semibold">N. Miniere</label>
                                    <input type="number" step="1" value="${numMiniereVal}"
                                           oninput="updateMineProduction('${b.id}', this.value, 'numMiniere')"
                                           class="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500">
                                </div>
                            </div>
                            <div class="text-[9px] text-amber-500 font-mono text-right font-semibold">
                                Resa Singola: <span id="span_rate_${b.id}" class="text-slate-200">${formatNum(b.rate)}</span> /ciclo
                            </div>
                        </div>
                    `;
                } else {
                    typeBadge = `<span class="bg-purple-500/10 border border-purple-500/20 text-purple-500 px-2 py-0.5 rounded text-[9px] uppercase font-bold">Consumatore (-${formatNum(b.rate)})</span>`;
                }

                const card = document.createElement('div');
                card.className = `bg-slate-950 border ${isChecked ? 'border-slate-850' : 'border-slate-900 opacity-60'} p-3.5 rounded-xl space-y-2 relative overflow-hidden group hover:border-slate-700 transition-colors`;
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
                    <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1.5 border-t border-slate-900 font-mono">
                        <div class="flex justify-between">
                            <span>Cost. Metallo:</span>
                            <span class="text-slate-200 font-semibold">${formatNum(b.costMetal)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Cost. Lega:</span>
                            <span class="text-yellow-500 font-semibold">${formatNum(b.costAlloy)}</span>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        // Toggle the selected state of a building
        function toggleBuildingSelection(bId) {
            const colony = database[activeColonyKey];
            if (!colony) return;
            const b = colony.buildings.find(x => x.id === bId);
            if (!b) return;

            b.selected = (b.selected === false) ? true : false;

            saveToLocalStorage();
            calculateAll(true); // Re-render everything because selection affects optimizations and sandboxes
            triggerToast(`Stato edificio '${b.name}' aggiornato`, "blue");
        }

        // Dynamic in-card input controller that modifies and calculates without focus-loss
        function updateMineProduction(bId, value, field) {
            const colony = database[activeColonyKey];
            if (!colony) return;
            const b = colony.buildings.find(x => x.id === bId);
            if (!b) return;

            b[field] = parseInputFloat(value);

            // Recompute single mine rate: rate = prodTotale / numMiniere
            const prodTot = b.prodTotale !== undefined ? b.prodTotale : 100;
            const numM = b.numMiniere !== undefined ? b.numMiniere : 10;
            b.rate = numM > 0 ? (prodTot / numM) : 0;

            // Update specific text nodes directly to avoid re-rendering entire list and breaking focus
            const spanRate = document.getElementById(`span_rate_${bId}`);
            if (spanRate) spanRate.innerText = formatNum(b.rate);

            const badgeRate = document.getElementById(`badge_rate_${bId}`);
            if (badgeRate) badgeRate.innerText = `Produttore (+${formatNum(b.rate)})`;

            saveToLocalStorage();
            calculateAll(false); // compute math on HUDs, sliders, and solver WITHOUT rebuilding Left DOM lists
        }

        // Generates inputs dynamically for the Sandbox Panel
        function renderSandboxSliders(buildings, freePop) {
            const container = document.getElementById('sandboxSlidersContainer');
            container.innerHTML = '';

            if (buildings.length === 0) {
                container.innerHTML = `<div class="col-span-2 text-center text-slate-500 text-xs py-4">Nessun edificio registrato. Creane uno per configurare il Sandbox.</div>`;
                return;
            }

            const colony = database[activeColonyKey];

            buildings.forEach(b => {
                const val = colony.planned[b.id] || 0;
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
                        <span>0</span>
                        <span>Max Calcolato: ${Math.floor(freePop / b.popReq)}</span>
                    </div>
                `;
                container.appendChild(block);
            });
        }

        // Sync visual sliders with the numerical value inputs
        function syncSandboxCounts(bId, source) {
            const colony = database[activeColonyKey];
            if (!colony) return;

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
            colony.planned[bId] = val;
            saveToLocalStorage();
            calculateAll(false); // update HUD and recommendations smoothly
        }

        // Reset Sandbox parameters
        function resetSandbox() {
            const colony = database[activeColonyKey];
            if (!colony) return;

            Object.keys(colony.planned).forEach(id => {
                colony.planned[id] = 0;
            });
            calculateAll(true);
            triggerToast("Sandbox resettato a zero", "blue");
        }

        // Solve optimizations according to the selected colony metrics
        function runOptimizationEngine(buildings, freePop) {
            const container = document.getElementById('optimizationsContainer');
            container.innerHTML = '';

            if (buildings.length === 0) {
                container.innerHTML = `
                    <div class="col-span-3 text-center py-6 text-slate-500 text-xs">
                        Aggiungi almeno un impianto industriale nel registro per abilitare il risolutore.
                    </div>
                `;
                return;
            }

            // Filter only the selected buildings
            const activeBuildings = buildings.filter(b => b.selected !== false);

            const hasProducer = activeBuildings.some(b => b.type === 'producer');
            const hasConsumer = activeBuildings.some(b => b.type === 'consumer');

            // Enforce mandatory selection constraint: at least 1 producer and 1 consumer
            if (!hasProducer || !hasConsumer) {
                container.innerHTML = `
                    <div class="col-span-3 text-center py-6 text-amber-400 font-semibold bg-amber-950/20 rounded-xl border border-amber-900/40 text-xs px-4 flex flex-col items-center justify-center gap-2">
                        <svg class="w-6 h-6 text-amber-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Seleziona obbligatoriamente almeno una miniera (produttore) e una fabbrica (consumatore) per avviare il calcolo delle strategie!</span>
                    </div>
                `;
                return;
            }

            const allSolutions = solveCombinations(activeBuildings, freePop);

            if (allSolutions.length === 0) {
                container.innerHTML = `
                    <div class="col-span-3 text-center py-6 text-red-400 font-semibold bg-red-950/20 rounded-xl border border-red-900/40 text-xs px-4">
                        Nessun assetto sostenibile trovato con gli edifici selezionati! La popolazione non è sufficiente o il bilancio non è stabile.
                    </div>
                `;
                return;
            }

            // Strategy 1: Max employment
            const maxEmploySolution = [...allSolutions].sort((a,b) => {
                if (b.employed !== a.employed) return b.employed - a.employed;
                return a.balance - b.balance;
            })[0];

            // Strategy 2: Best Balance (lowest surplus above 0)
            const perfectBalanceSolution = [...allSolutions]
                .filter(s => s.employed > 0)
                .sort((a,b) => {
                    if (a.balance !== b.balance) return a.balance - b.balance;
                    return b.employed - a.employed;
                })[0] || allSolutions[0];

            // Strategy 3: Lowest build cost (Metal + Alloy)
            const economySolution = [...allSolutions]
                .filter(s => s.employed >= (maxEmploySolution ? maxEmploySolution.employed : 0) * 0.4 && s.employed > 0)
                .sort((a,b) => {
                    const costA = a.metal + a.alloy;
                    const costB = b.metal + b.alloy;
                    return costA - costB;
                })[0] || allSolutions[0];

            const strategies = [
                {
                    title: "Massima Occupazione",
                    desc: "Sfrutta al meglio i cittadini liberi minimizzando la disoccupazione.",
                    sol: maxEmploySolution,
                    badge: "Max Impiego",
                    color: "from-blue-600 to-cyan-600",
                    border: "border-blue-900/50"
                },
                {
                    title: "Equilibrio Circolare",
                    desc: "Ottimizza i cicli per consumare quasi tutto l'estratto (spreco zero).",
                    sol: perfectBalanceSolution,
                    badge: "Spreco Zero",
                    color: "from-emerald-600 to-teal-600",
                    border: "border-emerald-900/50"
                },
                {
                    title: "Economia di Scala",
                    desc: "La combinazione che richiede la minor quantità di Metallo e Lega.",
                    sol: economySolution,
                    badge: "Pianificazione Economica",
                    color: "from-purple-600 to-indigo-600",
                    border: "border-purple-900/50"
                }
            ];

            // Render cards
            strategies.forEach(strategy => {
                if (!strategy.sol) return;

                // Build breakdown list
                let breakdownHtml = "";
                activeBuildings.forEach(b => {
                    const count = strategy.sol.counts[b.id] || 0;
                    if (count > 0) {
                        breakdownHtml += `<div class="flex justify-between text-slate-400">
                            <span>${b.name}:</span>
                            <strong class="text-slate-200 font-mono">${count}x</strong>
                        </div>`;
                    }
                });

                if (!breakdownHtml) {
                    breakdownHtml = `<div class="text-slate-500 italic">Nessun impianto costruito</div>`;
                }

                const cardHtml = `
                    <div class="bg-slate-950/80 border ${strategy.border} rounded-xl p-4 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200 text-xs">
                        <div class="space-y-3">
                            <div class="flex justify-between items-start">
                                <span class="text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-400">${strategy.badge}</span>
                                <span class="text-[10px] text-slate-500 font-mono">Uso Pop: ${Math.round(strategy.sol.utilizationRate)}%</span>
                            </div>
                            <div>
                                <h4 class="font-orbitron font-bold text-sm text-slate-100">${strategy.title}</h4>
                                <p class="text-[11px] text-slate-400 mt-1">${strategy.desc}</p>
                            </div>

                            <div class="bg-slate-900/30 p-2.5 rounded-lg border border-slate-900 space-y-1.5">
                                ${breakdownHtml}
                                <div class="border-t border-slate-800 my-1"></div>
                                <div class="flex justify-between text-[11px]">
                                    <span class="text-slate-500">Saldo Risorse:</span>
                                    <strong class="text-emerald-400 font-mono">+${formatNum(strategy.sol.balance)}</strong>
                                </div>
                                <div class="grid grid-cols-2 gap-2 text-[9px] font-mono text-center pt-1.5 border-t border-slate-900">
                                    <div class="bg-slate-950/80 p-1 rounded border border-slate-850">
                                        <div class="text-slate-400 font-bold">Metallo</div>
                                        <div class="text-slate-200 font-bold">${formatNum(strategy.sol.metal)}</div>
                                    </div>
                                    <div class="bg-slate-950/80 p-1 rounded border border-slate-850">
                                        <div class="text-yellow-500 font-bold">Lega</div>
                                        <div class="text-slate-200 font-bold">${formatNum(strategy.sol.alloy)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onclick="applyConfiguration('${encodeURIComponent(JSON.stringify(strategy.sol.counts))}')" class="mt-4 w-full py-2 bg-gradient-to-r ${strategy.color} hover:brightness-110 text-white rounded-lg text-xs font-semibold font-orbitron transition shadow-md">
                            APPLICA SCENARIO
                        </button>
                    </div>
                `;
                container.innerHTML += cardHtml;
            });
        }

        // Apply a pre-made calculation setup to sandbox sliders
        function applyConfiguration(encodedCounts) {
            const counts = JSON.parse(decodeURIComponent(encodedCounts));
            const colony = database[activeColonyKey];
            if (!colony) return;

            // Apply to model
            colony.planned = { ...counts };

            calculateAll(true);
            triggerToast(`Configurazione scenario applicata con successo!`, "emerald");
        }

        // Renders database table dynamically based on current local values
        function renderDatabaseTable() {
            const tbody = document.getElementById('colonyDatabaseBody');
            tbody.innerHTML = '';

            const keys = Object.keys(database);
            if (keys.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="py-4 text-center text-slate-500 font-sans">Nessuna colonia caricata nel database locale.</td>
                    </tr>
                `;
                return;
            }

            keys.forEach(name => {
                const item = database[name];
                const freePop = item.popTot - item.popOcc;

                // Aggregated data
                let totalCostMetal = 0;
                let totalCostAlloy = 0;
                let surplus = 0;
                let buildSummary = [];

                item.buildings.forEach(b => {
                    const count = item.planned[b.id] || 0;
                    totalCostMetal += count * b.costMetal;
                    totalCostAlloy += count * b.costAlloy;

                    if (b.type === 'producer') {
                        surplus += count * b.rate;
                    } else {
                        surplus -= count * b.rate;
                    }

                    if (count > 0) {
                        buildSummary.push(`${count}x ${b.name.split(' ')[0]}`); // shortened name
                    }
                });

                const buildingsSummaryText = item.buildings.length > 0
                    ? `${item.buildings.length} Tipi`
                    : "0 Edifici";

                const tr = document.createElement('tr');
                tr.className = `hover:bg-slate-900/30 transition-colors ${name === activeColonyKey ? 'bg-slate-900/20' : ''}`;
                tr.innerHTML = `
                    <td class="py-3 font-semibold text-slate-200 font-orbitron font-sans">${name}</td>
                    <td class="py-3">${item.popTot} (${freePop})</td>
                    <td class="py-3 text-purple-400">${buildingsSummaryText}</td>
                    <td class="py-3 text-slate-300 text-xs">${buildSummary.join(', ') || 'Nessuno'}</td>
                    <td class="py-3">
                        <div class="flex gap-2">
                            <span class="text-slate-300" title="Metallo">${formatNum(totalCostMetal)} M</span>
                            <span class="text-yellow-500" title="Lega">${formatNum(totalCostAlloy)} L</span>
                        </div>
                    </td>
                    <td class="py-3 text-right font-sans space-x-1 whitespace-nowrap">
                        <button onclick="loadColonyDirectly('${name}')" class="text-xs bg-slate-900 hover:bg-blue-600 hover:text-white border border-slate-800 px-2 py-0.5 rounded transition">Carica</button>
                        <button onclick="deleteColony('${name}')" class="text-xs text-red-400 hover:bg-red-900 hover:text-white px-2 py-0.5 rounded transition">Rimuovi</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Direct loader of Colony Data object
        function loadColonyDirectly(name) {
            if (!database[name]) return;
            activeColonyKey = name;

            saveToLocalStorage();

            const data = database[name];

            // Set Demographic inputs
            document.getElementById('popTotale').value = data.popTot;
            document.getElementById('popOccupata').value = data.popOcc;

            // Keep Colony selector in sync
            document.getElementById('colonySelector').value = name;

            calculateAll(true);
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

        // Save current configurations back into the active colony database model
        function saveCurrentColony() {
            if (!activeColonyKey) {
                triggerToast("Seleziona o crea una colonia prima di salvare", "red");
                return;
            }

            const colony = database[activeColonyKey];
            colony.popTot = parseInt(document.getElementById('popTotale').value) || 0;
            colony.popOcc = parseInt(document.getElementById('popOccupata').value) || 0;

            saveToLocalStorage();
            calculateAll(true);
            triggerToast(`Configurazioni di '${activeColonyKey}' salvate nel database!`, "emerald");
        }

        // Open Dialog/Modal to Create Colony
        function openCreateColonyModal() {
            document.getElementById('newColonyName').value = '';
            document.getElementById('colonyModal').classList.remove('hidden');
        }

        function closeColonyModal() {
            document.getElementById('colonyModal').classList.add('hidden');
        }

        // Confirm new colony creation
        function confirmCreateColony() {
            const name = document.getElementById('newColonyName').value.trim();
            if (!name) {
                triggerToast("Inserisci un nome valido per la colonia", "red");
                return;
            }
            if (database[name]) {
                triggerToast("Esiste già una colonia con questo nome!", "red");
                return;
            }

            // Create new template entry
            database[name] = createColonyTemplate();
            activeColonyKey = name;

            saveToLocalStorage();
            populateColonySelector();
            loadColonyDirectly(name);
            closeColonyModal();
            triggerToast(`Colonia '${name}' creata!`, "emerald");
        }

        // Open Dialog/Modal to Rename Colony
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
            if (database[newName]) {
                triggerToast("Esiste già un'altra colonia con questo nome!", "red");
                return;
            }

            // Perform rename swap in JS Object
            const tempObject = database[activeColonyKey];
            delete database[activeColonyKey];
            database[newName] = tempObject;
            activeColonyKey = newName;

            saveToLocalStorage();
            populateColonySelector();
            calculateAll(true);
            closeRenameColonyModal();
            triggerToast(`Colonia rinominata in '${newName}'!`, "emerald");
        }

        // Delete Colony from list
        function deleteColony(name) {
            if (Object.keys(database).length <= 1) {
                triggerToast("Impossibile eliminare l'unica colonia rimasta!", "red");
                return;
            }

            if (database[name]) {
                delete database[name];
                saveToLocalStorage();

                const remainingKeys = Object.keys(database);
                activeColonyKey = remainingKeys[0];

                populateColonySelector();
                loadColonyDirectly(activeColonyKey);
                triggerToast(`Colonia '${name}' rimossa definitivamente.`, "red");
            }
        }

        // Dynamic Building Modals Logic
        function openBuildingModal(editId = null) {
            const modal = document.getElementById('buildingModal');
            const title = document.getElementById('buildingModalTitle');
            const editIdField = document.getElementById('editBuildingId');
            const defaultBuildingSelector = document.getElementById('defaultBuildingSelector');

            defaultBuildingSelector.value = '';

            // Form Fields
            const nameField = document.getElementById('bName');
            const typeField = document.getElementById('bType');
            const popReqField = document.getElementById('bPopReq');
            const rateField = document.getElementById('bRate');

            // Planet specific fields
            const prodTotaleField = document.getElementById('bProdTotale');
            const numMiniereField = document.getElementById('bNumMiniere');

            const costMetalField = document.getElementById('bCostMetal');
            const costAlloyField = document.getElementById('bCostAlloy');

            if (editId) {
                title.innerText = "Modifica Edificio";
                editIdField.value = editId;

                const colony = database[activeColonyKey];
                const building = colony.buildings.find(b => b.id === editId);

                if (building) {
                    nameField.value = building.name;
                    typeField.value = building.type;
                    popReqField.value = building.popReq;

                    rateField.value = building.rate || 0;
                    prodTotaleField.value = building.prodTotale !== undefined ? building.prodTotale : 100;
                    numMiniereField.value = building.numMiniere !== undefined ? building.numMiniere : 10;

                    costMetalField.value = building.costMetal;
                    costAlloyField.value = building.costAlloy;
                }
            } else {
                title.innerText = "Nuovo Edificio";
                editIdField.value = "";

                // Clear to defaults
                nameField.value = "";
                typeField.value = "producer";
                popReqField.value = "10";
                rateField.value = "5";
                prodTotaleField.value = "100";
                numMiniereField.value = "10";
                costMetalField.value = "40";
                costAlloyField.value = "10";
            }

            document.getElementById('bType').dispatchEvent(new Event('change'));
            modal.classList.remove('hidden');
        }

        function closeBuildingModal() {
            document.getElementById('buildingModal').classList.add('hidden');
        }

        function populateDefaultBuildingSelector() {
            const selector = document.getElementById('defaultBuildingSelector');
            selector.innerHTML = '<option value="">Seleziona un edificio predefinito</option>';

            Object.keys(defaultBuilding).forEach(key => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = key;
                selector.appendChild(option);
            });
        }

        function loadDefaultBuilding(key) {
            const building = defaultBuilding[key];
            if (!building) return;

            document.getElementById('bName').value = building.name || '';
            document.getElementById('bType').value = building.type || 'consumer';
            document.getElementById('bPopReq').value = building.popReq ?? 1;
            document.getElementById('bRate').value = building.rate ?? 0;
            document.getElementById('bProdTotale').value = building.prodTotale ?? 0;
            document.getElementById('bNumMiniere').value = building.numMiniere ?? 1;
            document.getElementById('bCostMetal').value = building.costMetal ?? 0;
            document.getElementById('bCostAlloy').value = building.costAlloy ?? 0;
            document.getElementById('bType').dispatchEvent(new Event('change'));
        }

        // Adds or updates a building in the current active colony
        function saveBuilding() {
            const colony = database[activeColonyKey];
            if (!colony) return;

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
