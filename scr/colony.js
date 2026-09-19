class colony {
    
    buildings = [];
    set popTot(value) {
        this._popTot = value;
        this.freePop = this._popTot - this._popOcc;
    }
    get popTot() {
        return this._popTot;
    }
    set popOcc(value) {
        this._popOcc = value;
        this.freePop = this._popTot - this._popOcc;
    }
    get popOcc() {
        return this._popOcc;
    }
    _popTot = 500;
    _popOcc = 100;
    freePop = 400;
    name = "";
    planned = {};
    optimal = {};
    utilizationPopRate = {};// {risorsa:percentuale,...}
    /**
     * 
     * @param {string} name 
     * @param {building[]} buildings optional array of building objects to initialize the colony with
     * @param {Object} depositRate optional object containing deposit rates for each resource type, e.g. {silicon: 0.5, iron: 0.8}  
     */
    constructor(name, buildings = []) {
        this.name = name;

        
        //add control to check if buildings is an array of building objects
        if (Array.isArray(buildings)) {
            for (let b in buildings)
                this.addBuilding(buildings[b]);
        }
    }
    /**
     * Adds a new building to the colony
     * @param {object} buildingData - an object containing the building data
     */
    addBuilding(buildingData) {
        let newBuilding = new building(buildingData);
        this.buildings.push(newBuilding);
        this.buildings.sort(function (a, b) {
            let a1 = Array.isArray(a.resourceType) ? a.resourceType[0] : a.resourceType;
            let b1 = Array.isArray(b.resourceType) ? b.resourceType[0] : b.resourceType;
            return a1.localeCompare(b1);
        });
    }
    
    findBuildingByResourceType(resourceType) {
        return this.buildings.find(building => building.resourceType === resourceType);
    }
    calcReduction() {
        this.buildings.forEach(v => v.calcReduction());
    }
    getUtilizationPopRate(key) {
        return (this.utilizationPopRate[key] || 0);
    }
}