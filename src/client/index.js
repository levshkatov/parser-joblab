const MAX_ROWS_IN_TEXTAREA = 500;
const WEBSOCKET_URL = "ws://localhost:3000";

let ws = new WebSocket(WEBSOCKET_URL);

const color = (str) => {

    const colorTable = {
        time: "#7BB579",
        info: "#6C72CE",
        warn: "#CEC16C",
        error: "#CE7F6C",
    }

    let time = (str.split("/time/")[1]) ? str.split("/time/")[0] : "";
    let type = (str.split("/time/")[1] && str.split("/time/")[1].split("/type/")[1]) 
        ? str.split("/time/")[1].split("/type/")[0] : "";
    let text = (str.split("/type/")[1]) ? str.split("/type/")[1] : str;

    const typeColor = (type.includes("INFO")) 
        ? colorTable.info : (type.includes("WARN")) 
        ? colorTable.warn : colorTable.error;

    time = (time.length) ? `<p style="color:${colorTable.time};">${time}</p>` : "";
    type = (type.length) ? `<p style="color:${typeColor}; font-weight:bold">${type}</p>` : "";
    text = (text.length) ? `<p>${text}</p>` : text;

    return `${time}${type}${text}`;
}

const log = (str) => {
    const textareaLog = document.getElementById("textareaLog");
    const extraRows = textareaLog.innerText.split('\n').length - MAX_ROWS_IN_TEXTAREA;

    console.log(str);

    if(extraRows > 0){
        debugger;
        let rows = textareaLog.innerHTML.split('<br>');
        rows = rows.slice(extraRows);
        console.log(textareaLog.innerHTML);
        textareaLog.innerHTML = rows.join('<br>');
        console.log(textareaLog.innerHTML);
    }

    textareaLog.innerHTML = `${textareaLog.innerHTML}<br>${color(str)}`;
    textareaLog.scrollTop = 99999;
}



const sendWS = (str, type = "log", obj = {}) => {
	if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: type, 
            data: str,
            obj: obj,
        }));
	} else {
		alert(`Вы отключены от сервера. Пожалуйста, перезагрузите страницу`);
	}
}

ws.onmessage = (event) => {

    let msg;
    try {
        msg = JSON.parse(event.data);
    } catch (err) {
        console.log(`Can't parse message: ${err.message}`);
        return console.log(data);
    }

    if (!msg.type) {
        return console.log(`WS: Unknown message - ${msg}`);
    }

    switch (msg.type) {

        case "log":
            log(msg.data);
            break;

        case "auth":
            document.getElementById("antispam").src = msg.obj.path;
            document.getElementById("inputEmail").value = "";
            document.getElementById("inputPass").value = "";
            document.getElementById("inputAntispam").value = "";
            document.getElementById("formAuth").style.display = "";
            break;

        default:
            break;
    }
}

ws.onopen = () => {
    console.log('WS: connected');
}

ws.onerror = (err) => {
    console.log(`WS: ERROR`);
    console.log(err);
}

ws.onclose = (event) => {
    console.log('WS closed');
    setTimeout(() => {
        ws = new WebSocket(WEBSOCKET_URL);
    }, 500);
}






window.onload = () => {

    document.getElementById("selectTypeOfSearch").addEventListener("change", function(){
        document.getElementById("selectSearchBy_res").style.display = (this.value === "vac") ? "none" : "";
        document.getElementById("selectSearchBy_vac").style.display = (this.value === "vac") ? "" : "none";
    });

    document.getElementById("selectRegion").addEventListener("change", function() {

        const regionValue = this.value;
        const selectCity = document.getElementById("selectCity");
        const _cities = cities.find(el => el.region.value === regionValue).cities;

        while (selectCity.options.length > 0) {
            selectCity.remove(0);
        }

        for (const _city of _cities){
            const option = document.createElement('option');
            option.value = _city.value;
            option.textContent = _city.text;
            selectCity.appendChild(option);
        }
    });

    document.getElementById("inputSubmitForm").addEventListener("click", function() {
        let url = "https://joblab.ru/search.php?";

        const params = [
            "selectTypeOfSearch", 
            "inputSearchString", 
            "selectSearchBy_res", 
            "inputSalary",
            "selectRegion",
            "selectCity",
            "selectCategory",
        ];

        for(const param of params){
            url += document.getElementById(param).name;
            url += "=";
            url += encodeWin1251(document.getElementById(param).value);
            url += "&";
        }

        url += "maxThread=100&submit=1";

        sendWS("", "newRequest", {
            url: url,
        });

        // log("<br><br><br><br><br>");
        // log("<strong>----- НОВЫЙ ЗАПРОС -----</strong><br>");
        // log("13:52:53.760/time/ INFO &nbsp/type/- Открываем ссылку:");
        // log("13:52:53.760/time/ WARN &nbsp/type/- Открываем ссылку:");
        // log("13:52:53.760/time/ ERROR /type/- Открываем ссылку:");
        // log(url);

    });

    document.getElementById("inputSubmitAuth").addEventListener("click", function() {
        const radioJobseeker = document.getElementById("radioJobseeker");
        const radioJobgiver = document.getElementById("radioJobgiver");
        const inputEmail = document.getElementById("inputEmail");
        const inputPass = document.getElementById("inputPass");
        const inputAntispam = document.getElementById("inputAntispam");

        if (!inputEmail.value.length || !inputPass.value.length || !inputAntispam.value.length) {
            return alert("Заполните все необходимые поля");
        }

        sendWS("", "auth", {
            radioValue: radioJobseeker.checked ? 1 : 2,
            email: inputEmail.value,
            password: inputPass.value,
            antispam: inputAntispam.value,
        });

        document.getElementById("formAuth").style.display = "none";

    });
}






function encodeWin1251(s) {
    const DMap = {0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17, 18: 18, 19: 19, 20: 20, 21: 21, 22: 22, 23: 23, 24: 24, 25: 25, 26: 26, 27: 27, 28: 28, 29: 29, 30: 30, 31: 31, 32: 32, 33: 33, 34: 34, 35: 35, 36: 36, 37: 37, 38: 38, 39: 39, 40: 40, 41: 41, 42: 42, 43: 43, 44: 44, 45: 45, 46: 46, 47: 47, 48: 48, 49: 49, 50: 50, 51: 51, 52: 52, 53: 53, 54: 54, 55: 55, 56: 56, 57: 57, 58: 58, 59: 59, 60: 60, 61: 61, 62: 62, 63: 63, 64: 64, 65: 65, 66: 66, 67: 67, 68: 68, 69: 69, 70: 70, 71: 71, 72: 72, 73: 73, 74: 74, 75: 75, 76: 76, 77: 77, 78: 78, 79: 79, 80: 80, 81: 81, 82: 82, 83: 83, 84: 84, 85: 85, 86: 86, 87: 87, 88: 88, 89: 89, 90: 90, 91: 91, 92: 92, 93: 93, 94: 94, 95: 95, 96: 96, 97: 97, 98: 98, 99: 99, 100: 100, 101: 101, 102: 102, 103: 103, 104: 104, 105: 105, 106: 106, 107: 107, 108: 108, 109: 109, 110: 110, 111: 111, 112: 112, 113: 113, 114: 114, 115: 115, 116: 116, 117: 117, 118: 118, 119: 119, 120: 120, 121: 121, 122: 122, 123: 123, 124: 124, 125: 125, 126: 126, 127: 127, 1027: 129, 8225: 135, 1046: 198, 8222: 132, 1047: 199, 1168: 165, 1048: 200, 1113: 154, 1049: 201, 1045: 197, 1050: 202, 1028: 170, 160: 160, 1040: 192, 1051: 203, 164: 164, 166: 166, 167: 167, 169: 169, 171: 171, 172: 172, 173: 173, 174: 174, 1053: 205, 176: 176, 177: 177, 1114: 156, 181: 181, 182: 182, 183: 183, 8221: 148, 187: 187, 1029: 189, 1056: 208, 1057: 209, 1058: 210, 8364: 136, 1112: 188, 1115: 158, 1059: 211, 1060: 212, 1030: 178, 1061: 213, 1062: 214, 1063: 215, 1116: 157, 1064: 216, 1065: 217, 1031: 175, 1066: 218, 1067: 219, 1068: 220, 1069: 221, 1070: 222, 1032: 163, 8226: 149, 1071: 223, 1072: 224, 8482: 153, 1073: 225, 8240: 137, 1118: 162, 1074: 226, 1110: 179, 8230: 133, 1075: 227, 1033: 138, 1076: 228, 1077: 229, 8211: 150, 1078: 230, 1119: 159, 1079: 231, 1042: 194, 1080: 232, 1034: 140, 1025: 168, 1081: 233, 1082: 234, 8212: 151, 1083: 235, 1169: 180, 1084: 236, 1052: 204, 1085: 237, 1035: 142, 1086: 238, 1087: 239, 1088: 240, 1089: 241, 1090: 242, 1036: 141, 1041: 193, 1091: 243, 1092: 244, 8224: 134, 1093: 245, 8470: 185, 1094: 246, 1054: 206, 1095: 247, 1096: 248, 8249: 139, 1097: 249, 1098: 250, 1044: 196, 1099: 251, 1111: 191, 1055: 207, 1100: 252, 1038: 161, 8220: 147, 1101: 253, 8250: 155, 1102: 254, 8216: 145, 1103: 255, 1043: 195, 1105: 184, 1039: 143, 1026: 128, 1106: 144, 8218: 130, 1107: 131, 8217: 146, 1108: 186, 1109: 190}
    const L = [];
    for (let i = 0; i < s.length; i++) {
        const ord = s.charCodeAt(i)
        if (!(ord in DMap))
            throw "Character "+s.charAt(i)+" isn't supported by win1251!";
        L.push('%'+DMap[ord].toString(16));
    }
    return L.join('').toUpperCase();
}