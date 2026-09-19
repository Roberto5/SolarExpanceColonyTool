class deposit {
    modal;
    resourceTypeSelector;
    depositRateInput;
    removeButton;
    resourcePreview;
    constructor() {
        this.modal = document.getElementById('resourceModal');
        this.resourceTypeSelector = document.getElementById('resourceTypeSelector');
        this.depositRateInput = document.getElementById('depositRateInput');
        this.removeButton = document.getElementById('removeDepositButton');
        this.resourcePreview = document.getElementById('resourcePreview');
        this.resourceTypeSelector.innerHTML = '<option value="">Seleziona un tipo di risorsa</option>';
        Object.keys(resourcesTypes).forEach(key => {
            const option = document.createElement('option');
            option.value = resourcesTypes[key];
            option.textContent = resourcesTypes[key];
            this.resourceTypeSelector.appendChild(option);
        });
    }
    open(edit = false, type = "") {
        if (edit) {
            this.resourceTypeSelector.value = type;
            this.resourceTypeSelector.disabled = true;
            this.depositRateInput.value = activeColony.depositRate[type] || '';
            this.removeButton.classList.remove('hidden');
            this.changeImagePreview(type);
        } else {
            this.resourceTypeSelector.value = '';
            this.resourceTypeSelector.disabled = false;
            this.depositRateInput.value = '';
            this.removeButton.classList.add('hidden');
            this.changeImagePreview(type);
        }
        this.modal.classList.remove('hidden');
    }

    close() {
        this.modal.classList.add('hidden');
    }
    changeImagePreview(value) {
        if (value === "") {
            this.resourcePreview.src = "";
            this.resourcePreview.classList.add('hidden');
        }
        else {
            this.resourcePreview.classList.remove('hidden');
            this.resourcePreview.src = `img/${value}.png`;
            this.resourcePreview.alt = value;
            this.resourcePreview.title = value;
        }
    }
    confirmAddResource() {
        const resourceType = this.resourceTypeSelector.value;
        const depositRateInput = this.depositRateInput.value;
        activeColony = database.colonies.find(c => c.name === activeColonyKey);
        if (!resourceType) {
            triggerToast("Seleziona un tipo di risorsa", "red");
            return;
        }

        const depositRate = parseInputFloat(depositRateInput);
        if (isNaN(depositRate) || depositRate <= 0) {
            triggerToast("Inserisci un tasso di produzione valido", "red");
            return;
        }

        try {
            activeColony.addDepositRate(resourceType, depositRate);
            triggerToast(`Tasso di produzine per ${resourceType} aggiunto: ${depositRate}`, "green");
            this.close();
            calculateAll(true);
        } catch (error) {
            triggerToast(error.message, "red");
        }
        populateResourceList();
    }
    removeDeposit() {
        const type = this.resourceTypeSelector.value;
        delete activeColony.depositRate[type];
        triggerToast(`Tasso di produzione per ${type} rimosso`, "blue");
        populateResourceList();
        calculateAll(true);
        this.close();
    }
}