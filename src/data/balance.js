// Economy candidate reviewed by three independent model audits, 20 Oct 2026.
// Saved purchase prices and accepted session contracts remain their own facts.
export const PURCHASE_BALANCE=Object.freeze({
 tableComfort:{price:2000},chairSoft:{price:650},chairArms:{price:750},
 lightAdjustable:{price:450,hourlyCost:1},sofa:{price:1000},
 water:{price:500,hourlyCost:1},kettle:{price:350,hourlyCost:1},
 coffee:{price:1200,hourlyCost:2,useCost:12,salePrice:40,capacity:2},
 coffeeAuto:{price:2600,hourlyCost:6,useCost:8,salePrice:40,capacity:6},
 cookies:{price:400,hourlyCost:1},fridge:{price:1600,hourlyCost:3,useCost:20,salePrice:45,capacity:20},
 fan:{price:500,hourlyCost:2},conditioner:{price:1800,hourlyCost:4},
 mat:{price:220},miniatures:{price:450},screen:{price:200},tablet:{price:1600,hourlyCost:1},
 soundproof:{price:900,hourlyCost:2},
});
export const QUALITY_BALANCE=Object.freeze({
 version:8,tableComfort:.30,dice:.18,mat:.25,mapExploration:.20,miniatures:.35,miniatureMaterials:.15,screen:.20,
 armchair:.20,sofa:.20,dimmer:.15,equipmentCap:.80,serviceCap:.35,totalBonusCap:1,
 water:.15,tea:.18,coffee:.18,cold:.18,cookie:.20,serviceMinimumHours:3,
 boardMaterials:.25,tabletMaterials:.40,teachingComplexity:[1,1.15,1.3],
 teachingTarget:.9,teachingPenaltyStrength:3.5,teachingPenaltyCap:2.5,
 longSeatPenalty:.55,adjacentNoisePenalty:.50,applianceNoisePenalty:.15,heatPenalty:.35,
});
