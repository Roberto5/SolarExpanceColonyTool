class building {
    id;
    name;
    type;
    popReq;
    production;
    rate;
    cost;
    selected;
    resourceType;

    constructor(buildingData) {
        if (buildingData !== null && typeof buildingData == "object") {
            for (const key in defaultBuilding[buildingData.id]) {


                this[key] = buildingData[key];



            }
        }
    }
    calcReduction() {
        let rc = 1 - parseInputFloat(database.reduction.c) / 100;
        let rp = 1 - parseInputFloat(database.reduction.p) / 100;
        this.popReq = Math.round( defaultBuilding[this.id].popReq * rp);
        for (let k in this.cost) {
            this.cost[k] = Math.round(defaultBuilding[this.id].cost[k] * rc);
        }
    }
}

let defaultBuilding = {
    SiliconMine: {
        id: "SiliconMine",
        name: "Miniera di silicio",
        type: "producer",
        production: 0.62,
        popReq: 5,
        selected: true,
        cost: { iron: 125 },
        resourceType: "silicon"
    },
    IronMine: {
        id: "IronMine",
        name: "Miniera di metallo",
        type: "producer",
        popReq: 5,
        cost: { iron: 125 },
        production: 1.8,
        selected: true,
        resourceType: "iron"
    }, CarbonMine: {
        id: "CarbonMine",
        name: "Miniera di carbonio",
        type: "producer", popReq: 5,
        production: 0.01,
        cost: { iron: 125 },
        selected: true,
        resourceType: "carbon"
    },
    WaterMine: {
        id: "WaterMine",
        name: "Miniera di acqua",
        type: "producer", popReq: 5,
        production: 0.62,
        cost: { iron: 125 },
        selected: true,
        resourceType: "water"
    },
    NobleMine: {
        id: "NobleMine",
        name: "Miniera di gas nobili",
        type: "producer", popReq: 5,
        production: 0.12,
        cost: { iron: 125 },
        selected: true,
        resourceType: "noble"
    },
    NitrogenMine: {
        id: "NitrogenMine",
        name: "Miniera di azoto",
        type: "producer", popReq: 5,
        production: 0.01,
        cost: { iron: 125 },
        selected: true,
        resourceType: "nitrogen"
    },
    OxygenMine: {
        id: "OxygenMine",
        name: "Miniera di ossigeno",
        type: "producer", popReq: 5,
        production: 0.12,
        cost: { iron: 125 },
        selected: true,
        resourceType: "oxygen"
    },
    CO2Mine: {
        id: "CO2Mine",
        name: "Miniera di CO2",
        type: "producer", popReq: 5,
        production: 0.01,
        cost: { iron: 125 },
        selected: true,
        resourceType: "co2"
    },
    FuelMine: {
        id: "FuelMine",
        name: "Miniera di carburante",
        type: "producer", popReq: 5,
        production: 0.01,
        cost: { iron: 125 },
        selected: true,
        resourceType: "fuel"
    },
    HydrogenMine: {
        id: "HydrogenMine",
        name: "Miniera di idrogeno",
        type: "producer", popReq: 5,
        production: 0.01,
        cost: { iron: 125 },
        selected: true,
        resourceType: "hydrogen"
    },
    RareMetalMine: {
        id: "RareMetalMine",
        name: "Miniera di metalli rari",
        type: "producer", popReq: 5,
        production: 1.75,
        cost: { iron: 125 },
        selected: true,
        resourceType: "rareMetal"
    },
    FissileMine: {
        id: "FissileMine",
        name: "Miniera di materiale fissile",
        type: "producer", popReq: 10,
        production: 1,
        cost: { iron: 125 },
        selected: true,
        resourceType: "fissile"
    },
    Helium3Mine: {
        id: "Helium3Mine",
        name: "Miniera di elio-3",
        type: "producer", popReq: 20,
        production: 0.5,
        cost: { iron: 125 },
        selected: true,
        resourceType: "elio3"
    },
    ElectronicsFactory: {
        id: "ElectronicsFactory",
        name: "Fabbrica di electronics",
        type: "consumer",
        popReq: 40,
        rate: [0.2, 0.15, 0.01],
        selected: true,
        cost: { alloy: 200, eletronics: 10 },
        resourceType: ["silicon", "rareMetal", "noble"]
    },
    ExoticAlloyFactory: {
        id: "ExoticAlloyFactory",
        name: "Fabbrica di leghe esotiche",
        type: "consumer",
        popReq: 20,
        rate: [0.9, 0.01,],
        cost: { alloy: 300, eletronics: 20, rareMetal: 50 },
        selected: true,
        resourceType: ["rareMetal", "fissile"],
    },
    FuelRefinery: {
        id: "FuelRefinery",
        name: "Raffineria di carburante",
        type: "consumer",
        popReq: 5,
        rate: [0.09],
        cost: { iron: 50, rareMetal: 10 },
        selected: true,
        resourceType: ["water"],
    },
    EletrolysisPlant: {
        id: "ElectrolysisPlant",
        name: "Impianto di elettrolisi",
        type: "consumer",
        popReq: 10,
        rate: [0.09],
        cost: { iron: 50 },
        selected: true,
        resourceType: ["water"],
    },
    GlassFactory: {
        id: "GlassFactory",
        name: "Fonderia di vetro",
        type: "consumer",
        popReq: 10,
        rate: [0.1],
        cost: { alloy: 300 },
        selected: true,
        resourceType: ["silicon"]
    },
    AlloyFactory: {
        id: "AlloyFactory",
        name: "Fonderia di lega",
        type: "consumer",
        popReq: 10,
        rate: [0.15],
        cost: { iron: 300 },
        selected: true,
        resourceType: ["iron"]
    },
    PolymerFactory: {
        id: "PolymerFactory",
        name: "Fonderia di polimery",
        type: "consumer",
        popReq: 10,
        rate: [0.05],
        cost: { alloy: 200 },
        selected: true,
        resourceType: ["carbon"]
    },
    hydroponicFarm: {
        id: "HydroponicFarm",
        name: "Fattoria idroponica",
        type: "consumer",
        popReq: 5,
        rate: [0.1, 0.02],
        cost: { iron: 50 },
        selected: true,
        resourceType: ["water", "carbon"],
    }
};