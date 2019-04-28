var canvas;
var ctx;
var lastTime;

function start() {
    //DOM elemek betöltése
    canvas = document.getElementById('game_canvas');
    ctx = canvas.getContext('2d');

    //Adatok feltöltése
    mapWidth = canvas.width / TILE_SIZE;
    mapHeight = canvas.height / TILE_SIZE;

    //Különféle részek betöltése
    soundDoInit();
    inputInit();
    gameInit();
    toplistInit();

    //Rajzolás elindítása
    window.requestAnimationFrame(frame);
}

function frame(t) {
    //Eltelt idő számítás animációkhoz
    if (lastTime == undefined) {
        lastTime = t;
    }
    var delta = (t - lastTime) / 1000.0;
    lastTime = t;

    //Következő rajzolás indítése
    window.requestAnimationFrame(frame);

    //Canvas ürítése
    ctx.fillStyle = "#333333";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //Pálya és játékos rajzolás
    mapDraw(delta);
    playerDraw(delta);
}

//Bemenet kezelés
var input = {
    up: false, //38
    down: false, //40
    left: false, //37
    right: false //39
}
var inputMapping = {
    "38": "up",
    "40": "down",
    "37": "left",
    "39": "right"
}

function inputInit() {
    document.addEventListener('keydown', inputKeyDown, false);
    document.addEventListener('keyup', inputKeyUp, false);
}

function inputKeyDown(e) {
    var name = inputMapping[e.keyCode];

    //Ha nincs neve a gombnak akkor külön kell kezelni
    if (name == undefined) {
        if (e.keyCode == 82) { //'R' gomb
            gameInit();
        } else {
            if (levelFinished) {
                if (playerDied) {
                    gameInit();
                } else {
                    gameNextMap();
                }
            }
        }

        return;
    }

    input[name] = true;
}

function inputKeyUp(e) {
    var name = inputMapping[e.keyCode];

    if (name == undefined) {
        return;
    }

    input[name] = false;
}

//Játék
var gamePoints = 0;
var gamePointsAdd = 0;

var levelIndex = 6;

var levelDoTime = false;
var levelTime = 0;

var levelFinished = false;
var playerDied = false;

function gameInit() {
    document.getElementById("text_nextlvl").style.visibility = "hidden";

    //Számlálók és egyéb változók ürítése
    playerDied = false;
    levelFinished = false;

    levelDoTime = false;
    levelTime = 0;
    gamePointsAdd = 0;

    //Pálya lemásolása (így újra lehet játszani a pályát mert a belseje módosul a játékkal)
    map = jQuery.extend(true, {}, maps[levelIndex]);

    //Elemek sorba rakása típus alapján így a doboz (0) a lézer felett lesz (1) és nem fog furán kinézni
    map.entities.sort(gameEntitySort);

    //Pálya betöltése
    mapInit();

    //Pálya szöveg
    document.getElementById('text_level').innerHTML = (levelIndex + 1);

    //Szövegek firssítése
    pointsUpdateText();
    mapUpdateTime();
}

function gameEntitySort(a, b) {
    if (a.type < b.type){
      return 1;
    }

    if (a.type > b.type){
      return -1;
    }

    return 0;
}

function gameNew() {
    toplistHide();

    levelIndex = 0;
    gamePoints = 0;
    gamePointsAdd = 0;

    gameInit();
}

function gameNextMap() {
    if (gamePointsAdd > 0) {
        gamePoints += gamePointsAdd;

        pointsUpdateText();

        gamePointsAdd = 0;
    }

    if (levelIndex + 1 < maps.length) {
        levelIndex++;

        gameInit();
    } else {
        toplistShow();
    }
}

//Pálya
var TILE_SIZE = 48;

var mapWidth;
var mapHeight;
var map;

var MAP_FINISH_ANIMATION_TIME = 1.0;
var mapFinishAnimationTime;

var mapLazerTiles = [ ];

function mapInit() {
    //Játékos elhelyezése
    var playerSpawn = map.spawn;
    playerPosition.x = playerSpawn.x;
    playerPosition.y = playerSpawn.y;

    playerTargetPosition = undefined;

    //Animáció újraindítása
    mapFinishAnimationTime = 0;
}

function mapDraw(t) {
    mapLazerTiles = [ ];

    //Négyzetek
    var tilemap = map.tiles;

    for (var ty = 0; ty < mapHeight; ty++) {
        var row = tilemap[ty];
        if (row == undefined) {
            continue;
        }

        for (var tx = 0; tx < mapWidth; tx++) {
            var tile = row[tx];
            if (tile == undefined) {
                continue;
            }

            if (tile === 0) { //Üres négyzet
                continue;
            }

            tileDraw(tile, tx, ty);
        }
    }

    //Vége négyzet + animáció
    var finishPos = map.finish;
    mapFinishAnimationTime += t;

    //Sin használatával pulzáló animáció
    var finishAnim = (mapFinishAnimationTime / MAP_FINISH_ANIMATION_TIME) % 1.0;
    finishAnim = Math.sin(finishAnim * Math.PI);
    var finishColor = parseInt(finishAnim * 255);

    ctx.strokeStyle = "rgb(" + finishColor + ", " + finishColor + ", " + finishColor + ")";
    ctx.strokeRect(finishPos.x * TILE_SIZE + 1, finishPos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    //Dobozok
    var entityList = map.entities;
    for (var i = 0; i < entityList.length; i++){
        entityDraw(entityList[i], t);
    }

    //Idő számláló
    if (!levelFinished && levelDoTime) {
        levelTime += t;

        mapUpdateTime();
    }
}

function mapUpdateTime() {
    document.getElementById('text_time').innerHTML = mapFormatTime(levelTime) + " (" + mapFormatTime(map.score.time) + ")";
}

function mapFormatTime(secs) {
    var timeInt = parseInt(secs);
    var timeSec = timeInt % 60;
    var timeMin = Math.floor(timeInt / 60);

    return (timeMin < 10 ? "0" : "") + timeMin + ":" + (timeSec < 10 ? "0" : "") + timeSec;
}

function mapFindEntity(atX, atY) {
    //Elemek keresése egy négyzet X és Y koordinátán

    var entityList = map.entities;
    for (var i = 0; i < entityList.length; i++){
        var entity = entityList[i];

        if (entity.anim != undefined) { //Ha van animáció akkor a cél négyzetet kell nézni
            if (entity.anim.to.x == atX && entity.anim.to.y == atY) {
                return entity;
            }
        } else if (entity.x == atX && entity.y == atY) {
            return entity;
        }
    }

    return undefined;
}

function mapIsTileCollider(tx, ty, lazerMode) {
    //Egy négyzettel X Y helyen van ütközés?
    var tilemap = map.tiles;
    var row = tilemap[ty];
    if (row == undefined) {
        return true;
    }

    var tile = row[tx];
    if (tile == undefined) {
        return true;
    }

    return tileIsCollider(tile, lazerMode);
}

function mapCollideAt(tx, ty, lazerMode) {
    //Van ütközés négyzettel?
    if (mapIsTileCollider(tx, ty, lazerMode)) {
        return true;
    }

    //Van egyéb elem az adott négyzeten?
    return (mapFindEntity(tx, ty) != null);
}

//Entities
function entityCanMove(entity, dir) {
    if (entity.type != 0) { //Csak dobozok mozgathatóak
        return false;
    }

    //Tud mozogni az elem az adott irányba?
    return !mapCollideAt(entity.x + dir.x, entity.y + dir.y);
}

function entityDoMove(entity, dir) {
    entity.anim = animCreate(entity.x, entity.y, entity.x + dir.x, entity.y + dir.y, PLAYER_MOVE_TIME - 0.01);

    soundPlayPush();
}

function entityDraw(entity, t) {
    var drawX = entity.x;
    var drawY = entity.y;

    //Ha van animációja az elemnek frissíteni kell azt
    if (entity.anim != undefined) {
        var animResult = animUpdate(t, entity.anim);
        if (animResult === true) {
            entity.x = entity.anim.to.x;
            entity.y = entity.anim.to.y;

            entity.anim = undefined;

            drawX = entity.x;
            drawY = entity.y;
        } else {
            drawX = animResult.x;
            drawY = animResult.y;
        }
    }

    switch (entity.type) {
        case 0: //Doboz
            ctx.fillStyle = "#aaaaaa";
            ctx.fillRect(drawX * TILE_SIZE, drawY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            break;
        case 1: //Lazer
            ctx.fillStyle = "#ff0000";
            ctx.fillRect(drawX * TILE_SIZE + 10, drawY * TILE_SIZE + 10, TILE_SIZE - 20, TILE_SIZE - 20);

            entityDrawlazer(drawX, drawY, entity.lazerDir.x, entity.lazerDir.y);
            break;
        case 2: //Szöveg
            ctx.font = "16px Minecraftia";
            ctx.fillStyle = "#ffffff";

            var width = ctx.measureText(entity.text).width;
            ctx.fillText(entity.text, canvas.width / 2 - width / 2, drawY * TILE_SIZE + (TILE_SIZE / 2));
            break;
    }
}

function entityDrawlazer(tx, ty, lazerX, lazerY, checkTiles) {
    //A lézer max távolságig megvizsgálja a négyzeteket és kirajzolja a lézer elemeket
    for (var step = 0; step < Math.max(mapWidth, mapHeight); step++) {
        var checkX = tx + lazerX * step;
        var checkY = ty + lazerY * step;

        if (step != 0 && mapCollideAt(checkX, checkY, true)) {
            break;
        }

        //Csak az érdekel, hogy egy négyzeten van lézer vagy nincs?
        if (checkTiles === true) {
            mapLazerTiles.push({
                x: checkX,
                y: checkY
            });
            continue;
        }

        ctx.fillStyle = "#ff0000";
        if (step == 0) { //Az első lézer elem más mert ott indul ki
            if (lazerX != 0) {
                ctx.fillRect(checkX * TILE_SIZE + (TILE_SIZE / 2) * (lazerX > 0 ? 1 : 0), checkY * TILE_SIZE + (TILE_SIZE / 2) - 5, TILE_SIZE / 2, 10);
            } else {
                ctx.fillRect(checkX * TILE_SIZE + (TILE_SIZE / 2) - 5, checkY * TILE_SIZE + (TILE_SIZE / 2) * (lazerY > 0 ? 1 : 0), 10, TILE_SIZE / 2);
            }
        } else {
            if (lazerX != 0) {
                ctx.fillRect(checkX * TILE_SIZE, checkY * TILE_SIZE + (TILE_SIZE / 2) - 5, TILE_SIZE, 10);
            } else {
                ctx.fillRect(checkX * TILE_SIZE + (TILE_SIZE / 2) - 5, checkY * TILE_SIZE, 10, TILE_SIZE);
            }
        }
    }
}

//Négyzetek
function tileDraw(type, tx, ty) {
    var x = tx * TILE_SIZE;
    var y = ty * TILE_SIZE;

    switch(type) {
        case 1: //Út
        ctx.fillStyle = "#444444";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = "#666666";
        ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        break;
        case 2: //Átlátszó fal - X
        tileDraw(1, tx, ty);

        ctx.fillStyle = "#222222";
        ctx.fillRect(x, y + (TILE_SIZE / 2) - 5, TILE_SIZE, 10);
        break;
        case 3: //Átlátszó fal - Y
        tileDraw(1, tx, ty);

        ctx.fillStyle = "#222222";
        ctx.fillRect(x + (TILE_SIZE / 2) - 5, y, 10, TILE_SIZE);
        break;
    }
}

function tileIsCollider(type, lazerMode) {
    if (lazerMode) { //A lézer nem ütközik a vékony falakba
        if (type == 2 || type == 3) {
            return false;
        }
    }

    return (type != 1);
}

//Játékos
var PLAYER_MOVE_TIME = 0.1;

var playerPosition = {
    x: undefined,
    y: undefined
}
var playerMove = undefined;

function playerDraw(t) {
    var drawPosition = playerPosition;

    //Bemenet
    if (playerMove == undefined && !levelFinished) {
        var playSound = false;

        //Ha gomb le van nyomva és arra lehet mozogni, akkor mozgás animáció készítésével mozog a játékos
        if (input.up && !mapIsTileCollider(playerPosition.x, playerPosition.y - 1)) {
            playerMove = animCreate(playerPosition.x, playerPosition.y, playerPosition.x, playerPosition.y - 1, PLAYER_MOVE_TIME);
        } else if (input.down && !mapIsTileCollider(playerPosition.x, playerPosition.y + 1)) {
            playerMove = animCreate(playerPosition.x, playerPosition.y, playerPosition.x, playerPosition.y + 1, PLAYER_MOVE_TIME);
        } else if (input.left && !mapIsTileCollider(playerPosition.x - 1, playerPosition.y)) {
            playerMove = animCreate(playerPosition.x, playerPosition.y, playerPosition.x - 1, playerPosition.y, PLAYER_MOVE_TIME);
        } else if (input.right && !mapIsTileCollider(playerPosition.x + 1, playerPosition.y)) {
            playerMove = animCreate(playerPosition.x, playerPosition.y, playerPosition.x + 1, playerPosition.y, PLAYER_MOVE_TIME);
        }

        //Ha van mozgás esemény meg kell nézni hogy dobozt lehet-e mozgatni
        if (playerMove != undefined) {
            playSound = true;

            var entity = mapFindEntity(playerMove.to.x, playerMove.to.y);
            if (entity != undefined) {
                var dir = animDir(playerMove);
                if (entityCanMove(entity, dir)) {
                    entityDoMove(entity, dir);
                } else {
                    playerMove = undefined;
                    playSound = false;
                }
            }
        }

        if (playSound) {
            if (!levelDoTime) {
                levelDoTime = true;
            }

            soundPlayWalk();
        }
    }

    //Animáció
    if (playerMove != undefined) {
        var anim = animUpdate(t, playerMove);

        if (anim === true) {
            playerPosition.x = playerMove.to.x;
            playerPosition.y = playerMove.to.y;

            playerMove = undefined;

            eventPlayerMoved(playerPosition.x, playerPosition.y);
        } else {
            drawPosition = anim;
        }
    }

    //Rajzolás
    ctx.fillStyle = (playerDied ? "#ff0000" : "#ffffff");
    ctx.fillRect(drawPosition.x * TILE_SIZE, drawPosition.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

function playerCheckLazer() {
    //Lézer lista építése
    mapLazerTiles = [ ];
    for (var i = 0; i < map.entities.length; i++) {
        var entity = map.entities[i];

        if (entity.type == 1) {
            entityDrawlazer(entity.x, entity.y, entity.lazerDir.x, entity.lazerDir.y, true);
        }
    }

    //Ellenőrzés
    for (var x = 0; x < mapLazerTiles.length; x++) {
        if (mapLazerTiles[x].x == playerPosition.x && mapLazerTiles[x].y == playerPosition.y) {
            levelFinished = true;
            playerDied = true;

            soundPlayDead();
        }
    }
}

//Mozgás animáció
function animCreate(fromX, fromY, toX, toY, time) {
    return {
        from: {
            x: fromX,
            y: fromY
        },
        to: {
            x: toX,
            y: toY
        },
        time: 0,
        maxTime: time
    };
}

function animUpdate(time, anim) {
    anim.time += time;

    var moveProgress = anim.time / anim.maxTime;

    if (moveProgress >= 1) {
        return true; //Ha vége az animációnak true-val visszatérés
    } else {
        var difX = anim.to.x - anim.from.x;
        var difY = anim.to.y - anim.from.y;

        //Ha nincs vége akkor az animáció aktuális helyével tér vissza
        return {
            x: anim.from.x + difX * moveProgress,
            y: anim.from.y + difY * moveProgress
        };
    }
}

function animDir(anim) {
    return {
        x: Math.sign(anim.to.x - anim.from.x),
        y: Math.sign(anim.to.y - anim.from.y),
    }
}

function eventPlayerMoved(toX, toY) {
    if (toX == map.finish.x && toY == map.finish.y) {
        levelFinished = true;
        pointsCalculate();

        document.getElementById("text_nextlvl").style.visibility = "visible";
    } else {
        playerCheckLazer();
    }
}

//Pontszámítés
function pointsCalculate() {
    var targetTime = map.score.time;

    if (levelTime <= targetTime) { //Ha a max időn belül van akkor max pont
        gamePointsAdd = 100;
    } else {
        //Ha nem akkor a pontszám úgy csökken hogy:
        //A cél idő: 100pont
        //A cél idő kétszerese: 1 pont
        //Ezek között lineárisan csökken
        var left = levelTime - targetTime;

        left /= targetTime;
        left = 1.0 - left;

        if (left < 0) left = 0;
        if (left > 1) left = 1;

        var pt = 100 * left;
        if (pt < 1) pt = 1;

        gamePointsAdd = parseInt(Math.ceil(pt));
    }

    pointsUpdateText();
}

function pointsUpdateText() {
    document.getElementById("text_point").innerHTML = gamePoints + (gamePointsAdd > 0 ? " (+" + gamePointsAdd + ")" : "");
}

//Hangok
var soundDead;
var soundWalk;
var soundPush;

function soundDoInit() {
    soundWalk = new Audio("walk.wav");
    soundWalk.volume = 0.5;

    soundDead = new Audio("dead.wav");

    soundPush = new Audio("push.wav");
    soundPush.volume = 0.15;
}

function soundPlayWalk() {
    soundWalk.pause();
    soundWalk.currentTime = 0;
    soundWalk.play();
}

function soundPlayDead() {
    soundDead.play();
}

function soundPlayPush() {
    soundPush.pause();
    soundPush.currentTime = 0;
    soundPush.play();
}

//Toplista
var defaultToplist = [
    {
        name: "Bence",
        points: 600
    },
    {
        name: "Bence 2",
        points: 500
    }
];

var toplist = [
];

function toplistInit() {
    toplistLoad();
    toplistHide();
    toplistRefresh();
}

function toplistRefresh() {
    var table = document.getElementById("toplist_table");

    //Táblázat ürítése
    while (table.firstChild) {
        table.removeChild(table.firstChild);
    }

    //Táblázat feltöltése
    for (var i = 0; i < toplist.length; i++){
        var top = toplist[i];

        var tr = document.createElement("tr");
        table.appendChild(tr);

        var index = document.createElement("td");
        index.innerHTML = "#" + (i + 1);
        tr.appendChild(index);

        var name = document.createElement("td");
        name.innerHTML = top.name + " - " + top.points;
        tr.appendChild(name);
    }
}

function toplistHide() {
    document.getElementById("toplist_container").style.display = "none";
}

function toplistShow() {
    document.getElementById("toplist_container").style.display = "block";
    document.getElementById("toplist_score").innerHTML = gamePoints;
    document.getElementById("toplist_score_new").innerHTML = gamePoints;

    if (gamePoints > toplist[toplist.length - 1].score || toplist.length < 5) {
        toplistVisible(false, true);
    } else {
        toplistVisible(true, false);
    }
}

function toplistVisible(noHigh, newHigh) {
    document.getElementById("toplist_no_high").style.display = (noHigh ? "block" : "none");
    document.getElementById("toplist_new_high").style.display = (newHigh ? "block" : "none");
}

function toplistSubmit() {
    var name = document.getElementById("toplist_name");
    if (name.value == "" || name.value.length == 0) {
        name.focus();
    } else {
        toplistVisible(false, false);

        //Új toplista elem
        toplist.push({
            name: name.value,
            points: gamePoints
        });

        //Sorbarakás
        toplist.sort(toplistCompare);

        toplistSave();
        toplistRefresh();
    }
}

function toplistCompare(a, b) {
    if (a.points < b.points){
      return 1;
    }

    if (a.points > b.points){
      return -1;
    }

    return 0;
}

function toplistGetCookie() {
    var value = "; " + document.cookie;
    var parts = value.split("; tl=");
    if (parts.length == 2) return parts.pop().split(";").shift();

    return undefined;
  }

function toplistSetCookie(name, value) {
    document.cookie = name + "=" + value + "; path=/";
}

function toplistLoad() {
    var ck = toplistGetCookie();
    if (ck == undefined) {
        toplist = defaultToplist;

        toplistSave();
    } else {
        toplist = JSON.parse(ck);
    }
}

function toplistSave() {
    toplistSetCookie("tl", JSON.stringify(toplist));
}