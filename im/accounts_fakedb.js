var contactisId = "6b1d8055-c9a8-4764-a179-34b9357fe4b9";

var secretKeys = {
    // organization: secretKey
    "6b1d8055-c9a8-4764-a179-34b9357fe4b9": "secret"
};

var users = {
    // email: { user id, organizationID }
    "anna.rys": {userId: "1", orgId: contactisId},
    "artur.wedzicha": {userId: "2", orgId: contactisId},
    "bartosz.szmit": {userId: "3", orgId: contactisId},
    "blazej.brudny": {userId: "4", orgId: contactisId},
    "daniel.slavetskiy": {userId: "5", orgId: contactisId},
    "dariusz.baczynski": {userId: "6", orgId: contactisId},
    "elzbieta.wrobel": {userId: "7", orgId: contactisId},
    "filip.franczak": {userId: "8", orgId: contactisId},
    "jakub.peksa": {userId: "9", orgId: contactisId},
    "jakub.godyn": {userId: "10", orgId: contactisId},
    "jaroslaw.plocki": {userId: "11", orgId: contactisId},
    "kajetan.rzepecki": {userId: "12", orgId: contactisId},
    "krzysztof.rutka": {userId: "13", orgId: contactisId},
    "maciej.sypien": {userId: "14", orgId: contactisId},
    "marcin.put": {userId: "15", orgId: contactisId},
    "mariusz.beltowski": {userId: "16", orgId: contactisId},
    "marta.szafraniec": {userId: "17", orgId: contactisId},
    "mateusz.lugowski": {userId: "18", orgId: contactisId},
    "michalina.jodlowska": {userId: "19", orgId: contactisId},
    "michal.biernacki": {userId: "20", orgId: contactisId},
    "mikolaj.sikorski": {userId: "21", orgId: contactisId},
    "pawel.budzyk": {userId: "22", orgId: contactisId},
    "pawel.kaczorowski": {userId: "23", orgId: contactisId},
    "rafal.kulawiak": {userId: "24", orgId: contactisId},
    "konstantinos": {userId: "25", orgId: contactisId},
    "pawel.dzieciol": {userId: "26", orgId: contactisId},
    "dariusz.bembenek":{userId: "27", orgId: contactisId},
    "alice": {userId: "201", orgId: contactisId},
    "bob": {userId: "202", orgId: contactisId},
    "charlie": {userId: "203", orgId: contactisId},
    "duglas": {userId: "204", orgId: contactisId},
    "eve": {userId: "205", orgId: contactisId},
    "fred": {userId: "206", orgId: contactisId},
    "gary": {userId: "207", orgId: contactisId},
    "helen": {userId: "208", orgId: contactisId}
};

var reversedUsersMap = {};
Object.keys(users).forEach(function(user) {
    reversedUsersMap[users[user].userId] = user;
});

function getSessionId(nickname) {
    var user = users[nickname] || {};
    return user.userId || -1;
}

function getOrganizationId(nickname) {
    var user = users[nickname] || {};
    return user.orgId || 2;
}

function getUserNickname(userId) {
    return reversedUsersMap[userId];
}
