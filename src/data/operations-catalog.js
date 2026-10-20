// Working N1 balance, proposed in the GDD; these are game rules, not real food regulations.
export const OPERATIONS_BALANCE = Object.freeze({version:1,deliveryHours:1,dispatchHours:.25,warningHours:2,graceHours:1,firstFine:300,repeatFine:600,repeatWindow:24,inspectionHours:8,autoQuantity:10,autoBudget:200,autoBudgetMax:2000,autoWindow:8,cleanCells:25,cleanHours:.5,cleanHelperHours:.25,cleanExternal:40,cleanMaterials:10,cleanGain:60,wearPerHour:1,wearWarning:30});
export const STOCK_PRODUCTS = Object.freeze({
 water:{name:'Вода',storage:'dry',life:72,unitCost:2},
 tea:{name:'Чай',storage:'dry',life:72,unitCost:5},
 coffee:{name:'Кофе',storage:'dry',life:72,unitCost:12},
 cookie:{name:'Печенье',storage:'dry',life:24,openedLife:8,unitCost:4},
 cold:{name:'Холодные напитки',storage:'cold',life:48,warmLimit:2,unitCost:20},
});
export const minute = time => Math.round(time * 60);
export const hour = minutes => minutes / 60;
