// art-source/characters/data/character-catalog.js
var entry = (id, label, geometry, hintTags = []) => Object.freeze({ id, label, geometry: Object.freeze(geometry), hintTags: Object.freeze(hintTags), ordinary: hintTags.length === 0 }), BODY_CATALOG = [
  ["lean", "\u0421\u0442\u0440\u043E\u0439\u043D\u043E\u0435", 0.215, 0.145, 0.17, 0.11, 0.053, 0.066, 1, 1],
  ["regular", "\u041E\u0431\u044B\u0447\u043D\u043E\u0435", 0.235, 0.18, 0.193, 0.135, 0.059, 0.074, 1, 1],
  ["soft", "\u041C\u044F\u0433\u043A\u043E\u0435", 0.244, 0.235, 0.238, 0.176, 0.066, 0.087, 0.985, 1],
  ["broad", "\u0428\u0438\u0440\u043E\u043A\u043E\u0435", 0.282, 0.205, 0.205, 0.151, 0.069, 0.08, 1.025, 1],
  ["compact", "\u041A\u043E\u043C\u043F\u0430\u043A\u0442\u043D\u043E\u0435", 0.231, 0.196, 0.208, 0.145, 0.06, 0.077, 0.91, 1],
  ["tall", "\u0412\u044B\u0441\u043E\u043A\u043E\u0435", 0.231, 0.169, 0.182, 0.126, 0.056, 0.072, 1.1, 1],
  ["athletic", "\u0410\u0442\u043B\u0435\u0442\u0438\u0447\u043D\u043E\u0435", 0.275, 0.158, 0.187, 0.129, 0.069, 0.079, 1.04, 1],
  ["pear", "\u0428\u0438\u0440\u043E\u043A\u0438\u0435 \u0431\u0451\u0434\u0440\u0430", 0.217, 0.171, 0.258, 0.155, 0.056, 0.095, 1, 1],
  ["inverted", "\u0412\u044B\u0440\u0430\u0436\u0435\u043D\u043D\u044B\u0435 \u043F\u043B\u0435\u0447\u0438", 0.304, 0.177, 0.172, 0.133, 0.073, 0.065, 1.02, 1],
  ["stocky", "\u041A\u043E\u0440\u0435\u043D\u0430\u0441\u0442\u043E\u0435", 0.277, 0.238, 0.237, 0.168, 0.074, 0.092, 0.94, 1],
  ["slight", "\u0422\u043E\u043D\u043A\u043E\u0435", 0.194, 0.128, 0.147, 0.098, 0.047, 0.059, 0.98, 1],
  ["longtorso", "\u0414\u043B\u0438\u043D\u043D\u044B\u0439 \u0442\u043E\u0440\u0441", 0.237, 0.176, 0.193, 0.133, 0.059, 0.074, 1, 1.18],
  ["longlegs", "\u0414\u043B\u0438\u043D\u043D\u044B\u0435 \u043D\u043E\u0433\u0438", 0.23, 0.164, 0.183, 0.127, 0.056, 0.07, 1.08, 0.84],
  ["shorttorso", "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0442\u043E\u0440\u0441", 0.238, 0.193, 0.209, 0.145, 0.062, 0.08, 0.96, 0.83],
  ["rounded", "\u041E\u043A\u0440\u0443\u0433\u043B\u043E\u0435", 0.229, 0.256, 0.253, 0.187, 0.066, 0.091, 1.01, 1],
  ["angular", "\u0423\u0433\u043B\u043E\u0432\u0430\u0442\u043E\u0435", 0.262, 0.143, 0.173, 0.112, 0.052, 0.063, 1.05, 1.05],
  ["barrel", "\u041C\u0430\u0441\u0441\u0438\u0432\u043D\u044B\u0439 \u0442\u043E\u0440\u0441", 0.285, 0.27, 0.223, 0.203, 0.077, 0.083, 1.04, 1.05],
  ["willowy", "\u041E\u0447\u0435\u043D\u044C \u0432\u044B\u0441\u043E\u043A\u043E\u0435 \u0438 \u0442\u043E\u043D\u043A\u043E\u0435", 0.208, 0.132, 0.153, 0.102, 0.048, 0.061, 1.16, 1.07],
  ["petite", "\u041C\u0438\u043D\u0438\u0430\u0442\u044E\u0440\u043D\u043E\u0435", 0.204, 0.153, 0.174, 0.116, 0.05, 0.066, 0.86, 0.96],
  ["sturdy", "\u041A\u0440\u0435\u043F\u043A\u043E\u0435", 0.257, 0.211, 0.231, 0.156, 0.068, 0.092, 1.02, 0.95]
].map(([id, label, shoulder, waist, hip, depth, arm, leg, height, torso]) => entry(id, label, { kind: "body", shoulder, waist, hip, depth, arm, leg, height, torso })), FACE_CATALOG = [
  ["\u041E\u0432\u0430\u043B\u044C\u043D\u043E\u0435", 0.144, 0.135, 7.7, 0.72, 0.35],
  ["\u041A\u0440\u0443\u0433\u043B\u043E\u0435", 0.157, 0.141, 7.3, 0.84, 0.49],
  ["\u0423\u0434\u043B\u0438\u043D\u0451\u043D\u043D\u043E\u0435", 0.132, 0.127, 8.5, 0.65, 0.29],
  ["\u0428\u0438\u0440\u043E\u043A\u043E\u0435", 0.166, 0.139, 7.4, 0.88, 0.53],
  ["\u0421\u043A\u0443\u043B\u044B", 0.149, 0.131, 7.95, 0.65, 0.34],
  ["\u041C\u044F\u0433\u043A\u0438\u0439 \u043E\u0432\u0430\u043B", 0.151, 0.143, 7.65, 0.78, 0.4],
  ["\u041A\u0432\u0430\u0434\u0440\u0430\u0442\u043D\u043E\u0435", 0.158, 0.133, 7.7, 0.92, 0.65],
  ["\u0421\u0435\u0440\u0434\u0435\u0447\u043A\u043E", 0.15, 0.13, 7.75, 0.57, 0.23],
  ["\u0422\u0440\u0430\u043F\u0435\u0446\u0438\u044F", 0.142, 0.13, 7.5, 0.98, 0.7],
  ["\u0423\u0437\u043A\u043E\u0435", 0.123, 0.124, 8.05, 0.7, 0.34],
  ["\u0412\u044B\u0441\u043E\u043A\u0438\u0439 \u043B\u043E\u0431", 0.146, 0.135, 8.75, 0.72, 0.36],
  ["\u0428\u0438\u0440\u043E\u043A\u0438\u0435 \u0441\u043A\u0443\u043B\u044B", 0.172, 0.134, 7.65, 0.6, 0.31],
  ["\u041E\u0441\u0442\u0440\u044B\u0439 \u043F\u043E\u0434\u0431\u043E\u0440\u043E\u0434\u043E\u043A", 0.145, 0.129, 8.05, 0.61, 0.18],
  ["\u0428\u0438\u0440\u043E\u043A\u0438\u0439 \u043F\u043E\u0434\u0431\u043E\u0440\u043E\u0434\u043E\u043A", 0.151, 0.136, 7.8, 0.91, 0.69],
  ["\u0414\u043B\u0438\u043D\u043D\u044B\u0439 \u043A\u0432\u0430\u0434\u0440\u0430\u0442", 0.147, 0.132, 8.7, 0.91, 0.62],
  ["\u041C\u044F\u0433\u043A\u043E\u0435 \u0441\u0435\u0440\u0434\u0446\u0435", 0.153, 0.146, 7.6, 0.66, 0.29],
  ["\u041A\u043E\u0440\u043E\u0442\u043A\u043E\u0435 \u043A\u0440\u0443\u0433\u043B\u043E\u0435", 0.159, 0.144, 6.9, 0.86, 0.56],
  ["\u0420\u043E\u043C\u0431", 0.164, 0.127, 7.9, 0.57, 0.28],
  ["\u0423\u0437\u043A\u0438\u0439 \u043E\u0432\u0430\u043B", 0.13, 0.139, 8.2, 0.74, 0.35],
  ["\u0413\u0440\u0443\u0448\u0435\u0432\u0438\u0434\u043D\u043E\u0435", 0.139, 0.133, 7.65, 0.98, 0.58]
].map(([label, rx, ry, rz, jaw, chin], id) => entry(id, label, { kind: "face", rx, ry, rz, jaw, chin })), hairRows = [["short", "\u041A\u043E\u0440\u043E\u0442\u043A\u0430\u044F \u0441 \u043F\u0440\u043E\u0431\u043E\u0440\u043E\u043C"], ["crop", "\u041A\u0440\u043E\u043F"], ["sidepart", "\u0411\u043E\u043A\u043E\u0432\u043E\u0439 \u043F\u0440\u043E\u0431\u043E\u0440"], ["undercut", "\u0410\u043D\u0434\u0435\u0440\u043A\u0430\u0442"], ["pixie", "\u041F\u0438\u043A\u0441\u0438"], ["bob", "\u041A\u0430\u0440\u0435"], ["wavybob", "\u0412\u043E\u043B\u043D\u0438\u0441\u0442\u043E\u0435 \u043A\u0430\u0440\u0435"], ["long", "\u0414\u043B\u0438\u043D\u043D\u044B\u0435"], ["waves", "\u0414\u043B\u0438\u043D\u043D\u044B\u0435 \u0432\u043E\u043B\u043D\u044B"], ["curly", "\u041A\u0443\u0434\u0440\u0438"], ["afro", "\u041E\u0431\u044A\u0451\u043C\u043D\u044B\u0435 \u043A\u0443\u0434\u0440\u0438"], ["tied", "\u041F\u0443\u0447\u043E\u043A"], ["ponytail", "\u0425\u0432\u043E\u0441\u0442"], ["braid", "\u041A\u043E\u0441\u0430"], ["twists", "\u0422\u0432\u0438\u0441\u0442\u044B"], ["shaved", "\u0401\u0436\u0438\u043A"], ["bald", "\u0411\u0435\u0437 \u0432\u043E\u043B\u043E\u0441"], ["mohawk", "\u0418\u0440\u043E\u043A\u0435\u0437"], ["spikes", "\u041F\u0430\u043D\u043A: \u0448\u0438\u043F\u044B"], ["mullet", "\u041C\u0430\u043B\u043B\u0435\u0442"]], HAIR_CATALOG = hairRows.map(([id, label]) => entry(id, label, { kind: "hair", style: id })), TOP_CATALOG = [["crew", "\u0424\u0443\u0442\u0431\u043E\u043B\u043A\u0430"], ["henley", "\u0425\u0435\u043D\u043B\u0438"], ["polo", "\u041F\u043E\u043B\u043E"], ["shirt", "\u0420\u0443\u0431\u0430\u0448\u043A\u0430"], ["rolledshirt", "\u0417\u0430\u043A\u0430\u0442\u0430\u043D\u043D\u0430\u044F \u0440\u0443\u0431\u0430\u0448\u043A\u0430"], ["overshirt", "\u0420\u0443\u0431\u0430\u0448\u043A\u0430 \u043F\u043E\u0432\u0435\u0440\u0445 \u0444\u0443\u0442\u0431\u043E\u043B\u043A\u0438"], ["hoodie", "\u0425\u0443\u0434\u0438"], ["ziphoodie", "\u0425\u0443\u0434\u0438 \u043D\u0430 \u043C\u043E\u043B\u043D\u0438\u0438"], ["cardigan", "\u041A\u0430\u0440\u0434\u0438\u0433\u0430\u043D"], ["sweater", "\u0414\u0436\u0435\u043C\u043F\u0435\u0440"], ["turtleneck", "\u0412\u043E\u0434\u043E\u043B\u0430\u0437\u043A\u0430"], ["vest", "\u0416\u0438\u043B\u0435\u0442 \u0441 \u0440\u0443\u0431\u0430\u0448\u043A\u043E\u0439"], ["blazer", "\u041F\u0438\u0434\u0436\u0430\u043A"], ["denim", "\u0414\u0436\u0438\u043D\u0441\u043E\u0432\u0430\u044F \u043A\u0443\u0440\u0442\u043A\u0430"], ["bomber", "\u0411\u043E\u043C\u0431\u0435\u0440"], ["dress", "\u041F\u043B\u0430\u0442\u044C\u0435 \u0441 \u043F\u043E\u044F\u0441\u043E\u043C"], ["apron", "\u0424\u0430\u0440\u0442\u0443\u043A"], ["trench", "\u0414\u043B\u0438\u043D\u043D\u044B\u0439 \u043F\u043B\u0430\u0449"], ["poncho", "\u041F\u043E\u043D\u0447\u043E"], ["athletic", "\u0421\u043F\u043E\u0440\u0442\u0438\u0432\u043D\u0430\u044F \u043C\u0430\u0439\u043A\u0430"]].map(([id, label]) => entry(id, label, { kind: "top", style: id, layers: ["crew", "henley", "polo", "sweater", "turtleneck", "dress", "poncho", "athletic"].includes(id) ? ["outer", "trim"] : ["inner", "outer", "trim"] })), HAT_CATALOG = [
  ["beanie", "\u0412\u044F\u0437\u0430\u043D\u0430\u044F \u0448\u0430\u043F\u043A\u0430", "beanie", []],
  ["cap", "\u0411\u0435\u0439\u0441\u0431\u043E\u043B\u043A\u0430", "cap", []],
  ["backcap", "\u041A\u0435\u043F\u043A\u0430 \u043A\u043E\u0437\u044B\u0440\u044C\u043A\u043E\u043C \u043D\u0430\u0437\u0430\u0434", "backcap", []],
  ["beret", "\u0411\u0435\u0440\u0435\u0442", "beret", []],
  ["bucket", "\u041F\u0430\u043D\u0430\u043C\u0430", "bucket", []],
  ["fedora", "\u0424\u0435\u0434\u043E\u0440\u0430", "fedora", []],
  ["straw", "\u0421\u043E\u043B\u043E\u043C\u0435\u043D\u043D\u0430\u044F \u0448\u043B\u044F\u043F\u0430", "straw", []],
  ["flatcap", "\u041A\u0435\u043F\u0438", "flatcap", []],
  ["tophat", "\u0426\u0438\u043B\u0438\u043D\u0434\u0440", "tophat", []],
  ["ushanka", "\u0423\u0448\u0430\u043D\u043A\u0430", "ushanka", []],
  ["wizard", "\u0428\u043B\u044F\u043F\u0430 \u0432\u043E\u043B\u0448\u0435\u0431\u043D\u0438\u043A\u0430", "wizard", ["fantasy"]],
  ["witch", "\u0412\u0435\u0434\u044C\u043C\u0438\u043D\u0441\u043A\u0430\u044F \u0448\u043B\u044F\u043F\u0430", "witch", ["fantasy"]],
  ["crown", "\u041A\u043E\u0440\u043E\u043D\u0430", "crown", ["fantasy"]],
  ["hood", "\u041A\u0430\u043F\u044E\u0448\u043E\u043D \u0441\u043B\u0435\u0434\u043E\u043F\u044B\u0442\u0430", "hood", ["fantasy"]],
  ["helmet", "\u0428\u043B\u0435\u043C \u0440\u044B\u0446\u0430\u0440\u044F", "helmet", ["medieval"]],
  ["cybervisor", "\u041A\u0438\u0431\u0435\u0440\u0432\u0438\u0437\u043E\u0440", "cybervisor", ["cyberpunk"]],
  ["techcap", "\u0428\u043B\u0435\u043C \u0442\u0435\u0445\u043D\u0438\u043A\u0430", "techcap", ["cyberpunk"]],
  ["antenna", "\u0428\u0430\u043F\u043A\u0430 \u0441 \u0430\u043D\u0442\u0435\u043D\u043D\u0430\u043C\u0438", "antenna", ["science"]],
  ["horned", "\u0420\u043E\u0433\u0430\u0442\u044B\u0439 \u0448\u043B\u0435\u043C", "horned", ["grimdark"]],
  ["catbeanie", "\u0428\u0430\u043F\u043A\u0430 \u0441 \u0443\u0448\u043A\u0430\u043C\u0438", "catbeanie", []]
].map(([id, label, style, tags]) => entry(id, label, { kind: "hat", style }, tags)), BOTTOM_CATALOG = [
  ["straight", "\u041F\u0440\u044F\u043C\u044B\u0435 \u0431\u0440\u044E\u043A\u0438", "pants", 1, 0.6, 1, 0],
  ["tapered", "\u0417\u0430\u0443\u0436\u0435\u043D\u043D\u044B\u0435 \u0431\u0440\u044E\u043A\u0438", "pants", 1, 0.45, 1, 0],
  ["wide", "\u0428\u0438\u0440\u043E\u043A\u0438\u0435 \u0431\u0440\u044E\u043A\u0438", "pants", 1.24, 1, 1, 0],
  ["shorts", "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0435 \u0448\u043E\u0440\u0442\u044B", "shorts", 1.08, 0.8, 0.55, 0],
  ["skirt", "\u042E\u0431\u043A\u0430 \u0410-\u0441\u0438\u043B\u0443\u044D\u0442\u0430", "skirt", 1.28, 1, 1, 0],
  ["skinny", "\u0421\u043A\u0438\u043D\u043D\u0438", "pants", 0.78, 0.39, 1, 0],
  ["flared", "\u041A\u043B\u0451\u0448", "pants", 0.91, 1.45, 1, 0],
  ["cargo", "\u041A\u0430\u0440\u0433\u043E \u0441 \u043A\u0430\u0440\u043C\u0430\u043D\u0430\u043C\u0438", "cargo", 1.16, 0.78, 1, 0],
  ["joggers", "\u0414\u0436\u043E\u0433\u0433\u0435\u0440\u044B", "joggers", 1.18, 0.43, 1, 0],
  ["capri", "\u041A\u0430\u043F\u0440\u0438", "shorts", 0.95, 0.64, 0.81, 0],
  ["culottes", "\u041A\u044E\u043B\u043E\u0442\u044B", "shorts", 1.55, 1.5, 0.86, 0],
  ["bermuda", "\u0411\u0435\u0440\u043C\u0443\u0434\u044B", "shorts", 1.24, 1.1, 0.66, 0],
  ["pleated", "\u041F\u043B\u0438\u0441\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u044E\u0431\u043A\u0430", "skirt", 1.43, 1, 1, 12],
  ["pencil", "\u042E\u0431\u043A\u0430-\u043A\u0430\u0440\u0430\u043D\u0434\u0430\u0448", "skirt", 0.92, 1, 1.07, 0],
  ["mini", "\u041C\u0438\u043D\u0438-\u044E\u0431\u043A\u0430", "skirt", 1.15, 1, 0.63, 0],
  ["maxi", "\u0414\u043B\u0438\u043D\u043D\u0430\u044F \u044E\u0431\u043A\u0430", "skirt", 1.49, 1, 1.92, 0],
  ["wrap", "\u042E\u0431\u043A\u0430 \u043D\u0430 \u0437\u0430\u043F\u0430\u0445", "wrap", 1.23, 1, 1.12, 0],
  ["kilt", "\u041A\u0438\u043B\u0442", "kilt", 1.33, 1, 1, 8],
  ["asymmetric", "\u0410\u0441\u0438\u043C\u043C\u0435\u0442\u0440\u0438\u0447\u043D\u0430\u044F \u044E\u0431\u043A\u0430", "asymmetric", 1.4, 1, 1.28, 0],
  ["overalls", "\u041A\u043E\u043C\u0431\u0438\u043D\u0435\u0437\u043E\u043D", "overalls", 1.07, 0.73, 1, 0]
].map(([id, label, style, width2, cuff, length2, pleats]) => entry(id, label, { kind: "bottom", style, width: width2, cuff, length: length2, pleats })), SHOE_CATALOG = [
  ["sneakers", "\u041A\u0435\u0434\u044B", 0.22, 2.65, 0.65, "laces"],
  ["loafers", "\u041B\u043E\u0444\u0435\u0440\u044B", 0.22, 2.3, 0.45, "band"],
  ["boots", "\u0411\u043E\u0442\u0438\u043D\u043A\u0438", 0.225, 4.7, 0.85, "laces"],
  ["hightop", "\u0412\u044B\u0441\u043E\u043A\u0438\u0435 \u043A\u0435\u0434\u044B", 0.225, 5.8, 0.75, "laces"],
  ["ankleboot", "\u0411\u043E\u0442\u0438\u043B\u044C\u043E\u043D\u044B", 0.225, 5.4, 1.1, "heel"],
  ["combat", "\u0411\u0435\u0440\u0446\u044B", 0.245, 8.2, 1, "laces"],
  ["kneeboot", "\u0412\u044B\u0441\u043E\u043A\u0438\u0435 \u0441\u0430\u043F\u043E\u0433\u0438", 0.235, 12.4, 0.65, "buckle"],
  ["chelsea", "\u0427\u0435\u043B\u0441\u0438", 0.23, 5.6, 0.65, "elastic"],
  ["oxford", "\u041E\u043A\u0441\u0444\u043E\u0440\u0434\u044B", 0.24, 2.45, 0.45, "captoe"],
  ["derby", "\u0414\u0435\u0440\u0431\u0438", 0.25, 2.8, 0.65, "wings"],
  ["slipon", "\u0421\u043B\u0438\u043F\u043E\u043D\u044B", 0.225, 2.9, 0.7, "plain"],
  ["ballet", "\u0411\u0430\u043B\u0435\u0442\u043A\u0438", 0.23, 1.6, 0.3, "bow"],
  ["pumps", "\u0422\u0443\u0444\u043B\u0438 \u043D\u0430 \u043A\u0430\u0431\u043B\u0443\u043A\u0435", 0.24, 2.4, 1.4, "heel"],
  ["platform", "\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430", 0.24, 4.1, 2.3, "platform"],
  ["sandals", "\u0421\u0430\u043D\u0434\u0430\u043B\u0438\u0438", 0.235, 1.7, 0.45, "straps"],
  ["slides", "\u0428\u043B\u0451\u043F\u0430\u043D\u0446\u044B", 0.23, 1.35, 0.45, "slide"],
  ["clogs", "\u0421\u0430\u0431\u043E", 0.25, 3.5, 1, "wood"],
  ["moccasin", "\u041C\u043E\u043A\u0430\u0441\u0438\u043D\u044B", 0.225, 2.15, 0.3, "fringe"],
  ["pointed", "\u041E\u0441\u0442\u0440\u043E\u043D\u043E\u0441\u044B\u0435 \u0442\u0443\u0444\u043B\u0438", 0.29, 2.6, 0.45, "point"],
  ["armored", "\u041B\u0430\u0442\u043D\u044B\u0435 \u0431\u043E\u0442\u0438\u043D\u043A\u0438", 0.255, 6.6, 0.8, "armor"]
].map(([id, label, depth, height, sole, detail]) => entry(id, label, { kind: "shoe", depth, height, sole, detail }, id === "armored" ? ["medieval"] : [])), ACCESSORY_SLOTS = Object.freeze(["earL", "earR", "templeL", "templeR", "neck", "chestL", "chestR", "shoulderL", "shoulderR", "wristL", "wristR", "handL", "handR", "waistL", "waistR", "back", "ankleL", "ankleR", "headTop", "face"]), accessories = (theme, rows) => rows.map(([id, label, slot, shape, tags = [], variant = 0]) => entry(theme + "-" + id, label, { kind: "accessory", theme, slot, shape, variant }, tags)), ACCESSORY_THEMES = Object.freeze({
  everyday: accessories("everyday", [
    ["stud", "\u0421\u0435\u0440\u044C\u0433\u0430-\u0433\u0432\u043E\u0437\u0434\u0438\u043A", "earL", "stud"],
    ["hoop", "\u0421\u0435\u0440\u044C\u0433\u0430-\u043A\u043E\u043B\u044C\u0446\u043E", "earR", "hoop"],
    ["barrette", "\u0417\u0430\u043A\u043E\u043B\u043A\u0430-\u043F\u043B\u0430\u043D\u043A\u0430", "templeL", "barrette"],
    ["clip", "\u0417\u0430\u043A\u043E\u043B\u043A\u0430-\u0446\u0432\u0435\u0442\u043E\u043A", "templeR", "flower"],
    ["chain", "\u0426\u0435\u043F\u043E\u0447\u043A\u0430 \u0441 \u043A\u0443\u043B\u043E\u043D\u043E\u043C", "neck", "pendant"],
    ["brooch", "\u041B\u0438\u0441\u0442-\u0431\u0440\u043E\u0448\u044C", "chestL", "leaf"],
    ["badge", "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043D\u0430 \u043A\u043B\u0438\u043F\u0441\u0435", "chestR", "badge"],
    ["bagstrap", "\u0420\u0435\u043C\u0435\u043D\u044C \u0441\u0443\u043C\u043A\u0438", "shoulderL", "strap"],
    ["scarf", "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0448\u0430\u0440\u0444", "shoulderR", "scarf"],
    ["watch", "\u041D\u0430\u0440\u0443\u0447\u043D\u044B\u0435 \u0447\u0430\u0441\u044B", "wristL", "watch"],
    ["bracelet", "\u0428\u0438\u0440\u043E\u043A\u0438\u0439 \u0431\u0440\u0430\u0441\u043B\u0435\u0442", "wristR", "bracelet"],
    ["mug", "\u0422\u0435\u0440\u043C\u043E\u043A\u0440\u0443\u0436\u043A\u0430", "handL", "mug"],
    ["book", "\u041A\u0430\u0440\u043C\u0430\u043D\u043D\u0430\u044F \u043A\u043D\u0438\u0433\u0430", "handR", "book"],
    ["pouch", "\u041F\u043E\u044F\u0441\u043D\u0430\u044F \u0441\u0443\u043C\u043A\u0430", "waistL", "pouch"],
    ["keys", "\u0421\u0432\u044F\u0437\u043A\u0430 \u043A\u043B\u044E\u0447\u0435\u0439", "waistR", "keys"],
    ["backpack", "\u0413\u043E\u0440\u043E\u0434\u0441\u043A\u043E\u0439 \u0440\u044E\u043A\u0437\u0430\u043A", "back", "backpack"],
    ["anklet", "\u0411\u0440\u0430\u0441\u043B\u0435\u0442 \u043D\u0430 \u0449\u0438\u043A\u043E\u043B\u043E\u0442\u043A\u0435", "ankleL", "anklet"],
    ["reflector", "\u0421\u0432\u0435\u0442\u043E\u043E\u0442\u0440\u0430\u0436\u0430\u0442\u0435\u043B\u044C", "ankleR", "reflector"],
    ["headband", "\u041E\u0431\u043E\u0434\u043E\u043A", "headTop", "headband"],
    ["roundglasses", "\u041A\u0440\u0443\u0433\u043B\u044B\u0435 \u043E\u0447\u043A\u0438", "face", "roundglasses"]
  ]),
  fantasy: accessories("fantasy", [
    ["gem", "\u0421\u0435\u0440\u044C\u0433\u0430-\u043A\u0440\u0438\u0441\u0442\u0430\u043B\u043B", "earL", "gem", ["fantasy"]],
    ["feather", "\u0421\u0435\u0440\u044C\u0433\u0430-\u043F\u0435\u0440\u043E", "earR", "feather", ["fantasy"]],
    ["leafcrown", "\u0412\u0435\u0442\u043E\u0447\u043A\u0430 \u044D\u043B\u044C\u0444\u0430", "templeL", "branch", ["fantasy"]],
    ["runeclip", "\u0420\u0443\u043D\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0437\u0430\u043A\u043E\u043B\u043A\u0430", "templeR", "rune", ["fantasy"]],
    ["amulet", "\u0421\u043E\u043B\u043D\u0435\u0447\u043D\u044B\u0439 \u0430\u043C\u0443\u043B\u0435\u0442", "neck", "sun", ["fantasy"]],
    ["spellbook", "\u041A\u043D\u0438\u0433\u0430 \u0437\u0430\u043A\u043B\u0438\u043D\u0430\u043D\u0438\u0439", "chestL", "spellbook", ["fantasy"]],
    ["dragon", "\u0411\u0440\u043E\u0448\u044C-\u0434\u0440\u0430\u043A\u043E\u043D", "chestR", "dragon", ["fantasy"]],
    ["pauldron", "\u041D\u0430\u043F\u043B\u0435\u0447\u043D\u0438\u043A", "shoulderL", "pauldron", ["medieval"]],
    ["cape", "\u041A\u043E\u0440\u043E\u0442\u043A\u0430\u044F \u043D\u0430\u043A\u0438\u0434\u043A\u0430", "shoulderR", "cape", ["fantasy"]],
    ["bracer", "\u041A\u043E\u0436\u0430\u043D\u044B\u0439 \u043D\u0430\u0440\u0443\u0447", "wristL", "bracer", ["medieval"]],
    ["gauntlet", "\u041B\u0430\u0442\u043D\u0430\u044F \u043F\u0435\u0440\u0447\u0430\u0442\u043A\u0430", "wristR", "gauntlet", ["medieval"]],
    ["wand", "\u0412\u043E\u043B\u0448\u0435\u0431\u043D\u0430\u044F \u043F\u0430\u043B\u043E\u0447\u043A\u0430", "handL", "wand", ["fantasy"]],
    ["lantern", "\u041F\u043E\u0445\u043E\u0434\u043D\u044B\u0439 \u0444\u043E\u043D\u0430\u0440\u044C", "handR", "lantern", ["fantasy"]],
    ["potion", "\u0421\u043A\u043B\u044F\u043D\u043A\u0430 \u0437\u0435\u043B\u044C\u044F", "waistL", "potion", ["fantasy"]],
    ["scroll", "\u0421\u0432\u0438\u0442\u043E\u043A \u0432 \u0440\u0435\u043C\u0435\u0448\u043A\u0435", "waistR", "scroll", ["fantasy"]],
    ["quiver", "\u041A\u043E\u043B\u0447\u0430\u043D", "back", "quiver", ["medieval"]],
    ["leafcuff", "\u041B\u0438\u0441\u0442\u043E\u0432\u043E\u0439 \u043C\u0430\u043D\u0436\u0435\u0442", "ankleL", "leafcuff", ["fantasy"]],
    ["spur", "\u0428\u043F\u043E\u0440\u0430", "ankleR", "spur", ["medieval"]],
    ["antlers", "\u041E\u043B\u0435\u043D\u044C\u0438 \u0440\u043E\u0436\u043A\u0438", "headTop", "antlers", ["fantasy"]],
    ["masque", "\u041C\u0430\u0441\u043A\u0430 \u0444\u0435\u0438", "face", "masque", ["fantasy"]]
  ]),
  cyberpunk: accessories("cyberpunk", [
    ["earjack", "\u0420\u0430\u0437\u044A\u0451\u043C \u0432 \u0443\u0445\u0435", "earL", "earjack", ["cyberpunk"]],
    ["receiver", "\u041F\u0440\u0438\u0451\u043C\u043D\u0438\u043A", "earR", "receiver", ["cyberpunk"]],
    ["implant", "\u0412\u0438\u0441\u043E\u0447\u043D\u044B\u0439 \u0438\u043C\u043F\u043B\u0430\u043D\u0442", "templeL", "implant", ["cyberpunk"]],
    ["scanner", "\u0421\u043A\u0430\u043D\u0435\u0440 \u0443 \u0432\u0438\u0441\u043A\u0430", "templeR", "scanner", ["cyberpunk"]],
    ["collar", "\u0421\u0432\u0435\u0442\u044F\u0449\u0438\u0439\u0441\u044F \u0432\u043E\u0440\u043E\u0442\u043D\u0438\u043A", "neck", "techcollar", ["cyberpunk"]],
    ["chip", "\u041F\u043B\u0430\u0442\u0430 \u043D\u0430 \u0433\u0440\u0443\u0434\u0438", "chestL", "chip", ["cyberpunk"]],
    ["display", "\u041D\u0430\u0433\u0440\u0443\u0434\u043D\u044B\u0439 \u044D\u043A\u0440\u0430\u043D", "chestR", "display", ["cyberpunk"]],
    ["drone", "\u041A\u0430\u0440\u043C\u0430\u043D\u043D\u044B\u0439 \u0434\u0440\u043E\u043D", "shoulderL", "drone", ["cyberpunk"]],
    ["cable", "\u041A\u0430\u0431\u0435\u043B\u044C\u043D\u044B\u0439 \u0436\u0433\u0443\u0442", "shoulderR", "cable", ["cyberpunk"]],
    ["terminal", "\u041D\u0430\u0440\u0443\u0447\u043D\u044B\u0439 \u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043B", "wristL", "terminal", ["cyberpunk"]],
    ["cyberglove", "\u0422\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043F\u0435\u0440\u0447\u0430\u0442\u043A\u0430", "wristR", "cyberglove", ["cyberpunk"]],
    ["deck", "\u041A\u0430\u0440\u043C\u0430\u043D\u043D\u0430\u044F \u0434\u0435\u043A\u0430", "handL", "deck", ["cyberpunk"]],
    ["baton", "\u0421\u0432\u0435\u0442\u043E\u0432\u043E\u0439 \u0436\u0435\u0437\u043B", "handR", "baton", ["cyberpunk"]],
    ["battery", "\u0410\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440", "waistL", "battery", ["cyberpunk"]],
    ["cartridge", "\u041A\u0430\u0441\u0441\u0435\u0442\u044B \u0434\u0430\u043D\u043D\u044B\u0445", "waistR", "cartridge", ["cyberpunk"]],
    ["tank", "\u0422\u0435\u0445\u043D\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0440\u0430\u043D\u0435\u0446", "back", "tank", ["cyberpunk"]],
    ["anklemodule", "\u041C\u043E\u0434\u0443\u043B\u044C \u043D\u0430 \u0433\u043E\u043B\u0435\u043D\u0438", "ankleL", "anklemodule", ["cyberpunk"]],
    ["cableboot", "\u041A\u0430\u0431\u0435\u043B\u044C\u043D\u044B\u0439 \u043C\u0430\u043D\u0436\u0435\u0442", "ankleR", "cableboot", ["cyberpunk"]],
    ["antennae", "\u0410\u043D\u0442\u0435\u043D\u043D\u044B", "headTop", "antennae", ["cyberpunk"]],
    ["goggles", "\u041A\u0438\u0431\u0435\u0440\u043F\u0430\u043D\u043A-\u043E\u0447\u043A\u0438", "face", "goggles", ["cyberpunk"]]
  ]),
  grimdark: accessories("grimdark", [
    ["tooth", "\u041F\u043E\u0434\u0432\u0435\u0441\u043A\u0430-\u043A\u043B\u044B\u043A", "earL", "tooth", ["grimdark"]],
    ["ring", "\u0421\u0435\u0440\u044C\u0433\u0430 \u0441 \u0448\u0438\u043F\u043E\u043C", "earR", "spikering", ["grimdark"]],
    ["bones", "\u041A\u043E\u0441\u0442\u044F\u043D\u0430\u044F \u0437\u0430\u043A\u043E\u043B\u043A\u0430", "templeL", "bones", ["grimdark"]],
    ["ironclip", "\u0416\u0435\u043B\u0435\u0437\u043D\u0430\u044F \u0441\u043A\u043E\u0431\u0430", "templeR", "ironclip", ["grimdark"]],
    ["skull", "\u0427\u0435\u0440\u0435\u043F \u043D\u0430 \u0446\u0435\u043F\u043E\u0447\u043A\u0435", "neck", "skull", ["grimdark"]],
    ["seal", "\u0412\u043E\u0441\u043A\u043E\u0432\u0430\u044F \u043F\u0435\u0447\u0430\u0442\u044C", "chestL", "seal", ["grimdark"]],
    ["reliquary", "\u0420\u0435\u043B\u0438\u043A\u0432\u0430\u0440\u0438\u0439", "chestR", "reliquary", ["grimdark"]],
    ["spikes", "\u0428\u0438\u043F\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u043D\u0430\u043F\u043B\u0435\u0447\u043D\u0438\u043A", "shoulderL", "spikepauldron", ["grimdark"]],
    ["ragcape", "\u0420\u0432\u0430\u043D\u0430\u044F \u043D\u0430\u043A\u0438\u0434\u043A\u0430", "shoulderR", "ragcape", ["grimdark"]],
    ["chain", "\u0426\u0435\u043F\u043D\u043E\u0439 \u0431\u0440\u0430\u0441\u043B\u0435\u0442", "wristL", "chaincuff", ["grimdark"]],
    ["ironfist", "\u041B\u0430\u0442\u043D\u0430\u044F \u0440\u0443\u043A\u0430\u0432\u0438\u0446\u0430", "wristR", "ironfist", ["grimdark"]],
    ["standard", "\u041C\u0430\u043B\u044B\u0439 \u0448\u0442\u0430\u043D\u0434\u0430\u0440\u0442", "handL", "standard", ["grimdark"]],
    ["censer", "\u041A\u0430\u0434\u0438\u043B\u043E", "handR", "censer", ["grimdark"]],
    ["tome", "\u041E\u043A\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u043A\u043D\u0438\u0433\u0430", "waistL", "irontome", ["grimdark"]],
    ["vials", "\u0421\u0432\u044F\u0437\u043A\u0430 \u0444\u0438\u0430\u043B\u043E\u0432", "waistR", "vials", ["grimdark"]],
    ["banner", "\u0421\u043F\u0438\u043D\u043D\u043E\u0435 \u0437\u043D\u0430\u043C\u044F", "back", "banner", ["grimdark"]],
    ["greave", "\u041B\u0430\u0442\u043D\u0430\u044F \u043F\u043E\u043D\u043E\u0436\u0430", "ankleL", "greave", ["grimdark"]],
    ["chainboot", "\u0426\u0435\u043F\u044C \u043D\u0430 \u0431\u043E\u0442\u0438\u043D\u043A\u0435", "ankleR", "chainboot", ["grimdark"]],
    ["halo", "\u0416\u0435\u043B\u0435\u0437\u043D\u044B\u0439 \u043D\u0438\u043C\u0431", "headTop", "halo", ["grimdark"]],
    ["ironmask", "\u0420\u0438\u0442\u0443\u0430\u043B\u044C\u043D\u0430\u044F \u043C\u0430\u0441\u043A\u0430", "face", "ironmask", ["grimdark"]]
  ]),
  adventure: accessories("adventure", [
    ["compass", "\u0421\u0435\u0440\u044C\u0433\u0430-\u043A\u043E\u043C\u043F\u0430\u0441", "earL", "compass", ["journey"]],
    ["planet", "\u0421\u0435\u0440\u044C\u0433\u0430-\u043F\u043B\u0430\u043D\u0435\u0442\u0430", "earR", "planet", ["science"]],
    ["magnifier", "\u041B\u0443\u043F\u0430 \u0443 \u0432\u0438\u0441\u043A\u0430", "templeL", "magnifier", ["mystery"]],
    ["gull", "\u0417\u0430\u043A\u043E\u043B\u043A\u0430-\u043F\u0442\u0438\u0446\u0430", "templeR", "gull", ["journey"]],
    ["map", "\u0421\u0432\u0451\u0440\u043D\u0443\u0442\u0430\u044F \u043A\u0430\u0440\u0442\u0430", "neck", "map", ["journey"]],
    ["detective", "\u0417\u043D\u0430\u0447\u043E\u043A \u0441\u044B\u0449\u0438\u043A\u0430", "chestL", "detective", ["mystery"]],
    ["dice", "\u0417\u043D\u0430\u0447\u043E\u043A \u0441 \u043A\u0443\u0431\u0438\u043A\u0430\u043C\u0438", "chestR", "dice", []],
    ["telescope", "\u041C\u0430\u043B\u044B\u0439 \u0442\u0435\u043B\u0435\u0441\u043A\u043E\u043F", "shoulderL", "telescope", ["science"]],
    ["rope", "\u0411\u0443\u0445\u0442\u0430 \u0432\u0435\u0440\u0451\u0432\u043A\u0438", "shoulderR", "rope", ["journey"]],
    ["sundial", "\u041D\u0430\u0440\u0443\u0447\u043D\u044B\u0435 \u0441\u043E\u043B\u043D\u0435\u0447\u043D\u044B\u0435 \u0447\u0430\u0441\u044B", "wristL", "sundial", ["history"]],
    ["ribbon", "\u041B\u0435\u043D\u0442\u044B \u0444\u0435\u0445\u0442\u043E\u0432\u0430\u043B\u044C\u0449\u0438\u043A\u0430", "wristR", "ribbon", ["medieval"]],
    ["hobbyhorse", "\u041A\u043E\u043D\u044C \u0434\u043B\u044F \u0445\u043E\u0431\u0431\u0438\u0445\u043E\u0440\u0441\u0438\u043D\u0433\u0430", "handL", "hobbyhorse", ["hobbyhorse"]],
    ["spyglass", "\u041F\u043E\u0434\u0437\u043E\u0440\u043D\u0430\u044F \u0442\u0440\u0443\u0431\u0430", "handR", "spyglass", ["journey"]],
    ["fieldbag", "\u041F\u043E\u043B\u0435\u0432\u0430\u044F \u0441\u0443\u043C\u043A\u0430", "waistL", "fieldbag", ["journey"]],
    ["flask", "\u041F\u043E\u0445\u043E\u0434\u043D\u0430\u044F \u0444\u043B\u044F\u0433\u0430", "waistR", "flask", ["journey"]],
    ["bedroll", "\u0421\u043A\u0430\u0442\u043A\u0430 \u043F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u0438\u043A\u0430", "back", "bedroll", ["journey"]],
    ["gaiter", "\u041F\u043E\u0445\u043E\u0434\u043D\u0430\u044F \u0433\u0430\u043C\u0430\u0448\u0430", "ankleL", "gaiter", ["journey"]],
    ["bell", "\u0411\u0443\u0431\u0435\u043D\u0435\u0446", "ankleR", "bell", ["comedy"]],
    ["jester", "\u041A\u043E\u043B\u043F\u0430\u043A \u0448\u0443\u0442\u0430", "headTop", "jester", ["comedy"]],
    ["domino", "\u041C\u0430\u0441\u043A\u0430 \u0434\u043E\u043C\u0438\u043D\u043E", "face", "domino", ["heist"]]
  ])
}), ACCESSORY_CATALOG = Object.freeze(Object.values(ACCESSORY_THEMES).flat()), CATALOGS = Object.freeze({ body: BODY_CATALOG, face: FACE_CATALOG, hair: HAIR_CATALOG, top: TOP_CATALOG, hat: HAT_CATALOG, bottom: BOTTOM_CATALOG, shoes: SHOE_CATALOG, accessories: ACCESSORY_CATALOG });
var catalogItem = (category, id) => CATALOGS[category]?.find((item) => String(item.id) === String(id)), HINT_RULES = Object.freeze({
  journey: { genres: ["journey"] },
  science: { genres: ["science"] },
  mystery: { genres: ["mystery"] },
  history: { genres: ["history"] },
  comedy: { genres: ["comedy"] },
  heist: { genres: ["heist"] },
  fantasy: { genres: ["myth"], works: ["\u0445\u043E\u0431\u0431\u0438\u0442", "\u0432\u043B\u0430\u0441\u0442\u0435\u043B\u0438\u043D \u043A\u043E\u043B\u0435\u0446", "\u0437\u0435\u043C\u043D\u043E\u043C\u043E\u0440\u044C\u044F", "\u043F\u043E\u0434\u0437\u0435\u043C\u0435\u043B\u044C\u044F \u0438 \u0434\u0440\u0430\u043A\u043E\u043D\u044B", "baldur", "dragon age"] },
  medieval: { genres: [], works: ["\u0438\u043C\u044F \u0440\u043E\u0437\u044B", "kingdom come", "crusader kings", "mount & blade", "warhammer fantasy"] },
  cyberpunk: { genres: [], works: ["cyberpunk", "neuromancer", "\u043D\u0435\u0439\u0440\u043E\u043C\u0430\u043D\u0442", "shadowrun", "blade runner", "\u0431\u0435\u0433\u0443\u0449\u0438\u0439 \u043F\u043E \u043B\u0435\u0437\u0432\u0438\u044E", "deus ex", "citizen sleeper"] },
  grimdark: { genres: [], works: ["warhammer", "\u0432\u0430\u0440\u0445\u0430\u043C\u043C\u0435\u0440", "darktide", "vermintide", "rogue trader", "berserk", "\u0431\u0435\u0440\u0441\u0435\u0440\u043A"] },
  hobbyhorse: { genres: [], works: ["\u0445\u043E\u0431\u0431\u0438\u0445\u043E\u0440\u0441\u0438\u043D\u0433", "hobby horse", "hobbyhorse"] }
});
function normalizeAccessories(values = []) {
  let used = /* @__PURE__ */ new Set();
  return (Array.isArray(values) ? values : []).flatMap((value) => {
    let item = catalogItem("accessories", value?.id ?? value);
    return !item || used.has(item.geometry.slot) ? [] : (used.add(item.geometry.slot), [{ id: item.id, slot: item.geometry.slot, color: /^#[\da-f]{6}$/i.test(value?.color ?? "") ? value.color : "#bd9d67" }]);
  });
}
var NPC_PRESENTATION = Object.freeze({
  masculine: { body: ["lean", "regular", "soft", "broad", "compact", "tall", "athletic", "inverted", "stocky", "slight", "longtorso", "longlegs", "shorttorso", "rounded", "angular", "barrel", "sturdy"], face: [0, 1, 2, 3, 4, 6, 8, 9, 10, 11, 13, 14, 16, 18, 19], hair: ["short", "crop", "sidepart", "undercut", "curly", "afro", "shaved", "bald", "mohawk", "spikes", "mullet"], top: TOP_CATALOG.filter((v) => v.id !== "dress").map((v) => v.id), bottom: ["straight", "tapered", "wide", "shorts", "skinny", "flared", "cargo", "joggers", "capri", "bermuda", "overalls"], shoes: ["sneakers", "loafers", "boots", "hightop", "combat", "chelsea", "oxford", "derby", "slipon", "sandals", "slides", "clogs", "moccasin", "pointed"] },
  feminine: { body: ["lean", "regular", "soft", "compact", "tall", "athletic", "pear", "slight", "longtorso", "longlegs", "shorttorso", "rounded", "angular", "willowy", "petite", "sturdy"], face: [0, 1, 2, 4, 5, 7, 9, 10, 11, 12, 15, 16, 17, 18, 19], hair: ["pixie", "bob", "wavybob", "long", "waves", "curly", "afro", "tied", "ponytail", "braid", "twists", "undercut", "mohawk"], top: TOP_CATALOG.map((v) => v.id), bottom: BOTTOM_CATALOG.filter((v) => v.id !== "kilt").map((v) => v.id), shoes: SHOE_CATALOG.filter((v) => v.ordinary).map((v) => v.id) }
});

// art-source/characters/data/character-appearance.js
var choices = (list) => list.map(({ id, label }) => [id, label]), HAIRSTYLES = choices(HAIR_CATALOG), OUTFITS = choices(TOP_CATALOG), BODY_SHAPES = choices(BODY_CATALOG), BOTTOMS = choices(BOTTOM_CATALOG), SHOE_STYLES = choices(SHOE_CATALOG), HATS = [["none", "\u0411\u0435\u0437 \u0433\u043E\u043B\u043E\u0432\u043D\u043E\u0433\u043E \u0443\u0431\u043E\u0440\u0430"], ...choices(HAT_CATALOG)], PATTERNS = [["plain", "\u041E\u0434\u043D\u043E\u0442\u043E\u043D\u043D\u0430\u044F"], ["stripe", "\u041F\u043E\u043B\u043E\u0441\u043A\u0430"], ["block", "\u0414\u0432\u0430 \u0446\u0432\u0435\u0442\u0430"], ["check", "\u041A\u043B\u0435\u0442\u043A\u0430"], ["emblem", "\u042D\u043C\u0431\u043B\u0435\u043C\u0430"]], SHAPES = Object.fromEntries(BODY_CATALOG.map((v) => [v.id, v.geometry])), DEFAULT_LOOK = Object.freeze({ artRevision: 6, skin: "#dfb399", hairColor: "#493b37", hair: "sidepart", coat: "#426b64", trousers: "#344349", shoes: "#303b3e", accent: "#e4d5b7", innerColor: "#e4d5b7", hatColor: "#526e79", soleColor: "#d7cfbd", iris: "#536d62", outfit: "vest", bodyShape: "regular", bottom: "straight", shoeStyle: "loafers", pattern: "plain", hat: "none", accessories: [], face: 2, eyes: 1, nose: 2, mouth: 1, hairDetail: 0, expression: "calm", build: 1 }), isColor = (value) => /^#[\da-f]{6}$/i.test(value ?? ""), allowed = (catalog, value, fallback) => catalog.some(([id]) => id === value) ? value : fallback;
function normalizeLook(source = {}) {
  let p = { ...DEFAULT_LOOK, ...source };
  for (let key of ["skin", "hairColor", "coat", "trousers", "shoes", "accent", "iris", "innerColor", "hatColor", "soleColor"]) isColor(p[key]) || (p[key] = DEFAULT_LOOK[key]);
  source.innerColor || (p.innerColor = p.accent);
  for (let [key, catalog] of Object.entries({ hair: HAIRSTYLES, outfit: OUTFITS, bodyShape: BODY_SHAPES, bottom: BOTTOMS, pattern: PATTERNS, shoeStyle: SHOE_STYLES, hat: HATS })) p[key] = allowed(catalog, p[key], DEFAULT_LOOK[key]);
  for (let [key, max] of [["face", 19], ["eyes", 6], ["nose", 6], ["mouth", 3], ["hairDetail", 2]]) p[key] = Number.isInteger(p[key]) && p[key] >= 0 && p[key] <= max ? p[key] : DEFAULT_LOOK[key];
  p.build = Number.isFinite(p.build) ? Math.max(0.8, Math.min(1.25, p.build)) : 1;
  let darken = (hex, n) => "#" + [1, 3, 5].map((i) => Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + n)).toString(16).padStart(2, "0")).join("");
  return p.shade = isColor(source.shade) ? source.shade : darken(p.skin, -25), p.hairShadow = darken(p.hairColor, -17), p.hairLight = darken(p.hairColor, 21), p.accessories = normalizeAccessories(source.accessories), p.artRevision = 6, p;
}
function appearanceFor(person, uniform) {
  let identity = person?.identity ?? person ?? {}, p = normalizeLook(identity.portrait), u = uniform ?? person?.uniform ?? identity.uniform;
  if (u?.enabled) {
    OUTFITS.some(([id]) => id === u.outfit) && (p.outfit = u.outfit);
    for (let key of ["coat", "accent", "innerColor"]) isColor(u[key]) && (p[key] = u[key]);
    p.badge = u.badge !== !1, p.badgeColor = isColor(u.badgeColor) ? u.badgeColor : "#efe4c9", p.uniform = !0;
  } else p.badge = p.badge ?? identity.role === "administrator";
  return { ...identity, age: Number.isFinite(identity.age) ? identity.age : 30, portrait: p };
}

// tools/lib/experimental-gltf-character.mjs
var BONES = ["torso", "head", "upperarmL", "forearmL", "handL", "thighL", "calfL", "footL", "upperarmR", "forearmR", "handR", "thighR", "calfR", "footR"];
var add = (a, b) => a.map((v, i) => v + b[i]), sub = (a, b) => a.map((v, i) => v - b[i]), mul = (a, s) => a.map((v) => v * s), dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0), length = (a) => Math.hypot(...a), unit = (a) => mul(a, 1 / (length(a) || 1)), cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function bounds(points) {
  let min = [1 / 0, 1 / 0, 1 / 0], max = [-1 / 0, -1 / 0, -1 / 0], count = 0;
  for (let p of points) {
    if (p.length < 3 || !p.every(Number.isFinite)) throw Error("Non-finite point");
    count++;
    for (let k = 0; k < 3; k++)
      min[k] = Math.min(min[k], p[k]), max[k] = Math.max(max[k], p[k]);
  }
  return count ? { min, max, size: sub(max, min), center: mul(add(min, max), 0.5), count } : null;
}
function segmentTransform(p, source, target, sourceEnd, targetEnd, scale) {
  let d = sub(p, source);
  if (!sourceEnd || !targetEnd) return add(target, mul(d, scale));
  let a = sub(sourceEnd, source), b = sub(targetEnd, target), la = length(a), lb = length(b);
  if (la < 1e-8 || lb < 1e-8) return add(target, mul(d, scale));
  let u = unit(a), v = unit(b), cos = Math.max(-1, Math.min(1, dot(u, v))), axis = cross(u, v), s = length(axis), rotated = d;
  if (s > 1e-8) {
    let k = mul(axis, 1 / s);
    rotated = add(add(mul(d, cos), mul(cross(k, d), s)), mul(k, dot(k, d) * (1 - cos)));
  } else if (cos < 0) {
    let k = unit(cross(u, Math.abs(u[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]));
    rotated = sub(mul(k, 2 * dot(k, d)), d);
  }
  let along = dot(rotated, v);
  return add(target, add(mul(sub(rotated, mul(v, along)), scale), mul(v, along * lb / la)));
}
function previewNormals(primitive) {
  let normals = Array.from({ length: primitive.vertices.length }, () => [0, 0, 0]), degenerateTriangles = 0;
  for (let i = 0; i < primitive.indices.length; i += 3) {
    let [a, b, c] = primitive.indices.slice(i, i + 3), n = cross(sub(primitive.vertices[b].position, primitive.vertices[a].position), sub(primitive.vertices[c].position, primitive.vertices[a].position));
    if (length(n) < 1e-12) {
      degenerateTriangles++;
      continue;
    }
    for (let j of [a, b, c]) normals[j] = add(normals[j], n);
  }
  let fallbackVertices = normals.filter((n) => length(n) < 1e-12).length;
  return { normals: normals.map((n) => length(n) < 1e-12 ? [0, 1, 0] : unit(n)), degenerateTriangles, fallbackVertices };
}

// tools/lib/character-skin4-part.mjs
var linear = (v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4, hexColor = (hex) => [...[1, 3, 5].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255)), hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1], validHex = (v) => typeof v == "string" && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v), finite = (v, n) => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
function paintBinding(part, vertex, look) {
  let field = vertex.sourceSemantic;
  if (part.name.endsWith("-exposed-skin") && (field = "skin"), field === "accessory") {
    let id = part.name.startsWith("accessory:") ? part.name.slice(10) : null, item = look.accessories?.find((a) => a.id === id);
    return validHex(item?.color) ? { field: "accessory", id, base: hexColor(item.color) } : null;
  }
  return validHex(look[field]) ? { field, base: hexColor(look[field]) } : null;
}
function resolveSkin4Paint(code, look) {
  if (code[0] === "fixed") return code.slice(1);
  let binding = code[0] === "accessory" ? look.accessories?.find((a) => a.id === code[1])?.color : look[code[0]];
  if (!validHex(binding)) throw Error("Missing saved paint binding " + code[0]);
  let base = hexColor(binding), factor = code.slice(2);
  return base.map((v, k) => Math.max(0, Math.min(1, v * factor[k])));
}
function packSkin4Part(part, look) {
  let count = part.vertices?.length;
  if (!count || part.normals?.length !== count) throw Error("Part must have prepared positions and normals");
  let packed = {
    format: "nri-character-skin4-part",
    version: 2,
    name: part.name,
    material: part.material ?? 0,
    positions: [],
    normals: [],
    bones: [],
    weights: [],
    indices: [...part.indices],
    paint: [],
    paintIndices: []
  }, paintMap = /* @__PURE__ */ new Map();
  if ((part.uv || part.texcoords) && (packed.uv = []), part.uv2 && (packed.uv2 = []), !part.indices?.length || part.indices.length % 3 || part.indices.some((i) => !Number.isInteger(i) || i < 0 || i >= count)) throw Error("Invalid triangle indices");
  return part.vertices.forEach((vertex, i) => {
    if (!finite(vertex.position, 3) || !finite(part.normals[i], 3) || Math.abs(Math.hypot(...part.normals[i]) - 1) > 1e-4) throw Error("Invalid position/normal in " + part.name);
    let weights = vertex.targetWeights;
    if (!weights?.length || weights.length > 4 || weights.some(([b, w]) => !Number.isInteger(b) || b < 0 || b >= BONES.length || !Number.isFinite(w) || w <= 0) || Math.abs(weights.reduce((s, [, w]) => s + w, 0) - 1) > 1e-6) throw Error("Cannot pack target influences without loss");
    packed.positions.push(...vertex.position), packed.normals.push(...part.normals[i]);
    for (let j = 0; j < 4; j++)
      packed.bones.push(weights[j]?.[0] ?? 0), packed.weights.push(weights[j]?.[1] ?? 0);
    for (let [name, source] of [["uv", part.uv ?? part.texcoords], ["uv2", part.uv2]]) if (source) {
      if (!finite(source[i], 2)) throw Error("Invalid " + name);
      packed[name].push(...source[i]);
    }
    let color = part.colors?.[i] ?? [1, 1, 1, 1];
    if (!finite(color, 4) || color.some((v) => v < 0 || v > 1)) throw Error("Invalid linear vertex color");
    let binding = part.colors ? paintBinding(part, vertex, look) : null, code = ["fixed", ...color];
    binding && binding.base.every((v, k) => v > 1e-9 || color[k] === 0) && (code = [binding.field, binding.id ?? "", ...color.map((v, k) => binding.base[k] > 1e-9 ? v / binding.base[k] : 1)]);
    let key = JSON.stringify(code);
    paintMap.has(key) || (paintMap.set(key, packed.paint.length), packed.paint.push(code)), packed.paintIndices.push(paintMap.get(key));
  }), packed.stats = { vertices: count, triangles: part.indices.length / 3, paintBindings: packed.paint.length }, packed;
}
function unpackSkin4Part(part, look) {
  if (part.format !== "nri-character-skin4-part" || part.version !== 2) throw Error("Unsupported skin4 part schema");
  let n = part.positions.length / 3;
  if (!Number.isInteger(n) || part.normals.length !== n * 3 || part.bones.length !== n * 4 || part.weights.length !== n * 4 || part.paintIndices.length !== n) throw Error("Invalid packed part lengths");
  let colors = part.paint.map((p) => resolveSkin4Paint(p, look));
  return {
    name: part.name,
    material: part.material,
    indices: [...part.indices],
    normals: Array.from({ length: n }, (_, i) => part.normals.slice(i * 3, i * 3 + 3)),
    colors: part.paintIndices.map((i) => {
      if (!colors[i]) throw Error("Unknown paint index");
      return colors[i];
    }),
    vertices: Array.from({ length: n }, (_, i) => ({ position: part.positions.slice(i * 3, i * 3 + 3), targetWeights: Array.from({ length: 4 }, (_2, j) => [part.bones[i * 4 + j], part.weights[i * 4 + j]]).filter(([, w]) => w > 0) })),
    ...part.uv ? { uv: Array.from({ length: n }, (_, i) => part.uv.slice(i * 2, i * 2 + 2)) } : {},
    ...part.uv2 ? { uv2: Array.from({ length: n }, (_, i) => part.uv2.slice(i * 2, i * 2 + 2)) } : {}
  };
}

// art-source/characters/ui/character-wearables.js
var TAU = Math.PI * 2;

// art-source/characters/ui/character-model.js
var TAU2 = Math.PI * 2;
var clamp = (n, a, b) => Math.max(a, Math.min(b, n));
var sub2 = (a, b) => a.map((n, i) => n - b[i]), dot2 = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
function solveArm(shoulder, elbowHint, wrist, upper = 9.7, lower = 9.1) {
  let metric = (p) => [p[0] * 36, p[1] * 36, p[2]], a = metric(shoulder), b = metric(wrist), hint = metric(elbowHint), delta = sub2(b, a), distance = Math.hypot(...delta) || 1, axis = delta.map((n) => n / distance), d = clamp(distance, Math.abs(upper - lower) + 0.08, upper + lower - 0.08), along = (upper * upper - lower * lower + d * d) / (2 * d), height = Math.sqrt(Math.max(0, upper * upper - along * along)), raw = sub2(hint, a), projection = dot2(raw, axis), pole = raw.map((n, i) => n - axis[i] * projection), pl = Math.hypot(...pole) || 1;
  return { elbow: a.map((n, i) => (n + axis[i] * along + pole[i] / pl * height) / (i < 2 ? 36 : 1)), wrist: a.map((n, i) => (n + axis[i] * d) / (i < 2 ? 36 : 1)) };
}
function characterRig(person, { seated = !1, atTable = !1, phase = 0, walking = !1, actionFrame = 0, reception = !1, master = !1, blockedSides = [], uniform } = {}) {
  let identity = appearanceFor(person, uniform), p = identity.portrait, s = SHAPES[p.bodyShape], height = s.height, hip = seated ? 16.4 : 30.4 * height, shoulder = hip + 21.2 * height * (s.torso ?? 1), hasPack = p.accessories.some((a) => ["everyday-backpack", "cyberpunk-tank"].includes(a.id)), lean = atTable ? 0.085 : seated && hasPack ? 0.075 : 0, rig = { identity, shape: s, hip, shoulder, neck: [0, lean, shoulder + 3.8], head: [0, lean + 8e-3, shoulder + 11], seated, atTable, lean, joints: {} };
  for (let side of [-1, 1]) {
    let name = side < 0 ? "L" : "R", stride = walking ? Math.sin(phase + side * Math.PI / 2) : 0, shoulderPoint = [side * (s.shoulder - 0.012), lean, shoulder - 1.1], elbow = [side * (s.shoulder + 0.025), lean + 0.025 - stride * 0.07, shoulder - 10.5], wrist = [side * (s.shoulder - 0.023), lean + 0.1 - stride * 0.13, shoulder - 19.3];
    if (seated && (elbow.splice(0, 3, side * (s.shoulder + 0.02), lean + 0.13, shoulder - 10), wrist.splice(0, 3, side * 0.17, 0.31, hip + 5.9)), (atTable || reception) && !blockedSides.includes(side) && (elbow.splice(0, 3, side * (s.shoulder + 0.02), lean + 0.2, shoulder - 8.5), wrist.splice(0, 3, side * 0.17, 0.52, seated ? 28.5 : shoulder - 11.2)), actionFrame && side === (master ? 1 : -1) && !blockedSides.includes(side)) {
      let gesture = [[0.17, 0.53, seated ? 28.5 : shoulder - 11], [0.2, 0.42, shoulder + 1.8], [0.13, 0.69, seated ? 28.6 : shoulder - 9], [0.25, 0.31, shoulder + 6]][actionFrame % 4];
      wrist.splice(0, 3, side * gesture[0], gesture[1], gesture[2]), elbow[1] = 0.2, elbow[2] = shoulder - 6.4;
    }
    let solved = solveArm(shoulderPoint, elbow, wrist, 9.7 * height, 9.1 * height);
    elbow.splice(0, 3, ...solved.elbow), wrist.splice(0, 3, ...solved.wrist);
    let pelvis = [side * s.hip * 0.51, -0.015, hip], knee = seated ? [side * 0.115, 0.375, 15.5] : [side * s.hip * 0.55, 0.015 + stride * 0.13, 16 * height], ankle = seated ? [side * 0.115, 0.405, 3] : [side * s.hip * 0.58, 0.025 + stride * 0.25, 3 + Math.max(0, stride) * 1.6];
    Object.assign(rig.joints, { ["shoulder" + name]: shoulderPoint, ["elbow" + name]: elbow, ["wrist" + name]: wrist, ["hip" + name]: pelvis, ["knee" + name]: knee, ["ankle" + name]: ankle });
  }
  return rig;
}

// tools/lib/experimental-character-profiles.mjs
var clamp2 = (n, a, b) => Math.max(a, Math.min(b, n)), ends = { torso: "head", upperarmL: "forearmL", forearmL: "handL", thighL: "calfL", calfL: "footL", upperarmR: "forearmR", forearmR: "handR", thighR: "calfR", calfR: "footR" }, PROFILE_POSES = { stand: {}, sit: { seated: !0 }, table: { seated: !0, atTable: !0 }, walk: { walking: !0, phase: 0.9 }, "walk-opposite": { walking: !0, phase: 2.4 } };
function profileRig(body = "regular", pose = "stand") {
  if (!SHAPES[body] || !PROFILE_POSES[pose]) throw Error("Unknown body or pose: " + body + "/" + pose);
  let authored = characterRig({ age: 30, portrait: { ...DEFAULT_LOOK, bodyShape: body } }, PROFILE_POSES[pose]), point = (p) => [p[0], p[2] / 36, p[1]], rig = { torso: [0, authored.hip / 36, 0], head: point(authored.head) };
  for (let side of ["L", "R"]) for (let [bone, joint] of [["upperarm", "shoulder"], ["forearm", "elbow"], ["hand", "wrist"], ["thigh", "hip"], ["calf", "knee"], ["foot", "ankle"]]) rig[bone + side] = point(authored.joints[joint + side]);
  return rig;
}
function endpoint(rig, bone) {
  if (ends[bone]) return rig[ends[bone]];
  if (bone.startsWith("hand")) {
    let parent = "forearm" + bone.at(-1);
    return add(rig[bone], sub(rig[bone], rig[parent]));
  }
  return null;
}
function widthAt(shape, t) {
  let knots = [[0, shape.hip], [0.3, shape.waist], [0.76, shape.shoulder], [1, shape.shoulder]], p = clamp2(t, 0, 1), a = knots[0];
  for (let b of knots.slice(1)) {
    if (p <= b[0]) return a[1] + (b[1] - a[1]) * (p - a[0]) / (b[0] - a[0]);
    a = b;
  }
  return a[1];
}
function localShape(p, bone, rig, shape) {
  let baseline = SHAPES.regular, origin = rig[bone], delta = sub(p, origin);
  if (bone === "head") return p;
  if (bone === "torso") {
    let height = rig.head[1] - origin[1], t = delta[1] / height;
    return add(origin, [delta[0] * widthAt(shape, t) / widthAt(baseline, t), delta[1], delta[2] * shape.depth / baseline.depth]);
  }
  let isArm = /^(upperarm|forearm|hand)/.test(bone), radius = isArm ? shape.arm / baseline.arm : shape.leg / baseline.leg, end = endpoint(rig, bone);
  if (end) {
    let axis = unit(sub(end, origin)), along = mul(axis, dot(delta, axis));
    return add(origin, add(along, mul(sub(delta, along), radius)));
  }
  return add(origin, [delta[0] * radius, delta[1], delta[2]]);
}
function transferProfileVertex(vertex, sourceRig, targetRig, shape) {
  let weights = vertex.targetWeights;
  if (!Array.isArray(weights) || weights.length < 1 || weights.length > 4 || Math.abs(weights.reduce((s, p) => s + p[1], 0) - 1) > 1e-6) throw Error("Expected complete normalized skin4 weights");
  let position = [0, 0, 0];
  for (let [index, weight] of weights) {
    let bone = BONES[index];
    if (!bone || !Number.isFinite(weight) || weight < 0) throw Error("Invalid bone weight");
    let shaped = localShape(vertex.position, bone, sourceRig, shape), transformed = segmentTransform(shaped, sourceRig[bone], targetRig[bone], endpoint(sourceRig, bone), endpoint(targetRig, bone), 1);
    position = add(position, mul(transformed, weight));
  }
  if (!position.every(Number.isFinite)) throw Error("Non-finite profile geometry");
  return { ...vertex, position };
}
function transferBodyProfile(skin, body, pose = "stand") {
  if (skin.format !== "nri-experimental-character-skin4" || !SHAPES[body]) throw Error("Unsupported experimental source or body profile");
  let sourceRig = skin.rig, targetRig = profileRig(body, pose), shape = SHAPES[body];
  for (let bone of BONES) if (!sourceRig[bone]) throw Error("Missing source bone " + bone);
  return { ...skin, bodyProfile: body, pose, rig: targetRig, primitives: skin.primitives.map((p) => ({ ...p, vertices: p.vertices.map((v) => transferProfileVertex(v, sourceRig, targetRig, shape)) })), normalsRequireRebuild: !0, experimental: !0 };
}
function faceProfilePoint(position, head, faceId) {
  let target = CATALOGS.face.find((f4) => f4.id === faceId)?.geometry, base = CATALOGS.face.find((f4) => f4.id === DEFAULT_LOOK.face)?.geometry;
  if (!target || !base) throw Error("Unknown saved face profile " + faceId);
  let d = sub(position, head), normalizedHeight = d[1] / (base.rz / 36), jaw = clamp2((-normalizedHeight - 0.15) / 0.55, 0, 1), chin = clamp2((-normalizedHeight - 0.65) / 0.35, 0, 1), jawRatio = 1 + jaw * (target.jaw / base.jaw - 1), chinRatio = 1 + chin * (target.chin / base.chin - 1);
  return add(head, [d[0] * target.rx / base.rx * jawRatio * chinRatio, d[1] * target.rz / base.rz, d[2] * target.ry / base.ry]);
}
function transferFaceProfile(skin, faceId) {
  let headIndex = BONES.indexOf("head");
  return { ...skin, faceProfile: faceId, experimental: !0, normalsRequireRebuild: !0, primitives: skin.primitives.map((p) => ({ ...p, vertices: p.vertices.map((v) => {
    let influence = v.targetWeights.find(([b]) => b === headIndex)?.[1] ?? 0;
    return { ...v, position: add(v.position, mul(sub(faceProfilePoint(v.position, skin.rig.head, faceId), v.position), influence)) };
  }) })) };
}

// tools/lib/experimental-character-face.mjs
var headWeight = (v) => v.targetWeights.find(([b]) => BONES[b] === "head")?.[1] ?? 0;
function measuredFaceLandmarks(skin) {
  let body = skin.primitives.find((p) => !["Eyes", "Eyebrows"].includes(p.name)), eyes = skin.primitives.find((p) => p.name === "Eyes");
  if (!body || !eyes) throw Error("Face fitting requires donor body and eyes");
  let skull = bounds(body.vertices.filter((v) => headWeight(v) > 0.7 && v.position[1] > skin.rig.head[1] - 0.16).map((v) => v.position)), sides = [-1, 1].map((side) => bounds(eyes.vertices.filter((v) => (v.position[0] - skin.rig.head[0]) * side > 0).map((v) => v.position)));
  if (sides.some((s) => !s)) throw Error("Both donor eyes must be measured");
  let eyeY = (sides[0].center[1] + sides[1].center[1]) / 2, headSize = skull.size[1], midX = skin.rig.head[0], noseTip = body.vertices.filter((v) => headWeight(v) > 0.7 && Math.abs(v.position[0] - midX) < skull.size[0] * 0.12 && v.position[1] < eyeY && v.position[1] > eyeY - headSize * 0.28).reduce((best, v) => !best || v.position[2] > best[2] ? v.position : best, null);
  if (!noseTip) throw Error("Cannot locate donor nose");
  let mouthY = eyeY - headSize * 0.29, mouthCandidates = body.vertices.filter((v) => headWeight(v) > 0.7 && Math.abs(v.position[0] - midX) < skull.size[0] * 0.22 && Math.abs(v.position[1] - mouthY) < headSize * 0.05), mouthZ = Math.max(...mouthCandidates.map((v) => v.position[2]));
  if (!Number.isFinite(mouthZ)) throw Error("Cannot locate donor lips");
  return { skull, eyes: sides, nose: [...noseTip], mouth: [midX, mouthY, mouthZ] };
}

// tools/lib/experimental-wardrobe-styles.mjs
var TOP_STYLES = Object.freeze({
  crew: { ease: 0.016, neck: "round" },
  henley: { ease: 0.017, neck: "henley" },
  polo: { ease: 0.018, neck: "collar" },
  shirt: { ease: 0.019, neck: "collar" },
  rolledshirt: { ease: 0.019, neck: "collar" },
  overshirt: { ease: 0.03, neck: "open" },
  hoodie: { ease: 0.033, neck: "hood" },
  ziphoodie: { ease: 0.033, neck: "hood" },
  cardigan: { ease: 0.026, neck: "open" },
  sweater: { ease: 0.024, neck: "round" },
  turtleneck: { ease: 0.016, neck: "high" },
  vest: { ease: 0.018, neck: "collar" },
  blazer: { ease: 0.032, neck: "lapels" },
  denim: { ease: 0.029, neck: "collar" },
  bomber: { ease: 0.039, neck: "rib" },
  dress: { ease: 0.02, neck: "round", drape: !0 },
  apron: { ease: 0.02, neck: "collar" },
  trench: { ease: 0.032, neck: "lapels", drape: !0 },
  poncho: { ease: 0.025, neck: "cloak", drape: !0 },
  athletic: { ease: 9e-3, neck: "round" }
});
var garmentNeckline = (rig) => Math.max(rig.upperarmL[1] + 0.155, rig.upperarmL[1] + (rig.head[1] - rig.upperarmL[1]) * 0.61), clamp3 = (n, a, b) => Math.max(a, Math.min(b, n)), lerp = (a, b, t) => a.map((n, i) => n + (b[i] - n) * t);
function canonicalClothWeldGroups(primitive) {
  if (!/^(reconstructed-(top|bottom):|top-layer:|bottom-drape:|top-extension:)/.test(primitive.name)) return null;
  let groups = /* @__PURE__ */ new Map();
  return primitive.vertices.map((v) => {
    let key = v.position.map((n) => Math.round(Math.fround(n) * 1e7)).join(",");
    return groups.has(key) || groups.set(key, groups.size), groups.get(key);
  });
}
function prepareClothNormals(primitive) {
  if (!/^(reconstructed-(top|bottom):|top-layer:|bottom-drape:|top-extension:)/.test(primitive.name)) return primitive;
  let saved = primitive.normalWeldGroups;
  if (saved && (!Array.isArray(saved) || saved.length !== primitive.vertices.length || saved.some((n) => !Number.isInteger(n) || n < 0))) throw Error("Invalid canonical cloth weld groups");
  let groups = /* @__PURE__ */ new Map(), keys = saved ?? primitive.vertices.map((v) => v.position.map((n) => Math.round(n * 1e7)).join(","));
  for (let i = 0; i < primitive.indices.length; i += 3) {
    let ids = primitive.indices.slice(i, i + 3), points = ids.map((j) => primitive.vertices[j].position), areaVector = cross(sub(points[1], points[0]), sub(points[2], points[0]));
    if (saved && length(areaVector) < 1e-7) continue;
    let face = unit(areaVector);
    for (let k = 0; k < 3; k++) {
      let a = unit(sub(points[(k + 1) % 3], points[k])), b = unit(sub(points[(k + 2) % 3], points[k])), angle = Math.acos(clamp3(dot(a, b), -1, 1)), key = keys[ids[k]];
      groups.set(key, add(groups.get(key) ?? [0, 0, 0], mul(face, angle)));
    }
  }
  let normals = keys.map((key) => {
    let sum = groups.get(key) ?? [0, 0, 0];
    return saved && length(sum) < 1e-12 ? [0, 1, 0] : unit(sum);
  });
  if (normals.some((n) => !n.every(Number.isFinite) || Math.abs(length(n) - 1) > 1e-5)) throw Error("Invalid smooth cloth normals: " + primitive.name);
  return { ...primitive, normals, normalsPolicy: "cloth-smooth", normalsPreparedForPositions: !0 };
}
function limbPointAtDistance(rig, side, distance) {
  let hip = rig["thigh" + side], knee = rig["calf" + side], ankle = rig["foot" + side], upper = length(sub(knee, hip)), lower = length(sub(ankle, knee)), first = distance <= upper, a = first ? hip : knee, b = first ? knee : ankle, t = first ? distance / upper : (distance - upper) / lower;
  return { position: lerp(a, b, clamp3(t, 0, 1)), axis: unit(sub(b, a)), bone: (first ? "thigh" : "calf") + side };
}

// tools/lib/experimental-wardrobe-fit.mjs
var rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
var lerp2 = (a, b, t) => a.map((n, i) => n + (b[i] - n) * t);
var linearColor = (hex) => [...rgb(hex).map((n) => (n /= 255, n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4)), 1];
var endName = { upperarmL: "forearmL", forearmL: "handL", thighL: "calfL", calfL: "footL", upperarmR: "forearmR", forearmR: "handR", thighR: "calfR", calfR: "footR" };
function segment(rig, bone) {
  let start = rig[bone], end = rig[endName[bone]], d = sub(end, start), len = length(d);
  return { start, end, axis: unit(d), length: len };
}
function coveragePlan(look, rig) {
  let bottom = CATALOGS.bottom.find((b) => b.id === look.bottom).geometry, shoe = CATALOGS.shoes.find((s) => s.id === look.shoeStyle).geometry, sleeve = ["crew", "polo", "dress"].includes(look.outfit) ? "short" : ["rolledshirt", "apron"].includes(look.outfit) ? "rolled" : look.outfit === "athletic" ? "bare" : "long", sides = Object.fromEntries(["L", "R"].map((side) => {
    let a = segment(rig, "upperarm" + side), f4 = segment(rig, "forearm" + side), thigh = segment(rig, "thigh" + side), calf = segment(rig, "calf" + side), armCut = sleeve === "long" ? { point: lerp2(f4.start, f4.end, 0.98), axis: f4.axis, bone: "forearm" + side } : sleeve === "bare" ? { point: lerp2(a.start, a.end, -0.035), axis: a.axis, bone: "upperarm" + side } : { point: lerp2(a.start, a.end, sleeve === "short" ? 0.455 : 0.885), axis: a.axis, bone: "upperarm" + side }, legCut;
    if (bottom.style === "shorts")
      legCut = bottom.length <= 0.7 ? { point: lerp2(thigh.start, thigh.end, bottom.length * 1.5 - 0.012), axis: thigh.axis, bone: "thigh" + side } : { point: lerp2(calf.start, calf.end, (bottom.length - 0.7) * 2 - 0.012), axis: calf.axis, bone: "calf" + side };
    else if (["skirt", "wrap", "kilt", "asymmetric"].includes(bottom.style)) {
      let at = limbPointAtDistance(rig, side, 0.3472 * bottom.length);
      legCut = { point: at.position, axis: at.axis, bone: at.bone };
    } else legCut = { point: [rig["foot" + side][0], rig["foot" + side][1] - 8e-3, rig["foot" + side][2]], axis: [0, -1, 0], bone: "foot" + side };
    let footwearTop = rig["foot" + side][1] + Math.max(4e-3, (shoe.height + shoe.sole - 2.6) / 36);
    return [side, { armCut, legCut, footwearTop }];
  }));
  return { sleeve, bottomStyle: bottom.style, shoeStyle: look.shoeStyle, closedShoes: !["straps", "slide"].includes(shoe.detail), neckline: garmentNeckline(rig), waistline: rig.torso[1] + 0.018, shirtHem: rig.torso[1] - 0.018, sides };
}
function interpolateVertex(a, b, t) {
  let weights = (key) => {
    let m = /* @__PURE__ */ new Map();
    for (let [id, w] of a[key] ?? []) m.set(id, (m.get(id) ?? 0) + w * (1 - t));
    for (let [id, w] of b[key] ?? []) m.set(id, (m.get(id) ?? 0) + w * t);
    return [...m].filter((p) => p[1] > 1e-10);
  };
  return { position: lerp2(a.position, b.position, t), targetWeights: weights("targetWeights"), sourceWeights: weights("sourceWeights"), ...a.surfaceNormal && b.surfaceNormal ? { surfaceNormal: unit(lerp2(a.surfaceNormal, b.surfaceNormal, t)) } : {}, generatedBoundary: !0 };
}
function clipPolygon(vertices, signedDistance) {
  let out = [];
  for (let i = 0; i < vertices.length; i++) {
    let a = vertices[i], b = vertices[(i + 1) % vertices.length], da = signedDistance(a.position, a), db = signedDistance(b.position, b);
    da >= 0 && out.push(a), da >= 0 != db >= 0 && out.push(interpolateVertex(a, b, da / (da - db)));
  }
  return out;
}
function triangleBone(tri) {
  let sums = Array(BONES.length).fill(0);
  for (let v of tri) for (let [j, w] of v.targetWeights) sums[j] += w;
  return BONES[sums.indexOf(Math.max(...sums))];
}
function clipAnatomicalLimb(tri, cut, keepDistal) {
  if (cut.bone) {
    let bone = triangleBone(tri), chain = /arm|hand/.test(cut.bone) ? ["upperarm", "forearm", "hand"] : ["thigh", "calf", "foot"], at = chain.indexOf(bone.slice(0, -1)), boundary = chain.indexOf(cut.bone.slice(0, -1));
    if (at >= 0 && at !== boundary) return (keepDistal ? at > boundary : at < boundary) ? tri : [];
  }
  return clipPolygon(tri, (p) => (keepDistal ? 1 : -1) * dot(sub(p, cut.point), cut.axis));
}
function maskDonorBody(primitive, rig, look, { footwearOnly = !1 } = {}) {
  let plan = coveragePlan(look, rig), vertices = [], indices = [], counts = { sourceTriangles: primitive.indices.length / 3, fullyHiddenTriangles: 0, retainedSourceTriangles: 0, clippedSourceTriangles: 0, generatedTriangles: 0, regions: {} };
  if (footwearOnly && !plan.closedShoes) return { primitive: { ...primitive, name: primitive.name.endsWith("-exposed-skin") ? primitive.name : primitive.name + "-exposed-skin" }, audit: { ...counts, retainedSourceTriangles: counts.sourceTriangles, generatedTriangles: counts.sourceTriangles, coverageFraction: 0, openFootwearNoOp: !0 }, plan };
  let keyMap = /* @__PURE__ */ new Map(), index = (v) => {
    let key = v.position.map((n) => n.toFixed(8)).join(",");
    return keyMap.has(key) || (keyMap.set(key, vertices.length), vertices.push(v)), keyMap.get(key);
  };
  for (let i = 0; i < primitive.indices.length; i += 3) {
    let tri = primitive.indices.slice(i, i + 3).map((j) => primitive.vertices[j]), centre = mul(tri.reduce((a, v) => add(a, v.position), [0, 0, 0]), 1 / 3), scores = { head: 0, Larm: 0, Rarm: 0, Lleg: 0, Rleg: 0, torso: 0 };
    for (let v of tri) for (let [j, w] of v.targetWeights) {
      let b = BONES[j], region2 = b === "head" ? "head" : /^(upperarm|forearm|hand)/.test(b) ? b.at(-1) + "arm" : /^(thigh|calf|foot)/.test(b) ? b.at(-1) + "leg" : "torso";
      scores[region2] += w;
    }
    let region = Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
    counts.regions[region] = (counts.regions[region] ?? 0) + 1;
    let poly = tri;
    if (footwearOnly)
      region.endsWith("leg") && plan.closedShoes && (poly = clipPolygon(poly, (p) => p[1] - plan.sides[region[0]].footwearTop));
    else if (region === "head" || region === "torso") poly = clipPolygon(poly, (p) => p[1] - plan.neckline);
    else if (region.endsWith("arm")) {
      let cut = plan.sides[region[0]].armCut;
      poly = clipAnatomicalLimb(poly, cut, !0);
    } else {
      let side = region[0], cut = plan.sides[side].legCut;
      poly = clipAnatomicalLimb(poly, cut, !0), plan.closedShoes && (poly = clipPolygon(poly, (p) => p[1] - plan.sides[side].footwearTop));
    }
    if (poly.length < 3) {
      counts.fullyHiddenTriangles++;
      continue;
    }
    counts.retainedSourceTriangles++, (poly.length !== 3 || poly.some((v) => v.generatedBoundary)) && counts.clippedSourceTriangles++;
    for (let j = 1; j < poly.length - 1; j++) indices.push(index(poly[0]), index(poly[j]), index(poly[j + 1]));
  }
  return counts.generatedTriangles = indices.length / 3, counts.coverageFraction = counts.fullyHiddenTriangles / counts.sourceTriangles, { primitive: { name: primitive.name.endsWith("-exposed-skin") ? primitive.name : primitive.name + "-exposed-skin", material: primitive.material, vertices, indices, colors: vertices.map(() => linearColor(look.skin)) }, audit: counts, plan };
}

// tools/lib/experimental-identity-parts.mjs
var clamp4 = (n, a, b) => Math.max(a, Math.min(b, n)), gaussian = (p, c, r) => Math.exp(-0.5 * p.reduce((s, v, i) => s + ((v - c[i]) / r[i]) ** 2, 0));
function prepareFaceChannels(skin) {
  let landmarks = measuredFaceLandmarks(skin), height = landmarks.skull.size[1], channels = skin.primitives.map((part) => part.vertices.map((v) => {
    let p = v.position, w = v.targetWeights.find(([b]) => BONES[b] === "head")?.[1] ?? 0, eye = landmarks.eyes[p[0] < skin.rig.head[0] ? 0 : 1], eyeInfluence = part.name === "Eyes" ? 1 : gaussian(p, eye.center, [eye.size[0] * 0.9, eye.size[1] * 1.45, height * 0.18]), body = part.name !== "Eyes" && part.name !== "Eyebrows", front = clamp4((p[2] - landmarks.skull.center[2]) / (height * 0.18), 0, 1), nose = body ? gaussian(p, landmarks.nose, [height * 0.1, height * 0.14, height * 0.17]) * front * w : 0, mouth = body ? gaussian(p, landmarks.mouth, [height * 0.16, height * 0.065, height * 0.13]) * front * w : 0;
    return [
      (p[0] - eye.center[0]) * eyeInfluence * w,
      (p[1] - eye.center[1]) * eyeInfluence * w,
      part.name === "Eyebrows" ? w : 0,
      nose,
      (p[0] - landmarks.mouth[0]) * mouth,
      mouth,
      clamp4(Math.abs(p[0] - landmarks.mouth[0]) / (height * 0.15), 0, 1) * mouth
    ];
  }));
  return { format: "nri-experimental-face-channels", version: 1, landmarks, height, channels, source: skin };
}
function applyFaceChannels(prepared, appearance = {}) {
  if (prepared.format !== "nri-experimental-face-channels") throw Error("Unknown face channel schema");
  let look = normalizeLook(appearance), joy = ["happy", "delighted"].includes(look.expression), surprise = look.expression === "surprised", bored = look.expression === "bored", focused = look.expression === "focused", coefficients = [
    [0.03, 0.033, 0.028, 0.034, 0.03, 0.032, 0.029][look.eyes] / 0.033 - 1,
    (surprise ? 1.15 : bored ? 0.7 : joy ? 0.88 : 1) * [0.9, 1, 1.12, 0.82, 1.04, 0.94, 1.06][look.eyes] * (look.eastAsian ? 0.52 / 0.75 : 1) - 1,
    surprise ? 0.012 : joy ? 6e-3 : focused ? -4e-3 : 0,
    (1.55 + look.nose * 0.1) / (1.55 + DEFAULT_LOOK.nose * 0.1) - 1,
    [0.84, 1, 1.16, 0.94][look.mouth] - 1,
    [-2e-3, 0, 2e-3, -3e-3][look.mouth],
    joy ? 0.011 : bored ? -5e-3 : 0
  ], { source, channels, height, landmarks } = prepared;
  return { ...source, primitives: source.primitives.map((p, pi) => ({ ...p, vertices: p.vertices.map((v, vi) => {
    let c = channels[pi][vi], a = coefficients;
    return { ...v, position: [
      v.position[0] + c[0] * a[0] + c[4] * a[4],
      v.position[1] + c[1] * a[1] + c[2] * a[2] - c[3] * a[3] * height * 0.055 + c[5] * a[5] + c[6] * a[6],
      v.position[2] + c[3] * a[3] * height * 0.1
    ] };
  }) })), facialFeatures: { eyes: look.eyes, nose: look.nose, mouth: look.mouth, expression: look.expression, eastAsian: !!look.eastAsian, landmarks }, normalsRequireRebuild: !0, experimental: !0 };
}

// tools/lib/character-canonical-assembly.mjs
function deformCanonicalIdentity(canonical, appearance = {}) {
  let look = normalizeLook(appearance);
  canonical = { ...canonical, primitives: canonical.primitives.map((p) => {
    let groups = p.normalWeldGroups ?? canonicalClothWeldGroups(p);
    return groups ? { ...p, normalWeldGroups: groups } : p;
  }) };
  let shaped = transferBodyProfile({ ...canonical, format: "nri-experimental-character-skin4" }, look.bodyShape, canonical.pose), faced = transferFaceProfile(shaped, look.face), deformed = applyFaceChannels(prepareFaceChannels(faced), look), primitives = deformed.primitives.map((part) => {
    let smooth = prepareClothNormals(part), normals = smooth.normalsPolicy === "cloth-smooth" ? smooth.normals : previewNormals(smooth).normals;
    return { ...smooth, normals, normalsPreparedForPositions: !0 };
  });
  return {
    ...deformed,
    format: "nri-experimental-dressed-skin",
    look,
    primitives,
    bounds: bounds(primitives.flatMap((p) => p.vertices.map((v) => v.position))),
    assemblyRecipe: {
      version: 1,
      base: "canonical-regular",
      pose: canonical.pose,
      body: look.bodyShape,
      face: look.face,
      stages: ["body", "face-profile", "face-channels", "normals"],
      visualAccepted: !1
    },
    audit: { ...canonical.audit, runtimeChanged: !1, visualPassed: !1 }
  };
}

// tools/lib/browser-native-character-morph.mjs
var f = Math.fround, nativeVector3 = {
  make: (a) => a.map(f),
  add: (a, b) => [f(a[0] + b[0]), f(a[1] + b[1]), f(a[2] + b[2])],
  sub: (a, b) => [f(a[0] - b[0]), f(a[1] - b[1]), f(a[2] - b[2])],
  mul: (a, s) => (s = f(s), [f(a[0] * s), f(a[1] * s), f(a[2] * s)]),
  div: (a, s) => (s = f(s), [f(a[0] / s), f(a[1] / s), f(a[2] / s)]),
  dot: (a, b) => f(f(f(a[0] * b[0]) + f(a[1] * b[1])) + f(a[2] * b[2])),
  cross: (a, b) => [f(f(a[1] * b[2]) - f(a[2] * b[1])), f(f(a[2] * b[0]) - f(a[0] * b[2])), f(f(a[0] * b[1]) - f(a[1] * b[0]))]
}, V = nativeVector3;
V.length = (a) => f(Math.sqrt(V.dot(a, a)));
V.unit = (a) => {
  let n = V.length(a);
  return n === 0 ? [0, 0, 0] : V.div(a, n);
};
var clamp5 = (v, a, b) => Math.max(a, Math.min(b, v)), width = (t, s) => t <= 0.3 ? s.hip + (s.waist - s.hip) * (t / 0.3) : t <= 0.76 ? s.waist + (s.shoulder - s.waist) * ((t - 0.3) / (0.76 - 0.3)) : s.shoulder;
function prepareNativeCharacterMorph(recipe, sourceRig, targetRig, shapeId, faceId) {
  let shape = recipe.shapes[shapeId], baseline = recipe.shapes.regular, face = recipe.faces[faceId], baseFace = recipe.faces[recipe.defaultFace], endpoint2 = (rig, name) => recipe.ends[name] ? V.make(rig[recipe.ends[name]]) : name.startsWith("hand") ? V.sub(V.add(V.make(rig[name]), V.make(rig[name])), V.make(rig["forearm" + name.slice(-1)])) : null, maps = recipe.bones.map((name) => {
    let source = V.make(sourceRig[name]), target = V.make(targetRig[name]), se = endpoint2(sourceRig, name), te = endpoint2(targetRig, name), arm = name.startsWith("upperarm") || name.startsWith("forearm") || name.startsWith("hand"), map = { source, target, kind: name === "head" ? 0 : name === "torso" ? 1 : se ? 2 : 3, radius: arm ? shape.arm / baseline.arm : shape.leg / baseline.leg, shapeAxis: se ? V.unit(V.sub(se, source)) : null, segment: !1, rotationKind: 0 };
    if (se && te) {
      let a = V.sub(se, source), b = V.sub(te, target), al = V.length(a), bl = V.length(b);
      if (al >= 1e-8 && bl >= 1e-8) {
        let u = V.div(a, al), targetAxis = V.div(b, bl), cosine = clamp5(V.dot(u, targetAxis), -1, 1), axis = V.cross(u, targetAxis), sine = V.length(axis);
        Object.assign(map, { segment: !0, sourceLength: al, targetLength: bl, targetAxis, cosine, sine }), sine > 1e-8 ? (map.rotationKind = 1, map.rotationAxis = V.div(axis, sine)) : cosine < 0 && (map.rotationKind = 2, map.rotationAxis = V.unit(V.cross(u, Math.abs(u[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0])));
      }
    }
    return map;
  }), head = V.make(targetRig.head), headIndex = recipe.bones.indexOf("head"), torsoHeight = sourceRig.head[1] - V.make(sourceRig.torso)[1], jawRatio = face.jaw / baseFace.jaw - 1, chinRatio = face.chin / baseFace.chin - 1;
  return { maps, point(position, weights) {
    let p = V.make(position), result = [0, 0, 0], headWeight2 = 0;
    for (let [bone, weight] of weights) {
      let m = maps[bone];
      bone === headIndex && (headWeight2 = weight);
      let shaped = p, delta = V.sub(p, m.source);
      if (m.kind === 1) {
        let t = clamp5(delta[1] / torsoHeight, 0, 1);
        shaped = V.add(m.source, V.make([delta[0] * width(t, shape) / width(t, baseline), delta[1], delta[2] * shape.depth / baseline.depth]));
      } else if (m.kind === 2) {
        let along2 = V.mul(m.shapeAxis, V.dot(delta, m.shapeAxis));
        shaped = V.add(V.add(m.source, along2), V.mul(V.sub(delta, along2), m.radius));
      } else m.kind === 3 && (shaped = V.add(m.source, V.make([delta[0] * m.radius, delta[1], delta[2]])));
      if (delta = V.sub(shaped, m.source), !m.segment) {
        result = V.add(result, V.mul(V.add(m.target, delta), weight));
        continue;
      }
      let rotated = delta, k = m.rotationAxis;
      m.rotationKind === 1 ? rotated = V.add(V.add(V.mul(delta, m.cosine), V.mul(V.cross(k, delta), m.sine)), V.mul(V.mul(k, V.dot(k, delta)), 1 - m.cosine)) : m.rotationKind === 2 && (rotated = V.sub(V.mul(V.mul(k, 2), V.dot(k, delta)), delta));
      let along = V.dot(rotated, m.targetAxis), point = V.add(V.add(m.target, V.sub(rotated, V.mul(m.targetAxis, along))), V.div(V.mul(V.mul(m.targetAxis, along), m.targetLength), m.sourceLength));
      result = V.add(result, V.mul(point, weight));
    }
    if (headWeight2 > 0) {
      let delta = V.sub(result, head), height = delta[1] / (baseFace.rz / 36), jaw = clamp5((-height - 0.15) / 0.55, 0, 1), chin = clamp5((-height - 0.65) / 0.35, 0, 1), at = V.add(head, V.make([delta[0] * face.rx / baseFace.rx * (1 + jaw * jawRatio) * (1 + chin * chinRatio), delta[1] * face.rz / baseFace.rz, delta[2] * face.ry / baseFace.ry]));
      result = V.add(result, V.mul(V.sub(at, result), headWeight2));
    }
    return result;
  } };
}
function morphNativeCharacter(canonical, look, recipe) {
  if (!recipe?.rigs?.[look.bodyShape]?.[canonical.pose]) throw Error("Missing native profile recipe");
  let rig = recipe.rigs[look.bodyShape][canonical.pose], morph = prepareNativeCharacterMorph(recipe, canonical.rig, rig, look.bodyShape, look.face);
  return { ...canonical, rig, primitives: canonical.primitives.map((part) => ({ ...part, vertices: part.vertices.map((v) => ({ ...v, position: morph.point(v.position, v.targetWeights) })) })) };
}
function rebuildNativeCharacterNormals(part) {
  let smooth = part.normalsPolicy === "cloth-smooth" || /^(reconstructed-(top|bottom):|top-layer:|bottom-drape:|top-extension:)/.test(part.name), keys = [], groups = /* @__PURE__ */ new Map(), sums = [];
  for (let i = 0; i < part.vertices.length; i++) {
    let group = smooth ? part.normalWeldGroups?.[i] : i;
    if (group === void 0) throw Error("Missing canonical normal weld groups");
    groups.has(group) || (groups.set(group, sums.length), sums.push([0, 0, 0])), keys.push(groups.get(group));
  }
  let p = part.vertices.map((v) => v.position);
  for (let i = 0; i < part.indices.length; i += 3) {
    let ids = part.indices.slice(i, i + 3), a = p[ids[0]], b = p[ids[1]], c = p[ids[2]], ax = b[0] - a[0], ay = b[1] - a[1], az = b[2] - a[2], bx = c[0] - a[0], by = c[1] - a[1], bz = c[2] - a[2], nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, l2 = nx * nx + ny * ny + nz * nz;
    if (!(l2 < 1e-24 || smooth && l2 < 1e-14)) {
      if (smooth) {
        let len = Math.sqrt(l2);
        nx /= len, ny /= len, nz /= len;
      }
      for (let k = 0; k < 3; k++) {
        let weight = 1;
        if (smooth) {
          let a2 = p[ids[k]], b2 = p[ids[(k + 1) % 3]], c2 = p[ids[(k + 2) % 3]], ax2 = b2[0] - a2[0], ay2 = b2[1] - a2[1], az2 = b2[2] - a2[2], bx2 = c2[0] - a2[0], by2 = c2[1] - a2[1], bz2 = c2[2] - a2[2], len = Math.sqrt(ax2 * ax2 + ay2 * ay2 + az2 * az2);
          len >= 1e-12 ? (ax2 /= len, ay2 /= len, az2 /= len) : ax2 = ay2 = az2 = 0, len = Math.sqrt(bx2 * bx2 + by2 * by2 + bz2 * bz2), len >= 1e-12 ? (bx2 /= len, by2 /= len, bz2 /= len) : bx2 = by2 = bz2 = 0, weight = Math.acos(clamp5(ax2 * bx2 + ay2 * by2 + az2 * bz2, -1, 1));
        }
        let sum = sums[keys[ids[k]]];
        sum[0] += nx * weight, sum[1] += ny * weight, sum[2] += nz * weight;
      }
    }
  }
  let normals = keys.map((key) => {
    let [x, y, z] = sums[key], len = Math.sqrt(x * x + y * y + z * z);
    return len >= 1e-12 ? [x / len, y / len, z / len] : [0, 1, 0];
  });
  return { ...part, normals, normalsPolicy: smooth ? "cloth-smooth" : "vertex", normalsPreparedForPositions: !0 };
}

// tools/lib/browser-native-character-face.mjs
var f2 = Math.fround, clamp6 = (v, a, b) => Math.max(a, Math.min(b, v)), featureId = (value, fallback, max) => Number.isFinite(value) ? clamp6(Math.trunc(value), 0, max) : fallback, gaussian2 = (point, center, radius) => {
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    let d = (point[i] - center[i]) / radius[i];
    sum += d * d;
  }
  return Math.exp(-0.5 * sum);
};
function measuredBounds(points) {
  if (!points.length) throw Error("Cannot measure native donor landmarks");
  let min = [1 / 0, 1 / 0, 1 / 0], max = [-1 / 0, -1 / 0, -1 / 0];
  for (let point of points) for (let i = 0; i < 3; i++) {
    let value = f2(point[i]);
    min[i] = Math.min(min[i], value), max[i] = Math.max(max[i], value);
  }
  return { min, max, size: min.map((v, i) => f2(max[i] - v)), center: min.map((v, i) => f2(f2(v + max[i]) * 0.5)), count: points.length };
}
function applyNativeFaceChannels(skin, look, recipe) {
  let cfg = recipe.faceBasis, defaults = recipe.featureDefaults;
  if (!cfg || !defaults) throw Error("Native face recipe required");
  let body = skin.primitives.find((p) => !["Eyes", "Eyebrows"].includes(p.name)), eyesPart = skin.primitives.find((p) => p.name === "Eyes");
  if (!body || !eyesPart) throw Error("Native face body/eyes missing");
  let headIndex = recipe.bones.indexOf("head"), head = skin.rig.head, headWeight2 = (v) => v.targetWeights.find((pair) => pair[0] === headIndex)?.[1] ?? 0, skull = measuredBounds(body.vertices.filter((v) => headWeight2(v) > cfg.landmarkWeight && v.position[1] > head[1] - cfg.skullBelowHead).map((v) => v.position)), eyeBounds = [0, 1].map((side) => measuredBounds(eyesPart.vertices.filter((v) => v.position[0] !== head[0] && (v.position[0] < head[0] ? 0 : 1) === side).map((v) => v.position))), height = skull.size[1], eyeY = (eyeBounds[0].center[1] + eyeBounds[1].center[1]) * 0.5, mouth = [head[0], eyeY - height * cfg.mouthBelowEye, -1 / 0], nose = [];
  for (let vertex of body.vertices) {
    if (headWeight2(vertex) <= cfg.landmarkWeight) continue;
    let p = vertex.position;
    Math.abs(p[0] - head[0]) < skull.size[0] * cfg.noseWidth && p[1] < eyeY && p[1] > eyeY - height * cfg.noseBelowEye && (!nose.length || p[2] > nose[2]) && (nose = [...p]), Math.abs(p[0] - head[0]) < skull.size[0] * cfg.mouthWidth && Math.abs(p[1] - mouth[1]) < height * cfg.mouthBand && (mouth[2] = Math.max(mouth[2], p[2]));
  }
  if (!nose.length || !Number.isFinite(mouth[2])) throw Error("Cannot locate native donor nose/lips");
  let eyeId = featureId(look.eyes, defaults.eyes, 6), noseId = featureId(look.nose, defaults.nose, 6), mouthId = featureId(look.mouth, defaults.mouth, 3), mood = look.expression ?? defaults.expression, joy = ["happy", "delighted"].includes(mood), a = [
    cfg.eyeWidths[eyeId] / cfg.eyeWidths[defaults.eyes] - 1,
    (mood === "surprised" ? 1.15 : mood === "bored" ? 0.7 : joy ? 0.88 : 1) * cfg.eyeHeights[eyeId] * (look.eastAsian ? 0.52 / 0.75 : 1) - 1,
    mood === "surprised" ? 0.012 : joy ? 6e-3 : mood === "focused" ? -4e-3 : 0,
    (1.55 + noseId * 0.1) / (1.55 + defaults.nose * 0.1) - 1,
    cfg.mouthWidths[mouthId] - 1,
    cfg.mouthLifts[mouthId],
    joy ? 0.011 : mood === "bored" ? -5e-3 : 0
  ], landmarks = { skull, eyes: eyeBounds, nose, mouth }, primitives = skin.primitives.map((part) => ({ ...part, vertices: part.vertices.map((vertex) => {
    let w = headWeight2(vertex);
    if (w === 0) return vertex;
    let p = vertex.position, eye = eyeBounds[p[0] < head[0] ? 0 : 1], eyeInfluence = part.name === "Eyes" ? 1 : gaussian2(p, eye.center, [eye.size[0] * cfg.eyeRadius[0], eye.size[1] * cfg.eyeRadius[1], height * cfg.eyeRadius[2]]), isBody = part.name !== "Eyes" && part.name !== "Eyebrows", front = clamp6((p[2] - skull.center[2]) / (height * cfg.frontDepth), 0, 1), n = isBody ? gaussian2(p, nose, [height * cfg.noseRadius[0], height * cfg.noseRadius[1], height * cfg.noseRadius[2]]) * front * w : 0, m = isBody ? gaussian2(p, mouth, [height * cfg.mouthRadius[0], height * cfg.mouthRadius[1], height * cfg.mouthRadius[2]]) * front * w : 0, c = [(p[0] - eye.center[0]) * eyeInfluence * w, (p[1] - eye.center[1]) * eyeInfluence * w, part.name === "Eyebrows" ? w : 0, n, (p[0] - mouth[0]) * m, m, clamp6(Math.abs(p[0] - mouth[0]) / (height * cfg.cornerWidth), 0, 1) * m];
    return { ...vertex, position: [p[0] + c[0] * a[0] + c[4] * a[4], p[1] + c[1] * a[1] + c[2] * a[2] - c[3] * a[3] * height * 0.055 + c[5] * a[5] + c[6] * a[6], p[2] + c[3] * a[3] * height * 0.1] };
  }) }));
  return { ...skin, primitives, facialFeatures: { eyes: eyeId, nose: noseId, mouth: mouthId, expression: mood, eastAsian: !!look.eastAsian, landmarks }, normalsRequireRebuild: !0 };
}

// tools/lib/browser-character-assembly.mjs
var FLOAT_FIELDS = ["positions", "normals", "weights", "uv", "uv2"], UINT_FIELDS = ["bones", "indices", "paintIndices"], clock = () => performance.now(), textDecoder = new TextDecoder();
async function decodeBrowserSkin4Packet(compressed) {
  let start = clock(), bytes = compressed instanceof Uint8Array ? compressed : new Uint8Array(compressed), stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")), raw = await new Response(stream).arrayBuffer(), view = new DataView(raw), inflated = clock();
  if (raw.byteLength < 12 || textDecoder.decode(new Uint8Array(raw, 0, 8)) !== "NRI4PART") throw Error("Invalid NRI4PART signature");
  let headerSize = view.getUint32(8, !0), dataStart = 12 + headerSize;
  if (dataStart > raw.byteLength) throw Error("Invalid NRI4PART header length");
  let packet = JSON.parse(textDecoder.decode(new Uint8Array(raw, 12, headerSize)));
  if (!packet.buffers || typeof packet.buffers != "object") throw Error("Missing NRI4PART buffers");
  for (let [key, b] of Object.entries(packet.buffers)) {
    let type = FLOAT_FIELDS.includes(key) ? "f32" : UINT_FIELDS.includes(key) ? "u32" : null;
    if (!type || b.type !== type || !Number.isSafeInteger(b.offset) || b.offset < 0 || !Number.isSafeInteger(b.length) || b.length < 0 || b.offset + b.length * 4 > raw.byteLength - dataStart) throw Error("Invalid NRI4PART buffer " + key);
    let values = new Array(b.length), offset = dataStart + b.offset;
    for (let i = 0; i < b.length; i++) values[i] = type === "f32" ? view.getFloat32(offset + i * 4, !0) : view.getUint32(offset + i * 4, !0);
    packet[key] = values;
  }
  return delete packet.buffers, { packet, timing: { inflate: inflated - start, decode: clock() - inflated } };
}
function selectBrowserSkin4Parts(node, l) {
  let h = l.hat !== "none" && !["crown", "cybervisor"].includes(l.hat) ? "tucked" : "loose", dress = l.outfit === "dress" ? node.dressCoverageV1 : null, families = [dress ? dress.anatomyByBottom[l.bottom] : node.anatomy, node.tops[l.outfit][l.pattern], dress ? dress.bottomsByBottom[l.bottom] : node.bottoms[l.bottom], ...l.bottom === "overalls" ? [node.overalls[l.outfit]] : [], node.shoes[l.shoeStyle], node.hair[l.hair][l.hairDetail][h], ...l.hat !== "none" ? [node.hats[l.hat]] : [], ...l.accessories.map((a) => node.accessories[a.id]), ...["glasses", "beard", "moustache", "freckles", "earrings"].filter((k) => l[k]).map((k) => node.legacy[k]), ...l.hairClip ? [node.hairClips[l.hair][l.hairDetail][h]] : [], ...l.necklace ? [node.necklaces[l.outfit]] : []];
  if (families.some((f4) => !Array.isArray(f4))) throw Error("Missing canonical family");
  return families.flat();
}
function mergeBrowserSkin4Atlas(set, recipe, { semanticPaint = !1 } = {}) {
  let p = { format: "nri-character-skin4-part", version: 2, name: "canonical-character-atlas", material: 0, positions: [], normals: [], bones: [], weights: [], indices: [], paint: [], paintIndices: [], uv: [], uv2: [] }, paintMap = /* @__PURE__ */ new Map();
  for (let part of set.parts) {
    let first = p.positions.length / 3, paintFirst = p.paint.length, mapping = recipe.uvMappings.find((m) => m.sourceMaterial === part.material);
    if (!mapping) throw Error("Missing atlas mapping");
    for (let field of ["positions", "normals", "bones", "weights"]) p[field].push(...part[field]);
    if (p.indices.push(...part.indices.map((i) => i + first)), semanticPaint) {
      let remap = part.paint.map((code) => {
        let key = JSON.stringify(code);
        return paintMap.has(key) || (paintMap.set(key, p.paint.length), p.paint.push(code)), paintMap.get(key);
      });
      p.paintIndices.push(...part.paintIndices.map((i) => remap[i]));
    } else
      p.paint.push(...part.paint), p.paintIndices.push(...part.paintIndices.map((i) => i + paintFirst));
    for (let i = 0; i < part.positions.length / 3; i++)
      p.uv.push(...mapping.whiteUV ?? [0, 1].map((a) => (part.uv[i * 2 + a] * mapping.sourceSize[a] - mapping.sourceOrigin[a] + mapping.padding + mapping.rect[a]) / recipe.atlas.size[a])), p.uv2.push(mapping.row, 0);
  }
  return { ...set, parts: [p] };
}
function packBrowserSkin4GPU(set) {
  if (set.parts.length !== 1) throw Error("GPU bridge requires one merged surface");
  let part = set.parts[0], fields = {}, buffers = [];
  for (let key of [...FLOAT_FIELDS, ...UINT_FIELDS]) {
    if (!part[key]) throw Error("Missing GPU channel " + key);
    let array = UINT_FIELDS.includes(key) ? Uint32Array.from(part[key]) : Float32Array.from(part[key]);
    if (key === "indices") for (let i = 0; i < array.length; i += 3) {
      let b = array[i + 1];
      array[i + 1] = array[i + 2], array[i + 2] = b;
    }
    fields[key] = array, buffers.push(array.buffer);
  }
  return { packed: { format: "nri-character-skin4-packed", version: 1, endian: "little", indexWinding: "godot-clockwise", fields, rig: set.rig, bones: set.bones, paint: part.paint, metadata: { materialEncoding: "uv2-material-index-v1", normalPolicy: "prepared-per-family" } }, buffers, bytes: buffers.reduce((n, b) => n + b.byteLength, 0) };
}
function transferBrowserSkin4Set(set) {
  let buffers = [], parts = set.parts.map((p) => {
    let result = { ...p };
    for (let key of [...FLOAT_FIELDS, ...UINT_FIELDS]) if (p[key]) {
      let values = UINT_FIELDS.includes(key) ? new Uint32Array(p[key]) : new Float64Array(p[key]);
      result[key] = values, buffers.push(values.buffer);
    }
    return result;
  });
  return { set: { ...set, parts }, buffers, bytes: buffers.reduce((n, b) => n + b.byteLength, 0) };
}
var BrowserCharacterAssembler = class {
  constructor(manifest, materials, loadCompressed, { cacheBudget = 24 * 1024 * 1024, profileRecipe = null } = {}) {
    if (manifest.format !== "nri-character-canonical-library" || manifest.version !== 1) throw Error("Invalid canonical manifest");
    let bottomIds = CATALOGS.bottom.map((b) => b.id).sort();
    for (let base of Object.values(manifest.bases)) for (let node of Object.values(base.poses)) if (node.dressCoverageV1) {
      let recipe = node.dressCoverageV1;
      if (recipe.footwear !== "runtime" || !/^[a-f0-9]{64}$/.test(recipe.recipeHash)) throw Error("Invalid dress coverage provenance");
      for (let name of ["anatomyByBottom", "bottomsByBottom"]) {
        let table = recipe[name];
        if (!table || JSON.stringify(Object.keys(table).sort()) !== JSON.stringify(bottomIds)) throw Error("Incomplete dress coverage table");
        for (let refs of Object.values(table)) if (!Array.isArray(refs) || name === "anatomyByBottom" && !refs.length || new Set(refs).size !== refs.length || refs.some((id) => !Object.hasOwn(manifest.parts, id))) throw Error("Invalid dress coverage references");
      }
    }
    this.manifest = manifest, this.materials = materials, this.loadCompressed = loadCompressed, this.profileRecipe = profileRecipe, this.cache = /* @__PURE__ */ new Map(), this.cacheBytes = 0, this.cacheBudget = cacheBudget;
  }
  async packet(id, timing) {
    if (this.cache.has(id)) {
      let item = this.cache.get(id);
      return this.cache.delete(id), this.cache.set(id, item), timing.cacheHits++, item.packet;
    }
    let path = this.manifest.parts[id];
    if (typeof path != "string") throw Error("Missing canonical packet");
    let loadStart = clock(), bytes = await this.loadCompressed(path, id);
    timing.read += clock() - loadStart;
    let decoded = await decodeBrowserSkin4Packet(bytes);
    timing.inflate += decoded.timing.inflate, timing.decode += decoded.timing.decode, timing.cacheMisses++;
    let packet = decoded.packet, estimate = [...FLOAT_FIELDS, ...UINT_FIELDS].reduce((n, k) => n + (packet[k]?.length ?? 0) * 32, 0) + (packet.metadata?.normalWeldGroups?.length ?? 0) * 32 + JSON.stringify(packet.paint ?? []).length * 2 + 2048;
    if (estimate <= this.cacheBudget) {
      for (; this.cacheBytes + estimate > this.cacheBudget && this.cache.size; ) {
        let key = this.cache.keys().next().value;
        this.cacheBytes -= this.cache.get(key).estimate, this.cache.delete(key);
      }
      this.cache.set(id, { packet, estimate }), this.cacheBytes += estimate;
    }
    return packet;
  }
  async assemble(appearance, base, pose, { includeParts = !1, packedGPU = !1 } = {}) {
    let start = clock(), look = normalizeLook(appearance), node = this.manifest.bases[base]?.poses[pose];
    if (!node) throw Error("Missing base/pose");
    let refs = selectBrowserSkin4Parts(node, look), primitives = [], paintSources = [], timing = { read: 0, inflate: 0, decode: 0, prefetch: 0, unpack: 0, coverage: 0, deformNormals: 0, pack: 0, mergeAtlas: 0, transfer: 0, cacheHits: 0, cacheMisses: 0, maxConcurrentLoads: 0 }, loaded = /* @__PURE__ */ new Map(), unique = [...new Set(refs)], next = 0, active = 0, prefetchStart = clock();
    await Promise.all(Array.from({ length: Math.min(6, unique.length) }, async () => {
      for (; next < unique.length; ) {
        let id = unique[next++];
        active++, timing.maxConcurrentLoads = Math.max(timing.maxConcurrentLoads, active);
        try {
          loaded.set(id, await this.packet(id, timing));
        } finally {
          active--;
        }
      }
    })), timing.prefetch = clock() - prefetchStart;
    let body = !1, dress = look.outfit === "dress" ? node.dressCoverageV1 : null, anatomyRefs = dress ? dress.anatomyByBottom[look.bottom] : node.anatomy;
    for (let id of refs) {
      let packet = loaded.get(id), unpackStart = clock(), p = unpackSkin4Part(packet, look);
      timing.unpack += clock() - unpackStart, packet.metadata?.normalWeldGroups && (p.normalWeldGroups = packet.metadata.normalWeldGroups), packet.metadata?.normalsPolicy && (p.normalsPolicy = packet.metadata.normalsPolicy);
      let paintSource = packet;
      if (!body && anatomyRefs.includes(id) && !["Eyes", "Eyebrows"].includes(p.name)) {
        let t2 = clock();
        p = maskDonorBody(p, node.rig, look, { footwearOnly: !!dress }).primitive, timing.coverage += clock() - t2, body = !0, paintSource = { paint: [["skin", "", 1, 1, 1, 1]], paintIndices: new Array(p.vertices.length).fill(0) };
      }
      primitives.push(p), paintSources.push(paintSource);
    }
    let canonical = { format: "nri-experimental-character-skin4", targetBones: this.manifest.bones, rig: node.rig, pose, primitives }, t = clock(), deformed;
    packedGPU ? (deformed = applyNativeFaceChannels(morphNativeCharacter(canonical, look, this.profileRecipe), look, this.profileRecipe), deformed = { ...deformed, primitives: deformed.primitives.map(rebuildNativeCharacterNormals) }) : deformed = deformCanonicalIdentity(canonical, look), timing.deformNormals = clock() - t, t = clock();
    let set = { format: "nri-character-skin4-set", version: 2, bones: this.manifest.bones, rig: deformed.rig, parts: deformed.primitives.map((p, i) => {
      let result = packSkin4Part(packedGPU ? { ...p, colors: void 0 } : p, look);
      if (packedGPU) {
        if (p.vertices.length !== paintSources[i].paintIndices.length) throw Error("Semantic paint topology changed");
        result.paint = paintSources[i].paint, result.paintIndices = paintSources[i].paintIndices;
      }
      return result;
    }) };
    timing.pack = clock() - t, t = clock();
    let atlas = mergeBrowserSkin4Atlas(set, this.materials[base], { semanticPaint: packedGPU });
    if (timing.mergeAtlas = clock() - t, packedGPU) {
      t = clock();
      let encoded = packBrowserSkin4GPU(atlas);
      return timing.transfer = clock() - t, timing.total = clock() - start, { packed: encoded.packed, transferables: encoded.buffers, transferBytes: encoded.bytes, timings: { ...timing, totalMs: timing.total }, cache: { count: this.cache.size, estimatedBytes: this.cacheBytes, budget: this.cacheBudget } };
    }
    t = clock();
    let encodedAtlas = transferBrowserSkin4Set(atlas), encodedParts = includeParts ? transferBrowserSkin4Set(set) : null;
    return timing.transfer = clock() - t, timing.total = clock() - start, { atlas: encodedAtlas.set, ...encodedParts ? { parts: encodedParts.set } : {}, transferables: [...encodedAtlas.buffers, ...encodedParts?.buffers ?? []], transferBytes: encodedAtlas.bytes + (encodedParts?.bytes ?? 0), timing, cache: { count: this.cache.size, estimatedBytes: this.cacheBytes, budget: this.cacheBudget } };
  }
};

// godot/web/character-geometry-validation.js
var FLOAT_FIELDS2 = ["positions", "normals", "weights", "uv", "uv2"], UINT_FIELDS2 = ["bones", "indices", "paintIndices"], ALL_FIELDS = [...FLOAT_FIELDS2, ...UINT_FIELDS2], MAX_BYTES = 16 * 1024 * 1024, f3 = Math.fround, clock2 = () => performance.now(), fail = (message) => {
  throw new Error(message);
}, check = (ok, message) => {
  ok || fail(message);
}, isType = (value, name) => ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === "[object " + name + "]" && Object.prototype.toString.call(value.buffer) === "[object ArrayBuffer]", finite2 = (value) => typeof value == "number" && Number.isFinite(value);
function validateFinalPackedCharacter(packet, { boneNames, materialRows } = {}) {
  let start = clock2();
  check(packet?.format === "nri-character-skin4-packed" && packet.version === 1, "Unsupported packed envelope"), check(packet.endian === "little", "Explicit little endian required"), check(packet.indexWinding === "godot-clockwise", "Verified fast intake requires already clockwise indices"), check(Array.isArray(boneNames) && boneNames.length === 14 && new Set(boneNames).size === 14, "Independent fourteen bone names required"), check(Array.isArray(packet.bones) && packet.bones.length === 14 && packet.bones.every((bone, i) => bone === boneNames[i]), "Bone names/order differ"), check(packet.rig && boneNames.every((bone) => Array.isArray(packet.rig[bone]) && packet.rig[bone].length === 3 && packet.rig[bone].every(finite2)), "Invalid rig anchors"), check(Number.isInteger(materialRows) && materialRows > 0 && materialRows <= 32, "Independent bounded material row count required"), check(Array.isArray(packet.paint) && packet.paint.length > 0 && packet.paint.length <= 4096, "Invalid semantic palette size");
  for (let code of packet.paint) {
    check(Array.isArray(code) && typeof code[0] == "string", "Invalid semantic paint code");
    let first = code[0] === "fixed" ? 1 : 2;
    check(code.length === first + 4 && (first === 1 || typeof code[1] == "string") && code.slice(first).every((n) => finite2(n) && n >= 0), "Invalid semantic paint coefficients");
  }
  check(packet.metadata === void 0 || packet.metadata !== null && typeof packet.metadata == "object" && !Array.isArray(packet.metadata), "Invalid small metadata object"), check(JSON.stringify({ rig: packet.rig, bones: packet.bones, paint: packet.paint, metadata: packet.metadata ?? {} }).length <= 32768, "Metadata is not a small header");
  let fields = packet.fields;
  check(fields && typeof fields == "object" && !Array.isArray(fields), "Packed fields required"), check(Object.keys(fields).every((name) => ALL_FIELDS.includes(name)), "Unknown binary field");
  for (let name of FLOAT_FIELDS2) (name !== "uv" || fields[name] !== void 0) && check(isType(fields[name], "Float32Array"), "Final F32 " + name + " required");
  for (let name of UINT_FIELDS2) check(isType(fields[name], "Uint32Array"), "Final U32 " + name + " required");
  let count = fields.positions.length / 3;
  check(Number.isSafeInteger(count) && count > 0, "Invalid positions dimensions");
  for (let [name, stride] of [["positions", 3], ["normals", 3], ["bones", 4], ["weights", 4], ["uv2", 2], ["paintIndices", 1]]) check(fields[name].length === count * stride, "Invalid " + name + " dimensions");
  fields.uv && check(fields.uv.length === count * 2, "Invalid uv dimensions"), check(fields.indices.length > 0 && fields.indices.length % 3 === 0, "Invalid indices dimensions");
  let bytes = 0, fieldByteLengths = {};
  for (let [name, value] of Object.entries(fields))
    check(Number.isSafeInteger(value.byteLength) && value.byteLength % 4 === 0, "Invalid integer field byte length"), bytes += value.byteLength, fieldByteLengths[name] = value.byteLength;
  check(bytes <= MAX_BYTES, "Packed byte budget exceeded");
  let headerEnd = clock2(), min = [1 / 0, 1 / 0, 1 / 0], max = [-1 / 0, -1 / 0, -1 / 0];
  for (let i = 0; i < count; i++) {
    let p = i * 3, w = i * 4, u = i * 2;
    for (let axis = 0; axis < 3; axis++) {
      let position = fields.positions[p + axis], normal = fields.normals[p + axis];
      check(Number.isFinite(position) && Number.isFinite(normal), "Nonfinite position/normal"), min[axis] = Math.min(min[axis], position), max[axis] = Math.max(max[axis], position);
    }
    let x = fields.normals[p], y = fields.normals[p + 1], z = fields.normals[p + 2], length2 = f3(Math.sqrt(f3(f3(f3(x * x) + f3(y * y)) + f3(z * z))));
    check(Math.abs(length2 - 1) <= 1e-4, "Invalid unit normal");
    let total = 0;
    for (let slot = 0; slot < 4; slot++) {
      let bone = fields.bones[w + slot], weight = fields.weights[w + slot];
      check(bone < 14 && Number.isFinite(weight) && weight >= 0 && weight <= 1, "Invalid target influence"), total += weight;
    }
    check(Math.abs(total - 1) <= 1e-6, "Four target weights do not sum to one"), check(fields.paintIndices[i] < packet.paint.length, "Paint index outside semantic palette"), fields.uv && check(Number.isFinite(fields.uv[u]) && Number.isFinite(fields.uv[u + 1]), "Nonfinite uv");
    let row = fields.uv2[u], other = fields.uv2[u + 1];
    check(Number.isFinite(row) && other === 0 && Number.isInteger(row) && row >= 0 && row < materialRows, "Invalid atlas material row");
  }
  let verticesEnd = clock2();
  for (let i = 0; i < fields.indices.length; i++) check(fields.indices[i] < count, "Triangle outside vertex buffer");
  let end = clock2();
  return { ok: !0, validationProfile: "nri-final-f32-u32-sha256-v1", vertices: count, triangles: fields.indices.length / 3, byteLength: bytes, fieldByteLengths, bounds: { minimum: min, maximum: max }, indexWinding: packet.indexWinding, semanticColorsResolved: !1, timings: { headerMs: headerEnd - start, verticesMs: verticesEnd - headerEnd, indicesMs: end - verticesEnd, totalMs: end - start } };
}
async function sha256Buffer(bytes) {
  check(globalThis.crypto?.subtle, "SHA256 verification support unavailable");
  let digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}
async function attestFinalPackedCharacter(packet, context) {
  let validated = validateFinalPackedCharacter(packet, context), start = clock2(), entries = await Promise.all(Object.entries(packet.fields).map(async ([name, field]) => [name, await sha256Buffer(field)]));
  return { profile: "nri-final-f32-u32-sha256-v1", hashes: Object.fromEntries(entries), materialRows: context.materialRows, vertices: validated.vertices, triangles: validated.triangles, byteLength: validated.byteLength, fieldByteLengths: validated.fieldByteLengths, timings: { validationMs: validated.timings.totalMs, digestMs: clock2() - start } };
}

// tools/browser-character-worker.mjs
function installBrowserCharacterWorker(scope) {
  let assembler = null, chain = Promise.resolve(), verifiedPackets = 0;
  scope.onmessage = (event) => {
    chain = chain.then(async () => {
      let message = event.data;
      if (message.type === "configure") {
        let base = new URL(message.baseURL);
        if (!base.pathname.endsWith("/")) throw Error("Library URL must end with /");
        let readJson = async (path) => {
          let r = await fetch(new URL(path, base), { cache: "no-cache" });
          if (!r.ok) throw Error("Library fetch " + r.status);
          return r.json();
        }, [manifest, inventory, male, female] = await Promise.all([readJson("manifest.json"), readJson("inventory.json"), readJson("materials/male.json"), readJson("materials/female.json")]), profileRecipe = await readJson(manifest.profileRecipe), entries = new Map(inventory.files.map((f4) => [f4.path, f4]));
        verifiedPackets = 0, assembler = new BrowserCharacterAssembler(manifest, { male, female }, async (path) => {
          let url = new URL(path, base);
          if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw Error("Packet outside configured library");
          let expected = entries.get(path);
          if (!expected) throw Error("Packet missing from inventory");
          url.searchParams.set("v", expected.sha256);
          let response = await fetch(url);
          if (!response.ok) throw Error("Packet fetch " + response.status);
          let bytes = await response.arrayBuffer();
          if (bytes.byteLength !== expected.bytes) throw Error("Packet length mismatch");
          if (Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("") !== expected.sha256) throw Error("Packet integrity mismatch");
          return verifiedPackets++, bytes;
        }, { cacheBudget: message.cacheBudget ?? 24 * 1024 * 1024, profileRecipe }), scope.postMessage({ type: "configured", id: message.id, inventoryFiles: entries.size, packetCount: Object.keys(manifest.parts).length });
        return;
      }
      if (message.type !== "assemble" || !assembler) throw Error("Worker is not configured");
      let result = await assembler.assemble(message.appearance, message.base, message.pose, { includeParts: message.includeParts === !0, packedGPU: message.packedGPU === !0 });
      message.packedGPU === !0 && (result.verification = await attestFinalPackedCharacter(result.packed, { boneNames: assembler.manifest.bones, materialRows: assembler.materials[message.base].materialTable.length }));
      let transfer = result.transferables;
      delete result.transferables, scope.postMessage({ type: "assembled", id: message.id, ...result, verifiedPackets }, transfer), scope.postMessage({ type: "transferred", id: message.id, buffers: transfer.length, detached: transfer.every((b) => b.byteLength === 0) });
    }).catch((error) => scope.postMessage({ type: "error", id: event.data?.id, error: String(error?.stack ?? error) }));
  };
}
typeof WorkerGlobalScope < "u" && globalThis instanceof WorkerGlobalScope && installBrowserCharacterWorker(globalThis);
export {
  BrowserCharacterAssembler,
  decodeBrowserSkin4Packet,
  installBrowserCharacterWorker,
  mergeBrowserSkin4Atlas,
  packBrowserSkin4GPU,
  selectBrowserSkin4Parts,
  transferBrowserSkin4Set
};
